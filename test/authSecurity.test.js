import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBearerToken,
  getVerifiedGoogleProfile,
  isResourceOwner,
} from '../utils/authSecurity.js';

test('extractBearerToken accepts one well-formed bearer token', () => {
  assert.equal(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken('Basic abc'), null);
  assert.equal(extractBearerToken('Bearer abc extra'), null);
});

test('isResourceOwner compares populated identifier values', () => {
  const ownerId = { toString: () => 'user-123' };
  assert.equal(isResourceOwner(ownerId, 'user-123'), true);
  assert.equal(isResourceOwner(ownerId, 'user-456'), false);
  assert.equal(isResourceOwner(null, 'user-123'), false);
});

test('getVerifiedGoogleProfile requires a verified identity', () => {
  assert.deepEqual(
    getVerifiedGoogleProfile({
      sub: 'google-user-id',
      email: 'Person@Example.com',
      email_verified: true,
      name: 'Person',
    }),
    { email: 'person@example.com', name: 'Person' },
  );

  assert.throws(() =>
    getVerifiedGoogleProfile({
      sub: 'google-user-id',
      email: 'person@example.com',
      email_verified: false,
    }),
  );
});
