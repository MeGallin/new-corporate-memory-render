import Memories from '../models/MemoriesModel.js';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { buildAgentPrompt } from '../prompts/AgentPrompt.js';

// Map numeric priority to a friendly label (if present)
function toPriority(num) {
  if (num === 1) return 'low';
  if (num === 2) return 'med';
  if (num === 3) return 'high';
  return undefined;
}

function normalizeMemory(m) {
  const tags = Array.isArray(m.tag)
    ? m.tag.filter(Boolean).map(String)
    : m.tag
    ? [String(m.tag)]
    : [];
  return {
    id: String(m._id),
    title: m.title,
    content: m.memory, // decrypted by model transform when using toObject()
    tags,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
    updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
    priority: toPriority(typeof m.priority === 'number' ? m.priority : undefined),
    setDueDate: !!m.setDueDate,
    dueDate: m.dueDate ?? null,
  };
}

function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}

function cosineSim(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function parseFilters(question, base) {
  const q = (question || '').toLowerCase();
  const filters = { ...(base || {}) };
  if (/\bdue|overdue|deadline\b/.test(q)) filters.dueOnly = true;
  if (/\bhigh[- ]?priority\b/.test(q)) filters.priority = ['high'];
  const tagMatches = [...(question || '').matchAll(/tag:\"([^\"]+)\"|tag:([^\s]+)/g)].map(
    (m) => m[1] ?? m[2],
  );
  if (tagMatches.length) {
    filters.tags = [...new Set([...(filters.tags || []), ...tagMatches])];
  }

  const quoted = [...(question || '').matchAll(/\"([^\"]+)\"/g)].map((m) => m[1]);
  const containMatch = (question || '').match(/\bcontain[s]?\s+([a-zA-Z0-9_-]+)/i);
  const includeMatch = (question || '').match(/\binclude[s]?\s+([a-zA-Z0-9_-]+)/i);
  const textTerms = [
    ...quoted,
    ...(containMatch ? [containMatch[1]] : []),
    ...(includeMatch ? [includeMatch[1]] : []),
  ]
    .map((t) => t.trim())
    .filter(Boolean);
  if (textTerms.length) filters.textQuery = textTerms.join(' ');
  return filters;
}

export const agentMemoriesChat = async (req, res, next) => {
  try {
    const { question, filters: inputFilters } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    // Load this user's memories from DB. Use toObject() to trigger model transforms (decrypt memory).
    const docs = await Memories.find({ user: req.user._id }).sort({ createdAt: -1 });
    const items = docs.map((d) => normalizeMemory(d.toObject()));

    // Parse filters (soft hints), and do only coarse date filtering.
    const filters = parseFilters(question, inputFilters);
    const dateFiltered = items.filter((m) => {
      if (filters?.dateFrom && m.createdAt && m.createdAt < filters.dateFrom) return false;
      if (filters?.dateTo && m.createdAt && m.createdAt > filters.dateTo) return false;
      return true;
    });

    // Rank with embeddings + soft boosts
    const docsForEmbed = dateFiltered.map((m) => ({
      pageContent: [
        m.title || '',
        m.content || '',
        m.tags?.length ? `Tags: ${m.tags.join(', ')}` : '',
        m.setDueDate && m.dueDate ? `Due: ${m.dueDate}` : '',
        m.priority ? `Priority: ${m.priority}` : '',
        m.createdAt ? `Created: ${m.createdAt}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      metadata: m,
    }));

    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    });
    const docVectors = await embeddings.embedDocuments(
      docsForEmbed.map((d) => d.pageContent),
    );
    const qVec = await embeddings.embedQuery(question);

    const qTokens = tokenize(question);
    const requestedTags = (filters?.tags || []).map((t) => t.toLowerCase());
    const focusTokens = tokenize(filters?.textQuery || '').filter((t) => t.length >= 3);

    const ranked = docsForEmbed
      .map((d, i) => {
        const base = cosineSim(docVectors[i], qVec);
        const meta = d.metadata;
        let boost = 0;
        if (requestedTags.length) {
          const docTags = (meta.tags || []).map((t) => t.toLowerCase());
          const overlap = docTags.filter((t) => requestedTags.includes(t)).length;
          boost += Math.min(0.08, overlap * 0.04);
        }
        if (filters?.dueOnly && meta.setDueDate) boost += 0.06;
        if (filters?.priority?.length && filters.priority.includes(meta.priority || 'med')) boost += 0.05;
        const docTokens = tokenize(`${meta.title || ''} ${d.pageContent}`);
        boost += Math.min(0.2, jaccard(qTokens, docTokens));
        if (focusTokens.length) {
          const overlap = focusTokens.filter((t) => docTokens.includes(t)).length;
          boost += Math.min(0.3, overlap * 0.15);
        }
        return { doc: d, score: base + boost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const workingSet = ranked.slice(0, 8).map((r) => r.doc);

    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
    });

    const contextBlocks = workingSet
      .map((d) => `# [${d.metadata.id}] ${d.metadata.title || '(untitled)'}\n${d.pageContent}`)
      .join('\n\n');

    const prompt = buildAgentPrompt(question, contextBlocks);

    const resLLM = await llm.invoke([{ role: 'user', content: prompt }]);
    const answerText = (resLLM && resLLM.content && resLLM.content.toString()) || String(resLLM);

    const citations = ranked.slice(0, 8).map((r) => ({
      id: r.doc.metadata.id,
      title: r.doc.metadata.title,
      score: r.score,
    }));

    return res.json({ answerText: answerText.trim(), citations, followUps: [] });
  } catch (e) {
    return next(e);
  }
};
