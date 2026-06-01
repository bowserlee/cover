import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { DraftsList } from "@/components/DraftsList";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Cover</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="text-sm text-neutral-500 hover:text-black transition"
          >
            Profile
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="px-6 py-8 max-w-md mx-auto flex flex-col gap-8">
        <div className="text-center">
          <p className="text-neutral-500 mb-1 text-sm">Signed in as</p>
          <p className="font-medium mb-6">{user.email}</p>
          <Link
            href="/new"
            className="inline-block w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
          >
            New bill
          </Link>
        </div>

        <section>
          <h2 className="text-sm font-medium text-neutral-500 mb-3 uppercase tracking-wide">
            Your bills
          </h2>
          <DraftsList userId={user.id} />
        </section>
      </main>
      <InstallPrompt />
    </div>
  );
}
