/**
 * Typed API client for Subjourney backend
 * Provides type-safe methods for all API operations
 */

import { API_BASE_URL } from '../config/environment';
import { supabase } from '../lib/supabase';
import type { AuthContext, ApiError } from './types';

/**
 * API client class with typed methods
 */
export class ApiClient {
  private baseUrl: string;
  private authContext: AuthContext | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the auth context for authenticated requests
   */
  setAuthContext(authContext: AuthContext | null): void {
    this.authContext = authContext;
  }

  /**
   * Get auth headers from Supabase session
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    if (this.authContext) {
      return this.authContext.getAuthHeaders();
    }

    // Fallback: get from Supabase directly
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  /**
   * Make an authenticated request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get auth headers
        const authHeaders = await this.getAuthHeaders();

        // Prepare headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers || {}),
        };

        // Make request
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle 401 - try to refresh token
        if (response.status === 401 && this.authContext?.refreshAccessToken) {
          try {
            await this.authContext.refreshAccessToken();
            // Retry with new token
            const newAuthHeaders = await this.getAuthHeaders();
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                ...headers,
                ...newAuthHeaders,
              },
            });

            if (!retryResponse.ok) {
              throw await this.handleErrorResponse(retryResponse);
            }

            return retryResponse.json();
          } catch (refreshError) {
            // Redirect to login on refresh failure
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            throw new Error('Authentication failed');
          }
        }

        // Handle non-OK responses
        if (!response.ok) {
          throw await this.handleErrorResponse(response);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return {} as T;
        }

        return response.json();
      } catch (error) {
        // Retry on network errors or 5xx errors
        const isRetryable =
          attempt < maxRetries &&
          (error instanceof TypeError || // Network error
            (error instanceof Error && error.message.includes('500')) ||
            (error instanceof Error && error.message.includes('503')) ||
            (error instanceof Error && error.message.includes('502')));

        if (isRetryable) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error('Request failed after all retries');
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    const text = await response.text();
    let errorMessage = `API ${response.status}: ${text}`;

    try {
      const errorData: ApiError = JSON.parse(text);
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Use the text as-is if JSON parsing fails
    }

    // Handle specific status codes
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return new Error('Unauthorized');
    }

    if (response.status === 404) {
      return new Error(errorMessage || 'Resource not found');
    }

    return new Error(errorMessage);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

