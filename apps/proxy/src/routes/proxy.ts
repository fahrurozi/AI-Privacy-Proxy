import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { processIncomingRequest, detectProtocol } from '../proxy/request-pipeline.js';
import { forwardUpstreamRequest } from '../proxy/upstream.js';
import {
  processNonStreamingResponse,
  createStreamingResponseTransformer,
} from '../proxy/response-pipeline.js';
import { metricsTracker } from './admin.js';

// Extract provider ID from path like /p/<providerId>/... or /provider/<providerId>/...
function extractProviderId(path: string): string | undefined {
  const m = path.match(/^\/(?:p|provider)\/([a-zA-Z0-9_-]+)/i);
  return m?.[1]?.toLowerCase();
}

export async function handleProxyRequest(req: FastifyRequest, reply: FastifyReply) {
  const path = req.url;
  const startTime = Date.now();
  const requestId = randomUUID();
  const providerId = extractProviderId(path);

  const processed = await processIncomingRequest(
    path,
    req.headers,
    req.body as any,
  );

  // Track how long our pre-processing (presidio + tokenization) took
  const preProcessMs = Date.now() - startTime;

  if (processed.blocked) {
    metricsTracker.recordRequest({
      requestId,
      sessionId: processed.sessionId,
      action: 'BLOCK',
      entitiesDetected: processed.entitiesDetected,
      tokensCount: 0,
      presidioLatencyMs: processed.presidioLatencyMs,
      proxyLatencyMs: Date.now() - startTime,
      path,
      upstreamStatus: 400,
      clientIp: req.ip,
      providerId,
    });

    return reply.status(400).send({
      error: {
        type: 'privacy_policy_violation',
        code: 'request_blocked',
        message: `Request was blocked because it contains sensitive entities: ${processed.blockedEntities?.join(', ')}`,
      },
    });
  }

  try {
    const upstreamStartTime = Date.now();
    const upstreamResponse = await forwardUpstreamRequest(
      path,
      req.method,
      req.headers,
      processed.sanitizedBody ? Buffer.from(processed.sanitizedBody, 'utf-8') : null,
    );
    const llmLatencyMs = Date.now() - upstreamStartTime;

    const upstreamStatus = upstreamResponse.statusCode;
    const contentType = (upstreamResponse.headers['content-type'] as string) || '';
    const isEventStream = contentType.includes('text/event-stream');

    for (const [key, value] of Object.entries(upstreamResponse.headers)) {
      if (
        value !== undefined &&
        !['connection', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())
      ) {
        reply.header(key, value);
      }
    }

    const adapter = detectProtocol(path, req.headers, null);

    // Always expose session ID so clients can fetch token legend
    reply.header('x-privacy-session-id', processed.sessionId);
    reply.header('x-privacy-presidio-ms', String(processed.presidioLatencyMs));
    reply.header('x-privacy-llm-ms', String(llmLatencyMs));
    reply.header('x-privacy-proxy-overhead-ms', String(Math.max(0, preProcessMs)));

    if (req.headers['x-privacy-debug'] === 'true') {
      reply.header('x-privacy-sanitized-body', Buffer.from(processed.sanitizedBody || '').toString('base64'));
      reply.header('x-privacy-tokens-map', Buffer.from(JSON.stringify(processed.tokensCreated || [])).toString('base64'));
      reply.header('x-privacy-tokens-count', String(processed.tokensCreated.length));
      reply.header('x-privacy-entities', JSON.stringify(processed.entitiesDetected));
    }

    if (isEventStream) {
      reply.status(upstreamStatus);
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      const rawStream =
        typeof (upstreamResponse.body as any)?.getReader === 'function'
          ? Readable.fromWeb(upstreamResponse.body as any)
          : (upstreamResponse.body as unknown as Readable);

      const transformedStream = createStreamingResponseTransformer(
        rawStream,
        processed.sessionId,
        requestId,
        adapter,
      );

      metricsTracker.recordRequest({
        requestId,
        sessionId: processed.sessionId,
        action: processed.tokensCreated.length > 0 ? 'TOKENIZE' : 'PASS',
        entitiesDetected: processed.entitiesDetected,
        tokensCount: processed.tokensCreated.length,
        presidioLatencyMs: processed.presidioLatencyMs,
        proxyLatencyMs: Date.now() - startTime,
        llmLatencyMs,
        path,
        upstreamStatus,
        clientIp: req.ip,
        providerId,
      });

      return reply.send(transformedStream);
    }

    const rawText = await upstreamResponse.text();
    const detokenizedBody = await processNonStreamingResponse(
      rawText,
      processed.sessionId,
      adapter,
    );

    const totalMs = Date.now() - startTime;

    metricsTracker.recordRequest({
      requestId,
      sessionId: processed.sessionId,
      action: processed.tokensCreated.length > 0 ? 'TOKENIZE' : 'PASS',
      entitiesDetected: processed.entitiesDetected,
      tokensCount: processed.tokensCreated.length,
      presidioLatencyMs: processed.presidioLatencyMs,
      proxyLatencyMs: totalMs,
      llmLatencyMs,
      path,
      upstreamStatus,
      clientIp: req.ip,
      providerId,
    });

    // Always expose session ID so clients can fetch token legend
    reply.header('x-privacy-session-id', processed.sessionId);
    // Expose timing breakdown for playground inspector
    reply.header('x-privacy-total-ms', String(totalMs));
    reply.header('x-privacy-presidio-ms', String(processed.presidioLatencyMs));
    reply.header('x-privacy-llm-ms', String(llmLatencyMs));
    reply.header('x-privacy-proxy-overhead-ms', String(Math.max(0, totalMs - llmLatencyMs)));

    if (req.headers['x-privacy-debug'] === 'true') {
      reply.header('x-privacy-sanitized-body', Buffer.from(processed.sanitizedBody || '').toString('base64'));
      reply.header('x-privacy-raw-upstream-body', Buffer.from(rawText || '').toString('base64'));
      reply.header('x-privacy-tokens-map', Buffer.from(JSON.stringify(processed.tokensCreated || [])).toString('base64'));
      reply.header('x-privacy-tokens-count', String(processed.tokensCreated.length));
      reply.header('x-privacy-entities', JSON.stringify(processed.entitiesDetected));
    }

    if (contentType.includes('application/json')) {
      reply.header('content-type', 'application/json; charset=utf-8');
      try {
        const parsed = typeof detokenizedBody === 'string' ? JSON.parse(detokenizedBody) : detokenizedBody;
        return reply.status(upstreamStatus).send(parsed);
      } catch {}
    }

    return reply.status(upstreamStatus).send(detokenizedBody);
  } catch (err: any) {
    metricsTracker.recordRequest({
      requestId,
      sessionId: processed.sessionId,
      action: 'PASS',
      entitiesDetected: processed.entitiesDetected,
      tokensCount: 0,
      presidioLatencyMs: processed.presidioLatencyMs,
      proxyLatencyMs: Date.now() - startTime,
      path,
      upstreamStatus: 502,
      clientIp: req.ip,
      providerId,
    });

    return reply.status(502).send({
      error: {
        type: 'upstream_error',
        code: 'bad_gateway',
        message: `Failed to connect to upstream server: ${err.message}`,
      },
    });
  }
}

export async function proxyRoutes(fastify: FastifyInstance) {
  fastify.all('/v1/*', handleProxyRequest);
  fastify.all('/p/*', handleProxyRequest);
  fastify.all('/provider/*', handleProxyRequest);
  fastify.all('/api/*', handleProxyRequest);
  fastify.all('/v1', handleProxyRequest);
  fastify.all('/p', handleProxyRequest);
}
