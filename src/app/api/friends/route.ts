import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

interface CreateFriendPayload {
  name: string;
  phone?: string;
  venmoHandle?: string;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(friends)
    .where(eq(friends.userId, user.id))
    .orderBy(asc(friends.name));

  return NextResponse.json({ friends: rows });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CreateFriendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const cleanVenmo = payload.venmoHandle?.trim().replace(/^@/, "") || null;

  const db = getDb();
  const [created] = await db
    .insert(friends)
    .values({
      userId: user.id,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      venmoHandle: cleanVenmo,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
