import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface UpdateFriendPayload {
  name?: string;
  phone?: string | null;
  venmoHandle?: string | null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: UpdateFriendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates: Partial<typeof friends.$inferInsert> = {};
  if (typeof payload.name === "string") {
    if (!payload.name.trim()) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    updates.name = payload.name.trim();
  }
  if (payload.phone !== undefined) {
    updates.phone = payload.phone?.trim() || null;
  }
  if (payload.venmoHandle !== undefined) {
    updates.venmoHandle = payload.venmoHandle?.trim().replace(/^@/, "") || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(friends)
    .set(updates)
    .where(and(eq(friends.id, id), eq(friends.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const deleted = await db
    .delete(friends)
    .where(and(eq(friends.id, id), eq(friends.userId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
