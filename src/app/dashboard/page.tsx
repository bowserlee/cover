import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallPrompt } from "@/components/InstallPrompt";

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
        <SignOutButton />
      </header>
      <main className="px-6 py-12 max-w-md mx-auto text-center">
        <p className="text-neutral-500 mb-2">Signed in as</p>
        <p className="font-medium mb-12">{user.email}</p>
        <button
          disabled
          className="w-full bg-black text-white rounded-full py-3 font-medium opacity-50 cursor-not-allowed"
        >
          New bill (coming soon)
        </button>
      </main>
      <InstallPrompt />
    </div>
  );
}
