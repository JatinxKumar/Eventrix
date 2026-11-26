// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

function isValidSupabaseUrl(url: string): boolean {
  if (!url || url.includes("your_project") || url.includes("example.com")) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string): boolean {
  return Boolean(
    key &&
    !key.includes("your_publishable_key") &&
    !key.includes("your_anon_key") &&
    key.length > 20,
  );
}

export const isSupabaseConfigured = isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey);

export const SUPABASE_CONFIG_ERROR =
  "Supabase configuration is missing or still uses placeholder values. Set a valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local and restart the dev server.";

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  if (typeof window === "undefined") {
    if (!serverClient) {
      serverClient = createClient(rawUrl, rawKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
    return serverClient;
  }

  if (!browserClient) {
    browserClient = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
