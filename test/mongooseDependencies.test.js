import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import Memories from '../models/MemoriesModel.js';
import { decryptMemory, isCiphertext } from '../utils/memoryCrypto.js';

const runPreMiddleware = (model, operation, context) =>
  model.schema.s.hooks.execPre(operation, context, []);

test('Mongoose 9 runs the password save middleware without callbacks', async () => {
  assert.equal(mongoose.version.split('.')[0], '9');

  const user = new User({
    name: 'Mongoose Test',
    email: 'mongoose-test@example.com',
    password: 'CurrentPass123!',
  });

  await runPreMiddleware(User, 'save', user);

  assert.match(user.password, /^\$2b\$12\$/);
  assert.equal(await user.matchPasswords('CurrentPass123!'), true);
});

test('Mongoose 9 runs memory encryption middleware without a database', async () => {
  const originalKey = process.env.ENCRYPTION_MASTER_KEY_BASE64;
  const originalEnabled = process.env.ENCRYPTION_ENABLED;
  process.env.ENCRYPTION_MASTER_KEY_BASE64 = Buffer.alloc(32, 7).toString(
    'base64',
  );
  process.env.ENCRYPTION_ENABLED = 'true';

  try {
    const userId = new mongoose.Types.ObjectId();
    const memory = new Memories({
      user: userId,
      title: 'Offline middleware test',
      memory: 'Save hook plaintext',
    });

    await runPreMiddleware(Memories, 'save', memory);

    assert.equal(isCiphertext(memory.memory), true);
    assert.equal(decryptMemory(memory.memory, userId), 'Save hook plaintext');

    const query = Memories.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId() },
      { $set: { user: userId, memory: 'Update hook plaintext' } },
    );

    await runPreMiddleware(Memories, 'findOneAndUpdate', query);

    const encryptedUpdate = query.getUpdate().$set.memory;
    assert.equal(isCiphertext(encryptedUpdate), true);
    assert.equal(decryptMemory(encryptedUpdate, userId), 'Update hook plaintext');
  } finally {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_MASTER_KEY_BASE64;
    } else {
      process.env.ENCRYPTION_MASTER_KEY_BASE64 = originalKey;
    }

    if (originalEnabled === undefined) {
      delete process.env.ENCRYPTION_ENABLED;
    } else {
      process.env.ENCRYPTION_ENABLED = originalEnabled;
    }
  }
});
