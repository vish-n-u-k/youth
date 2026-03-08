/**
 * @purpose Business rule guard middleware skeleton
 * @inputs  architect_output/global_middleware_registry.json (business_rule_guard, order 8)
 * @outputs Per-endpoint business rule check factories
 * @sideEffects DB reads for validation checks
 * @errors  400/409/410 depending on rule violation type
 *
 * Each guarded endpoint defines its own rule set. This file provides the factory
 * pattern; module-level implementations fill in the rules.
 *
 * Architecture-defined rules (to be implemented per module):
 *   - auth_token_validation (auth_accounts)
 *   - lead_status_transition (lead_management, GP-04)
 *   - enrollment_duplicate_check (enrollment_trial, GP-01)
 *   - enrollment_capacity_check (enrollment_trial)
 *   - enrollment_coupon_validation (enrollment_trial)
 *   - program_activation_prereq (program_pricing)
 *   - payment_amount_validation (payment_tracking)
 *   - calendar_uniqueness (calendar_scheduling)
 *   - calendar_fk_constraint (calendar_scheduling)
 *   - template_variable_validation (communication, GP-03)
 *   - email_retry_guard (communication)
 *   - settings_zelle_validation (settings)
 */
import type { MiddlewareFn } from './pipeline';

export type BusinessRuleFn = MiddlewareFn;

/**
 * @purpose Compose multiple business rules into a single middleware
 * @inputs  Array of BusinessRuleFn
 * @outputs Single MiddlewareFn that runs all rules in order
 */
export function composeRules(...rules: BusinessRuleFn[]): MiddlewareFn {
  return async (req, ctx) => {
    for (const rule of rules) {
      const result = await rule(req, ctx);
      if (result) return result;
    }
    return undefined;
  };
}
