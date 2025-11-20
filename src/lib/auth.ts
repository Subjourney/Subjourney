/**
 * Authentication utilities using Supabase
 */

import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Get the current user session
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  firstName?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || '',
      },
    },
  });
  return { data, error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

