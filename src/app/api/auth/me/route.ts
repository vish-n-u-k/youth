/**
 * @purpose Get current session / validate auth
 * @inputs  Authenticated admin session (cookie)
 * @outputs AdminLoginResponse { user: { id, email, role, name } }
 * @sideEffects None (read-only)
 * @errors  401 (unauthenticated / session expired)
 */
import {
  createHandler,
  authSession,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';

export const GET = createHandler({
  middleware: [authSession],
  handler: async (_req, ctx) => {
    return successResponse({ user: ctx.admin });
  },
});
