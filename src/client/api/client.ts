import type { ApiResponse } from '@/shared/types';

// ============================================
// API CLIENT
// ============================================
// Type-safe fetch wrapper for client-side API calls

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { body, headers, ...rest } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      throw new ApiError(
        data.error?.code ?? 'UNKNOWN_ERROR',
        data.error?.message ?? 'An unexpected error occurred',
        response.status
      );
    }

    return data;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Default client instance
export const api = new ApiClient();

// Export class for custom instances
export { ApiClient };
