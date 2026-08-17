import { UpstreamProvider, UpstreamSettings, PrivacyMode } from '@ai-privacy-proxy/shared';
import { config } from './index.js';

const DISALLOWED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS/GCP/Azure Instance Metadata
  'instance-data',
  '[::1]',
]);

/**
 * Validates upstream URL to protect against Server-Side Request Forgery (SSRF).
 */
export function isSafeUpstreamUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Allow localhost only if explicitly configured in local dev environment
    if (process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV']) {
      if (hostname === '169.254.169.254') return false; // Never allow cloud metadata
      return true;
    }

    // In production, block all loopback, link-local, and metadata addresses
    if (DISALLOWED_HOSTNAMES.has(hostname)) {
      return false;
    }

    // Block private IPv4 ranges (10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x, 169.254.x.x)
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

class UpstreamStore {
  private providers: Map<string, UpstreamProvider> = new Map();
  private defaultProviderId = 'default';
  private privacyMode: PrivacyMode = config.PRIVACY_MODE;
  private vaultTtlSeconds: number = config.VAULT_TTL_SECONDS;

  constructor() {
    this.initDefaultProviders();
  }

  private initDefaultProviders() {
    const envBaseUrl = config.UPSTREAM_BASE_URL || 'https://api.openai.com';

    this.providers.set('default', {
      id: 'default',
      name: 'Primary Upstream (Configured)',
      baseUrl: envBaseUrl,
      isDefault: true,
      description: 'Default target from initial environment configuration',
    });

    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI Direct',
      baseUrl: 'https://api.openai.com',
      isDefault: false,
      description: 'Official OpenAI API (v1/chat/completions)',
    });

    this.providers.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic Direct',
      baseUrl: 'https://api.anthropic.com',
      isDefault: false,
      description: 'Official Anthropic API (v1/messages)',
    });

    this.providers.set('openrouter', {
      id: 'openrouter',
      name: 'OpenRouter Gateway',
      baseUrl: 'https://openrouter.ai/api',
      isDefault: false,
      description: 'Unified OpenRouter LLM gateway',
    });
  }

  getSettings(): UpstreamSettings {
    const defaultProv = this.providers.get(this.defaultProviderId) || Array.from(this.providers.values())[0];
    const currentBaseUrl = defaultProv ? defaultProv.baseUrl : config.UPSTREAM_BASE_URL;

    return {
      defaultProviderId: this.defaultProviderId,
      upstreamBaseUrl: currentBaseUrl,
      privacyMode: this.privacyMode,
      vaultTtlSeconds: this.vaultTtlSeconds,
      hasCustomKey: Boolean(config.ADMIN_API_KEY),
      providers: Array.from(this.providers.values()),
    };
  }

  getProvider(id: string): UpstreamProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  /**
   * Resolves the target upstream base URL and normalizes the target path.
   * Securely maps requests ONLY to registered, validated upstream providers.
   * (Mitigates SEC-001 SSRF by removing unauthenticated arbitrary raw URL headers)
   */
  resolveTarget(
    headers: Record<string, string | string[] | undefined>,
    rawPath: string = '/',
  ): { targetBaseUrl: string; targetPath: string } {
    let cleanPath = rawPath.split('?')[0] || '/';
    let targetBaseUrl = '';

    // 1. Check path prefix: /p/:providerId/... or /provider/:providerId/...
    const pathPrefixMatch = cleanPath.match(/^\/(?:p|provider)\/([a-zA-Z0-9_-]+)(\/.*)?$/i);
    if (pathPrefixMatch) {
      const providerId = pathPrefixMatch[1]?.toLowerCase();
      cleanPath = pathPrefixMatch[2] || '/';
      if (providerId && this.providers.has(providerId)) {
        targetBaseUrl = this.providers.get(providerId)!.baseUrl;
      }
    }

    // 2. Check provider ID header (e.g. x-upstream-provider: 9router or x-provider: 9router)
    if (!targetBaseUrl) {
      const providerHeader = headers['x-upstream-provider'] || headers['x-provider'];
      if (typeof providerHeader === 'string' && providerHeader.trim()) {
        const p = this.providers.get(providerHeader.trim().toLowerCase());
        if (p && p.baseUrl) {
          targetBaseUrl = p.baseUrl;
        }
      }
    }

    // 3. Fall back to configured default provider
    if (!targetBaseUrl) {
      const defaultProv = this.providers.get(this.defaultProviderId);
      targetBaseUrl = defaultProv?.baseUrl || config.UPSTREAM_BASE_URL || 'https://api.openai.com';
    }

    targetBaseUrl = targetBaseUrl.replace(/\/+$/, '');

    // Normalize duplicate /v1 if provider baseUrl already ends with /v1
    if (targetBaseUrl.endsWith('/v1') && cleanPath.startsWith('/v1/')) {
      cleanPath = cleanPath.slice(3);
    }

    // Preserve query parameters if any
    const queryIndex = rawPath.indexOf('?');
    if (queryIndex !== -1) {
      cleanPath += rawPath.slice(queryIndex);
    }

    return { targetBaseUrl, targetPath: cleanPath };
  }

  resolveTargetBaseUrl(headers: Record<string, string | string[] | undefined>): string {
    return this.resolveTarget(headers, '/').targetBaseUrl;
  }

  getPrivacyMode(): PrivacyMode {
    return this.privacyMode;
  }

  getVaultTtl(): number {
    return this.vaultTtlSeconds;
  }

  updateSettings(newSettings: {
    defaultProviderId?: string;
    upstreamBaseUrl?: string;
    privacyMode?: PrivacyMode;
    vaultTtlSeconds?: number;
    providers?: UpstreamProvider[];
  }) {
    if (newSettings.privacyMode) {
      this.privacyMode = newSettings.privacyMode;
      config.PRIVACY_MODE = newSettings.privacyMode;
    }

    if (newSettings.vaultTtlSeconds && newSettings.vaultTtlSeconds >= 10) {
      this.vaultTtlSeconds = newSettings.vaultTtlSeconds;
      config.VAULT_TTL_SECONDS = newSettings.vaultTtlSeconds;
    }

    if (newSettings.providers && Array.isArray(newSettings.providers)) {
      this.providers.clear();
      for (const p of newSettings.providers) {
        if (isSafeUpstreamUrl(p.baseUrl)) {
          this.providers.set(p.id, { ...p, isDefault: p.id === (newSettings.defaultProviderId || this.defaultProviderId) });
        }
      }
    }

    if (newSettings.defaultProviderId && this.providers.has(newSettings.defaultProviderId)) {
      this.defaultProviderId = newSettings.defaultProviderId;
      for (const [id, p] of this.providers.entries()) {
        p.isDefault = id === this.defaultProviderId;
      }
      const active = this.providers.get(this.defaultProviderId);
      if (active) {
        config.UPSTREAM_BASE_URL = active.baseUrl;
      }
    } else if (newSettings.upstreamBaseUrl && isSafeUpstreamUrl(newSettings.upstreamBaseUrl)) {
      const defaultProv = this.providers.get(this.defaultProviderId);
      if (defaultProv) {
        defaultProv.baseUrl = newSettings.upstreamBaseUrl;
      }
      config.UPSTREAM_BASE_URL = newSettings.upstreamBaseUrl;
    }
  }

  addOrUpdateProvider(provider: UpstreamProvider): boolean {
    if (!isSafeUpstreamUrl(provider.baseUrl)) {
      return false;
    }

    if (provider.isDefault) {
      this.defaultProviderId = provider.id;
      for (const p of this.providers.values()) {
        p.isDefault = false;
      }
      config.UPSTREAM_BASE_URL = provider.baseUrl;
    }
    this.providers.set(provider.id, { ...provider });
    return true;
  }

  deleteProvider(id: string): boolean {
    if (this.providers.size <= 1) return false;
    const wasDefault = this.defaultProviderId === id;
    this.providers.delete(id);
    if (wasDefault) {
      const first = Array.from(this.providers.values())[0];
      if (first) {
        this.defaultProviderId = first.id;
        first.isDefault = true;
        config.UPSTREAM_BASE_URL = first.baseUrl;
      }
    }
    return true;
  }
}

export const upstreamStore = new UpstreamStore();
