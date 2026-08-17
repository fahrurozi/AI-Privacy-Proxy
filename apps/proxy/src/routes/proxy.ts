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

export async function handleProxyRequest(req: FastifyRequest, reply: FastifyReply) {
  const path = req.url;
  const startTime = Date.now();
  const requestId = randomUUID();

  const processed = await processIncomingRequest(
    path,
    req.headers,
    req.body as any,
  );

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
    const upstreamResponse = await forwardUpstreamRequest(
      path,
      req.method,
      req.headers,
      processed.sanitizedBody ? Buffer.from(processed.sanitizedBody, 'utf-8') : null,
    );

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

    if (isEventStream) {
      reply.status(upstreamStatus);
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      const transformedStream = createStreamingResponseTransformer(
        Readable.fromWeb(upstreamResponse.body as any),
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
        path,
        upstreamStatus,
        clientIp: req.ip,
      });

      return reply.send(transformedStream);
    }

    const rawText = await upstreamResponse.body.text();
    const detokenizedBody = await processNonStreamingResponse(
      rawText,
      processed.sessionId,
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
      path,
      upstreamStatus,
      clientIp: req.ip,
    });

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
