import { TokenVault } from '../vault/redis-vault.js';

export const TOKEN_PATTERN = /\[(?:[a-zA-Z0-9_-]+:)?([A-Z_]+_\d{3})\]/g;

export async function detokenizeText(
  text: string,
  sessionId: string,
  vault: TokenVault,
): Promise<{ text: string; restoredCount: number }> {
  if (!text || !text.includes('[')) {
    return { text, restoredCount: 0 };
  }

  const matches = Array.from(text.matchAll(TOKEN_PATTERN));
  if (matches.length === 0) {
    return { text, restoredCount: 0 };
  }

  // Deduplicate tokens
  const uniqueTokens = Array.from(new Set(matches.map((m) => m[0])));
  const tokenMap = new Map<string, string>();

  await Promise.all(
    uniqueTokens.map(async (token) => {
      const restored = await vault.restore(sessionId, token);
      if (restored !== null) {
        tokenMap.set(token, restored);
      }
    }),
  );

  let result = text;
  let restoredCount = 0;
  for (const [token, originalVal] of tokenMap.entries()) {
    result = result.replaceAll(token, originalVal);
    restoredCount += 1;
  }

  return { text: result, restoredCount };
}
