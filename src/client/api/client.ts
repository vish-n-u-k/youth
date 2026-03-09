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
  ): Promise<T> {
    const { body, headers, ...rest } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const err = data as Record<string, unknown>;
      throw new ApiError(
        (err.error as string) ?? 'UNKNOWN_ERROR',
        (err.message as string) ?? 'An unexpected error occurred',
        (err.statusCode as number) ?? response.status,
        err.details
      );
    }

    return data as T;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Default client instance
export const api = new ApiClient();

// Export class for custom instances
export { ApiClient };
