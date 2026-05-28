"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { ItemEditor } from "@/components/ItemEditor";
import type { ParsedItem, ParsedReceipt } from "@/lib/ocr/types";

type Stage = "capture" | "loading" | "edit" | "saving" | "error";

export default function NewBillPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("capture");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("Untitled bill");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);

  const handleSelect = async (file: File) => {
    setStage("loading");
    setErrorMsg(null);
    try {
      const { recognizeReceipt } = await import("@/lib/ocr/tesseract");
      const { parsed } = await recognizeReceipt(file);
      applyParsed(parsed);
      setStage("edit");
    } catch (err) {
      console.error("OCR failed:", err);
      // Fall through to manual entry — empty items is fine, user can add
      setStage("edit");
    }
  };

  const applyParsed = (parsed: ParsedReceipt) => {
    setItems(parsed.items);
    if (typeof parsed.tax === "number") setTax(parsed.tax);
    if (typeof parsed.tip === "number") setTip(parsed.tip);
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) {
      setErrorMsg("Add at least one item before saving.");
      return;
    }
    setStage("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items, tax, tip }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Save failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save bill.");
      setStage("edit");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </button>
        <h1 className="font-semibold">New bill</h1>
        <div className="w-12" />
      </header>

      <main className="px-6 py-8 max-w-md mx-auto">
        {stage === "capture" && <ReceiptCapture onSelect={handleSelect} />}

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
            <p className="text-neutral-500">Reading receipt…</p>
          </div>
        )}

        {(stage === "edit" || stage === "saving") && (
          <div className="flex flex-col gap-6">
            <ItemEditor
              name={name}
              onNameChange={setName}
              items={items}
              onItemsChange={setItems}
              tax={tax}
              onTaxChange={setTax}
              tip={tip}
              onTipChange={setTip}
            />
            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={stage === "saving"}
              className="w-full bg-black text-white rounded-full py-4 font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {stage === "saving" ? "Saving…" : "Save bill"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
