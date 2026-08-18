import { randomUUID } from 'crypto';
import { TokenEntry } from '@ai-privacy-proxy/shared';
import { openAIAdapter } from '../protocols/openai.js';
import { anthropicAdapter } from '../protocols/anthropic.js';
import { ProtocolAdapter } from '../protocols/types.js';
import { analyzeText } from '../presidio/client.js';
import { policyEngine } from '../privacy/policy-engine.js';
import { tokenizeText } from '../privacy/tokenizer.js';
import { vault } from '../vault/redis-vault.js';
import { upstreamStore } from '../config/upstream-store.js';

export interface ProcessedRequest {
  sanitizedBody: string;
  sessionId: string;
  blocked: boolean;
  blockedEntities?: string[] | undefined;
  tokensCreated: TokenEntry[];
  entitiesDetected: string[];
  presidioLatencyMs: number;
  protocol: 'openai' | 'anthropic' | 'unknown';
}

export function resolveSessionId(
  headers: Record<string, string | string[] | undefined>,
  body: any,
): string {
  const customSessionHeader = headers['x-privacy-session-id'];
  if (typeof customSessionHeader === 'string' && customSessionHeader.trim()) {
    return customSessionHeader.trim();
  }

  const conversationHeader = headers['x-conversation-id'];
  if (typeof conversationHeader === 'string' && conversationHeader.trim()) {
    return conversationHeader.trim();
  }

  if (body && typeof body === 'object' && typeof body.conversation_id === 'string' && body.conversation_id.trim()) {
    return body.conversation_id.trim();
  }

  return randomUUID();
}

export function detectProtocol(
  url: string,
  headers: Record<string, string | string[] | undefined>,
  body: any,
): ProtocolAdapter | null {
  if (url.includes('/chat/completions') || url.includes('/completions')) {
    return openAIAdapter;
  }
  if (anthropicAdapter.matches(url, headers, body)) {
    return anthropicAdapter;
  }
  if (openAIAdapter.matches(url, headers, body)) {
    return openAIAdapter;
  }
  return openAIAdapter;
}

export async function processIncomingRequest(
  url: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: any,
): Promise<ProcessedRequest> {
  if (!rawBody) {
    return {
      sanitizedBody: '',
      sessionId: resolveSessionId(headers, null),
      blocked: false,
      tokensCreated: [],
      entitiesDetected: [],
      presidioLatencyMs: 0,
      protocol: 'unknown',
    };
  }

  let parsedBody: any = null;
  let bodyStr = '';

  if (Buffer.isBuffer(rawBody)) {
    bodyStr = rawBody.toString('utf-8');
    try {
      parsedBody = JSON.parse(bodyStr);
    } catch {
      parsedBody = null;
    }
  } else if (typeof rawBody === 'string') {
    bodyStr = rawBody;
    try {
      parsedBody = JSON.parse(bodyStr);
    } catch {
      parsedBody = null;
    }
  } else if (typeof rawBody === 'object' && rawBody !== null) {
    parsedBody = rawBody;
    try {
      bodyStr = JSON.stringify(rawBody);
    } catch {
      bodyStr = '';
    }
  }

  if (!parsedBody) {
    return {
      sanitizedBody: bodyStr,
      sessionId: resolveSessionId(headers, null),
      blocked: false,
      tokensCreated: [],
      entitiesDetected: [],
      presidioLatencyMs: 0,
      protocol: 'unknown',
    };
  }

  const sessionId = resolveSessionId(headers, parsedBody);
  const adapter = detectProtocol(url, headers, parsedBody);

  if (upstreamStore.getPrivacyMode() === 'bypass') {
    return {
      sanitizedBody: bodyStr,
      sessionId,
      blocked: false,
      tokensCreated: [],
      entitiesDetected: [],
      presidioLatencyMs: 0,
      protocol: adapter?.type || 'unknown',
    };
  }

  if (!adapter) {
    return {
      sanitizedBody: bodyStr,
      sessionId,
      blocked: false,
      tokensCreated: [],
      entitiesDetected: [],
      presidioLatencyMs: 0,
      protocol: 'unknown',
    };
  }

  const fields = adapter.extractRequestFields(parsedBody);
  const allTokens: TokenEntry[] = [];
  const allEntities: string[] = [];
  let totalPresidioLatency = 0;

  for (const field of fields) {
    if (!field.text || field.text.trim().length === 0) continue;

    const { entities, latencyMs } = await analyzeText(field.text);
    totalPresidioLatency += latencyMs;

    if (entities.length === 0) continue;

    for (const ent of entities) {
      allEntities.push(ent.entity_type);
    }

    const tokenResult = await tokenizeText(field.text, entities, policyEngine, vault, sessionId);

    if (tokenResult.blocked) {
      return {
        sanitizedBody: '',
        sessionId,
        blocked: true,
        blockedEntities: tokenResult.blockedEntities,
        tokensCreated: [],
        entitiesDetected: allEntities,
        presidioLatencyMs: totalPresidioLatency,
        protocol: adapter.type,
      };
    }

    field.setter(tokenResult.sanitizedText);
    allTokens.push(...tokenResult.mappings);
  }

  // ── Smart Token Preservation System Hint Injection ────────────────────────
  // Only inject if at least 1 PII token was generated and the feature is enabled.
  if (allTokens.length > 0 && upstreamStore.isPreservationHintEnabled()) {
    const hintText = upstreamStore.getPreservationHintText();

    if (adapter.type === 'openai') {
      if (Array.isArray(parsedBody.messages)) {
        const sysMsg = parsedBody.messages.find((m: any) => m && m.role === 'system');
        if (sysMsg) {
          if (typeof sysMsg.content === 'string') {
            sysMsg.content = `${sysMsg.content}\n\n[Proxy Directive: ${hintText}]`;
          } else if (Array.isArray(sysMsg.content)) {
            sysMsg.content.push({ type: 'text', text: `\n\n[Proxy Directive: ${hintText}]` });
          }
        } else {
          // Prepend new system message with the directive
          parsedBody.messages.unshift({
            role: 'system',
            content: `[Proxy Directive: ${hintText}]`,
          });
        }
      }
    } else if (adapter.type === 'anthropic') {
      if (typeof parsedBody.system === 'string') {
        parsedBody.system = `${parsedBody.system}\n\n[Proxy Directive: ${hintText}]`;
      } else if (Array.isArray(parsedBody.system)) {
        parsedBody.system.push({ type: 'text', text: `\n\n[Proxy Directive: ${hintText}]` });
      } else {
        parsedBody.system = `[Proxy Directive: ${hintText}]`;
      }
    }
  }

  return {
    sanitizedBody: JSON.stringify(parsedBody),
    sessionId,
    blocked: false,
    tokensCreated: allTokens,
    entitiesDetected: allEntities,
    presidioLatencyMs: totalPresidioLatency,
    protocol: adapter.type,
  };
}

