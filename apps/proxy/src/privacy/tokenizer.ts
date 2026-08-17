import { PresidioEntity, TokenEntry, TokenizeResult } from '@ai-privacy-proxy/shared';
import { PolicyEngine } from './policy-engine.js';
import { TokenVault } from '../vault/redis-vault.js';

export function replaceRange(str: string, start: number, end: number, replacement: string): string {
  return str.slice(0, start) + replacement + str.slice(end);
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
