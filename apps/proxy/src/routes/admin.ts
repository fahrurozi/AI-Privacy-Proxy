import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual, createHash } from 'crypto';
import {
  MetricsSummary,
  AuditEvent,
  CustomRecognizerConfig,
  EntityPolicy,
  UpstreamProvider,
  PrivacyMode,
} from '@ai-privacy-proxy/shared';
import { config } from '../config/index.js';
import { policyRegistry } from '../config/policy.js';
import { upstreamStore, isSafeUpstreamUrl } from '../config/upstream-store.js';
import { vault } from '../vault/redis-vault.js';
import { checkPresidioHealth, analyzeText } from '../presidio/client.js';
import { maskValue } from '../privacy/tokenizer.js';
import { streamStateManager } from '../streaming/stream-state.js';

export class AdminMetricsTracker {
  totalRequests = 0;
  blockedRequests = 0;
  tokensGenerated = 0;
  tokensRestored = 0;
  entityCounts: Record<string, number> = {};
  auditLogs: AuditEvent[] = [];
  presidioLatencies: number[] = [];
  proxyLatencies: number[] = [];

  recordRequest(event: {
    requestId: string;
    sessionId: string;
    action: 'TOKENIZE' | 'MASK' | 'REDACT' | 'BLOCK' | 'PASS';
    entitiesDetected: string[];
    tokensCount: number;
    presidioLatencyMs: number;
    proxyLatencyMs: number;
    path: string;
    upstreamStatus?: number | undefined;
    clientIp?: string | undefined;
    providerId?: string | undefined;
    llmLatencyMs?: number | undefined;
  }) {
    this.totalRequests += 1;
    if (event.action === 'BLOCK') {
      this.blockedRequests += 1;
    }
    this.tokensGenerated += event.tokensCount;

    // Deduplicate entities before counting / storing
    const uniqueEntities = Array.from(new Set(event.entitiesDetected));

    for (const ent of uniqueEntities) {
      this.entityCounts[ent] = (this.entityCounts[ent] || 0) + 1;
    }

    if (event.presidioLatencyMs > 0) {
      this.presidioLatencies.push(event.presidioLatencyMs);
      if (this.presidioLatencies.length > 100) this.presidioLatencies.shift();
    }

    if (event.proxyLatencyMs > 0) {
      this.proxyLatencies.push(event.proxyLatencyMs);
      if (this.proxyLatencies.length > 100) this.proxyLatencies.shift();
    }

    // Compute timing breakdown:
    // llmLatencyMs = proxyLatencyMs - presidioLatencyMs - proxy overhead
    // proxyOverheadMs = presidioLatencyMs + tokenization overhead (~5ms)
    const llmLatencyMs = event.llmLatencyMs ?? Math.max(0, event.proxyLatencyMs - event.presidioLatencyMs - 10);
    const proxyOverheadMs = Math.max(0, event.proxyLatencyMs - llmLatencyMs);

    this.auditLogs.unshift({
      id: event.requestId,
      timestamp: Date.now(),
      requestId: event.requestId,
      sessionId: event.sessionId,
      action: event.action,
      entitiesDetected: uniqueEntities,
      entityCount: uniqueEntities.length,
      path: event.path,
      clientIp: event.clientIp,
      upstreamStatus: event.upstreamStatus,
      providerId: event.providerId,
      presidioLatencyMs: event.presidioLatencyMs,
      llmLatencyMs,
      proxyOverheadMs,
      totalLatencyMs: event.proxyLatencyMs,
    });

    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  async getSummary(startDate?: string, endDate?: string): Promise<MetricsSummary> {
    const [redisOk, presidioOk] = await Promise.all([
      vault.ping(),
      checkPresidioHealth(),
    ]);

    let filteredLogs = this.auditLogs;
    if (startDate || endDate) {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(endDate).getTime() : Infinity;
      filteredLogs = this.auditLogs.filter((log) => {
        const t = new Date(log.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    // If date filters applied, compute metrics specifically for that timeframe
    let totalRequests = this.totalRequests;
    let blockedRequests = this.blockedRequests;
    let tokensGenerated = this.tokensGenerated;
    let tokensRestored = this.tokensRestored;
    let entityCounts = { ...this.entityCounts };
    let presidioLatencies = this.presidioLatencies;
    let proxyLatencies = this.proxyLatencies;

    if (startDate || endDate) {
      totalRequests = filteredLogs.length;
      blockedRequests = filteredLogs.filter((l) => l.action === 'BLOCK').length;
      tokensGenerated = filteredLogs.reduce((acc, l) => acc + (l.action === 'TOKENIZE' || l.action === 'MASK' ? l.entitiesDetected.length : 0), 0);
      tokensRestored = filteredLogs.reduce((acc, l) => acc + (l.action === 'TOKENIZE' || l.action === 'MASK' ? l.entitiesDetected.length : 0), 0);

      entityCounts = {};
      const presidioLats: number[] = [];
      const proxyLats: number[] = [];
      for (const log of filteredLogs) {
        for (const ent of log.entitiesDetected || []) {
          entityCounts[ent] = (entityCounts[ent] || 0) + 1;
        }
        if (log.presidioLatencyMs !== undefined && log.presidioLatencyMs > 0) {
          presidioLats.push(log.presidioLatencyMs);
        }
        if (log.proxyOverheadMs !== undefined) {
          proxyLats.push(log.proxyOverheadMs);
        }
      }
      presidioLatencies = presidioLats;
      proxyLatencies = proxyLats;
    }

    const avgPresidio =
      presidioLatencies.length > 0
        ? Math.round(presidioLatencies.reduce((a, b) => a + b, 0) / presidioLatencies.length)
        : 0;

    const avgProxy =
      proxyLatencies.length > 0
        ? Math.round(proxyLatencies.reduce((a, b) => a + b, 0) / proxyLatencies.length)
        : 0;

    return {
      totalRequests,
      blockedRequests,
      tokensGenerated,
      tokensRestored,
      activeStreams: streamStateManager.getActiveStreamCount(),
      presidioLatencyMs: avgPresidio,
      vaultLatencyMs: 2,
      upstreamLatencyMs: 120,
      proxyLatencyMs: avgProxy,
      entityBreakdown: entityCounts,
      status: {
        proxy: 'healthy',
        presidio: presidioOk ? 'healthy' : 'down',
        redis: redisOk ? 'healthy' : 'down',
      },
    };
  }
}

import fs from 'fs';
import path from 'path';

export const metricsTracker = new AdminMetricsTracker();
const localCustomRecognizers: Map<string, CustomRecognizerConfig> = new Map();
const loginAttemptMap = new Map<string, { count: number; resetAt: number }>();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RECOGNIZERS_FILE = path.join(DATA_DIR, 'recognizers.json');

try {
  if (fs.existsSync(RECOGNIZERS_FILE)) {
    const raw = fs.readFileSync(RECOGNIZERS_FILE, 'utf-8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      for (const r of list) {
        localCustomRecognizers.set(r.id, r);
      }
    }
  }
} catch {}

function saveRecognizersToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(RECOGNIZERS_FILE, JSON.stringify(Array.from(localCustomRecognizers.values()), null, 2), 'utf-8');
  } catch {}
}

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttemptMap.get(ip);
  if (!record || record.resetAt <= now) {
    loginAttemptMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 10) {
    return false;
  }
  record.count += 1;
  return true;
}

export function constantTimeEquals(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const hashA = createHash('sha256').update(String(a)).digest();
  const hashB = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(hashA, hashB);
}

function verifyAdminAuth(req: FastifyRequest, reply: FastifyReply): boolean {
  const authHeader = req.headers['authorization'];
  let candidateKey = req.headers['x-admin-key'];

  if (!candidateKey && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    candidateKey = authHeader.slice(7).trim();
  }

  const keyString = Array.isArray(candidateKey) ? candidateKey[0] : candidateKey;

  if (!keyString || !constantTimeEquals(keyString, config.ADMIN_API_KEY)) {
    reply.status(401).send({ error: 'unauthorized', message: 'Invalid or missing Admin Authentication Key' });
    return false;
  }
  return true;
}

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/admin/auth/login', async (req, reply) => {
    const clientIp = req.ip || '127.0.0.1';
    if (!checkLoginRateLimit(clientIp)) {
      return reply.status(429).send({
        success: false,
        error: 'rate_limited',
        message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
      });
    }

