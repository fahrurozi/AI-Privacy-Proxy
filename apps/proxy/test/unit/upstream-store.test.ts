import { describe, it, expect } from 'vitest';
import { upstreamStore } from '../../src/config/upstream-store.js';

describe('UpstreamStore & Multi-Provider Routing', () => {
  it('should resolve default provider base URL when no special headers are sent', () => {
    const target = upstreamStore.resolveTargetBaseUrl({});
    expect(target).toBeTruthy();
    expect(target.startsWith('http')).toBe(true);
  });

  it('should resolve specific provider by X-Upstream-Provider header', () => {
    const targetAnthropic = upstreamStore.resolveTargetBaseUrl({
      'x-upstream-provider': 'anthropic',
    });
    expect(targetAnthropic).toBe('https://api.anthropic.com');

    const targetOpenAI = upstreamStore.resolveTargetBaseUrl({
      'x-upstream-provider': 'openai',
    });
    expect(targetOpenAI).toBe('https://api.openai.com');
  });

  it('should allow direct override via X-Upstream-Base-Url header', () => {
    const targetCustom = upstreamStore.resolveTargetBaseUrl({
      'x-upstream-base-url': 'https://my-custom-router.internal.net/v1',
    });
    expect(targetCustom).toBe('https://my-custom-router.internal.net/v1');
  });

  it('should dynamically switch default provider via updateSettings', () => {
    upstreamStore.updateSettings({ defaultProviderId: 'openrouter' });
    const target = upstreamStore.resolveTargetBaseUrl({});
    expect(target).toBe('https://openrouter.ai/api');
  });

  it('should dynamically update privacy mode and vault ttl', () => {
    upstreamStore.updateSettings({ privacyMode: 'balanced', vaultTtlSeconds: 7200 });
    expect(upstreamStore.getPrivacyMode()).toBe('balanced');
    expect(upstreamStore.getVaultTtl()).toBe(7200);
  });
});
