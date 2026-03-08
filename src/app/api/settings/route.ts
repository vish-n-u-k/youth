/**
 * @purpose Settings API routes: GET and PUT /api/settings
 * @inputs  architect_output/modules/settings/be_policy_flow.json
 *          contract_output/modules/settings/openapi.json
 * @outputs GET: SettingsResponse, PUT: SettingsResponse
 * @sideEffects PUT: LocationSettings UPDATE, AuditLog CREATE
 * @errors  400 (validation), 401 (unauthenticated), 404 (settings not found), 500 (internal)
 * @idempotency PUT is idempotent (same input produces same state)
 */
import { NextRequest } from 'next/server';
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
  auditAction,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { UpdateSettingsRequestSchema, type UpdateSettingsRequest } from '@/schemas/settings.schema';

/**
 * @purpose Get current location settings
 * @inputs  Authenticated admin session
 * @outputs SettingsResponse
 * @sideEffects None (read-only)
 * @errors  401 (unauthenticated), 404 (no settings record)
 */
export const GET = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
  ],
  handler: async (_req: NextRequest) => {
    const settings = await db.locationSettings.findFirst();
    if (!settings) {
      throw AppError.notFound('Settings');
    }
    return successResponse({
      locationId: settings.id,
      businessName: settings.businessName,
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      websiteUrl: settings.websiteUrl,
      zelleRecipientName: settings.zelleRecipientName ?? '',
      zelleContactInfo: settings.zelleContactInfo ?? '',
      zelleInstructions: settings.zelleInstructions,
      notifyNewLead: settings.notifyNewLead,
      notifyNewEnrollment: settings.notifyNewEnrollment,
      notifyPaymentReceived: settings.notifyPaymentReceived,
    });
  },
});

/**
 * @purpose Update location settings
 * @inputs  UpdateSettingsRequest body, authenticated admin session
 * @outputs Updated SettingsResponse
 * @sideEffects LocationSettings UPDATE, AuditLog CREATE (audit_settings_update)
 * @errors  400 (validation), 401 (unauthenticated), 404 (no settings record)
 * @idempotency Idempotent — same input produces same DB state
 */
export const PUT = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(UpdateSettingsRequestSchema),
    auditAction({
      action: 'audit_settings_update',
      resourceType: 'LocationSettings',
    }),
  ],
  handler: async (req: NextRequest) => {
    const body = getParsedBody<UpdateSettingsRequest>(req);

    const existing = await db.locationSettings.findFirst();
    if (!existing) {
      throw AppError.notFound('Settings');
    }

    const updated = await db.locationSettings.update({
      where: { id: existing.id },
      data: {
        businessName: body.businessName,
        address: body.address,
        phone: body.phone,
        email: body.email,
        websiteUrl: body.websiteUrl || null,
        zelleRecipientName: body.zelleRecipientName,
        zelleContactInfo: body.zelleContactInfo,
        zelleInstructions: body.zelleInstructions || null,
        notifyNewLead: body.notifyNewLead,
        notifyNewEnrollment: body.notifyNewEnrollment,
        notifyPaymentReceived: body.notifyPaymentReceived,
      },
    });

    return successResponse({
      locationId: updated.id,
      businessName: updated.businessName,
      address: updated.address ?? '',
      phone: updated.phone ?? '',
      email: updated.email ?? '',
      websiteUrl: updated.websiteUrl,
      zelleRecipientName: updated.zelleRecipientName ?? '',
      zelleContactInfo: updated.zelleContactInfo ?? '',
      zelleInstructions: updated.zelleInstructions,
      notifyNewLead: updated.notifyNewLead,
      notifyNewEnrollment: updated.notifyNewEnrollment,
      notifyPaymentReceived: updated.notifyPaymentReceived,
    });
  },
});
