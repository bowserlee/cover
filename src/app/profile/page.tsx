import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const safeRedirectTo =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [profile] = await db
    .select({ venmoHandle: profiles.venmoHandle })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </Link>
        <h1 className="font-semibold">Profile</h1>
        <div className="w-12" />
      </header>
      <main className="px-6 py-8 max-w-md mx-auto">
        <ProfileForm
          initialVenmoHandle={profile?.venmoHandle ?? ""}
          redirectTo={safeRedirectTo}
        />
      </main>
    </div>
  );
}
