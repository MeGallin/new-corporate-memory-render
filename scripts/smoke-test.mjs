const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const healthUrl = new URL('/health', baseUrl);

const response = await fetch(healthUrl);
const body = await response.json();

if (!response.ok) {
  throw new Error(
    `Health check failed with HTTP ${response.status}: ${JSON.stringify(body)}`,
  );
}

if (body.status !== 'ok' || body.database !== 'connected') {
  throw new Error(`Unexpected health response: ${JSON.stringify(body)}`);
}

console.log(`Smoke test passed: ${healthUrl}`);
