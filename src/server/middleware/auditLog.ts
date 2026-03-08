/**
 * @purpose Audit logging middleware — records state-change/security events
 * @inputs  architect_output/global_middleware_registry.json (audit_log, order 9)
 * @outputs void (post-handler logging, non-blocking)
 * @sideEffects AuditLog CREATE in DB (async)
 * @errors  Never throws — audit failures logged to stderr
 *
 * Runs as a post-handler wrapper: captures outcome after handler completes.
 * For middleware pipeline integration, use auditAction() which logs before handler returns.
 */
import type { MiddlewareFn, RequestContext } from './pipeline';
import {
  logEvent,
  logSecurityEvent,
  extractClientInfo,
} from '@/server/services/auditLogService';

type AuditConfig = {
  action: string;
  resourceType?: string;
  getResourceId?: (ctx: RequestContext) => string | undefined;
  security?: boolean;
};

/**
 * @purpose Create audit log middleware for a specific action
 * @inputs  AuditConfig with action name and resource info
 * @outputs MiddlewareFn that logs after handler (non-blocking)
 *
 * Note: This middleware does NOT short-circuit — it always returns void
 * and lets the handler proceed. The audit event is fired as a side effect.
 * For post-handler audit (success/failure outcome), use the createAuditHandler wrapper.
 */
export function auditAction(config: AuditConfig): MiddlewareFn {
  return async (req, ctx) => {
    // Attach audit info to context for post-handler logging
    const { ipAddress, userAgent } = extractClientInfo(req);

    // Fire-and-forget: log the action attempt
    const payload = {
      userId: ctx.admin?.id,
      action: config.action,
      resourceType: config.resourceType,
      resourceId: config.getResourceId?.(ctx),
      outcome: 'success' as const,
      ipAddress,
      userAgent,
    };

    if (config.security) {
      void logSecurityEvent(payload);
    } else {
      void logEvent(payload);
    }
  };
}

/**
 * @purpose Wrap a handler to log audit events with outcome
 * @inputs  action, handler function
 * @outputs New handler that logs success/failure after execution
 */
export function withAudit(
  config: AuditConfig,
  handler: (req: Request, ctx: RequestContext) => Promise<Response>
) {
  return async (req: Request, ctx: RequestContext): Promise<Response> => {
    const { ipAddress, userAgent } = extractClientInfo(req);
    let outcome: 'success' | 'failure' = 'success';

    try {
      const response = await handler(req, ctx);
      if (response.status >= 400) outcome = 'failure';
      return response;
    } catch (err) {
      outcome = 'failure';
      throw err;
    } finally {
      const payload = {
        userId: ctx.admin?.id,
        action: config.action,
        resourceType: config.resourceType,
        resourceId: config.getResourceId?.(ctx),
        outcome,
        ipAddress,
        userAgent,
      };

      if (config.security) {
        void logSecurityEvent(payload);
      } else {
        void logEvent(payload);
      }
    }
  };
}
