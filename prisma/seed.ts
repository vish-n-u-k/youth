// ============================================
// DATABASE SEED SCRIPT
// ============================================
//
// @purpose    Seeds the database with required bootstrap data:
//             - LocationSettings (single record, ST-A-01)
//             - Default Admin user (admin@platform.com)
//             - Default email templates (6 trigger-mapped templates)
//             - Automation rules (6 pre-seeded, one per TriggerEvent)
//
// @inputs     architect_output/production_bootstrap.json
//             architect_output/global_services_registry.json
//             architect_output/modules/communication/db_flow.json
//
// @idempotency  Uses upsert with deterministic unique keys to prevent
//               duplicate rows on re-run. Safe after partial failure.
//
// Run: npx prisma db seed
// ============================================

import { PrismaClient, TriggerEvent } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ═══════════════════════════════════════════════════════
  // 1. LOCATION SETTINGS (single record for MVP)
  // Uniqueness key: first record (findFirst + create-if-missing)
  // ═══════════════════════════════════════════════════════
  const existingSettings = await prisma.locationSettings.findFirst();
  let locationSettingsId: string;

  if (!existingSettings) {
    const settings = await prisma.locationSettings.create({
      data: {
        businessName: 'My Youth Program',
        address: '',
        phone: '',
        email: '',
        websiteUrl: '',
        zelleRecipientName: null,
        zelleContactInfo: null,
        zelleInstructions: null,
        notifyNewLead: true,
        notifyNewEnrollment: true,
        notifyPaymentReceived: true,
        paymentOverdueDays: 3,
      },
    });
    locationSettingsId = settings.id;
    console.log('  Created LocationSettings');
  } else {
    locationSettingsId = existingSettings.id;
    console.log('  LocationSettings already exists, skipped');
  }

  // ═══════════════════════════════════════════════════════
  // 2. DEFAULT ADMIN USER
  // Uniqueness key: email (@@unique)
  // Password must be changed on first login.
  // ═══════════════════════════════════════════════════════
  const adminEmail = 'admin@platform.com';
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const saltRounds = 10;
    const defaultPassword = 'changeme123';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    await prisma.admin.create({
      data: {
        email: adminEmail,
        name: 'Platform Admin',
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`  Created default admin: ${adminEmail} (password: ${defaultPassword})`);
  } else {
    console.log('  Admin user already exists, skipped');
  }

  // ═══════════════════════════════════════════════════════
  // 3. DEFAULT EMAIL TEMPLATES
  // Uniqueness key: triggerEvent on Template (used for matching)
  // 6 templates matching the 6 TriggerEvent values.
  // ═══════════════════════════════════════════════════════
  const defaultTemplates = [
    {
      name: 'Lead Created Welcome',
      subject: 'Welcome to {{businessName}}!',
      body: 'Hi {{parentName}},\n\nThank you for your interest in {{businessName}}! We are excited to help your child discover our programs.\n\nFeel free to browse our programs and book a trial class.\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.LEAD_CREATED,
    },
    {
      name: 'Trial Booking Confirmation',
      subject: 'Trial Class Confirmed - {{programName}}',
      body: 'Hi {{parentName}},\n\nYour trial class has been booked!\n\nProgram: {{programName}}\nChild: {{childName}}\nDate: {{trialDate}}\n\nWe look forward to seeing {{childName}}!\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.TRIAL_SCHEDULED,
    },
    {
      name: 'Trial Approaching Reminder',
      subject: 'Reminder: Trial Class Tomorrow - {{programName}}',
      body: 'Hi {{parentName}},\n\nThis is a friendly reminder that {{childName}} has a trial class coming up!\n\nProgram: {{programName}}\nDate: {{trialDate}}\n\nWe look forward to seeing you!\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.TRIAL_APPROACHING,
    },
    {
      name: 'Enrollment Confirmation',
      subject: 'Enrollment Confirmed - {{programName}}',
      body: 'Hi {{parentName}},\n\nCongratulations! {{childName}} has been enrolled in {{programName}}.\n\nTotal Due: ${{totalDue}}\n\nPlease complete your payment via Zelle using the instructions on your confirmation page.\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.ENROLLMENT_COMPLETED,
    },
    {
      name: 'Payment Overdue Reminder',
      subject: 'Payment Reminder - {{programName}}',
      body: 'Hi {{parentName}},\n\nThis is a reminder that your payment for {{childName}}\'s enrollment in {{programName}} is still pending.\n\nAmount Due: ${{amountDue}}\n\nPlease send your payment via Zelle at your earliest convenience.\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.PAYMENT_OVERDUE,
    },
    {
      name: 'Class Starting Soon',
      subject: 'Class Starting Soon - {{programName}}',
      body: 'Hi {{parentName}},\n\n{{programName}} is starting soon!\n\nStart Date: {{startDate}}\n\nPlease make sure {{childName}} is ready for the first class.\n\nBest regards,\n{{businessName}}',
      triggerEvent: TriggerEvent.CLASS_START_APPROACHING,
    },
  ];

  const templateIds: Record<string, string> = {};

  for (const tmpl of defaultTemplates) {
    const existing = await prisma.template.findFirst({
      where: { triggerEvent: tmpl.triggerEvent, isDefault: true },
    });

    if (!existing) {
      const created = await prisma.template.create({
        data: {
          name: tmpl.name,
          subject: tmpl.subject,
          body: tmpl.body,
          isDefault: true,
          triggerEvent: tmpl.triggerEvent,
        },
      });
      templateIds[tmpl.triggerEvent] = created.id;
      console.log(`  Created template: ${tmpl.name}`);
    } else {
      templateIds[tmpl.triggerEvent] = existing.id;
      console.log(`  Template "${tmpl.name}" already exists, skipped`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // 4. AUTOMATION RULES (6 pre-seeded, one per TriggerEvent)
  // Uniqueness key: triggerEvent (@@unique on Automation)
  // ═══════════════════════════════════════════════════════
  const automationConfigs = [
    { triggerEvent: TriggerEvent.LEAD_CREATED, delayMinutes: 0, enabled: true },
    { triggerEvent: TriggerEvent.TRIAL_SCHEDULED, delayMinutes: 0, enabled: true },
    { triggerEvent: TriggerEvent.TRIAL_APPROACHING, delayMinutes: 1440, enabled: true },
    { triggerEvent: TriggerEvent.ENROLLMENT_COMPLETED, delayMinutes: 0, enabled: true },
    { triggerEvent: TriggerEvent.PAYMENT_OVERDUE, delayMinutes: 0, enabled: true },
    { triggerEvent: TriggerEvent.CLASS_START_APPROACHING, delayMinutes: 1440, enabled: true },
  ];

  for (const auto of automationConfigs) {
    const templateId = templateIds[auto.triggerEvent];
    if (!templateId) {
      console.warn(`  WARNING: No template found for ${auto.triggerEvent}, skipping automation`);
      continue;
    }

    const existing = await prisma.automation.findUnique({
      where: { triggerEvent: auto.triggerEvent },
    });

    if (!existing) {
      await prisma.automation.create({
        data: {
          triggerEvent: auto.triggerEvent,
          templateId,
          delayMinutes: auto.delayMinutes,
          enabled: auto.enabled,
        },
      });
      console.log(`  Created automation: ${auto.triggerEvent}`);
    } else {
      console.log(`  Automation "${auto.triggerEvent}" already exists, skipped`);
    }
  }

  console.log('\nSeeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
