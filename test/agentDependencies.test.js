import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  DEFAULT_AGENT_CHAT_MODEL,
  DEFAULT_AGENT_EMBEDDING_MODEL,
  getAgentChatModelConfig,
  getAgentEmbeddingModelConfig,
} from '../controllers/AgentController.js';

const preserveEnvironment = (keys) =>
  Object.fromEntries(keys.map((key) => [key, process.env[key]]));

const restoreEnvironment = (environment) => {
  Object.entries(environment).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
};

test('Agent Chat defaults to the current cost-sensitive GPT model', () => {
  const environment = preserveEnvironment(['OPENAI_API_KEY', 'OPENAI_MODEL']);
  process.env.OPENAI_API_KEY = 'test-key';
  delete process.env.OPENAI_MODEL;

  try {
    const config = getAgentChatModelConfig();
    const model = new ChatOpenAI(config);

    assert.equal(DEFAULT_AGENT_CHAT_MODEL, 'gpt-5.6-luna');
    assert.equal(config.model, DEFAULT_AGENT_CHAT_MODEL);
    assert.deepEqual(config.reasoning, { effort: 'low' });
    assert.equal(model.model, DEFAULT_AGENT_CHAT_MODEL);
    assert.deepEqual(model.reasoning, { effort: 'low' });
  } finally {
    restoreEnvironment(environment);
  }
});

test('Agent Chat retains environment overrides and the low-cost embedding default', () => {
  const environment = preserveEnvironment([
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'OPENAI_EMBEDDING_MODEL',
  ]);
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'configured-chat-model';
  delete process.env.OPENAI_EMBEDDING_MODEL;

  try {
    const chatConfig = getAgentChatModelConfig();
    const embeddingConfig = getAgentEmbeddingModelConfig();
    const embeddings = new OpenAIEmbeddings(embeddingConfig);

    assert.equal(chatConfig.model, 'configured-chat-model');
    assert.equal(DEFAULT_AGENT_EMBEDDING_MODEL, 'text-embedding-3-small');
    assert.equal(embeddingConfig.model, DEFAULT_AGENT_EMBEDDING_MODEL);
    assert.equal(embeddings.model, DEFAULT_AGENT_EMBEDDING_MODEL);
  } finally {
    restoreEnvironment(environment);
  }
});
