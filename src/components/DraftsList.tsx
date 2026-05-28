import { getDb } from "@/lib/db/client";
import { splits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function DraftsList({ userId }: { userId: string }) {
  const db = getDb();
  const userSplits = await db
    .select()
    .from(splits)
    .where(eq(splits.hostUserId, userId))
    .orderBy(desc(splits.createdAt))
    .limit(20);

  if (userSplits.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        No bills yet. Tap &ldquo;New bill&rdquo; to add one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {userSplits.map((split) => {
        const subtotal = parseFloat(split.subtotal);
        const tax = parseFloat(split.tax);
        const tip = parseFloat(split.tip);
        const total = subtotal + tax + tip;
        return (
          <li
            key={split.id}
            className="border border-neutral-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{split.name}</p>
              <p className="text-xs text-neutral-500">
                {new Date(split.createdAt).toLocaleDateString()} ·{" "}
                {split.status}
              </p>
            </div>
            <span className="font-medium">${total.toFixed(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}
