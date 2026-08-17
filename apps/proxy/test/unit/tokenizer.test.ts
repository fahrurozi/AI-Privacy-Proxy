import { describe, it, expect, beforeEach } from 'vitest';
import { tokenizeText } from '../../src/privacy/tokenizer.js';
import { PolicyEngine } from '../../src/privacy/policy-engine.js';
import { RedisTokenVault } from '../../src/vault/redis-vault.js';
import { analyzeTextWithFallback } from '../../src/presidio/client.js';

describe('Tokenizer & Policy Engine', () => {
  let policyEngine: PolicyEngine;
  let vault: RedisTokenVault;
  const sessionId = 'test-session-001';

  beforeEach(() => {
    policyEngine = new PolicyEngine();
    vault = new RedisTokenVault('redis://localhost:9999');
  });

  it('should tokenize email addresses and phone numbers', async () => {
    const text = 'Please reach out to john.doe@example.com or call +1-555-0199.';
    const entities = await analyzeTextWithFallback(text);

    const result = await tokenizeText(text, entities, policyEngine, vault, sessionId);

    expect(result.blocked).toBe(false);
    expect(result.sanitizedText).not.toContain('john.doe@example.com');
    expect(result.sanitizedText).not.toContain('+1-555-0199');
    expect(result.mappings.length).toBeGreaterThanOrEqual(1);
  });

  it('should block requests containing sensitive API keys or private keys', async () => {
    const text = 'Here is my OpenAI API key: sk-abc12345678901234567890xyz';
    const entities = await analyzeTextWithFallback(text);

    const result = await tokenizeText(text, entities, policyEngine, vault, sessionId);

    expect(result.blocked).toBe(true);
    expect(result.blockedEntities).toContain('API_KEY');
    expect(result.sanitizedText).toBe('');
  });

  it('should redact credit cards with [REDACTED]', async () => {
    const text = 'Payment with card 4532-1234-5678-9010.';
    const entities = await analyzeTextWithFallback(text);

    const result = await tokenizeText(text, entities, policyEngine, vault, sessionId);

    expect(result.blocked).toBe(false);
    expect(result.sanitizedText).toContain('[REDACTED]');
    expect(result.sanitizedText).not.toContain('4532-1234-5678-9010');
  });

  it('should generate identical tokens for identical entities within same session', async () => {
    const text = 'Transfer from 0x71C8F794B32145429631994304244a1234567890 to 0x71C8F794B32145429631994304244a1234567890 now.';
    const entities = await analyzeTextWithFallback(text);

    const result = await tokenizeText(text, entities, policyEngine, vault, sessionId);

    expect(result.blocked).toBe(false);
    const tokens = result.mappings.map((m) => m.token);
    expect(tokens[0]).toBe(tokens[1]);
  });
});
