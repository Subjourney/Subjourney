/**
 * Environment configuration
 * Centralized configuration for API URLs and environment detection
 */

/**
 * Get the API base URL based on environment
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (import.meta.env.DEV) {
    // Development: call backend directly
    return 'http://localhost:8001';
  }

  if (envUrl) {
    return envUrl;
  }

  // Fallback to staging URL
  return 'https://backend-staging-310530487671.us-central1.run.app';
};

/**
 * Check if we're in local development mode
 */
export const isLocalDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

/**
 * API base URL
 */
export const API_BASE_URL = getApiBaseUrl();

