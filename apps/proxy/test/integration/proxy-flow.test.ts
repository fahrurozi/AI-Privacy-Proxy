import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from '../../src/routes/health.js';
import { adminRoutes } from '../../src/routes/admin.js';
import { processIncomingRequest } from '../../src/proxy/request-pipeline.js';
import { processNonStreamingResponse } from '../../src/proxy/response-pipeline.js';
import { openAIAdapter } from '../../src/protocols/openai.js';
import { config } from '../../src/config/index.js';

describe('Integration: Proxy Routes & Pipeline Flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.register(adminRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('POST /admin/auth/login verifies credentials and returns token', async () => {
    // 1. Invalid key
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: { key: 'wrong-key' },
    });
    expect(invalidRes.statusCode).toBe(401);

    // 2. Valid key
    const validRes = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: { key: config.ADMIN_API_KEY },
    });
    expect(validRes.statusCode).toBe(200);
    const body = JSON.parse(validRes.body);
    expect(body.success).toBe(true);
    expect(body.token).toBe(config.ADMIN_API_KEY);
  });

  it('GET /admin/metrics requires valid X-Admin-Key', async () => {
    const unauthorizedRes = await app.inject({ method: 'GET', url: '/admin/metrics' });
    expect(unauthorizedRes.statusCode).toBe(401);

    const authorizedRes = await app.inject({
      method: 'GET',
      url: '/admin/metrics',
      headers: { 'x-admin-key': config.ADMIN_API_KEY },
    });
    expect(authorizedRes.statusCode).toBe(200);
    const body = JSON.parse(authorizedRes.body);
    expect(body).toHaveProperty('totalRequests');
  });

  it('End-to-End Pipeline: Sanitizes request prompt and detokenizes response', async () => {
    const originalPrompt = 'Please process payment for satoshi.nakamoto@bitcoin.org to 0x71C8F794B32145429631994304244a1234567890.';
    const requestPayload = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: originalPrompt }],
    };

    // 1. Process incoming request
    const processed = await processIncomingRequest(
      '/v1/chat/completions',
      { 'x-privacy-session-id': 'e2e-session-xyz' },
      JSON.stringify(requestPayload),
    );

    expect(processed.blocked).toBe(false);
    expect(processed.tokensCreated.length).toBeGreaterThanOrEqual(1);
    expect(processed.sanitizedBody).not.toContain('satoshi.nakamoto@bitcoin.org');
    expect(processed.sanitizedBody).not.toContain('0x71C8F794B32145429631994304244a1234567890');

    // 2. Simulated Upstream LLM Response containing the sanitized token
    const tokenUsed = processed.tokensCreated[0]?.token || '';
    const upstreamResponseRaw = JSON.stringify({
      choices: [
        {
          message: {
            role: 'assistant',
            content: `Hello! I received request for ${tokenUsed} and will proceed.`,
          },
        },
      ],
    });

    // 3. Process response through response pipeline
    const detokenized = await processNonStreamingResponse(
      upstreamResponseRaw,
      processed.sessionId,
      openAIAdapter,
    );

    expect(detokenized).toContain(processed.tokensCreated[0]?.originalValue);
    expect(detokenized).not.toContain(tokenUsed);
  });
});
