import { TokenVault } from '../vault/redis-vault.js';
import { StreamStateManager } from './stream-state.js';
import { TOKEN_PATTERN, detokenizeText } from '../privacy/detokenizer.js';

const KNOWN_TOKEN_ENTITY_PREFIXES = [
  'PERSON',
  'EMAIL_ADDRESS',
  'PHONE_NUMBER',
  'BANK_ACCOUNT',
  'INDONESIAN_KTP',
  'PASSPORT_NUMBER',
  'DRIVER_LICENSE',
  'CUSTOMER_ID',
  'LOCATION',
  'CREDIT_CARD',
  'ETHEREUM_ADDRESS',
  'SOLANA_ADDRESS',
  'IP_ADDRESS',
  'API_KEY',
  'PASSWORD',
  'PRIVATE_KEY',
  'US_SSN',
  'US_PASSPORT',
  'SEED_PHRASE',
];

const BARE_TOKEN_PREFIX_REGEX = new RegExp(
  `\\b(${KNOWN_TOKEN_ENTITY_PREFIXES.join('|')})(?:_\\d{0,3})?$`,
  'i'
);

export function findSafeFlushBoundary(text: string): number {
  const lastBracket = text.lastIndexOf('[');
  if (lastBracket !== -1) {
    // Check if there is a closing bracket after this opening bracket
    const closingBracket = text.indexOf(']', lastBracket);
    if (closingBracket === -1 && text.length - lastBracket <= 60) {
      return lastBracket; // Incomplete bracket token, retain from lastBracket
    }
  }

  // Check for specific bare token candidate at the end of text (e.g. PERSON, PERSON_, EMAIL_ADDRESS_0)
  const bareMatch = text.match(BARE_TOKEN_PREFIX_REGEX);
  if (bareMatch && bareMatch[0] && bareMatch[0].length <= 50) {
    return text.length - bareMatch[0].length;
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
