import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
import Memories from '../models/MemoriesModel.js';
import MemoriesRoutes from '../routes/MemoriesRoute.js';

const createTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', MemoriesRoutes);
  app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({ error: error.message });
  });

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () =>
      resolve(listeningServer),
    );
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/api`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

const restoreEnvironmentVariable = (name, value) => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

test('completion-only memory updates accept booleans without full edit fields', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalUserFindById = User.findById;
  const originalMemoryFindOne = Memories.findOne;
  const originalFindByIdAndUpdate = Memories.findByIdAndUpdate;
  let receivedUpdate;

  process.env.JWT_SECRET = 'memory-completion-test-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'user-id', id: 'user-id' }),
  });
  Memories.findOne = async () => ({ _id: 'memory-id', user: 'user-id' });
  Memories.findByIdAndUpdate = async (id, update) => {
    receivedUpdate = { id, update };
  };

  const server = await createTestServer();

  try {
    const token = jwt.sign({ id: 'user-id' }, process.env.JWT_SECRET);
    const response = await fetch(`${server.baseUrl}/memories/memory-id`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isComplete: true }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      isComplete: true,
    });
    assert.deepEqual(receivedUpdate, {
      id: 'memory-id',
      update: { $set: { isComplete: true } },
    });
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalUserFindById;
    Memories.findOne = originalMemoryFindOne;
    Memories.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('completion-only memory updates reject non-boolean values', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalUserFindById = User.findById;
  const originalMemoryFindOne = Memories.findOne;
  const originalFindByIdAndUpdate = Memories.findByIdAndUpdate;
  let updateAttempted = false;

  process.env.JWT_SECRET = 'memory-completion-test-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'user-id', id: 'user-id' }),
  });
  Memories.findOne = async () => ({ _id: 'memory-id', user: 'user-id' });
  Memories.findByIdAndUpdate = async () => {
    updateAttempted = true;
  };

  const server = await createTestServer();

  try {
    const token = jwt.sign({ id: 'user-id' }, process.env.JWT_SECRET);
    const response = await fetch(`${server.baseUrl}/memories/memory-id`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isComplete: 'true' }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'Completion status must be a boolean',
    });
    assert.equal(updateAttempted, false);
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalUserFindById;
    Memories.findOne = originalMemoryFindOne;
    Memories.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('due-date-only memory updates accept booleans without full edit fields', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalUserFindById = User.findById;
  const originalMemoryFindOne = Memories.findOne;
  const originalFindByIdAndUpdate = Memories.findByIdAndUpdate;
  let receivedUpdate;

  process.env.JWT_SECRET = 'memory-completion-test-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'user-id', id: 'user-id' }),
  });
  Memories.findOne = async () => ({ _id: 'memory-id', user: 'user-id' });
  Memories.findByIdAndUpdate = async (id, update) => {
    receivedUpdate = { id, update };
  };

  const server = await createTestServer();

  try {
    const token = jwt.sign({ id: 'user-id' }, process.env.JWT_SECRET);
    const response = await fetch(`${server.baseUrl}/memories/memory-id`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ setDueDate: false }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      setDueDate: false,
    });
    assert.deepEqual(receivedUpdate, {
      id: 'memory-id',
      update: { $set: { setDueDate: false } },
    });
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalUserFindById;
    Memories.findOne = originalMemoryFindOne;
    Memories.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
