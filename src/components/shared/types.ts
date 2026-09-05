export interface Batch {
  id: string;
  qty: number;
  packs: number;
  mfgDate: string;
  expDate: string;
  mrp: number;
  saleRate: number;
}

export interface LineItem {
  id: number;
  barcode: string;
  medicineName: string;
  batch: Batch | null;
  packs: number;
  qty: number;
  free: number;
  mrp: number;
  saleRate: number;
  disc: number;
  gst: number;
  restock?: boolean;
}

export interface Medicine {
  name: string;
  barcode: string;
  batches: Batch[];
}

export type Alloc = "FEFO" | "LEFO";
