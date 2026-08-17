import { describe, it, expect } from 'vitest';
import { upstreamStore, isSafeUpstreamUrl } from '../../src/config/upstream-store.js';

describe('UpstreamStore & Multi-Provider Routing', () => {
  it('should resolve default provider base URL when no special headers are sent', () => {
    const target = upstreamStore.resolveTargetBaseUrl({});
    expect(target).toBeTruthy();
    expect(target.startsWith('http')).toBe(true);
  });

  it('should resolve specific provider by path /p/:providerId/v1/...', () => {
    const resultAnthropic = upstreamStore.resolveTarget({}, '/p/anthropic/v1/messages');
    expect(resultAnthropic.targetBaseUrl).toBe('https://api.anthropic.com');
    expect(resultAnthropic.targetPath).toBe('/v1/messages');

    const resultOpenAI = upstreamStore.resolveTarget({}, '/p/openai/v1/chat/completions');
    expect(resultOpenAI.targetBaseUrl).toBe('https://api.openai.com');
    expect(resultOpenAI.targetPath).toBe('/v1/chat/completions');
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

  it('should block unsafe cloud metadata addresses in isSafeUpstreamUrl (SSRF mitigation)', () => {
    expect(isSafeUpstreamUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafeUpstreamUrl('ftp://example.com/api')).toBe(false);
    expect(isSafeUpstreamUrl('https://api.openai.com/v1')).toBe(true);
    expect(isSafeUpstreamUrl('http://9router.mfahrurozi.my.id/api/v1')).toBe(true);
  });

  it('should dynamically switch default provider via updateSettings', () => {
    upstreamStore.updateSettings({ defaultProviderId: 'openrouter' });
    const target = upstreamStore.resolveTargetBaseUrl({});
    expect(target).toBe('https://openrouter.ai/api');
  });

  it('should dynamically update privacy mode to bypass, strict, or balanced', () => {
    upstreamStore.updateSettings({ privacyMode: 'bypass', vaultTtlSeconds: 7200 });
    expect(upstreamStore.getPrivacyMode()).toBe('bypass');
    expect(upstreamStore.getVaultTtl()).toBe(7200);

    upstreamStore.updateSettings({ privacyMode: 'strict' });
    expect(upstreamStore.getPrivacyMode()).toBe('strict');
  });
});
