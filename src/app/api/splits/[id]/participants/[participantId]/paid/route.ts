import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { splits, participants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface SetPaidPayload {
  paid: boolean;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id: splitId, participantId } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [splitRow] = await db
    .select({ id: splits.id })
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!splitRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: SetPaidPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof payload.paid !== "boolean") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  await db
    .update(participants)
    .set({ paid: payload.paid })
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.splitId, splitId)
      )
    );

  return NextResponse.json({ ok: true, paid: payload.paid });
}
