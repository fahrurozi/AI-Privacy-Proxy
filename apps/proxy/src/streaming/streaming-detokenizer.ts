import { TokenVault } from '../vault/redis-vault.js';
import { StreamStateManager } from './stream-state.js';
import { TOKEN_PATTERN, detokenizeText } from '../privacy/detokenizer.js';

export function findSafeFlushBoundary(text: string): number {
  const lastBracket = text.lastIndexOf('[');
  if (lastBracket !== -1) {
    // Check if there is a closing bracket after this opening bracket
    const closingBracket = text.indexOf(']', lastBracket);
    if (closingBracket === -1 && text.length - lastBracket <= 50) {
      return lastBracket; // Incomplete bracket token, retain from lastBracket
    }
  }

  // Check for bare token candidate at the end of text (e.g. PERSON, PERSON_, EMAIL_ADDRESS_0)
  // that might be split across incoming stream chunks
  const bareMatch = text.match(/([A-Z][A-Z_]{2,}_?\d{0,3})$/);
  if (bareMatch && bareMatch[1] && bareMatch[1].length <= 40) {
    return text.length - bareMatch[1].length;
  }

  return text.length;
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
