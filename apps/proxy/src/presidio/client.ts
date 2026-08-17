import { PresidioEntity } from '@ai-privacy-proxy/shared';
import { config } from '../config/index.js';

export interface AnalyzeOptions {
  language?: string;
  entities?: string[];
  scoreThreshold?: number;
}

// Built-in fallback regex for resilient detection
const FALLBACK_PATTERNS: { type: string; regex: RegExp; score: number }[] = [
  // Secrets and crypto first
  { type: 'PRIVATE_KEY', regex: /\b(?:0x)?[a-fA-F0-9]{64}\b/g, score: 0.95 },
  { type: 'API_KEY', regex: /\bsk-[a-zA-Z0-9_-]{20,}\b/g, score: 0.95 },
  { type: 'API_KEY', regex: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g, score: 0.95 },
  { type: 'API_KEY', regex: /\bgh[pousr]_[a-zA-Z0-9]{36,}\b/g, score: 0.95 },
  { type: 'PASSWORD', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi, score: 0.85 },
  { type: 'ETHEREUM_ADDRESS', regex: /\b0x[a-fA-F0-9]{40}\b/g, score: 0.95 },
  { type: 'SOLANA_ADDRESS', regex: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, score: 0.75 },
  { type: 'EMAIL_ADDRESS', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, score: 0.95 },
  { type: 'CREDIT_CARD', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, score: 0.9 },
  { type: 'PHONE_NUMBER', regex: /(?:\+\d{1,3}[-.\s]*)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]*\d{3,4}(?:[-.\s]*\d{3,4})?\b/g, score: 0.85 },
];

export async function analyzeTextWithFallback(text: string): Promise<PresidioEntity[]> {
  const results: PresidioEntity[] = [];
  const occupiedRanges: [number, number][] = [];

  for (const { type, regex, score } of FALLBACK_PATTERNS) {
    const re = new RegExp(regex);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const matchedText = match[1] ?? match[0];
      const start = match[1] ? match.index + match[0].indexOf(match[1]) : match.index;
      const end = start + matchedText.length;

      // Ensure no overlapping range with higher priority entity
      const overlaps = occupiedRanges.some(([s, e]) => Math.max(s, start) < Math.min(e, end));
      if (!overlaps) {
        occupiedRanges.push([start, end]);
        results.push({
          entity_type: type,
          start,
          end,
          score,
        });
      }
    }
  }

  return results;
}

export async function analyzeText(
  text: string,
  options: AnalyzeOptions = {},
): Promise<{ entities: PresidioEntity[]; usedFallback: boolean; latencyMs: number }> {
  if (!text || text.trim().length === 0) {
    return { entities: [], usedFallback: false, latencyMs: 0 };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${config.PRESIDIO_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language: options.language || 'en',
        entities: options.entities,
        score_threshold: options.scoreThreshold || 0.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Presidio HTTP ${res.status}: ${await res.text()}`);
    }

    const entities = (await res.json()) as PresidioEntity[];
    return { entities, usedFallback: false, latencyMs: Date.now() - startTime };
  } catch (err) {
    // If Presidio fails, run internal fallback detection
    const entities = await analyzeTextWithFallback(text);
    return { entities, usedFallback: true, latencyMs: Date.now() - startTime };
  }
}

export async function checkPresidioHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${config.PRESIDIO_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}
