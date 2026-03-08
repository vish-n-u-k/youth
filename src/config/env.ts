/**
 * @purpose Re-export environment config from server module
 * @deprecated Use @/server/config/env directly
 */
export { getEnv, isProduction, isDevelopment, type EnvConfig } from '@/server/config/env';
