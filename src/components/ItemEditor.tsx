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

function numberInputValue(n: number): string {
  return n === 0 ? "" : String(n);
}

function parseNumberInput(raw: string, min: number): number {
  if (raw === "") return min;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, parsed);
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

      <div className="flex flex-col gap-3">
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

        {items.map((item, index) => {
          const lineTotal = item.unitPrice * item.quantity;
          return (
            <div
              key={index}
              className="flex flex-col gap-2 border border-neutral-200 rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(index, { name: e.target.value })
                  }
                  placeholder="Item name"
                  className="flex-1 min-w-0 text-base font-medium"
                />
                <button
                  type="button"
                  onClick={() => deleteItem(index)}
                  className="text-neutral-400 hover:text-red-600 px-1 text-lg leading-none"
                  aria-label="Delete item"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-neutral-500 mb-0.5">
                    Qty
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={numberInputValue(item.quantity)}
                    min={1}
                    placeholder="1"
                    onChange={(e) =>
                      updateItem(index, {
                        quantity: parseNumberInput(e.target.value, 1),
                      })
                    }
                    className="border border-neutral-200 rounded px-2 py-1.5 text-base w-full"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-neutral-500 mb-0.5">
                    Price each
                  </label>
                  <div className="flex items-center border border-neutral-200 rounded px-2 py-1.5">
                    <span className="text-neutral-500 mr-1">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={numberInputValue(item.unitPrice)}
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateItem(index, {
                          unitPrice: parseNumberInput(e.target.value, 0),
                        })
                      }
                      className="text-base w-full min-w-0"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 mb-0.5">Line</p>
                  <p className="font-semibold text-base py-1.5">
                    ${lineTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tax</label>
          <div className="flex items-center border border-neutral-200 rounded px-2 py-1">
            <span className="text-neutral-500 mr-1">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={numberInputValue(tax)}
              step="0.01"
              min={0}
              placeholder="0.00"
              onChange={(e) =>
                onTaxChange(parseNumberInput(e.target.value, 0))
              }
              className="w-20 text-right text-base"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tip</label>
          <div className="flex items-center border border-neutral-200 rounded px-2 py-1">
            <span className="text-neutral-500 mr-1">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={numberInputValue(tip)}
              step="0.01"
              min={0}
              placeholder="0.00"
              onChange={(e) =>
                onTipChange(parseNumberInput(e.target.value, 0))
              }
              className="w-20 text-right text-base"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-lg font-semibold border-t pt-2 mt-2">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
