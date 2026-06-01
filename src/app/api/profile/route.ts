import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

interface UpdateProfilePayload {
  venmoHandle?: string | null;
  displayName?: string | null;
}

export async function PUT(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: UpdateProfilePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const cleanHandle = payload.venmoHandle?.trim().replace(/^@/, "") || null;
  const cleanName = payload.displayName?.trim() || null;

  const db = getDb();

  await db
    .insert(profiles)
    .values({
      id: user.id,
      venmoHandle: cleanHandle,
      displayName: cleanName,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        venmoHandle: sql`excluded.venmo_handle`,
        displayName: sql`excluded.display_name`,
      },
    });

  return NextResponse.json({ ok: true });
}
