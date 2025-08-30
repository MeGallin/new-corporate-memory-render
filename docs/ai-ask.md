# AI Add-On for Corporate Memory — LangChain/LangGraph (JS/TS) PRD + Code Stubs

This single markdown bundles the **product spec** and **ready-to-paste file stubs** for both repos:

- Backend: new-corporate-memory-render
- Frontend: new-corporate-memory-tws

It adopts **LangChain JS** + **LangGraph JS**, **MongoDB Atlas Vector Search**, **OpenAI** models, optional **Postgres** checkpointing, and **SSE** for streaming. Key API patterns and imports below mirror the current docs. [LangChain+2LangChain+2](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)[js.langchain.com](https://js.langchain.com/docs/integrations/vectorstores/mongodb_atlas/?utm_source=chatgpt.com)[LangChain](https://api.js.langchain.com/classes/langchain_mongodb.MongoDBAtlasVectorSearch.html?utm_source=chatgpt.com)

1. Goals

---

- Natural-language Q&A over Memories + attachments (PDF first), with citations.
- Inline AI actions on a memory: **Summarise**, **Auto-tag**, **Related**.
- Optional rerank step to boost retrieval quality.
- Safe-by-default (space for HIL pauses later using LangGraph’s state/interrupt patterns).
- Full traces via LangSmith (optional). [LangChain](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)[LangChain Docs](https://docs.langchain.com/langsmith/trace-with-langchain?utm_source=chatgpt.com)

**Non-Goals (v1)**: Generative edits of memory text, cross-tenant retrieval, OCR.

2. Architecture (high-level)

---

**Ingest**: PDF → PDFLoader → RecursiveCharacterTextSplitter → OpenAI embeddings → **MongoDB Atlas Vector Search**. [js.langchain.com+3js.langchain.com+3js.langchain.com+3](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/?utm_source=chatgpt.com)

**Ask**: Query → Retriever (Atlas VS) → (optional) rerank → Prompt → OpenAI Chat → Answer + citations.

**Orchestration**: **LangGraph StateGraph** with MessagesAnnotation, optional **ToolNode** for app actions; persistence via **Postgres checkpointer** (prod), in-memory (dev). [LangChain+3LangChain+3LangChain+3](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html?utm_source=chatgpt.com)

**Streaming**: Server streams with LangGraph’s stream(..., { streamMode: "messages" }), consumed via EventSource. [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/?utm_source=chatgpt.com)

3. Tech Choices (v1 defaults)

---

- **LangChain JS/TS** core + LCEL; **ChatOpenAI**, **OpenAIEmbeddings**. [js.langchain.com](https://js.langchain.com/docs/concepts/tracing/?utm_source=chatgpt.com)
- **LangGraph JS** (@langchain/langgraph), **ToolNode**, **StateGraph**, **MessagesAnnotation**. [LangChain+1](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)
- **Vector store**: **MongoDB Atlas Vector Search** via @langchain/mongodb. [js.langchain.com](https://js.langchain.com/docs/integrations/vectorstores/mongodb_atlas/?utm_source=chatgpt.com)[LangChain](https://api.js.langchain.com/classes/langchain_mongodb.MongoDBAtlasVectorSearch.html?utm_source=chatgpt.com)
- **Loaders**: PDFLoader from @langchain/community + pdf-parse. [js.langchain.com](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/?utm_source=chatgpt.com)
- **Text splitting**: RecursiveCharacterTextSplitter from @langchain/textsplitters. [js.langchain.com](https://js.langchain.com/docs/concepts/text_splitters/?utm_source=chatgpt.com)
- **Embeddings**: OpenAI text-embedding-3-small (cost-efficient) or -large (higher quality). [OpenAI Platform+1](https://platform.openai.com/docs/models/text-embedding-3-small?utm_source=chatgpt.com)
- **Chat model**: gpt-4o / gpt-4o-mini. [OpenAI Platform+1](https://platform.openai.com/docs/models/gpt-4o?utm_source=chatgpt.com)
- **Checkpointing**: @langchain/langgraph-checkpoint-postgres (PostgresSaver). [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/?utm_source=chatgpt.com)
- **Tracing**: LangSmith envs (optional). [LangChain](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)

4. Install (Backend)

---

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  npm i @langchain/core @langchain/openai @langchain/mongodb @langchain/community @langchain/textsplitters \        @langchain/langgraph @langchain/langgraph-checkpoint-postgres mongodb pdf-parse zod dotenv  # optional  # npm i cohere-ai  `

> **ESM**: Use "type": "module" in package.json or adapt imports.

5. Environment (Backend)

---

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  OPENAI_API_KEY=...  OPENAI_CHAT_MODEL=gpt-4o-mini  EMBEDDING_MODEL=text-embedding-3-small  MONGODB_URI=...  MONGODB_DB=corporate_memory  MONGODB_ATLAS_COLLECTION_NAME=cm_chunks  ATLAS_INDEX_NAME=vector_index  POSTGRES_URL=postgres://user:pass@host:5432/db  PG_SCHEMA=public  # Optional LangSmith (observability)  LANGCHAIN_TRACING_V2=true  LANGCHAIN_API_KEY=ls__...  LANGCHAIN_PROJECT=CorporateMemory  `

(LangGraph Postgres checkpointer & LangSmith variables per current guides.) [LangChain+1](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/?utm_source=chatgpt.com)

6. Backend — New Routes & Controllers

---

**File**: /routes/ai.routes.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { Router } from "express";  import {    ingestHandler,    askHandler,    askStreamHandler,    getThreadHandler,    feedbackHandler,  } from "../controllers/aiController.js";  const router = Router();  router.post("/ingest", ingestHandler);  router.post("/ask", askHandler);  router.get("/ask/stream", askStreamHandler);  router.get("/threads/:threadId", getThreadHandler);  router.post("/feedback", feedbackHandler);  export default router;  `

**File**: /controllers/aiController.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  import { qaGraph } from "../graphs/qaGraph.js";  import { ingestGraph } from "../graphs/ingestGraph.js";  import { z } from "zod";  const AskSchema = z.object({    query: z.string().min(2),    options: z.object({      useRerank: z.boolean().optional(),      threadId: z.string().optional(),      userId: z.string().optional(),    }).optional(),  });  export async function ingestHandler(req, res, next) {    try {      const urls = req.body?.urls || [];      const files = (req.files || []).map((f) => ({        path: f.path, originalname: f.originalname, mimetype: f.mimetype,      }));      const result = await ingestGraph().invoke({        files, urls, userId: req.user?._id?.toString(),      });      res.json({ ok: true, inserted: result.insertedCount || 0, errors: result.errors || [], threadId: result.threadId || null });    } catch (err) { next(err); }  }  export async function askHandler(req, res, next) {    try {      const parsed = AskSchema.safeParse(req.body);      if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message });      const { query, options } = parsed.data;      const app = qaGraph();      const out = await app.invoke(        { query, userId: req.user?._id?.toString(), messages: [{ role: "user", content: query }], options: options || {} },        { configurable: { thread_id: options?.threadId || crypto.randomUUID() } }      );      res.json({ ok: true, answer: out.answer || "", citations: out.citations || [], threadId: out.threadId });    } catch (err) { next(err); }  }  // SSE with LangGraph stream(..., { streamMode: "messages" })  export async function askStreamHandler(req, res, next) {    try {      const query = req.query.q || "";      if (!query || query.length < 2) return res.status(400).end("Missing ?q=...");      const threadId = req.query.threadId || crypto.randomUUID();      const userId = req.user?._id?.toString();      res.setHeader("Content-Type", "text/event-stream");      res.setHeader("Cache-Control", "no-cache, no-transform");      res.setHeader("Connection", "keep-alive");      const app = qaGraph();      const stream = await app.stream(        { query, userId, messages: [{ role: "user", content: query }], options: { useRerank: req.query.rerank === "1" } },        { configurable: { thread_id: threadId }, streamMode: "messages" }      );      let assembled = "";      for await (const [message] of stream) {        const chunk = typeof message?.content === "string" ? message.content : "";        if (chunk) {          assembled += chunk;          res.write(`event: token\ndata: ${JSON.stringify({ chunk })}\n\n`);        }      }      res.write(`event: done\ndata: ${JSON.stringify({ answer: assembled, threadId })}\n\n`);      res.end();    } catch (err) {      if (!res.headersSent) next(err);      try { res.end(); } catch {}    }  }  export async function getThreadHandler(req, res, next) {    try { res.json({ ok: true, threadId: req.params.threadId }); }    catch (err) { next(err); }  }  export async function feedbackHandler(_req, res, next) {    try { res.json({ ok: true }); }    catch (err) { next(err); }  }  ``

(Streaming mode and tuple shape per LangGraph JS streaming how-to.) [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/?utm_source=chatgpt.com)

7. Backend — Services

---

**File**: /services/embeddingService.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { OpenAIEmbeddings } from "@langchain/openai";  export function makeEmbeddings() {    return new OpenAIEmbeddings({      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",    });  }  `

(OpenAI embedding model names per models docs.) [OpenAI Platform](https://platform.openai.com/docs/models/text-embedding-3-small?utm_source=chatgpt.com)

**File**: /services/retrievalService.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { MongoClient } from "mongodb";  import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";  import { makeEmbeddings } from "./embeddingService.js";  let _client; let _collection;  export async function initMongo() {    if (_client) return { client: _client, collection: _collection };    _client = new MongoClient(process.env.MONGODB_URI);    await _client.connect();    const db = _client.db(process.env.MONGODB_DB || "corporate_memory");    const collName = process.env.MONGODB_ATLAS_COLLECTION_NAME || "cm_chunks";    _collection = db.collection(collName);    return { client: _client, collection: _collection };  }  export async function getVectorStore() {    const { collection } = await initMongo();    const embeddings = makeEmbeddings();    return new MongoDBAtlasVectorSearch(embeddings, {      collection,      indexName: process.env.ATLAS_INDEX_NAME || "vector_index",      textKey: "text",      embeddingKey: "embedding",    });  }  export async function addDocuments(docs) {    const vs = await getVectorStore();    return vs.addDocuments(docs);  }  export async function getRetriever({ k = 12, userId } = {}) {    const vs = await getVectorStore();    const filter = userId ? { userId } : undefined;    return vs.asRetriever({ k, filter });  }  `

(Integration API for Atlas VS in LangChain JS.) [LangChain](https://api.js.langchain.com/classes/langchain_mongodb.MongoDBAtlasVectorSearch.html?utm_source=chatgpt.com)[js.langchain.com](https://js.langchain.com/docs/integrations/vectorstores/mongodb_atlas/?utm_source=chatgpt.com)

8. Backend — LangGraph Graphs

---

**File**: /graphs/qaGraph.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  import { ChatOpenAI } from "@langchain/openai";  import { MessagesAnnotation, StateGraph, END } from "@langchain/langgraph";  import { ToolNode } from "@langchain/langgraph/prebuilt";  import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";  import { getRetriever } from "../services/retrievalService.js";  import { tools } from "./common/toolbox.js";  function makeCheckpointer() {    const url = process.env.POSTGRES_URL;    if (!url) return undefined;    const cp = PostgresSaver.fromConnString(url, { schema: process.env.PG_SCHEMA || "public" });    cp.setup?.().catch(() => {});    return cp;  }  const routeNode = async (_state) => "retrieve";  const retrieveNode = async (state) => {    const retriever = await getRetriever({ k: 12, userId: state.userId });    const retrieved = await retriever.invoke(state.query);    return { retrieved };  };  const draftNode = async (state) => {    const model = new ChatOpenAI({ model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini", temperature: 0.2 })      .bindTools(tools);    const context = (state.retrieved || [])      .map((d, i) => `[[${i + 1}]] ${d.pageContent}`)      .join("\n---\n");    const system = [      "You are a corporate memory assistant.",      "Answer strictly from the provided context.",      "If unsure, say you don't know.",      "Cite sources like [1], [2] referring to the order above.",    ].join(" ");    const messages = [      { role: "system", content: system },      { role: "user", content: `Context:\n${context}\n\nQuestion: ${state.query}` },    ];    const ai = await model.invoke(messages);    const citations = (state.retrieved || []).map((d, i) => ({      index: i + 1,      chunkId: d.metadata?._id || d.id || null,      text: d.pageContent.slice(0, 300),    }));    return { messages: [ai], answer: ai.content, citations };  };  const finaliseNode = async (state) => ({    answer: state.answer,    citations: state.citations,    threadId: state.threadId,  });  export function qaGraph() {    const checkpointer = makeCheckpointer();    const graph = new StateGraph(MessagesAnnotation)      .addNode("route", routeNode)      .addNode("retrieve", retrieveNode)      .addNode("draft", draftNode)      .addNode("finalise", finaliseNode)      .addEdge("__start__", "route")      .addEdge("route", "retrieve")      .addEdge("retrieve", "draft")      .addEdge("draft", "finalise")      .addEdge("finalise", END);    return graph.compile({ checkpointer });  }  ``

(StateGraph, MessagesAnnotation, ToolNode, PostgresSaver per JS docs.) [LangChain+3LangChain+3LangChain+3](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html?utm_source=chatgpt.com)

**File**: /graphs/ingestGraph.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { StateGraph, END } from "@langchain/langgraph";  import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";  import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";  import { addDocuments } from "../services/retrievalService.js";  const IngestState = { files: [], urls: [], userId: undefined, docs: [], insertedCount: 0, errors: [] };  const loadNode = async (state) => {    const docs = [];    for (const f of state.files || []) {      const loader = new PDFLoader(f.path);      const loaded = await loader.load();      for (const d of loaded) {        d.metadata = { ...(d.metadata || {}), userId: state.userId, source: f.originalname };      }      docs.push(...loaded);    }    // TODO: load from URLs if required    return { docs };  };  const splitNode = async (state) => {    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 120 });    const chunks = await splitter.splitDocuments(state.docs || []);    return { docs: chunks };  };  const embedUpsertNode = async (state) => {    const ids = await addDocuments(state.docs || []);    return { insertedCount: ids?.length || 0 };  };  export function ingestGraph() {    const graph = new StateGraph(IngestState)      .addNode("load", loadNode)      .addNode("split", splitNode)      .addNode("upsert", embedUpsertNode)      .addEdge("__start__", "load")      .addEdge("load", "split")      .addEdge("split", "upsert")      .addEdge("upsert", END);    return graph.compile();  }  `

(PDFLoader & text splitters usage per JS docs.) [js.langchain.com+1](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/?utm_source=chatgpt.com)

**File**: /graphs/common/toolbox.js (optional app tool)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  import { tool } from "@langchain/core/tools";  import { z } from "zod";  const createTask = tool(    async ({ title, dueDate, memoryId }) => {      // TODO: call your Task create service/model      return `Task created: "${title}" due ${dueDate || "unspecified"} (from memory ${memoryId || "-"})`;    },    {      name: "createTask",      description: "Create a task from user context (title, optional dueDate, optional memoryId).",      schema: z.object({ title: z.string(), dueDate: z.string().optional(), memoryId: z.string().optional() }),    }  );  export const tools = [createTask];  ``

(ToolNode + tools pattern per how-to.) [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/?utm_source=chatgpt.com)

9. Frontend — API utils & Ask page

---

> Install (if needed): npm i event-source-polyfill

**File**: /src/Store/utils/aiApi.js

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  const API_BASE = import.meta.env.VITE_API_BASE || "";  export async function aiAsk(query, options = {}) {    const res = await fetch(`${API_BASE}/ai/ask`, {      method: "POST",      headers: { "Content-Type": "application/json", ...(await authHeader()) },      body: JSON.stringify({ query, options }),    });    if (!res.ok) throw new Error(`ask failed: ${res.status}`);    return res.json();  }  export function aiAskStream({ query, useRerank = false, threadId }) {    const url = new URL(`${API_BASE}/ai/ask/stream`);    url.searchParams.set("q", query);    if (useRerank) url.searchParams.set("rerank", "1");    if (threadId) url.searchParams.set("threadId", threadId);    return new EventSource(url.toString(), { withCredentials: true });  }  async function authHeader() {    const token = localStorage.getItem("token");    return token ? { Authorization: `Bearer ${token}` } : {};  }  ``

**File**: /src/pages/AskAI.jsx

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  import { useEffect, useRef, useState } from "react";  import { aiAsk, aiAskStream } from "../Store/utils/aiApi";  export default function AskAI() {    const [query, setQuery] = useState("");    const [answer, setAnswer] = useState("");    const [useRerank, setUseRerank] = useState(false);    const [loading, setLoading] = useState(false);    const [citations, setCitations] = useState([]);    const esRef = useRef(null);    const onAsk = async (e) => {      e.preventDefault();      setAnswer(""); setCitations([]); setLoading(true);      esRef.current?.close?.();      const es = aiAskStream({ query, useRerank });      esRef.current = es;      es.addEventListener("token", (evt) => {        const { chunk } = JSON.parse(evt.data);        setAnswer((a) => a + chunk);      });      es.addEventListener("done", async () => {        es.close(); setLoading(false);        try {          const data = await aiAsk(query, { useRerank });          setCitations(data.citations || []);        } catch {}      });      es.onerror = () => { es.close(); setLoading(false); };    };    useEffect(() => () => esRef.current?.close?.(), []);    return (                Ask Memory ==========           setQuery(e.target.value)}                 placeholder="Ask across your memories & uploads…" className="flex-1 border rounded px-3 py-2" />             setUseRerank(e.target.checked)} />            Use rerank            {loading ? "Thinking…" : "Ask"}          {answer || (loading ? "…" : "Ask something to begin.")}    );  }  function CitationDrawer({ citations }) {    if (!citations?.length) return null;    return (                Sources -------          {citations.map((c) => (              `[{c.index}]` {c.text}          ))}    );  }  ``

(Streaming mode messages aligns with LangGraph streaming docs.) [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/?utm_source=chatgpt.com)

**Inline actions** (drop in as needed):

- /src/components/ai/InlineActions/SummariseButton.jsx
- /src/components/ai/InlineActions/AutoTagButton.jsx
- /src/components/ai/InlineActions/RelatedButton.jsx

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  // SummariseButton.jsx  import { useState } from "react";  import { aiAsk } from "../../../Store/utils/aiApi";  export default function SummariseButton({ memoryText }) {    const [loading, setLoading] = useState(false);    const [summary, setSummary] = useState("");    const run = async () => {      setLoading(true);      const prompt = `Summarise the following content in 3–5 bullets:\n\n${memoryText}`;      const { answer } = await aiAsk(prompt, { useRerank: false });      setSummary(answer); setLoading(false);    };    return (                {loading ? "…" : "Summarise"}        {summary &&   {summary}  }    );  }  ``

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  // AutoTagButton.jsx  import { useState } from "react";  import { aiAsk } from "../../../Store/utils/aiApi";  export default function AutoTagButton({ memoryText, onApply }) {    const [tags, setTags] = useState([]); const [loading, setLoading] = useState(false);    const run = async () => {      setLoading(true);      const prompt = `Extract 3–7 concise tags (single or two-word) from the text. Return as comma-separated list only.\n\n${memoryText}`;      const { answer } = await aiAsk(prompt, { useRerank: false });      const parsed = answer.split(",").map((t) => t.trim()).filter(Boolean);      setTags(parsed); setLoading(false);    };    return (                {loading ? "…" : "Auto-tag"}        {!!tags.length && (           onApply?.(tags)}>            Apply {tags.length}        )}    );  }  ``

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``  // RelatedButton.jsx  import { useState } from "react";  import { aiAsk } from "../../../Store/utils/aiApi";  export default function RelatedButton({ memoryText }) {    const [related, setRelated] = useState([]); const [loading, setLoading] = useState(false);    const run = async () => {      setLoading(true);      const prompt = `Return 5 short search queries that would find content related to:\n\n${memoryText}\n\nOne per line.`;      const { answer } = await aiAsk(prompt, { useRerank: true });      setRelated(answer.split("\n").filter(Boolean)); setLoading(false);    };    return (                {loading ? "…" : "Find related"}        {!!related.length && (            {related.map((q, i) => *   {q} )}        )}    );  }  ``

10. Acceptance Criteria (MVP)

---

1.  Upload a PDF; within ~60s you can query and receive an **answer with citations**.
2.  “Use Rerank” toggle demonstrably affects retrieval ranking (optional integration later).
3.  Streaming works token-by-token over SSE using LangGraph’s stream(..., { streamMode: "messages" }). [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/?utm_source=chatgpt.com)
4.  (Optional) LangSmith shows runs for ingest and ask. [LangChain](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)

11) Wire-up notes

---

- import aiRoutes from "./routes/ai.routes.js";app.use("/ai", aiRoutes);
- Create the **Atlas Vector Search** index on your cm_chunks collection with embedding as the vector field; set text as the content field (see LangChain + MongoDB Atlas guide). [js.langchain.com](https://js.langchain.com/docs/integrations/vectorstores/mongodb_atlas/?utm_source=chatgpt.com)
- If you enable **PostgresSaver** for checkpointing, ensure DB connectivity and run setup() once (the stub calls it). [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/?utm_source=chatgpt.com)

12. References (load-bearing)

---

- **LangGraph JS**: Quickstart (ToolNode, MessagesAnnotation) & API (StateGraph). [LangChain+1](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com)
- **Streaming tokens**: stream(..., { streamMode: "messages" }). [LangChain](https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/?utm_source=chatgpt.com)
- **MongoDB Atlas Vector Search with LangChain**: Guide + API reference. [js.langchain.com](https://js.langchain.com/docs/integrations/vectorstores/mongodb_atlas/?utm_source=chatgpt.com)[LangChain](https://api.js.langchain.com/classes/langchain_mongodb.MongoDBAtlasVectorSearch.html?utm_source=chatgpt.com)
- **PDFLoader** (@langchain/community) & **text splitters**. [js.langchain.com+1](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/?utm_source=chatgpt.com)
- **OpenAI embeddings & models**: text-embedding-3-small/-large, GPT-4o / 4o-mini. [OpenAI Platform+3OpenAI Platform+3OpenAI Platform+3](https://platform.openai.com/docs/models/text-embedding-3-small?utm_source=chatgpt.com)
- **LangSmith (observability)**: Env setup in LangGraph JS quickstart and LangSmith docs.
