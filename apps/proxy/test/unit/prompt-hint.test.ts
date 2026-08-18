import { describe, it, expect, beforeEach } from 'vitest';
import { processIncomingRequest } from '../../src/proxy/request-pipeline.js';
import { upstreamStore } from '../../src/config/upstream-store.js';

describe('Smart Token Preservation Hint Injection', () => {
  beforeEach(() => {
    upstreamStore.updateSettings({
      injectPreservationHint: true,
      customPreservationHint: undefined,
    });
  });

  it('does NOT inject hint when prompt contains 0 PII tokens', async () => {
    const rawPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'What is the capital of France?' },
      ],
    };

    const result = await processIncomingRequest(
      '/v1/chat/completions',
      { 'content-type': 'application/json' },
      rawPayload
    );

    expect(result.tokensCreated.length).toBe(0);
    const parsed = JSON.parse(result.sanitizedBody);
    expect(parsed.messages.length).toBe(1);
    expect(parsed.messages[0].role).toBe('user');
    expect(parsed.messages[0].content).toBe('What is the capital of France?');
  });

  it('injects hint into OpenAI system message when PII tokens are generated', async () => {
    const rawPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Send payment to satoshi.nakamoto@bitcoin.org now.' },
      ],
    };

    const result = await processIncomingRequest(
      '/v1/chat/completions',
      { 'content-type': 'application/json' },
      rawPayload
    );

    expect(result.tokensCreated.length).toBeGreaterThan(0);
    const parsed = JSON.parse(result.sanitizedBody);
    // Should have created a system message directive at index 0
    expect(parsed.messages.length).toBe(2);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[0].content).toContain('[Proxy Directive:');
    expect(parsed.messages[1].role).toBe('user');
  });

  it('appends hint to existing OpenAI system message', async () => {
    const rawPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: 'Contact Alice Walker at alice@company.com.' },
      ],
    };

    const result = await processIncomingRequest(
      '/v1/chat/completions',
      { 'content-type': 'application/json' },
      rawPayload
    );

    const parsed = JSON.parse(result.sanitizedBody);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[0].content).toContain('You are a helpful coding assistant.');
    expect(parsed.messages[0].content).toContain('[Proxy Directive:');
  });

  it('injects hint into Anthropic system parameter', async () => {
    const rawPayload = {
      model: 'claude-3-5-sonnet-20241022',
      system: 'You are a finance assistant.',
      messages: [
        { role: 'user', content: 'Transfer funds to 0x71C8F794B32145429631994304244a1234567890.' },
      ],
    };

    const result = await processIncomingRequest(
      '/v1/messages',
      { 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      rawPayload
    );

    const parsed = JSON.parse(result.sanitizedBody);
    expect(parsed.system).toContain('You are a finance assistant.');
    expect(parsed.system).toContain('[Proxy Directive:');
  });

  it('respects disabled preservation hint in settings', async () => {
    upstreamStore.updateSettings({
      injectPreservationHint: false,
    });

    const rawPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Reach out to test@example.com.' },
      ],
    };

    const result = await processIncomingRequest(
      '/v1/chat/completions',
      { 'content-type': 'application/json' },
      rawPayload
    );

    expect(result.tokensCreated.length).toBeGreaterThan(0);
    const parsed = JSON.parse(result.sanitizedBody);
    expect(parsed.messages.length).toBe(1);
    expect(parsed.messages[0].role).toBe('user');
  });
});

