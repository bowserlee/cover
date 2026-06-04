import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import {
  splits,
  splitItems,
  participants,
  itemAssignments,
  friends as friendsTable,
} from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { AssignmentClient } from "./AssignmentClient";

export default async function SplitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: splitId } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [split] = await db
    .select()
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!split) notFound();

  const items = await db
    .select()
    .from(splitItems)
    .where(eq(splitItems.splitId, splitId))
    .orderBy(asc(splitItems.name));

  const splitParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.splitId, splitId))
    .orderBy(asc(participants.name));

  const assignments = await db
    .select({
      itemId: itemAssignments.itemId,
      participantId: itemAssignments.participantId,
      shareFraction: itemAssignments.shareFraction,
    })
    .from(itemAssignments)
    .innerJoin(splitItems, eq(itemAssignments.itemId, splitItems.id))
    .where(eq(splitItems.splitId, splitId));

  const userFriends = await db
    .select()
    .from(friendsTable)
    .where(eq(friendsTable.userId, user.id))
    .orderBy(asc(friendsTable.name));

  return (
    <AssignmentClient
      splitId={split.id}
      billName={split.name}
      billStatus={split.status}
      billSubtotal={parseFloat(split.subtotal)}
      billTax={parseFloat(split.tax)}
      billTip={parseFloat(split.tip)}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        unitPrice: parseFloat(i.unitPrice),
        quantity: i.quantity,
      }))}
      initialParticipants={splitParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        venmoHandle: p.venmoHandle,
      }))}
      initialAssignments={assignments.map((a) => ({
        itemId: a.itemId,
        participantId: a.participantId,
        shareFraction: parseFloat(a.shareFraction),
      }))}
      initialFriends={userFriends.map((f) => ({
        id: f.id,
        name: f.name,
        phone: f.phone,
        venmoHandle: f.venmoHandle,
      }))}
    />
  );
}
