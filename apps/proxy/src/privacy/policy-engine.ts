import { PresidioEntity, PrivacyAction } from '@ai-privacy-proxy/shared';
import { policyRegistry } from '../config/policy.js';

export interface EvaluatedEntity {
  entity: PresidioEntity;
  action: PrivacyAction;
}

export class PolicyEngine {
  evaluate(entities: PresidioEntity[]): EvaluatedEntity[] {
    const results: EvaluatedEntity[] = [];

    for (const entity of entities) {
      const policy = policyRegistry.getPolicy(entity.entity_type);

      // If policy is disabled, pass it through
      if (policy.enabled === false) {
        results.push({ entity, action: 'PASS' });
        continue;
      }

      const minScore = policy.minScore ?? 0.6;

      if (entity.score < minScore) {
        // Below confidence threshold -> PASS
        results.push({ entity, action: 'PASS' });
        continue;
      }

      results.push({ entity, action: policy.action });
    }

    return results;
  }
}

export const policyEngine = new PolicyEngine();
