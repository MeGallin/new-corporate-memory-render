import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
import Memories from '../models/MemoriesModel.js';
import AdminRoutes from '../routes/AdminRoute.js';
import MemoryUploadImageRoutes from '../routes/MemoryUploadImageRoutes.js';
import UserRoutes from '../routes/UserRoutes.js';

const createTestServer = async (router) => {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
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

const createToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);

const restoreEnvironmentVariable = (name, value) => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

test('protected admin and upload routes reject missing authentication', async () => {
  const adminServer = await createTestServer(AdminRoutes);
  const uploadServer = await createTestServer(MemoryUploadImageRoutes);

  try {
    const adminResponse = await fetch(`${adminServer.baseUrl}/admin/users`);
    const uploadResponse = await fetch(
      `${uploadServer.baseUrl}/memory-upload-image`,
      { method: 'POST' },
    );

    assert.equal(adminResponse.status, 401);
    assert.equal(uploadResponse.status, 401);
  } finally {
    await adminServer.close();
    await uploadServer.close();
  }
});

test('admin users route returns only fields needed by the admin screen', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  const originalUserFind = User.find;
  const originalMemoryFind = Memories.find;
  let selectedUserFields;
  let selectedMemoryFields;

  process.env.JWT_SECRET = 'route-test-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'admin-user', id: 'admin-user', isAdmin: true }),
  });
  User.find = () => ({
    select: (fields) => {
      selectedUserFields = fields;
      return {
        lean: async () => [
          {
            _id: 'member-user',
            name: 'Member',
            email: 'member@example.com',
          },
        ],
      };
    },
  });
  Memories.find = () => ({
    select: (fields) => {
      selectedMemoryFields = fields;
      return {
        lean: async () => [{ _id: 'memory-id', user: 'member-user' }],
      };
    },
  });

  const server = await createTestServer(AdminRoutes);
  try {
    const response = await fetch(`${server.baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${createToken('admin-user')}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(selectedUserFields.includes('resetPasswordToken'), false);
    assert.equal(selectedMemoryFields, '_id user');
    assert.deepEqual(body.memories, [
      { _id: 'memory-id', user: 'member-user' },
    ]);
    assert.equal(JSON.stringify(body).includes('memory content'), false);
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
    User.find = originalUserFind;
    Memories.find = originalMemoryFind;
  }
});

test('memory image route rejects an authenticated non-owner before Cloudinary', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  const originalMemoryFindById = Memories.findById;

  process.env.JWT_SECRET = 'route-test-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'requesting-user', id: 'requesting-user' }),
  });
  Memories.findById = async () => ({ _id: 'memory-id', user: 'other-user' });

  const server = await createTestServer(MemoryUploadImageRoutes);
  try {
    const form = new FormData();
    form.append(
      'memoryImage',
      new Blob(['not-a-real-image'], { type: 'image/png' }),
      'test.png',
    );

    const response = await fetch(`${server.baseUrl}/memory-upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createToken('requesting-user')}`,
        memoryId: 'memory-id',
      },
      body: form,
    });

    assert.equal(response.status, 403);
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
    Memories.findById = originalMemoryFindById;
  }
});

test('public authentication and recovery routes are rate limited', async () => {
  const originalFindOne = User.findOne;
  User.findOne = async () => null;

  const server = await createTestServer(UserRoutes);
  try {
    let firstLoginStatus;
    let loginResponse;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      loginResponse = await fetch(`${server.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (attempt === 0) firstLoginStatus = loginResponse.status;
    }
    assert.equal(firstLoginStatus, 400);
    assert.equal(loginResponse.status, 429);
    assert.match(
      (await loginResponse.json()).error,
      /Too many sign-in attempts/,
    );

    let firstRecoveryStatus;
    let recoveryResponse;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      recoveryResponse = await fetch(`${server.baseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'missing@example.com' }),
      });
      if (attempt === 0) firstRecoveryStatus = recoveryResponse.status;
    }
    assert.equal(firstRecoveryStatus, 404);
    assert.equal(recoveryResponse.status, 429);
    assert.match(
      (await recoveryResponse.json()).error,
      /Too many account requests/,
    );
  } finally {
    await server.close();
    User.findOne = originalFindOne;
  }
});
