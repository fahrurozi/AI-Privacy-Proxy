import { PresidioEntity } from '@ai-privacy-proxy/shared';
import { config } from '../config/index.js';

export interface AnalyzeOptions {
  language?: string;
  entities?: string[];
  scoreThreshold?: number;
}

const KNOWN_LOCATIONS = new Set([
  'jawa barat', 'jawa timur', 'jawa tengah', 'dki jakarta', 'jakarta',
  'bandung', 'depok', 'bogor', 'bekasi', 'tangerang', 'sukmajaya',
  'jalan braga', 'braga', 'surabaya', 'yogyakarta', 'bali', 'medan', 'semarang',
  'makassar', 'palembang', 'malang', 'solo', 'surakarta', 'denpasar', 'indonesia'
]);

// Built-in high-precision regex patterns for resilient, culturally accurate detection
const FALLBACK_PATTERNS: { type: string; regex: RegExp; score: number }[] = [
  // Secrets and crypto first
  { type: 'PRIVATE_KEY', regex: /\b(?:0x)?[a-fA-F0-9]{64}\b/g, score: 0.99 },
  { type: 'API_KEY', regex: /\b(?:sk-[a-zA-Z0-9_-]{20,}|sk-ant-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9]{36,})\b/g, score: 0.99 },
  { type: 'PASSWORD', regex: /(?:password|passwd|pwd|kata\s*sandi)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi, score: 0.95 },
  { type: 'ETHEREUM_ADDRESS', regex: /\b0x[a-fA-F0-9]{40}\b/g, score: 0.98 },
  { type: 'SOLANA_ADDRESS', regex: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, score: 0.85 },
  { type: 'EMAIL_ADDRESS', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, score: 0.95 },
  { type: 'CREDIT_CARD', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, score: 0.95 },

  // Indonesian National ID / NIK (16 digits)
  { type: 'INDONESIAN_KTP', regex: /(?:KTP|NIK|nomor\s*KTP|no\.?\s*KTP)\s*[:=]?\s*(\d{16})\b|\b(\d{16})\b/gi, score: 0.95 },

  // Passport Number
  { type: 'PASSPORT_NUMBER', regex: /(?:paspor|passport)\s*(?:nomor|no\.?)?\s*[:=]?\s*([A-Z]\d{7,8})\b|\b([A-Z]\d{7,8})\b/gi, score: 0.9 },

  // Driver License / SIM
  { type: 'DRIVER_LICENSE', regex: /(?:SIM|driver['’]?s?\s*license)\s*(?:nomor|no\.?)?\s*[:=]?\s*([\d-]{12,18})\b/gi, score: 0.9 },

  // Bank Account Number
  { type: 'BANK_ACCOUNT', regex: /(?:rekening|rek|no\.?\s*rek|account)\s*(?:bank\s*[a-zA-Z]+)?\s*[:=]?\s*(\d{8,16})\b/gi, score: 0.9 },

  // Customer ID / Customer Number
  { type: 'CUSTOMER_ID', regex: /(?:pelanggan|customer|cust\s*id|no\.?\s*pelanggan)\s*[:=]?\s*(\d{8,16})\b/gi, score: 0.9 },

  // Phone Numbers (Supports +62/08 Indonesian formats and international formats like +1-555-0199)
  { type: 'PHONE_NUMBER', regex: /(?:\+62\s*|08)\d{1,4}[-.\s]*\d{3,4}[-.\s]*\d{3,5}\b|\b(?:\+\d{1,3}[-.\s]*)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]+\d{3,4}(?:[-.\s]+\d{3,4})?\b/g, score: 0.9 },

  // Street / Location Pattern (Single-line only)
  { type: 'LOCATION', regex: /\b(?:Jl\.|Jalan|Gg\.|Gang)\s+[A-Z][a-zA-Z0-9.-]+(?:\s+[A-Z0-9][a-zA-Z0-9.-]+){0,4}(?:\s+No\.\s*\d+)?\b/g, score: 0.85 },

  // Person name pattern fallback (Capitalized First & Last names)
  { type: 'PERSON', regex: /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Bapak|Ibu)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})+)\b|\b([A-Z][a-z]{2,20}(?:\s+[A-Z][a-z]{2,20})+)\b/g, score: 0.8 },
];

function extractCurrencyRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  const curRegex = /(?:Rp\.?|IDR|\$|USD|EUR|€|£|¥)\s*\d+(?:[.,]\d+)*(?:\s*(?:rupiah|ribu|juta|miliar|dollars?|euros?|cents?))?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = curRegex.exec(text)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function postProcessEntities(text: string, incoming: PresidioEntity[]): PresidioEntity[] {
  const currencyRanges = extractCurrencyRanges(text);
  const occupiedRanges: [number, number][] = [];
  const processed: PresidioEntity[] = [];

  // Helper to check range overlap
  const isOverlapping = (s: number, e: number, list: [number, number][]) =>
    list.some(([os, oe]) => Math.max(s, os) < Math.min(e, oe));

  // 1. First add high-priority local regex matches (secrets, IDs, banks, strict phones)
  for (const { type, regex, score } of FALLBACK_PATTERNS) {
    const re = new RegExp(regex);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const matchedStr = match[1] || match[2] || match[0];
      let start = match.index;
      if (match[1]) {
        start += match[0].indexOf(match[1]);
      } else if (match[2]) {
        start += match[0].indexOf(match[2]);
      }
      const end = start + matchedStr.length;

      // Never match inside a currency amount (e.g. Rp5.000.000)
      if (isOverlapping(start, end, currencyRanges)) {
        continue;
      }

      // Check if a PERSON match is actually a known Indonesian Location
      let finalType = type;
      if (type === 'PERSON') {
        const lower = matchedStr.toLowerCase().trim();
        if (
          KNOWN_LOCATIONS.has(lower) ||
          lower.startsWith('jl') ||
          lower.startsWith('jalan') ||
          lower.startsWith('gang') ||
          lower.includes(' raya')
        ) {
          finalType = 'LOCATION';
        }
      }

      if (!isOverlapping(start, end, occupiedRanges)) {
        occupiedRanges.push([start, end]);
        processed.push({
          entity_type: finalType,
          start,
          end,
          score,
        });
      }
    }
  }

  // 2. Then merge any valid Presidio NLP entities that don't conflict
  for (const ent of incoming) {
    // Skip if overlaps currency
    if (isOverlapping(ent.start, ent.end, currencyRanges)) {
      continue;
    }

    const matchedStr = text.slice(ent.start, ent.end);
    let finalType = ent.entity_type;

    // Fix Presidio misclassifying Indonesian locations as PERSON
    if (finalType === 'PERSON') {
      const lower = matchedStr.toLowerCase().trim();
      if (
        KNOWN_LOCATIONS.has(lower) ||
        lower.startsWith('jl') ||
        lower.startsWith('jalan') ||
        lower.startsWith('gang') ||
        lower.includes(' raya')
      ) {
        finalType = 'LOCATION';
      }
    }

    if (!isOverlapping(ent.start, ent.end, occupiedRanges)) {
      occupiedRanges.push([ent.start, ent.end]);
      processed.push({
        entity_type: finalType,
        start: ent.start,
        end: ent.end,
        score: ent.score,
      });
    }
  }

  return processed.sort((a, b) => a.start - b.start);
}

export async function analyzeTextWithFallback(text: string): Promise<PresidioEntity[]> {
  return postProcessEntities(text, []);
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

    const rawEntities = (await res.json()) as PresidioEntity[];
    const entities = postProcessEntities(text, rawEntities);
    return { entities, usedFallback: false, latencyMs: Date.now() - startTime };
  } catch (err) {
    // If Presidio fails or is unavailable, run enhanced local detection
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
