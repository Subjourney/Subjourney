/**
 * API-specific types
 */

import type { EntityId } from '../types';

/**
 * API error response
 */
export interface ApiError {
  detail: string;
  status_code?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Auth context interface for API client
 */
export interface AuthContext {
  getAuthHeaders: () => Promise<HeadersInit>;
  refreshAccessToken?: () => Promise<void>;
}

