import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase client if keys are provided.
// This allows a hybrid architecture: if keys are present (e.g. in Cloudflare Pages), 
// the app connects directly to Supabase serverless. If not, it falls back to the local Express backend.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