    const body = req.body as { key?: string; password?: string; adminKey?: string };
    const submittedKey = body?.key || body?.adminKey || body?.password;

    if (!submittedKey || !constantTimeEquals(submittedKey, config.ADMIN_API_KEY)) {
      return reply.status(401).send({
        success: false,
        error: 'invalid_credentials',
        message: 'Invalid Admin Access Key / Password',
      });
    }

    return reply.send({
      success: true,
      token: config.ADMIN_API_KEY,
      user: {
        username: 'admin',
        role: 'Administrator',
      },
      expiresAt: Date.now() + 86400 * 1000 * 7,
    });
  });

  fastify.get('/admin/auth/verify', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    return reply.send({
      authenticated: true,
      user: { username: 'admin', role: 'Administrator' },
    });
  });

  fastify.get('/admin/metrics', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summary = await metricsTracker.getSummary(startDate, endDate);
    return reply.send(summary);
  });

  fastify.get('/admin/metrics/stream', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const interval = setInterval(async () => {
      try {
        const summary = await metricsTracker.getSummary();
        reply.raw.write(`data: ${JSON.stringify(summary)}\n\n`);
      } catch {}
    }, 3000);

    req.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  fastify.get('/admin/sessions', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const sessions = await vault.listSessions();
    return reply.send({ sessions });
  });

  fastify.delete('/admin/sessions/:id', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { id } = req.params as { id: string };
    const success = await vault.deleteSession(id);
    return reply.send({ success, sessionId: id });
  });

  fastify.get('/admin/sessions/:id/tokens', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { id } = req.params as { id: string };
    const tokenMap = await vault.listSessionTokens(id);
    const entries: { token: string; entityType: string; originalValue: string }[] = [];
    for (const [token, originalValue] of tokenMap.entries()) {
      const typeMatch = token.match(/\[(?:[a-zA-Z0-9_-]+:)?([A-Z_]+)_\d{3}\]/);
      let entityType = typeMatch?.[1] || 'UNKNOWN';
      if (entityType === 'UNKNOWN') {
        if (token.includes('@')) entityType = 'EMAIL_ADDRESS';
        else if (token.startsWith('0x')) entityType = 'ETHEREUM_ADDRESS';
        else if (token.includes('****')) entityType = 'CREDIT_CARD';
        else if (token.includes('*')) entityType = 'MASKED_PII';
      }
      entries.push({
        token,
        entityType,
        originalValue,
      });
    }
    return reply.send({ sessionId: id, tokens: entries });
  });

  fastify.get('/admin/policy', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    return reply.send({ policies: policyRegistry.getAllPolicies() });
  });

  fastify.put('/admin/policy', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const body = req.body as { policy?: EntityPolicy; policies?: EntityPolicy[] };
    if (body?.policy) {
      policyRegistry.setPolicy(body.policy);
    } else if (Array.isArray(body?.policies)) {
      for (const p of body.policies) {
        policyRegistry.setPolicy(p);
      }
    }
    return reply.send({ status: 'ok', policies: policyRegistry.getAllPolicies() });
  });

  fastify.post('/admin/policy/simulate', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const body = req.body as { text?: string; policies?: EntityPolicy[] };
    const text = body?.text || '';

    if (!text.trim()) {
      return reply.send({
        transformedText: '',
        detectedEntities: [],
        blocked: false,
        blockedEntities: [],
        presidioLatencyMs: 0,
      });
    }

    const { entities, latencyMs } = await analyzeText(text);
    const policyMap = new Map((body.policies || policyRegistry.getAllPolicies()).map((p) => [p.entityType.toUpperCase(), p]));
    const sorted = [...entities].sort((a, b) => b.start - a.start);
    let transformed = text;
    const detected: Array<{ entityType: string; matchedText: string; action: string }> = [];
    const blockedEntities: string[] = [];
    let isBlocked = false;

    for (const ent of sorted) {
      const match = text.slice(ent.start, ent.end);
      const policy = policyMap.get(ent.entity_type.toUpperCase());
      const action = policy ? policy.action : 'TOKENIZE';
      const enabled = policy ? policy.enabled !== false : true;

      if (!enabled) {
        continue;
      }

      detected.push({
        entityType: ent.entity_type,
        matchedText: match,
        action,
      });

      if (action === 'BLOCK') {
        isBlocked = true;
        blockedEntities.push(ent.entity_type);
      } else if (action === 'REDACT') {
        transformed = transformed.slice(0, ent.start) + `[REDACTED_${ent.entity_type}]` + transformed.slice(ent.end);
      } else if (action === 'MASK') {
        const masked = clientMaskSim(match);
        transformed = transformed.slice(0, ent.start) + masked + transformed.slice(ent.end);
      } else if (action === 'TOKENIZE') {
        transformed = transformed.slice(0, ent.start) + `[PREFIX:${ent.entity_type}_001]` + transformed.slice(ent.end);
      }
    }

    return reply.send({
      transformedText: transformed,
      detectedEntities: detected,
      blocked: isBlocked,
      blockedEntities,
      presidioLatencyMs: latencyMs,
    });
  });

  fastify.get('/admin/recognizers', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    try {
      const res = await fetch(`${config.PRESIDIO_URL}/recognizers`);
      if (res.ok) {
        const data = await res.json();
        return reply.send(data);
      }
    } catch {}
    return reply.send({
      custom: Array.from(localCustomRecognizers.values()),
      registered: [],
    });
  });

  fastify.post('/admin/recognizers', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const item = req.body as CustomRecognizerConfig;
    const id = item.id || `custom_${Date.now()}`;
    localCustomRecognizers.set(id, { ...item, id });
    saveRecognizersToDisk();

    try {
      await fetch(`${config.PRESIDIO_URL}/recognizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch {}

    return reply.send({ status: 'added', id, recognizer: localCustomRecognizers.get(id) });
  });

  fastify.delete('/admin/recognizers/:id', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { id } = req.params as { id: string };
    localCustomRecognizers.delete(id);
    saveRecognizersToDisk();

    try {
      await fetch(`${config.PRESIDIO_URL}/recognizers/${id}`, {
        method: 'DELETE',
      });
    } catch {}

    return reply.send({ status: 'deleted', id });
  });

  fastify.get('/admin/audit', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let logs = metricsTracker.auditLogs;
    if (startDate || endDate) {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(endDate).getTime() : Infinity;
      logs = logs.filter((log) => {
        const t = new Date(log.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
    }
    return reply.send({ events: logs });
  });

  fastify.get('/admin/upstream', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    return reply.send(upstreamStore.getSettings());
  });

  fastify.put('/admin/upstream', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const body = req.body as {
      defaultProviderId?: string;
      upstreamBaseUrl?: string;
      privacyMode?: PrivacyMode;
      vaultTtlSeconds?: number;
      providers?: UpstreamProvider[];
    };

    if (body.upstreamBaseUrl && !isSafeUpstreamUrl(body.upstreamBaseUrl)) {
      return reply.status(400).send({ error: 'invalid_url', message: 'Target upstream URL failed security validation' });
    }

    upstreamStore.updateSettings(body);
    return reply.send({
      status: 'ok',
      settings: upstreamStore.getSettings(),
    });
  });

  fastify.post('/admin/providers', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const provider = req.body as UpstreamProvider;
    if (!provider.id || !provider.baseUrl || !provider.name) {
      return reply.status(400).send({ error: 'invalid_provider', message: 'Missing required provider fields' });
    }

    if (!isSafeUpstreamUrl(provider.baseUrl)) {
      return reply.status(400).send({
        error: 'unsafe_upstream_url',
        message: 'The specified base URL is invalid or targets a disallowed internal address.',
      });
    }

    const added = upstreamStore.addOrUpdateProvider(provider);
    if (!added) {
      return reply.status(400).send({ error: 'unsafe_upstream_url', message: 'The specified URL failed safety validation.' });
    }

    return reply.send({ status: 'ok', provider, settings: upstreamStore.getSettings() });
  });

  fastify.put('/admin/providers/:id', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { id } = req.params as { id: string };
    const provider = req.body as UpstreamProvider;
    if (!provider.baseUrl || !provider.name) {
      return reply.status(400).send({ error: 'invalid_provider', message: 'Missing required provider fields' });
    }

    if (!isSafeUpstreamUrl(provider.baseUrl)) {
      return reply.status(400).send({
        error: 'unsafe_upstream_url',
        message: 'The specified base URL is invalid or targets a disallowed internal address.',
      });
    }

    const updatedProvider: UpstreamProvider = {
      ...provider,
      id,
    };

    const added = upstreamStore.addOrUpdateProvider(updatedProvider);
    if (!added) {
      return reply.status(400).send({ error: 'unsafe_upstream_url', message: 'The specified URL failed safety validation.' });
    }

    return reply.send({ status: 'ok', provider: updatedProvider, settings: upstreamStore.getSettings() });
  });

  fastify.delete('/admin/providers/:id', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const { id } = req.params as { id: string };
    const success = upstreamStore.deleteProvider(id);
    if (!success) {
      return reply.status(400).send({ error: 'cannot_delete', message: 'Cannot delete the only remaining provider' });
    }
    return reply.send({ status: 'deleted', id, settings: upstreamStore.getSettings() });
  });
}
