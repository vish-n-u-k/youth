#!/usr/bin/env tsx
// ============================================
// INTERACTIVE SETUP WIZARD
// ============================================
// Run: npm run setup

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

const select = async (prompt: string, options: string[]): Promise<number> => {
  console.log(prompt);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`));
  const answer = await question('Enter number: ');
  const index = parseInt(answer, 10) - 1;
  return index >= 0 && index < options.length ? index : 0;
};

const confirm = async (prompt: string, defaultValue = true): Promise<boolean> => {
  const suffix = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await question(`${prompt} ${suffix}: `);
  if (answer.trim() === '') return defaultValue;
  return answer.toLowerCase().startsWith('y');
};

interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    login: { maxAttempts: number; windowMs: number };
    api: { maxAttempts: number; windowMs: number };
  };
  lockout: {
    enabled: boolean;
    maxFailedAttempts: number;
    lockoutDurationMs: number;
    showRemainingAttempts: boolean;
  };
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  session: {
    invalidateOnPasswordChange: boolean;
    maxConcurrentSessions: number | null;
  };
  audit: {
    enabled: boolean;
    storage: 'database' | 'console';
    events: string[];
    retentionDays: number;
  };
}

async function main(): Promise<void> {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                                                             │');
  console.log('│   Next.js Starter Setup                                     │');
  console.log('│                                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Check for .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    console.log('Creating .env.local from .env.example...\n');

    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✓ Created .env.local\n');

      const dbUrl = await question('Database URL (press Enter for default): ');
      if (dbUrl.trim()) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(
          /DATABASE_URL="[^"]*"/,
          `DATABASE_URL="${dbUrl.trim()}"`
        );
        fs.writeFileSync(envPath, envContent);
      }

      // Generate JWT secret
      const crypto = await import('crypto');
      const jwtSecret = crypto.randomBytes(32).toString('base64');
      let envContent = fs.readFileSync(envPath, 'utf-8');
      envContent = envContent.replace(
        /JWT_SECRET="[^"]*"/,
        `JWT_SECRET="${jwtSecret}"`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✓ Generated secure JWT_SECRET\n');
    }
  } else {
    console.log('✓ .env.local already exists\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Security Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const config: SecurityConfig = {
    rateLimit: {
      enabled: false,
      login: { maxAttempts: 5, windowMs: 60_000 },
      api: { maxAttempts: 100, windowMs: 60_000 },
    },
    lockout: {
      enabled: false,
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60_000,
      showRemainingAttempts: true,
    },
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSymbols: false,
    },
    session: {
      invalidateOnPasswordChange: false,
      maxConcurrentSessions: null,
    },
    audit: {
      enabled: false,
      storage: 'database',
      events: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'REGISTER',
        'PASSWORD_CHANGED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
      ],
      retentionDays: 90,
    },
  };

  // Rate Limiting
  config.rateLimit.enabled = await confirm(
    'Enable rate limiting? (Prevents brute force attacks)',
    true
  );
  if (config.rateLimit.enabled) {
    const customRate = await confirm('  Use custom rate limits?', false);
    if (customRate) {
      const loginMax = await question('  Login max attempts per minute [5]: ');
      if (loginMax.trim()) config.rateLimit.login.maxAttempts = parseInt(loginMax, 10);
      const apiMax = await question('  API max requests per minute [100]: ');
      if (apiMax.trim()) config.rateLimit.api.maxAttempts = parseInt(apiMax, 10);
    }
  }
  console.log();

  // Account Lockout
  config.lockout.enabled = await confirm(
    'Enable account lockout? (Lock after failed attempts)',
    true
  );
  if (config.lockout.enabled) {
    const customLockout = await confirm('  Use custom lockout settings?', false);
    if (customLockout) {
      const maxAttempts = await question('  Max failed attempts before lockout [5]: ');
      if (maxAttempts.trim()) config.lockout.maxFailedAttempts = parseInt(maxAttempts, 10);
      const duration = await question('  Lockout duration in minutes [15]: ');
      if (duration.trim()) config.lockout.lockoutDurationMs = parseInt(duration, 10) * 60_000;
    }
  }
  console.log();

  // Password Requirements
  console.log('Password requirements:');
  const minLen = await question('  Minimum length [8]: ');
  if (minLen.trim()) config.password.minLength = parseInt(minLen, 10);
  config.password.requireUppercase = await confirm('  Require uppercase letter?', false);
  config.password.requireLowercase = await confirm('  Require lowercase letter?', false);
  config.password.requireNumbers = await confirm('  Require number?', false);
  config.password.requireSymbols = await confirm('  Require symbol?', false);
  console.log();

  // Session Security
  config.session.invalidateOnPasswordChange = await confirm(
    'Invalidate sessions on password change? (Security best practice)',
    true
  );
  console.log();

  // Audit Logging
  config.audit.enabled = await confirm('Enable audit logging? (Track security events)', true);
  if (config.audit.enabled) {
    const storageIndex = await select('  Storage method:', [
      'Database (recommended)',
      'Console only',
    ]);
    config.audit.storage = storageIndex === 0 ? 'database' : 'console';
  }
  console.log();

  // Generate security.ts
  const securityConfigContent = `// ============================================
// SECURITY CONFIGURATION
// ============================================
// Generated by setup wizard. Edit as needed.
// Run \`npm run setup:security\` to reconfigure.

export const security = {
  // ═══════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════
  rateLimit: {
    enabled: ${config.rateLimit.enabled},
    login: {
      maxAttempts: ${config.rateLimit.login.maxAttempts},
      windowMs: ${config.rateLimit.login.windowMs},
    },
    api: {
      maxAttempts: ${config.rateLimit.api.maxAttempts},
      windowMs: ${config.rateLimit.api.windowMs},
    },
  },

  // ═══════════════════════════════════════════════════════
  // ACCOUNT LOCKOUT
  // ═══════════════════════════════════════════════════════
  lockout: {
    enabled: ${config.lockout.enabled},
    maxFailedAttempts: ${config.lockout.maxFailedAttempts},
    lockoutDurationMs: ${config.lockout.lockoutDurationMs},
    showRemainingAttempts: ${config.lockout.showRemainingAttempts},
  },

  // ═══════════════════════════════════════════════════════
  // PASSWORD REQUIREMENTS
  // ═══════════════════════════════════════════════════════
  password: {
    minLength: ${config.password.minLength},
    maxLength: ${config.password.maxLength},
    requireUppercase: ${config.password.requireUppercase},
    requireLowercase: ${config.password.requireLowercase},
    requireNumbers: ${config.password.requireNumbers},
    requireSymbols: ${config.password.requireSymbols},
  },

  // ═══════════════════════════════════════════════════════
  // SESSION SECURITY
  // ═══════════════════════════════════════════════════════
  session: {
    invalidateOnPasswordChange: ${config.session.invalidateOnPasswordChange},
    maxConcurrentSessions: ${config.session.maxConcurrentSessions},
  },

  // ═══════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════
  audit: {
    enabled: ${config.audit.enabled},
    storage: '${config.audit.storage}' as 'database' | 'console',
    events: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
    ] as const,
    retentionDays: ${config.audit.retentionDays},
  },
} as const;

