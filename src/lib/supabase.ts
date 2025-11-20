/**
 * Supabase client configuration
 * 
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 * 
 * For local development with Supabase CLI:
 * - VITE_SUPABASE_URL=http://127.0.0.1:54321
 * - VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL from environment or use local dev default
// For Supabase CLI (recommended): http://127.0.0.1:54321
// For Docker Compose: http://127.0.0.1:8000 (Kong gateway)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// Get Supabase anon key from environment or use local dev default
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Validate that we have required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
  );
}

/**
 * Supabase client instance
 * Configured with authentication settings for automatic session management
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-client-info': 'subjourney-web',
    },
  },
});

