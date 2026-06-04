import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import {
  splits,
  splitItems,
  participants,
  itemAssignments,
  profiles,
} from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { computePerPersonTotals } from "@/lib/split-math/totals";
import { SendClient } from "./SendClient";

export default async function SendPage({
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

  const [profile] = await db
    .select({ venmoHandle: profiles.venmoHandle })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.venmoHandle) {
    redirect(`/profile?redirectTo=/split/${splitId}/send`);
  }

  const [split] = await db
    .select()
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!split) notFound();

  const items = await db
    .select()
    .from(splitItems)
    .where(eq(splitItems.splitId, splitId));

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

  const totals = computePerPersonTotals({
    billSubtotal: parseFloat(split.subtotal),
    billTax: parseFloat(split.tax),
    billTip: parseFloat(split.tip),
    items: items.map((i) => ({
      id: i.id,
      unitPrice: parseFloat(i.unitPrice),
      quantity: i.quantity,
    })),
    participants: splitParticipants.map((p) => ({ id: p.id })),
    assignments: assignments.map((a) => ({
      itemId: a.itemId,
      participantId: a.participantId,
      shareFraction: parseFloat(a.shareFraction),
    })),
  });

  const totalsByParticipantId = new Map(
    totals.map((t) => [t.participantId, t.total])
  );

  const billTotal =
    parseFloat(split.subtotal) +
    parseFloat(split.tax) +
    parseFloat(split.tip);

  // Host participants are included in totals math (so tax/tip allocation
  // stays correct with the host's share factored in) but excluded from
  // the send list — you don't send a Venmo link to yourself.
  const sendParticipants = splitParticipants
    .filter((p) => !p.isHost)
    .map((p) => ({
      id: p.id,
      name: p.name,
      venmoHandle: p.venmoHandle,
      paid: p.paid,
      amount: totalsByParticipantId.get(p.id) ?? 0,
    }));

  return (
    <SendClient
      splitId={split.id}
      billName={split.name}
      billTotal={billTotal}
      hostVenmoHandle={profile.venmoHandle}
      initialParticipants={sendParticipants}
    />
  );
}
