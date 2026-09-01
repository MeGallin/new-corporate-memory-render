import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ErrorResponse from '../utils/errorResponse.js';

const createTestServer = async () => {
  const app = express();
  app.get('/known', (req, res) => res.status(200).json({ success: true }));
  app.get('/async-error', async () => {
    throw new Error('Async route failed');
  });
  app.all('/{*path}', (req, res, next) => {
    next(new ErrorResponse(`Can't find ${req.originalUrl}`, 404));
  });
  app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({ error: error.message });
  });

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () =>
      resolve(listeningServer),
    );
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

test('Express 5 serves known routes and catches root and nested 404s', async () => {
  const server = await createTestServer();

  try {
    const knownResponse = await fetch(`${server.baseUrl}/known`);
    assert.equal(knownResponse.status, 200);

    for (const pathname of ['/', '/missing/nested']) {
      const response = await fetch(`${server.baseUrl}${pathname}`);
      assert.equal(response.status, 404);
      assert.match((await response.json()).error, /Can't find/);
    }
  } finally {
    await server.close();
  }
});

test('Express 5 forwards rejected async handlers to error middleware', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/async-error`);
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /Async route failed/);
  } finally {
    await server.close();
  }
});
