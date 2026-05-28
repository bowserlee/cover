import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
  );
}

let client: ReturnType<typeof createSupabaseBrowserClient> | undefined;

export function createBrowserClient() {
  if (!client) {
    client = createSupabaseBrowserClient(url!, key!);
  }
  return client;
}
