// ============================================
// PASSWORD RULES
// ============================================
// Validate password complexity based on config.

import { security } from '@/config/security';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  requirements: PasswordRequirement[];
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Validate password against configured rules
 */
export function validatePassword(password: string): PasswordValidationResult {
  const config = security.password;
  const errors: string[] = [];
  const requirements: PasswordRequirement[] = [];

  // Min length
  const minLengthMet = password.length >= config.minLength;
  requirements.push({
    label: `At least ${config.minLength} characters`,
    met: minLengthMet,
  });
  if (!minLengthMet) {
    errors.push(`Password must be at least ${config.minLength} characters`);
  }

  // Max length
  const maxLengthMet = password.length <= config.maxLength;
  if (!maxLengthMet) {
    errors.push(`Password must be no more than ${config.maxLength} characters`);
  }

  // Uppercase
  if (config.requireUppercase) {
    const hasUppercase = /[A-Z]/.test(password);
    requirements.push({
      label: 'One uppercase letter',
      met: hasUppercase,
    });
    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
  }

  // Lowercase
  if (config.requireLowercase) {
    const hasLowercase = /[a-z]/.test(password);
    requirements.push({
      label: 'One lowercase letter',
      met: hasLowercase,
    });
    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
  }

  // Numbers
  if (config.requireNumbers) {
    const hasNumber = /[0-9]/.test(password);
    requirements.push({
      label: 'One number',
      met: hasNumber,
    });
    if (!hasNumber) {
      errors.push('Password must contain at least one number');
    }
  }

  // Symbols
  if (config.requireSymbols) {
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    requirements.push({
      label: 'One symbol (!@#$%^&*...)',
      met: hasSymbol,
    });
    if (!hasSymbol) {
      errors.push('Password must contain at least one symbol');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requirements,
  };
}

/**
 * Get password requirements for display (e.g., in registration form)
 */
export function getPasswordRequirements(): string[] {
  const config = security.password;
  const requirements: string[] = [];

  requirements.push(`At least ${config.minLength} characters`);

  if (config.requireUppercase) {
    requirements.push('One uppercase letter (A-Z)');
  }
  if (config.requireLowercase) {
    requirements.push('One lowercase letter (a-z)');
  }
  if (config.requireNumbers) {
    requirements.push('One number (0-9)');
  }
  if (config.requireSymbols) {
    requirements.push('One symbol (!@#$%^&*...)');
  }

  return requirements;
}

/**
 * Generate Zod schema string for password validation
 * Useful for client-side validation
 */
export function getPasswordZodSchema(): string {
  const config = security.password;
  let schema = `z.string().min(${config.minLength}).max(${config.maxLength})`;

  if (config.requireUppercase) {
    schema += `.regex(/[A-Z]/, 'Must contain uppercase letter')`;
  }
  if (config.requireLowercase) {
    schema += `.regex(/[a-z]/, 'Must contain lowercase letter')`;
  }
  if (config.requireNumbers) {
    schema += `.regex(/[0-9]/, 'Must contain number')`;
  }
  if (config.requireSymbols) {
    schema += `.regex(/[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]/, 'Must contain symbol')`;
  }

  return schema;
}
