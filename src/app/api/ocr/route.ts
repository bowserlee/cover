import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import type { ParsedReceipt } from "@/lib/ocr/types";

const SYSTEM_PROMPT = `You are extracting line items from a restaurant receipt photo.

Return ONLY a JSON object with this exact shape:
{
  "items": [{"name": string, "quantity": number, "unitPrice": number}],
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null
}

Rules:
- Each "item" is a food/drink line item with a price
- Skip headers, addresses, phone numbers, server names, dates, totals, change, payment info
- If a line shows "2 Burger 24.00" treat as quantity=2, unitPrice=12.00 (divide total by quantity)
- If a line shows "Burger 12.00" treat as quantity=1, unitPrice=12.00
- subtotal/tax/tip are bill-level totals shown at the bottom; use null if not visible
- All numbers as numbers (not strings), no currency symbols
- Round to 2 decimal places
- Return ONLY the JSON object, no markdown fences, no explanation text`;

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isAllowedMediaType(
  t: string
): t is "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  return ALLOWED_MEDIA_TYPES.has(t);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ocr_unavailable" },
      { status: 503 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  const mediaType = file.type || "image/jpeg";
  if (!isAllowedMediaType(mediaType)) {
    return NextResponse.json(
      { error: "unsupported_media_type" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey });

  let responseText: string;
  try {
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
    });
    const firstBlock = completion.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      return NextResponse.json(
        { error: "ocr_no_response" },
        { status: 502 }
      );
    }
    responseText = firstBlock.text.trim();
  } catch (err) {
    console.error("Anthropic API error:", err);
    return NextResponse.json(
      { error: "ocr_api_failed" },
      { status: 502 }
    );
  }

  // Strip markdown code fences if Claude added them despite instructions
  const cleaned = responseText
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  interface ClaudeItem {
    name: string;
    quantity: number;
    unitPrice: number;
  }
  const isClaudeItem = (it: unknown): it is ClaudeItem =>
    typeof it === "object" &&
    it !== null &&
    typeof (it as { name: unknown }).name === "string" &&
    typeof (it as { quantity: unknown }).quantity === "number" &&
    typeof (it as { unitPrice: unknown }).unitPrice === "number";

  let parsed: ParsedReceipt;
  try {
    const json = JSON.parse(cleaned);
    const rawItems: unknown[] = Array.isArray(json.items) ? json.items : [];
    parsed = {
      items: rawItems.filter(isClaudeItem).map((it) => ({
        name: it.name,
        quantity: Math.max(1, Math.round(it.quantity)),
        unitPrice: Math.max(0, it.unitPrice),
      })),
      subtotal: typeof json.subtotal === "number" ? json.subtotal : undefined,
      tax: typeof json.tax === "number" ? json.tax : undefined,
      tip: typeof json.tip === "number" ? json.tip : undefined,
    };
  } catch (err) {
    console.error("Failed to parse Claude OCR response:", cleaned, err);
    return NextResponse.json(
      { error: "ocr_parse_failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ parsed });
}
