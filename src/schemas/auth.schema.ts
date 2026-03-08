/**
 * @purpose Zod validation schemas for auth_accounts module
 * @inputs  contract_output/modules/auth_accounts/zod_patch.json
 *          contract_output/modules/auth_accounts/openapi.json
 */
import { z } from 'zod';

export const AdminLoginRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export const SetNewPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});

export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type SetNewPasswordRequest = z.infer<typeof SetNewPasswordRequestSchema>;
