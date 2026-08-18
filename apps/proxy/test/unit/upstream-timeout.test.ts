import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardUpstreamRequest, UpstreamTimeoutError } from '../../src/proxy/upstream.js';
import { config } from '../../src/config/index.js';

describe('forwardUpstreamRequest timeout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('aborts and throws UpstreamTimeoutError when upstream never responds with headers', async () => {
    global.fetch = vi.fn((_url: any, opts: any) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as any;

    const pending = forwardUpstreamRequest('/v1/chat/completions', 'POST', {}, Buffer.from('{}'));
    // Attach the rejection assertion immediately so the rejection is never
    // briefly "unhandled" while we advance fake timers below.
    const expectation = expect(pending).rejects.toBeInstanceOf(UpstreamTimeoutError);

    // Let the timeout inside forwardUpstreamRequest fire.
    await vi.advanceTimersByTimeAsync(config.UPSTREAM_TIMEOUT_MS + 100);

    await expectation;
  });

  it('does not abort a request that responds well within the timeout', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as any;

    const result = await forwardUpstreamRequest('/v1/chat/completions', 'POST', {}, Buffer.from('{}'));
    expect(result.statusCode).toBe(200);
  });
});
