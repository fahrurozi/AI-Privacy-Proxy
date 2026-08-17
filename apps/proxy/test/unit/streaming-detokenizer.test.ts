import { describe, it, expect, beforeEach } from 'vitest';
import { findSafeFlushBoundary, processStreamChunk, flushStreamPending } from '../../src/streaming/streaming-detokenizer.js';
import { StreamStateManager } from '../../src/streaming/stream-state.js';
import { RedisTokenVault } from '../../src/vault/redis-vault.js';

describe('StreamingDetokenizer', () => {
  let vault: RedisTokenVault;
  let stateManager: StreamStateManager;
  const sessionId = 'test-stream-session';

  beforeEach(async () => {
    vault = new RedisTokenVault('redis://localhost:9999'); // Fallback in-memory
    stateManager = new StreamStateManager();
  });

  it('findSafeFlushBoundary should return full length when no open bracket exists', () => {
    const text = 'Hello world, this is a clean text.';
    expect(findSafeFlushBoundary(text)).toBe(text.length);
  });

  it('findSafeFlushBoundary should retain partial token when open bracket is unclosed', () => {
    const text = 'Hello world, token is [a3x:PERSON';
    const boundary = findSafeFlushBoundary(text);
    expect(boundary).toBe(text.indexOf('['));
    expect(text.slice(0, boundary)).toBe('Hello world, token is ');
  });

  it('should restore token split across two consecutive chunks', async () => {
    const streamKey = 'req_123:choices.0.delta.content';
    const originalName = 'Alice Smith';
    const token = await vault.getOrCreate(sessionId, 'PERSON', originalName);

    // Split token in half: e.g. token is "[1234:PERSON_001]"
    const half = Math.floor(token.length / 2);
    const chunk1 = 'The winner is ' + token.slice(0, half);
    const chunk2 = token.slice(half) + ', congratulations!';

    // Process chunk 1
    const out1 = await processStreamChunk(streamKey, chunk1, sessionId, vault, stateManager);
    expect(out1).toBe('The winner is ');

    // Process chunk 2
    const out2 = await processStreamChunk(streamKey, chunk2, sessionId, vault, stateManager);
    expect(out2).toBe(originalName + ', congratulations!');

    // Final flush
    const final = await flushStreamPending(streamKey, sessionId, vault, stateManager);
    expect(final).toBe('');
  });

  it('should handle token split in 3 chunks', async () => {
    const streamKey = 'req_456:delta.text';
    const secretEmail = 'ceo@supersecretcorp.com';
    const token = await vault.getOrCreate(sessionId, 'EMAIL_ADDRESS', secretEmail);

    const part1 = token.slice(0, 3);
    const part2 = token.slice(3, 8);
    const part3 = token.slice(8);

    const out1 = await processStreamChunk(streamKey, `Contact: ${part1}`, sessionId, vault, stateManager);
    expect(out1).toBe('Contact: ');

    const out2 = await processStreamChunk(streamKey, part2, sessionId, vault, stateManager);
    expect(out2).toBe('');

    const out3 = await processStreamChunk(streamKey, `${part3} for info`, sessionId, vault, stateManager);
    expect(out3).toBe(`${secretEmail} for info`);
  });
});
