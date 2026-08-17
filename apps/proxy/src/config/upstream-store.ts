import { UpstreamProvider, UpstreamSettings, PrivacyMode } from '@ai-privacy-proxy/shared';
import { config } from './index.js';

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
   * Supports:
   * 1. Path-based provider routing: /p/:providerId/v1/... or /provider/:providerId/...
   * 2. Header-based provider routing: x-upstream-provider / x-provider
   * 3. Explicit base URL header override: x-upstream-base-url
   * 4. Default provider fallback
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

    // 2. If not matched by path, check explicit base URL header override
    if (!targetBaseUrl) {
      const explicitUrlHeader = headers['x-upstream-base-url'];
      if (typeof explicitUrlHeader === 'string' && explicitUrlHeader.trim()) {
        targetBaseUrl = explicitUrlHeader.trim();
      }
    }

    // 3. Check provider ID header (e.g. x-upstream-provider: 9router or x-provider: 9router)
    if (!targetBaseUrl) {
      const providerHeader = headers['x-upstream-provider'] || headers['x-provider'];
      if (typeof providerHeader === 'string' && providerHeader.trim()) {
        const p = this.providers.get(providerHeader.trim().toLowerCase());
        if (p && p.baseUrl) {
          targetBaseUrl = p.baseUrl;
        }
      }
    }

    // 4. Fall back to current default provider or config
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
        this.providers.set(p.id, { ...p, isDefault: p.id === (newSettings.defaultProviderId || this.defaultProviderId) });
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
    } else if (newSettings.upstreamBaseUrl) {
      const defaultProv = this.providers.get(this.defaultProviderId);
      if (defaultProv) {
        defaultProv.baseUrl = newSettings.upstreamBaseUrl;
      }
      config.UPSTREAM_BASE_URL = newSettings.upstreamBaseUrl;
    }
  }

  addOrUpdateProvider(provider: UpstreamProvider) {
    if (provider.isDefault) {
      this.defaultProviderId = provider.id;
      for (const p of this.providers.values()) {
        p.isDefault = false;
      }
      config.UPSTREAM_BASE_URL = provider.baseUrl;
    }
    this.providers.set(provider.id, { ...provider });
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
