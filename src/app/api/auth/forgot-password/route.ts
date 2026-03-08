/**
 * @purpose Request password reset — sends email with reset link
 * @inputs  PasswordResetRequest { email }
 * @outputs PasswordResetResponse { message } — always success (timing-safe, AA-A-03)
 * @sideEffects PasswordResetToken CREATE, email enqueue via sendTriggeredEmail
 * @errors  429 (rate limited), 400 (validation)
 * @idempotency Safe — creates new token each call; previous tokens remain valid
 */
import {
  createHandler,
  rateLimit,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { requestPasswordReset } from '@/server/services/authService';
import { sendEmail } from '@/server/services/emailService';
import { getEnv } from '@/server/config/env';
import { PasswordResetRequestSchema, type PasswordResetRequest } from '@/schemas/auth.schema';

export const POST = createHandler({
  middleware: [
    rateLimit('auth_recovery'),
    validateBody(PasswordResetRequestSchema),
  ],
  handler: async (req) => {
    const body = getParsedBody<PasswordResetRequest>(req);

    const result = await requestPasswordReset(body.email);

    if (result) {
      const env = getEnv();
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${result.token}`;
      void sendEmail({
        to: body.email,
        subject: 'Password Reset Request',
        htmlBody: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 24 hours. If you did not request this, you can safely ignore this email.</p>`,
        triggerEvent: undefined,
      });
    }

    // Always return success — AA-A-03 email enumeration protection
    return successResponse({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  },
});
