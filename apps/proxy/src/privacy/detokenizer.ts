import { TokenVault } from '../vault/redis-vault.js';

// Canonical full-form token: [prefix:TYPE_NNN] or [TYPE_NNN]
export const TOKEN_PATTERN = /\[(?:[a-zA-Z0-9_-]+:)?([A-Z_]+_\d{3})\]/g;

// Bare suffix token: TYPE_NNN without brackets (AI sometimes strips them)
const BARE_TOKEN_PATTERN = /\b([A-Z][A-Z_]+_\d{3})\b/g;

export async function detokenizeText(
  text: string,
  sessionId: string,
  vault: TokenVault,
): Promise<{ text: string; restoredCount: number; tokenMap: Map<string, string> }> {
  if (!text) {
    return { text, restoredCount: 0, tokenMap: new Map() };
  }

  // Step 1: Load entire session token map once (used for both exact and fuzzy matching)
  const sessionTokens = await vault.listSessionTokens(sessionId);

  if (sessionTokens.size === 0) {
    return { text, restoredCount: 0, tokenMap: new Map() };
  }

  // Build a suffix-to-token index for fuzzy matching:
  // e.g. "[8b4b7a8b:PERSON_001]" -> suffix "PERSON_001"
  const suffixIndex = new Map<string, { fullToken: string; originalValue: string }>();
  for (const [fullToken, originalValue] of sessionTokens.entries()) {
    // fullToken is like "[8b4b7a8b:PERSON_001]"
    const suffixMatch = fullToken.match(/\[(?:[a-zA-Z0-9_-]+:)?([A-Z_]+_\d{3})\]/);
    if (suffixMatch && suffixMatch[1]) {
      suffixIndex.set(suffixMatch[1]!, { fullToken, originalValue });
    }
  }

  let result = text;
  let restoredCount = 0;
  const restoredTokenMap = new Map<string, string>(); // full token -> original value

  // Step 2: Exact match – full canonical tokens [prefix:TYPE_NNN]
  const exactMatches = Array.from(result.matchAll(TOKEN_PATTERN));
  const uniqueExact = Array.from(new Set(exactMatches.map((m) => m[0])));

  for (const fullToken of uniqueExact) {
    const originalValue = sessionTokens.get(fullToken);
    if (originalValue !== undefined) {
      restoredTokenMap.set(fullToken, originalValue);
      result = result.replaceAll(fullToken, originalValue);
      restoredCount += 1;
    }
  }

  // Step 3: Fuzzy match – bare suffix tokens TYPE_NNN (AI stripped brackets/prefix)
  const bareMatches = Array.from(result.matchAll(BARE_TOKEN_PATTERN));
  const uniqueBare = Array.from(new Set(bareMatches.map((m) => m[1])));

  for (const suffix of uniqueBare) {
    if (!suffix) continue;
    const entry = suffixIndex.get(suffix);
    if (entry) {
      // Only replace if this bare token hasn't already been replaced as full form
      if (!restoredTokenMap.has(entry.fullToken)) {
        restoredTokenMap.set(entry.fullToken, entry.originalValue);
      }
      // Replace the bare occurrence too
      const safePattern = new RegExp(`\\b${suffix}\\b`, 'g');
      const before = result;
      result = result.replace(safePattern, entry.originalValue);
      if (result !== before) {
        restoredCount += 1;
      }
    }
  }

  return { text: result, restoredCount, tokenMap: restoredTokenMap };
}
