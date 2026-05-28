import { createWorker } from "tesseract.js";
import type { ParsedReceipt } from "./types";
import { parseReceiptText } from "./parser";

export async function recognizeReceipt(file: File): Promise<{
  raw: string;
  parsed: ParsedReceipt;
}> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    const raw = data.text;
    const parsed = parseReceiptText(raw);
    return { raw, parsed };
  } finally {
    await worker.terminate();
  }
}
