/*import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For client-side usage
export const createClientComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
}; 
*/

// lib/supabase.ts
// Supabase client with safe defaults for build time

import { createClient } from '@supabase/supabase-js';

// ========================================
// ENVIRONMENT VARIABLES WITH FALLBACKS
// Get Supabase credentials from environment variables
// Use empty strings as fallback to prevent build errors
// ========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ========================================
// VALIDATE ENVIRONMENT VARIABLES
// Log warnings if credentials are missing
// ========================================
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing! Set these environment variables:');
  console.warn('  - NEXT_PUBLIC_SUPABASE_URL');
  console.warn('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.warn('App will not work properly without these credentials.');
}

// ========================================
// CREATE SUPABASE CLIENT
// Initialize the Supabase client with credentials
// If credentials are missing, this will still create a client
// but database operations will fail gracefully
// ========================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for serverless
  },
});

// ========================================
// CREATE CLIENT COMPONENT CLIENT
// For use in client-side React components
// ========================================
export const createClientComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// ========================================
// HELPER: CHECK IF SUPABASE IS CONFIGURED
// Returns true if environment variables are set
// ========================================
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};