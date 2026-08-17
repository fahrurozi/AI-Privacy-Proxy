import { TokenVault } from '../vault/redis-vault.js';
import { StreamStateManager } from './stream-state.js';
import { TOKEN_PATTERN, detokenizeText } from '../privacy/detokenizer.js';

export function findSafeFlushBoundary(text: string): number {
  const lastBracket = text.lastIndexOf('[');
  if (lastBracket === -1) {
    return text.length;
  }

  // Check if there is a closing bracket after this opening bracket
  const closingBracket = text.indexOf(']', lastBracket);
  if (closingBracket !== -1) {
    // There is a closing bracket, but is there ANOTHER open bracket after it?
    const nextOpenBracket = text.indexOf('[', closingBracket);
    if (nextOpenBracket !== -1) {
      return findSafeFlushBoundary(text.slice(nextOpenBracket)) + nextOpenBracket;
    }
    return text.length; // Complete bracket exists, safe to flush all
  }

  // If text after '[' is longer than 50 chars, it's probably regular text (e.g. markdown link or code), not our token
  if (text.length - lastBracket > 50) {
    return text.length;
  }

  // Partial token detected, retain from lastBracket
  return lastBracket;
}

export async function processStreamChunk(
  streamKey: string,
  incomingChunkText: string,
  sessionId: string,
  vault: TokenVault,
  stateManager: StreamStateManager,
): Promise<string> {
  const state = stateManager.getOrCreate(streamKey);
  state.pending += incomingChunkText;

  // Restore any complete tokens in pending
  const { text: restored } = await detokenizeText(state.pending, sessionId, vault);

  // Find boundary to safely emit
  const splitIndex = findSafeFlushBoundary(restored);

  const outputToFlush = restored.slice(0, splitIndex);
  state.pending = restored.slice(splitIndex);

  return outputToFlush;
}

export async function flushStreamPending(
  streamKey: string,
  sessionId: string,
  vault: TokenVault,
  stateManager: StreamStateManager,
): Promise<string> {
  const state = stateManager.getOrCreate(streamKey);
  if (!state.pending) return '';

  const { text: restored } = await detokenizeText(state.pending, sessionId, vault);
  state.pending = '';
  return restored;
}
