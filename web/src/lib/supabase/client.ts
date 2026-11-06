import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the publishable (anon) key, which is safe
// to expose: all access is gated by RLS and the `api` schema views.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Our RLS-scoped views live in the `api` schema, not `public`. Default
    // every data query to it (PostgREST sends the Accept-Profile: api header).
    { db: { schema: "api" } },
  );
}
