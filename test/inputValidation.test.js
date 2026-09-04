import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMemoryValidationError,
  isValidEmail,
  isValidName,
  isValidNewPassword,
  normalizeEmail,
} from '../utils/inputValidation.js';

test('account validation applies the documented rules', () => {
  assert.equal(isValidName('Admin Guy'), true);
  assert.equal(isValidName('Admin'), false);
  assert.equal(isValidEmail('admin@example.com'), true);
  assert.equal(isValidEmail('invalid'), false);
  assert.equal(normalizeEmail(' Admin@Example.COM '), 'admin@example.com');
  assert.equal(isValidNewPassword('Secure1!'), true);
  assert.equal(isValidNewPassword('password'), false);
});

test('memory validation rejects whitespace, short notes, and invalid priorities', () => {
  assert.equal(
    getMemoryValidationError({ title: ' ', memory: 'Useful note', priority: 1 }),
    'Memory title is required',
  );
  assert.equal(
    getMemoryValidationError({ title: 'Title', memory: '  no ', priority: 1 }),
    'Memory content must contain at least 5 characters',
  );
  assert.equal(
    getMemoryValidationError({ title: 'Title', memory: 'Useful note', priority: 6 }),
    'Memory priority must be between 1 and 5',
  );
  assert.equal(
    getMemoryValidationError({ title: 'Title', memory: 'Useful note', priority: 3 }),
    null,
  );
});

test('new password validation preserves the six-character legacy minimum', () => {
  assert.equal(isValidNewPassword('Abc1!x'), true);
  assert.equal(isValidNewPassword('Abc1!'), false);
  assert.equal(isValidNewPassword(`${'A'.repeat(68)}a1!x`), true);
  assert.equal(isValidNewPassword(`${'A'.repeat(69)}a1!x`), false);
});
