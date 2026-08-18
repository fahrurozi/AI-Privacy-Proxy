import fs from 'fs';
import path from 'path';
import { EntityPolicy } from '@ai-privacy-proxy/shared';

export const DEFAULT_POLICIES: Record<string, EntityPolicy> = {
  PERSON: {
    entityType: 'PERSON',
    action: 'TOKENIZE',
    minScore: 0.65,
    enabled: true,
    description: 'Personal human names and identities identified by NLP models.',
  },
  EMAIL_ADDRESS: {
    entityType: 'EMAIL_ADDRESS',
    action: 'TOKENIZE',
    minScore: 0.75,
    enabled: true,
    description: 'Electronic mail addresses (e.g. user@domain.com) detected via RFC-5322 regex and NLP.',
  },
  PHONE_NUMBER: {
    entityType: 'PHONE_NUMBER',
    action: 'TOKENIZE',
    minScore: 0.7,
    enabled: true,
    description: 'International and regional telephone and mobile contact numbers.',
  },
  IP_ADDRESS: {
    entityType: 'IP_ADDRESS',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'IPv4 and IPv6 public or private network addresses.',
  },
  ETHEREUM_ADDRESS: {
    entityType: 'ETHEREUM_ADDRESS',
    action: 'TOKENIZE',
    minScore: 0.85,
    enabled: true,
    description: 'Ethereum and EVM-compatible 40-character hexadecimal crypto wallet addresses (0x...).',
  },
  SOLANA_ADDRESS: {
    entityType: 'SOLANA_ADDRESS',
    action: 'TOKENIZE',
    minScore: 0.75,
    enabled: true,
    description: 'Solana base58-encoded public keys (32 to 44 characters).',
  },
  CREDIT_CARD: {
    entityType: 'CREDIT_CARD',
    action: 'REDACT',
    minScore: 0.8,
    enabled: true,
    description: 'Visa, MasterCard, Amex payment card numbers (masked permanently as [REDACTED]).',
  },
  US_SSN: {
    entityType: 'US_SSN',
    action: 'REDACT',
    minScore: 0.8,
    enabled: true,
    description: 'United States Social Security Numbers (SSN).',
  },
  US_PASSPORT: {
    entityType: 'US_PASSPORT',
    action: 'REDACT',
    minScore: 0.8,
    enabled: true,
    description: 'Government issued passport identification numbers.',
  },
  INDONESIAN_KTP: {
    entityType: 'INDONESIAN_KTP',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'Indonesian National Identification Number (NIK / KTP 16-digit).',
  },
  PASSPORT_NUMBER: {
    entityType: 'PASSPORT_NUMBER',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'Government issued passport identification numbers.',
  },
  DRIVER_LICENSE: {
    entityType: 'DRIVER_LICENSE',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'Driver license numbers (e.g. Indonesian SIM).',
  },
  BANK_ACCOUNT: {
    entityType: 'BANK_ACCOUNT',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'Bank account numbers (e.g. BCA, Mandiri, BRI, BNI).',
  },
  CUSTOMER_ID: {
    entityType: 'CUSTOMER_ID',
    action: 'TOKENIZE',
    minScore: 0.8,
    enabled: true,
    description: 'Customer reference and account identifiers.',
  },
  LOCATION: {
    entityType: 'LOCATION',
    action: 'TOKENIZE',
    minScore: 0.7,
    enabled: true,
    description: 'Street addresses, cities, provinces, and geographic locations.',
  },
  PRIVATE_KEY: {
    entityType: 'PRIVATE_KEY',
    action: 'BLOCK',
    minScore: 0.85,
    enabled: true,
    description: 'Cryptographic 64-hex private keys and secret seeds. Requests are blocked immediately.',
  },
  SEED_PHRASE: {
    entityType: 'SEED_PHRASE',
    action: 'BLOCK',
    minScore: 0.85,
    enabled: true,
    description: 'BIP-39 mnemonic 12/24 recovery seed phrases. Requests are blocked immediately.',
  },
  API_KEY: {
    entityType: 'API_KEY',
    action: 'BLOCK',
    minScore: 0.8,
    enabled: true,
    description: 'Secret tokens, OpenAI/Anthropic keys, GitHub PATs, and AWS access credentials.',
  },
  PASSWORD: {
    entityType: 'PASSWORD',
    action: 'BLOCK',
    minScore: 0.8,
    enabled: true,
    description: 'Raw password assignments and plaintext authentication secrets.',
  },
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const POLICIES_FILE = path.join(DATA_DIR, 'policies.json');

class PolicyRegistry {
  private policies: Map<string, EntityPolicy> = new Map();

  constructor() {
    for (const [key, val] of Object.entries(DEFAULT_POLICIES)) {
      this.policies.set(key.toUpperCase(), { ...val });
    }
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(POLICIES_FILE)) {
        const raw = fs.readFileSync(POLICIES_FILE, 'utf-8');
        const list: EntityPolicy[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const p of list) {
            this.policies.set(p.entityType.toUpperCase(), p);
          }
        }
      }
    } catch {}
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(POLICIES_FILE, JSON.stringify(Array.from(this.policies.values()), null, 2), 'utf-8');
    } catch {}
  }

  getPolicy(entityType: string): EntityPolicy {
    const key = entityType.toUpperCase();
    return this.policies.get(key) || {
      entityType,
      action: 'TOKENIZE',
      minScore: 0.7,
      enabled: true,
      description: 'Custom entity rule.',
    };
  }

  getAllPolicies(): EntityPolicy[] {
    return Array.from(this.policies.values());
  }

  setPolicy(policy: EntityPolicy) {
    const key = policy.entityType.toUpperCase();
    const existing = this.policies.get(key);
    this.policies.set(key, {
      ...existing,
      ...policy,
      enabled: policy.enabled ?? existing?.enabled ?? true,
      description: policy.description || existing?.description || 'Custom configured entity rule.',
    });
    this.saveToDisk();
  }

  deletePolicy(entityType: string) {
    this.policies.delete(entityType.toUpperCase());
    this.saveToDisk();
  }
}

export const policyRegistry = new PolicyRegistry();
