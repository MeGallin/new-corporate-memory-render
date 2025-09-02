# Agent Memories Chat API (Current Implementation)

This document describes the current agent endpoint implemented in the API that answers natural-language questions over a user’s memories. It supersedes earlier LangGraph-oriented plans and reflects the shipped Express + LangChain/OpenAI solution.

---

## Overview

- Path: `POST /api/agent/memories/chat`
- Mount: prefixed by `/api` in `api/server.js`
- Auth: Bearer JWT required (middleware: `protect`)
- Input: Natural-language `question` with optional `filters`
- Output: Concise answer with citations and optional follow-ups

High-level flow:
1) Fetch the authenticated user’s memories from MongoDB via Mongoose.
2) Normalize memory objects (model transforms decrypt the `memory` field).
3) Embed memories and the query with OpenAI embeddings.
4) Rank by cosine similarity with soft boosts for tags, due, priority, and token overlap.
5) Synthesize a concise answer with an OpenAI chat model, citing memory IDs.

## Sequence Diagram

```text
Client
  |  POST /api/agent/memories/chat (JWT)
  |----------------------------------------------> Express Router (/api)
  |                                   [protect] verify JWT (jsonwebtoken + User)
  |                                   [controller] AgentController.agentMemoriesChat
  |                                                |
  |                                                |-- Mongoose: load Memories by req.user._id
  |                                                |-- normalize/decrypt memory content
  |                                                |-- OpenAIEmbeddings: embed docs and query
  |                                                |-- rank (cosine + boosts)
  |                                                |-- ChatOpenAI: synthesize answer with citations
  |                                                v
  |<---------------------------------------------- JSON { answerText, citations[], followUps[] }
```

---

## Endpoint Details

- Method/URL: `POST /api/agent/memories/chat`
- Headers:
  - `Authorization: Bearer <JWT>`
  - `Content-Type: application/json`
- Body (JSON):
  - `question` (string, required)
  - `filters` (object, optional): soft hints
    - `tags: string[]`
    - `priority: ("low"|"med"|"high")[]`
    - `dueOnly: boolean`
    - `dateFrom: ISO string`
    - `dateTo: ISO string`
    - `textQuery: string`

Request example:
```json
{
  "question": "What are my high-priority tasks due this week?",
  "filters": {
    "tags": ["project-x"],
    "priority": ["high"],
    "dueOnly": true,
    "dateFrom": "2025-08-25T00:00:00.000Z",
    "dateTo": "2025-09-07T23:59:59.999Z",
    "textQuery": "milestone"
  }
}
```

Response example:
```json
{
  "answerText": "Two items stand out ... [M-842], [M-917].",
  "citations": [
    { "id": "842", "title": "Q3 VAT checklist", "score": 0.92 },
    { "id": "917", "title": "Supplier payment run", "score": 0.89 }
  ],
  "followUps": []
}
```

Errors:
- 400 if `question` missing/invalid
- 401 if token missing/invalid
- 500 for unexpected server errors

---

## Implementation Notes

Files:
- `api/routes/AgentRoute.js`: `router.post('/agent/memories/chat', protect, agentMemoriesChat)`
- `api/controllers/AgentController.js`: `agentMemoriesChat` main logic
- `api/prompts/AgentPrompt.js`: exported `buildAgentPrompt(question, contextBlocks)` used by controller
- `api/middleWare/authMiddleWare.js`: JWT verification (`protect`)
- `api/server.js`: route mounting under `/api`, security middleware, error handling

Controller highlights:
- `normalizeMemory(m)`: shapes a memory for ranking, including decrypted `memory` content via Mongoose transform.
- `parseFilters(question, base)`: derives soft hints from the question and merges explicit `filters`.
  - `dueOnly` for due/overdue/deadline
  - `priority: ["high"]` if “high priority” is mentioned
  - `tags` via `tag:"..."` or `tag:foo`
  - `textQuery` via quoted strings or contain/include phrases
- Tokenization and similarity:
  - `tokenize`: lowercase, alphanumeric, whitespace split
  - `jaccard`: set overlap boost
  - `cosineSim`: over embedding vectors

