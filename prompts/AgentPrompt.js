// Builds the agent prompt for the memories chat endpoint
// Usage: buildAgentPrompt(question, contextBlocks)
export function buildAgentPrompt(question, contextBlocks) {
  return [
    'You are a corporate-memory analyst.',
    "Given the user's question and the memory excerpts, answer concisely in natural language.",
    'Cite memory IDs inline like [M-<id>] for specific claims.',
    'If synthesising across many items, cite 2-3 most relevant IDs.',
    'If nothing relevant, say so briefly and suggest a useful filter (e.g., a tag or date range).',
    '',
    `USER QUESTION:\n${question}`,
    '',
    'MEMORY EXCERPTS:',
    contextBlocks || '(none)',
  ].join('\n');
}

