import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadEnvironment } from '../config/environment.js';

test('dotenv 17 loads config.env quietly without overriding runtime values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'corporate-memory-env-'));
  const environmentFile = join(directory, 'config.env');
  const target = { EXISTING_VALUE: 'from-runtime' };
  const logMessages = [];
  const originalLog = console.log;

  await writeFile(
    environmentFile,
    'NEW_VALUE=from-file\nEXISTING_VALUE=from-file\n',
    'utf8',
  );

  console.log = (...args) => logMessages.push(args);

  try {
    const result = loadEnvironment({
      path: environmentFile,
      processEnv: target,
    });

    assert.equal(result.error, undefined);
    assert.deepEqual(result.parsed, {
      NEW_VALUE: 'from-file',
      EXISTING_VALUE: 'from-file',
    });
    assert.deepEqual(target, {
      NEW_VALUE: 'from-file',
      EXISTING_VALUE: 'from-runtime',
    });
    assert.deepEqual(logMessages, []);
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
});
