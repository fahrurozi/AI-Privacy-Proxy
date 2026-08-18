import { describe, it, expect, vi, beforeEach } from 'vitest';

const analyzeTextMock = vi.fn();

vi.mock('../../src/presidio/client.js', () => ({
  analyzeText: (text: string) => analyzeTextMock(text),
}));

import { processIncomingRequest } from '../../src/proxy/request-pipeline.js';

function delayedEmptyResult(latencyMs: number) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ entities: [], usedFallback: false, latencyMs }), latencyMs),
  );
}

describe('processIncomingRequest - Presidio parallelization', () => {
  beforeEach(() => {
    analyzeTextMock.mockReset();
  });

  it('analyzes all message fields concurrently instead of sequentially', async () => {
    const PER_FIELD_DELAY_MS = 200;
    const FIELD_COUNT = 6;

    analyzeTextMock.mockImplementation(() => delayedEmptyResult(PER_FIELD_DELAY_MS));

    const messages = Array.from({ length: FIELD_COUNT }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message number ${i}`,
    }));

    const start = Date.now();
    const result = await processIncomingRequest(
      '/v1/chat/completions',
      { 'x-privacy-session-id': 'parallel-test-session' },
      JSON.stringify({ model: 'gpt-4o', messages }),
    );
    const elapsed = Date.now() - start;

    expect(analyzeTextMock).toHaveBeenCalledTimes(FIELD_COUNT);
    // If calls were sequential this would take ~FIELD_COUNT * PER_FIELD_DELAY_MS
    // (1200ms). Parallel execution should stay close to a single delay, with
    // headroom for scheduling overhead.
    expect(elapsed).toBeLessThan(PER_FIELD_DELAY_MS * (FIELD_COUNT - 1));
    expect(result.blocked).toBe(false);
  });
});
