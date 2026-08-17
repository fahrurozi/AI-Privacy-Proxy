import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
import { upstreamStore } from '../config/upstream-store.js';
import { vault } from '../vault/redis-vault.js';
import { checkPresidioHealth, analyzeText } from '../presidio/client.js';
import { maskValue } from '../privacy/tokenizer.js';
import { streamStateManager } from '../streaming/stream-state.js';

// In-memory metrics tracking
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
  }) {
    this.totalRequests += 1;
    if (event.action === 'BLOCK') {
      this.blockedRequests += 1;
    }
    this.tokensGenerated += event.tokensCount;

    for (const ent of event.entitiesDetected) {
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

    // Add to audit log (capped at 500 entries)
    this.auditLogs.unshift({
      id: event.requestId,
      timestamp: Date.now(),
      requestId: event.requestId,
      sessionId: event.sessionId,
      action: event.action,
      entitiesDetected: event.entitiesDetected,
      entityCount: event.entitiesDetected.length,
      path: event.path,
      clientIp: event.clientIp,
      upstreamStatus: event.upstreamStatus,
    });

    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  async getSummary(): Promise<MetricsSummary> {
    const [redisOk, presidioOk] = await Promise.all([
      vault.ping(),
      checkPresidioHealth(),
    ]);

    const avgPresidio =
      this.presidioLatencies.length > 0
        ? Math.round(this.presidioLatencies.reduce((a, b) => a + b, 0) / this.presidioLatencies.length)
        : 0;

    const avgProxy =
      this.proxyLatencies.length > 0
        ? Math.round(this.proxyLatencies.reduce((a, b) => a + b, 0) / this.proxyLatencies.length)
        : 0;

    return {
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
      tokensGenerated: this.tokensGenerated,
      tokensRestored: this.tokensRestored,
      activeStreams: streamStateManager.getActiveStreamCount(),
      presidioLatencyMs: avgPresidio,
      vaultLatencyMs: 2,
      upstreamLatencyMs: 120,
      proxyLatencyMs: avgProxy,
      entityBreakdown: { ...this.entityCounts },
      status: {
        proxy: 'healthy',
        presidio: presidioOk ? 'healthy' : 'down',
        redis: redisOk ? 'healthy' : 'down',
      },
    };
  }
}

export const metricsTracker = new AdminMetricsTracker();
const localCustomRecognizers: Map<string, CustomRecognizerConfig> = new Map();

function verifyAdminAuth(req: FastifyRequest, reply: FastifyReply): boolean {
  const authHeader = req.headers['authorization'];
  let candidateKey = req.headers['x-admin-key'];

  if (!candidateKey && authHeader?.startsWith('Bearer ')) {
    candidateKey = authHeader.slice(7).trim();
  }

  if (!candidateKey || candidateKey !== config.ADMIN_API_KEY) {
    reply.status(401).send({ error: 'unauthorized', message: 'Invalid or missing Admin Authentication Key' });
    return false;
  }
  return true;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Authentication & Login Routes
  fastify.post('/admin/auth/login', async (req, reply) => {
    const body = req.body as { key?: string; password?: string; adminKey?: string };
    const submittedKey = body?.key || body?.adminKey || body?.password;

    if (!submittedKey || submittedKey !== config.ADMIN_API_KEY) {
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
      expiresAt: Date.now() + 86400 * 1000 * 7, // 7 days
    });
  });

  fastify.get('/admin/auth/verify', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    return reply.send({
      authenticated: true,
      user: { username: 'admin', role: 'Administrator' },
    });
  });

  // Metrics Summary
  fastify.get('/admin/metrics', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const summary = await metricsTracker.getSummary();
    return reply.send(summary);
  });

  // Metrics Live Stream (SSE)
  fastify.get('/admin/metrics/stream', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
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

  // Active Sessions
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

  // Policy Settings
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

  // Policy Sandbox & Live Simulation (Uses real Presidio spaCy NLP model!)
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

    // Build policy lookup map
    const policyMap = new Map((body.policies || policyRegistry.getAllPolicies()).map((p) => [p.entityType.toUpperCase(), p]));

    // Sort descending by start to avoid position drift during replacements
    const sorted = [...entities].sort((a, b) => b.start - a.start);
    let transformed = text;
    const detected: Array<{ entityType: string; matchedText: string; action: string; score: number }> = [];
    const blockedEntities: string[] = [];
    let counter = 1;

    for (const ent of sorted) {
      const pol = policyMap.get(ent.entity_type.toUpperCase()) || { action: 'TOKENIZE', enabled: true, minScore: 0.6 };
      if (pol.enabled === false) continue;
      if (ent.score < (pol.minScore ?? 0.6)) continue;

      const matchedText = text.slice(ent.start, ent.end);
      detected.unshift({
        entityType: ent.entity_type,
        matchedText,
        action: pol.action,
        score: ent.score,
      });

      if (pol.action === 'BLOCK') {
        if (!blockedEntities.includes(ent.entity_type)) blockedEntities.push(ent.entity_type);
      } else if (pol.action === 'REDACT') {
        transformed = transformed.slice(0, ent.start) + `[REDACTED_${ent.entity_type}]` + transformed.slice(ent.end);
      } else if (pol.action === 'MASK') {
        transformed = transformed.slice(0, ent.start) + maskValue(matchedText, ent.entity_type) + transformed.slice(ent.end);
      } else if (pol.action === 'TOKENIZE') {
        const pad = String(counter++).padStart(3, '0');
        transformed = transformed.slice(0, ent.start) + `[PREFIX:${ent.entity_type}_${pad}]` + transformed.slice(ent.end);
      }
    }

    return reply.send({
      transformedText: blockedEntities.length > 0 ? '' : transformed,
      detectedEntities: detected,
      blocked: blockedEntities.length > 0,
      blockedEntities,
      presidioLatencyMs: latencyMs,
    });
  });

  // Recognizers
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

    try {
      await fetch(`${config.PRESIDIO_URL}/recognizers/${id}`, {
        method: 'DELETE',
      });
    } catch {}

    return reply.send({ status: 'deleted', id });
  });

  // Audit Logs
  fastify.get('/admin/audit', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    return reply.send({ events: metricsTracker.auditLogs });
  });

  // Dynamic Upstream & System Settings (Multi-Provider, Privacy Mode, TTL)
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

    upstreamStore.updateSettings(body);
    return reply.send({
      status: 'ok',
      settings: upstreamStore.getSettings(),
    });
  });

  // Provider CRUD
  fastify.post('/admin/providers', async (req, reply) => {
    if (!verifyAdminAuth(req, reply)) return;
    const provider = req.body as UpstreamProvider;
    if (!provider.id || !provider.baseUrl || !provider.name) {
      return reply.status(400).send({ error: 'invalid_provider', message: 'Missing required provider fields' });
    }
    upstreamStore.addOrUpdateProvider(provider);
    return reply.send({ status: 'ok', provider, settings: upstreamStore.getSettings() });
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
