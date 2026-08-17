import { EntityPolicy, PrivacyAction } from '@ai-privacy-proxy/shared';

export const DEFAULT_POLICIES: Record<string, EntityPolicy> = {
  PERSON: { entityType: 'PERSON', action: 'TOKENIZE', minScore: 0.65 },
  EMAIL_ADDRESS: { entityType: 'EMAIL_ADDRESS', action: 'TOKENIZE', minScore: 0.75 },
  PHONE_NUMBER: { entityType: 'PHONE_NUMBER', action: 'TOKENIZE', minScore: 0.7 },
  IP_ADDRESS: { entityType: 'IP_ADDRESS', action: 'TOKENIZE', minScore: 0.8 },
  ETHEREUM_ADDRESS: { entityType: 'ETHEREUM_ADDRESS', action: 'TOKENIZE', minScore: 0.85 },
  SOLANA_ADDRESS: { entityType: 'SOLANA_ADDRESS', action: 'TOKENIZE', minScore: 0.75 },
  CREDIT_CARD: { entityType: 'CREDIT_CARD', action: 'REDACT', minScore: 0.8 },
  US_SSN: { entityType: 'US_SSN', action: 'REDACT', minScore: 0.8 },
  US_PASSPORT: { entityType: 'US_PASSPORT', action: 'REDACT', minScore: 0.8 },
  PRIVATE_KEY: { entityType: 'PRIVATE_KEY', action: 'BLOCK', minScore: 0.85 },
  SEED_PHRASE: { entityType: 'SEED_PHRASE', action: 'BLOCK', minScore: 0.85 },
  API_KEY: { entityType: 'API_KEY', action: 'BLOCK', minScore: 0.8 },
  PASSWORD: { entityType: 'PASSWORD', action: 'BLOCK', minScore: 0.8 },
};

class PolicyRegistry {
  private policies: Map<string, EntityPolicy> = new Map();

  constructor() {
    for (const [key, val] of Object.entries(DEFAULT_POLICIES)) {
      this.policies.set(key.toUpperCase(), { ...val });
    }
  }

  getPolicy(entityType: string): EntityPolicy {
    const key = entityType.toUpperCase();
    return this.policies.get(key) || {
      entityType,
      action: 'TOKENIZE',
      minScore: 0.7,
    };
  }

  getAllPolicies(): EntityPolicy[] {
    return Array.from(this.policies.values());
  }

  setPolicy(policy: EntityPolicy) {
    this.policies.set(policy.entityType.toUpperCase(), { ...policy });
  }

  deletePolicy(entityType: string) {
    this.policies.delete(entityType.toUpperCase());
  }
}

export const policyRegistry = new PolicyRegistry();
