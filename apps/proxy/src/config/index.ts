import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { PrivacyMode } from '@ai-privacy-proxy/shared';

// Automatically load .env file if present in workspace or proxy dir
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env'),
];

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
      break;
    } catch {}
  }
}

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  UPSTREAM_BASE_URL: z.string().default('https://api.openai.com'),
  PRESIDIO_URL: z.string().default('http://localhost:5000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PRIVACY_MODE: z.enum(['strict', 'balanced', 'bypass']).default('strict'),
  VAULT_TTL_SECONDS: z.coerce.number().default(3600),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ADMIN_API_KEY: z.string().default('admin-secret-key-change-me'),
  ALLOWED_ORIGINS: z.string().default(''),
  INJECT_PRESERVATION_HINT: z.preprocess(
    (val) => (val === undefined ? true : val === 'true' || val === true || val === '1'),
    z.boolean()
  ).default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

let currentConfig: Config;
try {
  currentConfig = ConfigSchema.parse(process.env);
} catch (err) {
  console.warn('Config validation warning, falling back to defaults with process.env values:', err);
  const rawMode = process.env['PRIVACY_MODE'];
  const validMode: PrivacyMode = (rawMode === 'strict' || rawMode === 'balanced' || rawMode === 'bypass') ? rawMode : 'strict';

  currentConfig = ConfigSchema.parse({
    PORT: process.env['PORT'] || 8080,
    HOST: process.env['HOST'] || '0.0.0.0',
    UPSTREAM_BASE_URL: process.env['UPSTREAM_BASE_URL'] || 'https://api.openai.com',
    PRESIDIO_URL: process.env['PRESIDIO_URL'] || 'http://localhost:5000',
    REDIS_URL: process.env['REDIS_URL'] || 'redis://localhost:6379',
    PRIVACY_MODE: validMode,
    VAULT_TTL_SECONDS: process.env['VAULT_TTL_SECONDS'] || 3600,
    LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
    ADMIN_API_KEY: process.env['ADMIN_API_KEY'] || 'admin-secret-key-change-me',
    ALLOWED_ORIGINS: process.env['ALLOWED_ORIGINS'] || '',
  });
}

// Security Warning: Log recommendation if default key is still active
if (currentConfig.ADMIN_API_KEY === 'admin-secret-key-change-me') {
  console.warn(`\n⚠️  [SECURITY NOTICE] Using default ADMIN_API_KEY ("admin-secret-key-change-me"). Remember to customize this in .env for production environments.\n`);
}

export const config = currentConfig;

export function updateUpstreamConfig(newUrl: string, privacyMode?: PrivacyMode, ttl?: number) {
  if (newUrl) config.UPSTREAM_BASE_URL = newUrl;
  if (privacyMode) config.PRIVACY_MODE = privacyMode;
  if (ttl) config.VAULT_TTL_SECONDS = ttl;
}
