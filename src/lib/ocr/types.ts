export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ParsedReceipt {
  items: ParsedItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
}
