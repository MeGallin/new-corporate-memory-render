import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import {
  createCorsMiddleware,
  createSecurityHeadersMiddleware,
  getAllowedOrigins,
} from '../config/httpMiddleware.js';

const listen = (app) => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const createTestServer = async (nodeEnvironment = 'production') => {
  const app = express();
  app.use(createCorsMiddleware(nodeEnvironment));
  app.use(createSecurityHeadersMiddleware());
  app.get('/middleware-check', (req, res) => res.status(200).json({ ok: true }));

  const server = await listen(app);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => close(server),
  };
};

test('production CORS reflects known origins and supports credentialed preflight', async () => {
  const server = await createTestServer();
  const origins = [
    'https://yourcorporatememory.com',
    'https://new-corporate-memory-api.onrender.com',
  ];

  assert.deepEqual(getAllowedOrigins('production'), origins);

  try {
    for (const origin of origins) {
      const response = await fetch(`${server.baseUrl}/middleware-check`, {
        headers: { Origin: origin },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
      assert.match(response.headers.get('vary'), /Origin/);
    }

    const preflight = await fetch(`${server.baseUrl}/middleware-check`, {
      method: 'OPTIONS',
      headers: {
        Origin: origins[0],
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origins[0]);
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  } finally {
    await server.close();
  }
});

test('CORS omits browser permission headers for unknown origins', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/middleware-check`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  } finally {
    await server.close();
  }
});

test('CORS retains local development origins and non-browser requests', async () => {
  assert.deepEqual(getAllowedOrigins('development'), [
    'http://localhost:3000',
    'http://localhost:5000',
  ]);

  const server = await createTestServer('development');

  try {
    const localResponse = await fetch(`${server.baseUrl}/middleware-check`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert.equal(
      localResponse.headers.get('access-control-allow-origin'),
      'http://localhost:3000',
    );

    const noOriginResponse = await fetch(`${server.baseUrl}/middleware-check`);
    assert.equal(noOriginResponse.status, 200);
    assert.equal(noOriginResponse.headers.get('access-control-allow-origin'), null);
  } finally {
    await server.close();
  }
});

test('Helmet 8 applies the expected API security headers', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/middleware-check`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(
      response.headers.get('strict-transport-security'),
      'max-age=31536000; includeSubDomains',
    );
  } finally {
    await server.close();
  }
});
