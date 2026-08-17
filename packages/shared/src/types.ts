import { z } from 'zod';

export type PrivacyAction = 'TOKENIZE' | 'REDACT' | 'BLOCK' | 'PASS';

export interface PresidioEntity {
  entity_type: string;
  start: number;
  end: number;
  score: number;
}

export interface EntityPolicy {
  entityType: string;
  action: PrivacyAction;
  minScore: number;
}

export interface TokenEntry {
  token: string;
  originalValue: string;
  entityType: string;
}

export interface TokenizeResult {
  sanitizedText: string;
  mappings: TokenEntry[];
  blocked: boolean;
  blockedEntities?: string[] | undefined;
}

export interface StreamKeyInfo {
  requestId: string;
  choiceIndex: number;
  blockIndex: number;
  fieldPath: string;
}

export interface MetricsSummary {
  totalRequests: number;
  blockedRequests: number;
  tokensGenerated: number;
  tokensRestored: number;
  activeStreams: number;
  presidioLatencyMs: number;
  vaultLatencyMs: number;
  upstreamLatencyMs: number;
  proxyLatencyMs: number;
  entityBreakdown: Record<string, number>;
  status: {
    proxy: 'healthy' | 'degraded' | 'down';
    presidio: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
  };
}

export interface ActiveSession {
  sessionId: string;
  tokenCount: number;
  createdAt: number;
  expiresAt: number;
  ttlSecondsRemaining: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  requestId: string;
  sessionId: string;
  action: PrivacyAction;
  entitiesDetected: string[];
  entityCount: number;
  clientIp?: string | undefined;
  path: string;
  upstreamStatus?: number | undefined;
}

export interface UpstreamProvider {
  id: string;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  description?: string | undefined;
}

export interface UpstreamSettings {
  defaultProviderId: string;
  upstreamBaseUrl: string;
  privacyMode: 'strict' | 'balanced';
  vaultTtlSeconds: number;
  hasCustomKey: boolean;
  providers: UpstreamProvider[];
}

export interface CustomRecognizerConfig {
  id?: string | undefined;
  name: string;
  entityType: string;
  pattern: string;
  score: number;
  enabled: boolean;
}

export const EntityPolicySchema = z.object({
  entityType: z.string(),
  action: z.enum(['TOKENIZE', 'REDACT', 'BLOCK', 'PASS']),
  minScore: z.number().min(0).max(1).default(0.7),
});

export const CustomRecognizerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  entityType: z.string().min(1),
  pattern: z.string().min(1),
  score: z.number().min(0).max(1).default(0.85),
  enabled: z.boolean().default(true),
});
