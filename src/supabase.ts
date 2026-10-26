import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Keys come ONLY from environment variables. Never hardcode them here,
// never log them, and never commit a .env file with real values.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
