/**
 * @purpose Set new password using reset token
 * @inputs  SetNewPasswordRequest { token, newPassword, confirmPassword }
 * @outputs SetNewPasswordResponse { message }
 * @sideEffects PasswordResetToken UPDATE (used=true), Admin UPDATE (passwordHash),
 *              Session DELETE ALL for admin, AuditLog CREATE
 * @errors  400 (validation/password mismatch), 410 (expired/used token), 429 (rate limited)
 * @idempotency Single-use token — second call returns 410
 */
import {
  createHandler,
  rateLimit,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { setNewPassword } from '@/server/services/authService';
import { logSecurityEvent, extractClientInfo } from '@/server/services/auditLogService';
import { SetNewPasswordRequestSchema, type SetNewPasswordRequest } from '@/schemas/auth.schema';

export const POST = createHandler({
  middleware: [
    rateLimit('auth_reset'),
    validateBody(SetNewPasswordRequestSchema),
  ],
  handler: async (req) => {
    const body = getParsedBody<SetNewPasswordRequest>(req);
    const { ipAddress, userAgent } = extractClientInfo(req);

    await setNewPassword(body.token, body.newPassword);

    void logSecurityEvent({
      action: 'password_change',
      outcome: 'success',
      ipAddress,
      userAgent,
    });

    return successResponse({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  },
});
