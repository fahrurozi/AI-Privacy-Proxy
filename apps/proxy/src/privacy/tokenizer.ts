import { PresidioEntity, TokenEntry, TokenizeResult } from '@ai-privacy-proxy/shared';
import { PolicyEngine } from './policy-engine.js';
import { TokenVault } from '../vault/redis-vault.js';

export function replaceRange(str: string, start: number, end: number, replacement: string): string {
  return str.slice(0, start) + replacement + str.slice(end);
}

export function maskValue(val: string, _entityType?: string): string {
  if (!val || val.length <= 2) return '*'.repeat(val.length || 1);

  // Email format: satoshi@bitcoin.org -> s***i@bitcoin.org
  if (val.includes('@')) {
    const parts = val.split('@');
    const user = parts[0] || '';
    const domain = parts[1] || '';
    if (user && domain) {
      const maskedUser =
        user.length <= 2
          ? `${user[0]}*`
          : `${user[0]}***${user[user.length - 1]}`;
      return `${maskedUser}@${domain}`;
    }
  }

  // Hex / EVM Crypto address: 0x71C8F794B32145429631994304244a1234567890 -> 0x71C8...7890
  if (val.startsWith('0x') && val.length >= 10) {
    return `${val.slice(0, 6)}...${val.slice(-4)}`;
  }

  // Long base58 / hashes (Solana, etc.): 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM -> 9WzD...AWWM
  if (val.length >= 32 && !val.includes(' ')) {
    return `${val.slice(0, 4)}...${val.slice(-4)}`;
  }

  // Credit Card / Number sequences: 4532-1234-5678-9010 -> ****-****-****-9010
  const digitsOnly = val.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 19) {
    const last4 = digitsOnly.slice(-4);
    return `****-****-****-${last4}`;
  }

  // Phone number: +1-555-0199 or 0812-3456-7890 -> 0812-****-7890
  if (/^[\d+\-\s()]{7,}$/.test(val)) {
    if (val.length > 6) {
      return `${val.slice(0, 3)}****${val.slice(-3)}`;
    }
  }

  // General text / Names: Alice Walker -> A***e W***r or John Doe -> J*** D**
  return val
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2) return `${word[0]}*`;
      return `${word[0]}***${word[word.length - 1]}`;
    })
    .join(' ');
}

export async function tokenizeText(
  text: string,
  entities: PresidioEntity[],
  policyEngine: PolicyEngine,
  vault: TokenVault,
  sessionId: string,
): Promise<TokenizeResult> {
  if (!text || entities.length === 0) {
    return { sanitizedText: text, mappings: [], blocked: false };
  }

  const evaluated = policyEngine.evaluate(entities);

  // Check if any entity is BLOCK
  const blockedList = evaluated.filter((e) => e.action === 'BLOCK');
  if (blockedList.length > 0) {
    return {
      sanitizedText: '',
      mappings: [],
      blocked: true,
      blockedEntities: blockedList.map((e) => e.entity.entity_type),
    };
  }

  // Sort descending by start offset to prevent position shifts during replacement
  const sorted = [...evaluated]
    .filter((e) => e.action !== 'PASS')
    .sort((a, b) => b.entity.start - a.entity.start);

  let result = text;
  const mappings: TokenEntry[] = [];

  for (const { entity, action } of sorted) {
    // Check range validity
    if (entity.start < 0 || entity.end > result.length || entity.start >= entity.end) {
      continue;
    }

    const originalValue = result.slice(entity.start, entity.end);

    if (action === 'REDACT') {
      result = replaceRange(result, entity.start, entity.end, '[REDACTED]');
    } else if (action === 'MASK') {
      const masked = maskValue(originalValue, entity.entity_type);
      result = replaceRange(result, entity.start, entity.end, masked);
    } else if (action === 'TOKENIZE') {
      const token = await vault.getOrCreate(sessionId, entity.entity_type, originalValue);
      result = replaceRange(result, entity.start, entity.end, token);
      mappings.push({
        token,
        originalValue,
        entityType: entity.entity_type,
      });
    }
  }

  return {
    sanitizedText: result,
    mappings,
    blocked: false,
  };
}
