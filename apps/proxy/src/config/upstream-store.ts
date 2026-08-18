import fs from 'fs';
import path from 'path';
import { UpstreamProvider, UpstreamSettings, PrivacyMode } from '@ai-privacy-proxy/shared';
import { config } from './index.js';
import { vault } from '../vault/redis-vault.js';

const DISALLOWED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'instance-data',
  '[::1]',
]);

export function isSafeUpstreamUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV']) {
      if (hostname === '169.254.169.254') return false;
      return true;
    }

    if (DISALLOWED_HOSTNAMES.has(hostname)) {
      return false;
    }

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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');

class UpstreamStore {
  private providers: Map<string, UpstreamProvider> = new Map();
  private defaultProviderId = 'openai';
  private privacyMode: PrivacyMode = config.PRIVACY_MODE;
  private vaultTtlSeconds: number = config.VAULT_TTL_SECONDS;
  private injectPreservationHint: boolean = config.INJECT_PRESERVATION_HINT !== false;
  private customPreservationHint?: string;

  constructor() {
    this.initDefaultProviders();
    this.loadFromDisk();
  }

  private initDefaultProviders() {
    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI Direct',
      baseUrl: 'https://api.openai.com',
      isDefault: true,
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

  private loadFromDisk() {
    try {
      if (fs.existsSync(PROVIDERS_FILE)) {
        const raw = fs.readFileSync(PROVIDERS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.applySavedData(data);
      }
    } catch {}
  }

  private applySavedData(data: any) {
    if (data && Array.isArray(data.providers)) {
      this.providers.clear();
      for (const p of data.providers) {
        this.providers.set(p.id, p);
      }
      if (data.defaultProviderId && this.providers.has(data.defaultProviderId)) {
        this.defaultProviderId = data.defaultProviderId;
      }
      if (data.privacyMode) {
        this.privacyMode = data.privacyMode;
        config.PRIVACY_MODE = data.privacyMode;
      }
      if (data.vaultTtlSeconds) {
        this.vaultTtlSeconds = data.vaultTtlSeconds;
        config.VAULT_TTL_SECONDS = data.vaultTtlSeconds;
      }
      if (typeof data.injectPreservationHint === 'boolean') {
        this.injectPreservationHint = data.injectPreservationHint;
      } else {
        this.injectPreservationHint = true;
      }
      if (typeof data.customPreservationHint === 'string') {
        this.customPreservationHint = data.customPreservationHint;
      }
    }
  }

  async initFromStorage(vaultInstance?: any) {
    if (vaultInstance) {
      try {
        const data = await vaultInstance.loadConfig('privacy:v1:system:providers');
        if (data) {
          this.applySavedData(data);
          await this.persist(vaultInstance);
          return;
        }
      } catch {}
    }
    this.loadFromDisk();
    if (vaultInstance) {
      try {
        await this.persist(vaultInstance);
      } catch {}
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        defaultProviderId: this.defaultProviderId,
        privacyMode: this.privacyMode,
        vaultTtlSeconds: this.vaultTtlSeconds,
        injectPreservationHint: this.injectPreservationHint,
        customPreservationHint: this.customPreservationHint,
        providers: Array.from(this.providers.values()),
      };
      fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  }

  async persist(vaultInstance?: any) {
    this.saveToDisk();
    if (vaultInstance) {
      try {
        const data = {
          defaultProviderId: this.defaultProviderId,
          privacyMode: this.privacyMode,
          vaultTtlSeconds: this.vaultTtlSeconds,
          injectPreservationHint: this.injectPreservationHint,
          customPreservationHint: this.customPreservationHint,
          providers: Array.from(this.providers.values()),
        };
        await vaultInstance.saveConfig('privacy:v1:system:providers', data);
      } catch {}
    }
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
      injectPreservationHint: this.injectPreservationHint,
      customPreservationHint: this.customPreservationHint,
    };
  }

  getProvider(id: string): UpstreamProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  isPreservationHintEnabled(): boolean {
    return this.injectPreservationHint;
  }

  getPreservationHintText(): string {
    if (this.customPreservationHint && this.customPreservationHint.trim()) {
      return this.customPreservationHint.trim();
    }
    return 'IMPORTANT: Bracketed tokens like [PREFIX:*] and masked strings (e.g. s***i@domain.com, 0x1234...abcd, ****-1234) are literal variables. Preserve them verbatim in your response without modifying, guessing, or replacing them.';
  }

  resolveTarget(
    headers: Record<string, string | string[] | undefined>,
    rawPath: string = '/',
  ): { targetBaseUrl: string; targetPath: string } {
    let cleanPath = rawPath.split('?')[0] || '/';
    let targetBaseUrl = '';

    const pathPrefixMatch = cleanPath.match(/^\/(?:p|provider)\/([a-zA-Z0-9_-]+)(\/.*)?$/i);
    if (pathPrefixMatch) {
      const providerId = pathPrefixMatch[1]?.toLowerCase();
      cleanPath = pathPrefixMatch[2] || '/';
      if (providerId && this.providers.has(providerId)) {
        targetBaseUrl = this.providers.get(providerId)!.baseUrl;
      }
    }

    if (!targetBaseUrl) {
      const providerHeader = headers['x-upstream-provider'] || headers['x-provider'];
      if (typeof providerHeader === 'string' && providerHeader.trim()) {
        const p = this.providers.get(providerHeader.trim().toLowerCase());
        if (p && p.baseUrl) {
          targetBaseUrl = p.baseUrl;
        }
      }
    }

    if (!targetBaseUrl) {
      const defaultProv = this.providers.get(this.defaultProviderId);
      targetBaseUrl = defaultProv?.baseUrl || config.UPSTREAM_BASE_URL || 'https://api.openai.com';
    }

    targetBaseUrl = targetBaseUrl.replace(/\/+$/, '');

    if (targetBaseUrl.endsWith('/v1') && cleanPath.startsWith('/v1/')) {
      cleanPath = cleanPath.slice(3);
    }

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
    injectPreservationHint?: boolean;
    customPreservationHint?: string;
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

    if (typeof newSettings.injectPreservationHint === 'boolean') {
      this.injectPreservationHint = newSettings.injectPreservationHint;
    }

    if (typeof newSettings.customPreservationHint === 'string') {
      this.customPreservationHint = newSettings.customPreservationHint;
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

    this.persist(vault);
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
    this.persist(vault);
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
    this.persist(vault);
    return true;
  }
}

export const upstreamStore = new UpstreamStore();
