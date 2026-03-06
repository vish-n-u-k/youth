// ============================================
// SHARED UTILITIES
// ============================================
// Pure functions that can be used on client and server
// No side effects, no external dependencies

/**
 * Type-safe check if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Assert a condition is true, throw if not
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Exhaustive check for switch statements
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a debounced version of a function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format a date to ISO string (for JSON serialization)
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Safe JSON parse with type
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Combine class names (simple implementation)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
