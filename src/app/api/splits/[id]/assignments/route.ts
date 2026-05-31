import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import {
  splits,
  splitItems,
  itemAssignments,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface PutAssignmentsPayload {
  itemId: string;
  participantIds: string[];
}

export async function PUT(
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

  const db = getDb();
  const [splitRow] = await db
    .select({ id: splits.id })
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!splitRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: PutAssignmentsPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload.itemId !== "string" ||
    !Array.isArray(payload.participantIds)
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const [itemRow] = await db
    .select({ id: splitItems.id })
    .from(splitItems)
    .where(
      and(eq(splitItems.id, payload.itemId), eq(splitItems.splitId, splitId))
    )
    .limit(1);
  if (!itemRow) {
    return NextResponse.json({ error: "item_not_in_split" }, { status: 400 });
  }

  const shareFraction =
    payload.participantIds.length > 0
      ? 1 / payload.participantIds.length
      : 0;

  await db.transaction(async (tx) => {
    await tx
      .delete(itemAssignments)
      .where(eq(itemAssignments.itemId, payload.itemId));

    if (payload.participantIds.length > 0) {
      await tx.insert(itemAssignments).values(
        payload.participantIds.map((participantId) => ({
          itemId: payload.itemId,
          participantId,
          shareFraction: shareFraction.toFixed(4),
        }))
      );
    }
  });

  return NextResponse.json({ ok: true, shareFraction });
}
