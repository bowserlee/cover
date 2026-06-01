import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DraftsList } from "@/components/DraftsList";

export default async function SettledPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </Link>
        <h1 className="font-semibold">Settled</h1>
        <div className="w-12" />
      </header>
      <main className="px-6 py-8 max-w-md mx-auto">
        <DraftsList
          userId={user.id}
          status="closed"
          emptyMessage="No settled bills yet."
        />
      </main>
    </div>
  );
}
