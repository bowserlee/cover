import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { FriendsClient, type Friend } from "./FriendsClient";

export default async function FriendsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  const rows = await db
    .select()
    .from(friends)
    .where(eq(friends.userId, user.id))
    .orderBy(asc(friends.name));

  const initialFriends: Friend[] = rows.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone,
    venmoHandle: f.venmoHandle,
  }));

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </Link>
        <h1 className="font-semibold">Friends</h1>
        <div className="w-12" />
      </header>
      <main className="px-6 py-8 max-w-md mx-auto">
        <FriendsClient initialFriends={initialFriends} />
      </main>
    </div>
  );
}
