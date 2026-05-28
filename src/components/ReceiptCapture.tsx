"use client";

import { useRef } from "react";

interface ReceiptCaptureProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function ReceiptCapture({ onSelect, disabled }: ReceiptCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full bg-black text-white rounded-full py-4 font-medium hover:bg-neutral-800 transition disabled:opacity-50"
      >
        Take a photo of the receipt
      </button>
      <p className="text-sm text-neutral-500 text-center">
        On phones, opens the camera. On desktop, opens a file picker.
      </p>
    </div>
  );
}
