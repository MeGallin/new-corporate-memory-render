import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
import Memories from '../models/MemoriesModel.js';
import AdminRoutes from '../routes/AdminRoute.js';
import ConfirmationLinkRoute from '../routes/ConfirmationLinkRoute.js';
import MemoryUploadImageRoutes from '../routes/MemoryUploadImageRoutes.js';
import UserRoutes from '../routes/UserRoutes.js';
import { generateConfirmationToken } from '../controllers/UserController.js';
import { toPublicUser } from '../utils/userResponse.js';

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

test('user session tokens use HS256 and include the configured expiry', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpire = process.env.JWT_EXPIRE;
  process.env.JWT_SECRET = 'route-test-secret';
  process.env.JWT_EXPIRE = '1h';

  try {
    const user = new User();
    const token = user.getSignedToken();
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    assert.equal(decoded.id, String(user._id));
    assert.ok(decoded.exp > decoded.iat);
  } finally {
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    restoreEnvironmentVariable('JWT_EXPIRE', originalJwtExpire);
  }
});

test('confirmation tokens expire and public user responses omit secrets', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'route-test-secret';

  try {
    const token = generateConfirmationToken('user-id');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    const publicUser = toPublicUser({
      _id: 'user-id',
      name: 'Admin Guy',
      email: 'admin@example.com',
      password: 'password-hash',
      resetPasswordToken: 'reset-token',
      resetPasswordExpire: new Date(),
    });

    assert.equal(decoded.id, 'user-id');
    assert.ok(decoded.exp > decoded.iat);
    assert.equal(publicUser.name, 'Admin Guy');
    assert.equal('password' in publicUser, false);
    assert.equal('resetPasswordToken' in publicUser, false);
    assert.equal('resetPasswordExpire' in publicUser, false);
  } finally {
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
  }
});

test('protected routes reject unconfirmed and suspended accounts', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'route-test-secret';
  const server = await createTestServer(AdminRoutes);

  try {
    for (const account of [
      { isConfirmed: false, isSuspended: false },
      { isConfirmed: true, isSuspended: true },
    ]) {
      User.findById = () => ({
        select: async () => ({
          _id: 'restricted-user',
          id: 'restricted-user',
          isAdmin: true,
          ...account,
        }),
      });

      const response = await fetch(`${server.baseUrl}/admin/users`, {
        headers: {
          Authorization: `Bearer ${createToken('restricted-user')}`,
        },
      });
      assert.equal(response.status, 403);
    }
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
  }
});

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

test('protected routes reject invalid, expired, and non-HS256 tokens', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'route-test-secret';
  User.findById = () => {
    throw new Error('Invalid tokens must be rejected before user lookup');
  };

  const tokens = [
    'not-a-valid-token',
    jwt.sign({ id: 'admin-user' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    }),
    jwt.sign({ id: 'admin-user' }, process.env.JWT_SECRET, {
      algorithm: 'HS384',
    }),
  ];

  const server = await createTestServer(AdminRoutes);
  try {
    for (const token of tokens) {
      const response = await fetch(`${server.baseUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /Token has failed/);
    }
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
  }
});

test('protected routes do not misreport database failures as invalid tokens', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'route-test-secret';
  User.findById = () => ({
    select: async () => {
      throw new Error('database unavailable');
    },
  });

  const server = await createTestServer(AdminRoutes);
  try {
    const response = await fetch(`${server.baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${createToken('admin-user')}` },
    });
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /database unavailable/);
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
  }
});

test('email confirmation rejects tokens that are not HS256', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'route-test-secret';
  User.findById = () => {
    throw new Error('Rejected confirmation tokens must not query users');
  };

  const token = jwt.sign({ id: 'user-id' }, process.env.JWT_SECRET, {
    algorithm: 'HS384',
  });
  const server = await createTestServer(ConfirmationLinkRoute);

  try {
    const response = await fetch(
      `${server.baseUrl}/confirm-email/${token}`,
    );
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /invalid or has expired/);
  } finally {
    await server.close();
    restoreEnvironmentVariable('JWT_SECRET', originalJwtSecret);
    User.findById = originalFindById;
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
    select: async () => ({
      _id: 'admin-user',
      id: 'admin-user',
      isAdmin: true,
      isConfirmed: true,
      isSuspended: false,
    }),
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
    select: async () => ({
      _id: 'requesting-user',
      id: 'requesting-user',
      isConfirmed: true,
      isSuspended: false,
    }),
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
    assert.equal(firstRecoveryStatus, 200);
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
