import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  UPSTREAM_BASE_URL: z.string().default('https://api.openai.com'),
  PRESIDIO_URL: z.string().default('http://localhost:5000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PRIVACY_MODE: z.enum(['strict', 'balanced']).default('strict'),
  VAULT_TTL_SECONDS: z.coerce.number().default(3600),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ADMIN_API_KEY: z.string().default('admin-secret-key-change-me'),
});

export type Config = z.infer<typeof ConfigSchema>;

let currentConfig: Config;
try {
  currentConfig = ConfigSchema.parse(process.env);
} catch (err) {
  console.warn('Config validation warning, falling back to defaults with process.env values:', err);
  currentConfig = ConfigSchema.parse({
    PORT: process.env['PORT'] || 8080,
    HOST: process.env['HOST'] || '0.0.0.0',
    UPSTREAM_BASE_URL: process.env['UPSTREAM_BASE_URL'] || 'https://api.openai.com',
    PRESIDIO_URL: process.env['PRESIDIO_URL'] || 'http://localhost:5000',
    REDIS_URL: process.env['REDIS_URL'] || 'redis://localhost:6379',
    PRIVACY_MODE: process.env['PRIVACY_MODE'] || 'strict',
    VAULT_TTL_SECONDS: process.env['VAULT_TTL_SECONDS'] || 3600,
    LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
    ADMIN_API_KEY: process.env['ADMIN_API_KEY'] || 'admin-secret-key-change-me',
  });
}

export const config = currentConfig;

export function updateUpstreamConfig(newUrl: string, privacyMode?: 'strict' | 'balanced', ttl?: number) {
  if (newUrl) config.UPSTREAM_BASE_URL = newUrl;
  if (privacyMode) config.PRIVACY_MODE = privacyMode;
  if (ttl) config.VAULT_TTL_SECONDS = ttl;
}
