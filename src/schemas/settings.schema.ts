/**
 * @purpose Zod validation schemas for settings module
 * @inputs  contract_output/modules/settings/zod_patch.json
 *          contract_output/modules/settings/openapi.json
 */
import { z } from 'zod';

export const UpdateSettingsRequestSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  zelleRecipientName: z.string().min(1, 'Zelle recipient name is required'),
  zelleContactInfo: z.string().min(1, 'Zelle contact info is required'),
  zelleInstructions: z.string().optional(),
  notifyNewLead: z.boolean(),
  notifyNewEnrollment: z.boolean(),
  notifyPaymentReceived: z.boolean(),
});

export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;