Ranking (indicative values; see code):
- Base: cosine similarity between doc embedding and query embedding
- Tag overlap: up to ~0.08
- Due-only: ~0.06 when relevant
- Priority match: ~0.05
- Token Jaccard overlap: up to ~0.2
- Focus tokens (`textQuery`) overlap: up to ~0.3

Top-N selection:
- Keep top ~12 ranked, pass top ~8 as context blocks to the chat model.

Prompting:
- Single-message prompt instructs the model to answer concisely, cite memory IDs inline as `[M-<id>]`, and suggest helpful filters when nothing relevant is found.

---

## Libraries Used

Server & Security:
- `express`: routing and middleware
- `cors`: CORS with environment-based `allowedOrigins` (see `server.js`)
- `helmet`: security headers
- `compression`: gzip responses
- `morgan`: request logging
- `dotenv`: loads `config.env`

Auth & Data:
- `jsonwebtoken`: Bearer JWT auth
- `mongoose`: MongoDB ODM (memories, users)

AI (Agent):
- `@langchain/openai`:
  - `OpenAIEmbeddings` (default `text-embedding-3-small` via `OPENAI_EMBEDDING_MODEL`)
  - `ChatOpenAI` (default `gpt-4o-mini` via `OPENAI_MODEL`)

Additional features in the wider API:
- Email utilities (`utils/sendEmail.js`) for register/reset flows
- Cloudinary integration for uploads (memories and user profile images)
- Admin routes and page hits tracking
- Scheduled reminder emails (`utils/cronJobs.js`)

Client context:
- React 18 + Redux Thunk (see repo `AGENTS.md` for client structure and commands)

---

## Client Integration

- Reusable component: `client/src/Components/AgentChat/AgentChatComponent.jsx`
  - Auth-aware: consumes Redux auth and calls this endpoint with Bearer JWT.
  - UX details: input with conditional actions, last-question label (`Q.`), answer label (`A.`) inline, list formatting and date highlighting.
  - Drop-in usage: include `<AgentChatComponent />` in any view (e.g., Memories).
- Redux additions:
  - `client/src/Store/actions/agentActions.js` → `agentChatAction({ question, filters? })`
  - `client/src/Store/reducers/agentReducers.js` → `agentChat` slice `{ loading, error, data }`
  - `client/src/Store/constants/agentConstants.js`
  - `client/src/Store/store.js` registers `agentChat` reducer
  - API key in `client/src/Store/utils/api.js`: `agentMemoriesChat: 'api/agent/memories/chat'`

---

## Environment Variables

Located in `api/config.env` (examples):
- `PORT=5000`
- `NODE_ENV=development`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-4o-mini` (optional)
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` (optional)
- `MAILER_*`, `CLOUDINARY_*` for other app features

CORS origins are configured in `server.js` and differ for development vs production.

---

## Running & Testing

Install & run API:
```bash
cd api && npm i
npm run server   # dev (nodemon)
# or
npm start        # prod-like
```

Test with Postman:
1) `POST /api/login` to obtain a JWT
2) `POST /api/agent/memories/chat` with `Authorization: Bearer <token>` and a JSON body including `question` (and optional `filters`)

Curl example:
```bash
curl -X POST http://localhost:5000/api/agent/memories/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Show project X notes","filters":{"tags":["project-x"],"priority":["high"],"dueOnly":true}}'
```

---

## Error Handling & Troubleshooting

- 401 Unauthorized: incorrect/missing `Authorization: Bearer <token>`
- 400 Bad Request: missing `question`
- 500 Server Error: check logs; verify `OPENAI_API_KEY` and network egress
- Irrelevant/empty answers: ensure the user has memories; refine `filters`

---

## Future Enhancements

- SSE streaming for progressive responses
- Conversation state (thread ID/checkpointer)
- Persistent vector index to avoid re-embedding unchanged items
- Rate limiting and audit logging on the agent route

---

## Change Log

- Updated to document the production Express + LangChain implementation of `/api/agent/memories/chat`.
