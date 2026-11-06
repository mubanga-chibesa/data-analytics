import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the publishable (anon) key, which is safe
// to expose: all access is gated by RLS and the `api` schema views.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
