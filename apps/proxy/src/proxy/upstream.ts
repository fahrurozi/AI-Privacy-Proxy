import { request, Dispatcher } from 'undici';
import { upstreamStore } from '../config/upstream-store.js';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

export function sanitizeForwardHeaders(
  incomingHeaders: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const clean: Record<string, string> = {};

  for (const [key, val] of Object.entries(incomingHeaders)) {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(lower) ||
      lower.startsWith('x-privacy-') ||
      lower.startsWith('x-upstream-')
    ) {
      continue;
    }
    if (val !== undefined) {
      clean[lower] = Array.isArray(val) ? val.join(', ') : val;
    }
  }

  return clean;
}

export async function forwardUpstreamRequest(
  path: string,
  method: string,
  headers: Record<string, string | string[] | undefined>,
  body: string | Buffer | null,
): Promise<Dispatcher.ResponseData> {
  const { targetBaseUrl, targetPath } = upstreamStore.resolveTarget(headers, path);
  const targetUrl = `${targetBaseUrl}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
  const cleanHeaders = sanitizeForwardHeaders(headers);

  if (body) {
    cleanHeaders['content-type'] = cleanHeaders['content-type'] || 'application/json';
  }

  return request(targetUrl, {
    method: method as Dispatcher.HttpMethod,
    headers: cleanHeaders,
    body: body ?? null,
    bodyTimeout: 0, // No timeout for streaming responses
    headersTimeout: 45_000,
  });
}
