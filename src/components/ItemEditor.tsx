"use client";

import type { ParsedItem } from "@/lib/ocr/types";

interface ItemEditorProps {
  name: string;
  onNameChange: (name: string) => void;
  items: ParsedItem[];
  onItemsChange: (items: ParsedItem[]) => void;
  tax: number;
  onTaxChange: (tax: number) => void;
  tip: number;
  onTipChange: (tip: number) => void;
}

export function ItemEditor({
  name,
  onNameChange,
  items,
  onItemsChange,
  tax,
  onTaxChange,
  tip,
  onTipChange,
}: ItemEditorProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal + tax + tip;

  const updateItem = (index: number, patch: Partial<ParsedItem>) => {
    onItemsChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const deleteItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onItemsChange([...items, { name: "", quantity: 1, unitPrice: 0 }]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-sm text-neutral-500 mb-1 block">Bill name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled bill"
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add item
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-neutral-500 py-6 text-center border border-dashed rounded-lg">
            No items yet. Tap &ldquo;Add item&rdquo; to start.
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2"
          >
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="Item name"
              className="flex-1 min-w-0 text-base"
            />
            <input
              type="number"
              value={item.quantity}
              min={1}
              onChange={(e) =>
                updateItem(index, { quantity: Math.max(1, +e.target.value) })
              }
              className="w-12 text-center text-base"
            />
            <span className="text-neutral-500">×</span>
            <input
              type="number"
              value={item.unitPrice}
              step="0.01"
              min={0}
              onChange={(e) =>
                updateItem(index, { unitPrice: Math.max(0, +e.target.value) })
              }
              className="w-20 text-right text-base"
            />
            <button
              type="button"
              onClick={() => deleteItem(index)}
              className="text-neutral-400 hover:text-red-600 px-1"
              aria-label="Delete item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tax</label>
          <input
            type="number"
            value={tax}
            step="0.01"
            min={0}
            onChange={(e) => onTaxChange(Math.max(0, +e.target.value))}
            className="w-24 text-right text-base"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tip</label>
          <input
            type="number"
            value={tip}
            step="0.01"
            min={0}
            onChange={(e) => onTipChange(Math.max(0, +e.target.value))}
            className="w-24 text-right text-base"
          />
        </div>
        <div className="flex items-center justify-between text-lg font-semibold border-t pt-2 mt-2">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
