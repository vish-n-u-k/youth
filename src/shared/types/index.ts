// ============================================
// SHARED TYPES
// ============================================
// Types that are used across client and server
// Prefer deriving types from Zod schemas when possible

// Re-export schema types for convenience
// export type { YourType } from '@/schemas';

// ============================================
// UTILITY TYPES
// ============================================

/** Make specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific properties required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Extract the resolved type of a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
