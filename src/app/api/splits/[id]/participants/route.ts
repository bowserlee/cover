import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { splits, participants, itemAssignments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface AddParticipantPayload {
  name: string;
  phone?: string;
  venmoHandle?: string;
  isHost?: boolean;
}

async function ownsSplit(splitId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: splits.id })
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, userId)))
    .limit(1);
  return !!row;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: splitId } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await ownsSplit(splitId, user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: AddParticipantPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const isHost = payload.isHost === true;

  const db = getDb();

  // Only one host participant per bill
  if (isHost) {
    const [existingHost] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(eq(participants.splitId, splitId), eq(participants.isHost, true))
      )
      .limit(1);
    if (existingHost) {
      return NextResponse.json(
        { error: "host_already_added" },
        { status: 409 }
      );
    }
  }

  const [newParticipant] = await db
    .insert(participants)
    .values({
      splitId,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      venmoHandle: payload.venmoHandle?.trim() || null,
      isHost,
    })
    .returning({
      id: participants.id,
      name: participants.name,
      phone: participants.phone,
      venmoHandle: participants.venmoHandle,
      isHost: participants.isHost,
    });

  return NextResponse.json(newParticipant, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: splitId } = await context.params;
  const url = new URL(request.url);
  const participantId = url.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json({ error: "missing_participantId" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await ownsSplit(splitId, user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const db = getDb();

  const [existingAssignment] = await db
    .select({ id: itemAssignments.id })
    .from(itemAssignments)
    .where(eq(itemAssignments.participantId, participantId))
    .limit(1);
  if (existingAssignment) {
    return NextResponse.json(
      { error: "has_assignments" },
      { status: 409 }
    );
  }

  await db
    .delete(participants)
    .where(
      and(eq(participants.id, participantId), eq(participants.splitId, splitId))
    );

  return NextResponse.json({ ok: true });
}
