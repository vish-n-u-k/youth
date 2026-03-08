/**
 * @purpose Middleware barrel exports
 * @inputs  architect_output/global_middleware_registry.json
 *
 * Execution order (per architecture):
 *   1. request_id      — handled by pipeline.ts (createHandler generates UUID)
 *   2. cors            — handled by root middleware.ts
 *   3. helmet          — handled by root middleware.ts (security headers)
 *   4. rate_limit      — rateLimit()
 *   5. auth_session    — authSession
 *   6. role_permission — requireRole()
 *   7. input_validation — validateBody(), validateQuery()
 *   8. business_rules  — composeRules()
 *   9. audit_log       — auditAction(), withAudit()
 *  10. error_handler   — handled by pipeline.ts (createHandler catch)
 */
export { createHandler, type RequestContext, type MiddlewareFn, type HandlerFn } from './pipeline';
export { authSession } from './auth';
export { requireRole } from './rbac';
export { rateLimit } from './rateLimit';
export { validateBody, validateQuery, getParsedBody, getParsedQuery } from './validation';
export { auditAction, withAudit } from './auditLog';
export { composeRules, type BusinessRuleFn } from './businessRules';
