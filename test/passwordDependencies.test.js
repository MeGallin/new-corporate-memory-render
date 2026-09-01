import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import User from '../models/UserModel.js';

const legacyHash =
  '$2a$12$abcdefghijklmnopqrstuuGS7RHIzH/eMStsn06zy0nMn87Usmrk.';

const createUser = (password) =>
  new User({
    name: 'Password Test',
    email: 'password-test@example.com',
    password,
  });

test('bcryptjs 3 verifies existing version 2 hashes', async () => {
  const user = createUser(legacyHash);

  assert.equal(await user.matchPasswords('LegacyPass123!'), true);
  assert.equal(await user.matchPasswords('IncorrectPass123!'), false);
});

test('bcryptjs 3 generates compatible version 2b hashes with 12 rounds', async () => {
  const password = 'CurrentPass123!';
  const hash = await bcrypt.hash(password, 12);

  assert.match(hash, /^\$2b\$12\$/);
  assert.equal(bcrypt.getRounds(hash), 12);
  assert.equal(await bcrypt.compare(password, hash), true);
});

test('new passwords cannot exceed bcrypt\'s 72-byte input limit', async () => {
  await assert.doesNotReject(createUser('a'.repeat(72)).validate());
  await assert.rejects(
    createUser('a'.repeat(73)).validate(),
    /Password must be 72 bytes or fewer/,
  );
  await assert.rejects(
    createUser('🔐'.repeat(19)).validate(),
    /Password must be 72 bytes or fewer/,
  );
});
