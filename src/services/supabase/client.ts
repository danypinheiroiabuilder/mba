import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/config/env";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.supabase.anonKey;

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (client) return client;
  if (!url || !anonKey) return null;

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export function requireSupabase() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error(
      "Supabase env vars ausentes: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return sb;
}