export type SecurityConfig = typeof security;
export type AuditEvent = (typeof security.audit.events)[number];
`;

  const securityPath = path.join(process.cwd(), 'src/config/security.ts');
  fs.writeFileSync(securityPath, securityConfigContent);
  console.log('✓ Generated src/config/security.ts\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Running Database Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { execSync } = await import('child_process');

  try {
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✓ Prisma client generated\n');

    console.log('Pushing database schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✓ Database schema pushed\n');

    const shouldSeed = await confirm('Seed database with default roles?', true);
    if (shouldSeed) {
      console.log('Seeding database...');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
      console.log('✓ Database seeded\n');
    }
  } catch (error) {
    console.error('Database setup failed. Please check your DATABASE_URL in .env.local');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✓ Setup complete!\n');
  console.log('Security features enabled:');
  console.log(`  • Rate limiting: ${config.rateLimit.enabled ? '✓' : '✗'}`);
  console.log(`  • Account lockout: ${config.lockout.enabled ? '✓' : '✗'}`);
  console.log(`  • Password rules: min ${config.password.minLength} chars${config.password.requireUppercase ? ', uppercase' : ''}${config.password.requireNumbers ? ', number' : ''}${config.password.requireSymbols ? ', symbol' : ''}`);
  console.log(`  • Session invalidation: ${config.session.invalidateOnPasswordChange ? '✓' : '✗'}`);
  console.log(`  • Audit logging: ${config.audit.enabled ? '✓ (' + config.audit.storage + ')' : '✗'}`);
  console.log('\nRun: npm run dev\n');

  rl.close();
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
