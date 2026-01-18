import { createClient } from '@supabase/supabase-js';

// Use Vite's specific syntax to load environment variables
// This prevents hardcoding secrets in your source code
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Throw a clear error if variables are missing to help with debugging
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase environment variables are missing! " +
    "Check your Vercel Settings or local .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);