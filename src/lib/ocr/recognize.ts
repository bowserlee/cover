import type { ParsedReceipt } from "./types";

export async function recognizeReceipt(file: File): Promise<{
  parsed: ParsedReceipt;
}> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { parsed: ParsedReceipt };
  return { parsed: data.parsed };
}
