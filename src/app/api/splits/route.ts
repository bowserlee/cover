import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { splits, splitItems } from "@/lib/db/schema";

interface CreateSplitPayload {
  name: string;
  tax: number;
  tip: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CreateSplitPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload.name !== "string" ||
    !payload.name.trim() ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const db = getDb();

  const [newSplit] = await db
    .insert(splits)
    .values({
      hostUserId: user.id,
      name: payload.name.trim(),
      subtotal: subtotal.toFixed(2),
      tax: payload.tax.toFixed(2),
      tip: payload.tip.toFixed(2),
      status: "open",
    })
    .returning({ id: splits.id });

  await db.insert(splitItems).values(
    payload.items.map((item) => ({
      splitId: newSplit.id,
      name: item.name,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: item.quantity,
    }))
  );

  return NextResponse.json({ id: newSplit.id }, { status: 201 });
}
