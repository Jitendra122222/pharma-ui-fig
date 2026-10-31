// ─── Types ────────────────────────────────────────────────────────────────────

export interface Batch {
  id: string; qty: number; packs: number;
  mfgDate: string; expDate: string; mrp: number; saleRate: number;
  ptr: number; distributor: string;
}
export interface LineItem {
  id: number; barcode: string; productName: string;
  batch: Batch | null; packs: number; qty: number; free: number;
  mrp: number; saleRate: number; disc: number; gst: number;
  restock?: boolean;
}

export type Tab = "invoices" | "counter" | "returns" | "payments";
export type View = "list" | "new-invoice" | "new-return" | "record-payment";
export type Alloc = "FEFO" | "LEFO";
export type PayMethod = "Cash" | "Card" | "Insurance" | "UPI" | "Bank Transfer";

export const TODAY = "2026-08-15";
export const RETURN_REASONS = ["Medication changed by doctor", "Wrong product dispensed", "Adverse reaction", "Quantity overfilled", "Near expiry", "Other"];
export const RETURN_STATUSES = ["Pending", "Processed", "Failed", "On Hold"];
export const PAY_METHODS: PayMethod[] = ["Cash", "Card", "Insurance", "UPI", "Bank Transfer"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Mock data ─────────────────────────────────────────────────────────────────

export const PRODUCTS: { name: string; barcode: string; batches: Batch[] }[] = [];

export const DOCTORS = [
  { id: "DR-001", name: "Dr. Rajesh Sharma",  specialty: "General Physician", phone: "9876541001" },
  { id: "DR-002", name: "Dr. Priya Patel",    specialty: "Cardiologist",       phone: "9876541002" },
  { id: "DR-003", name: "Dr. Anil Kumar",     specialty: "Diabetologist",      phone: "9876541003" },
  { id: "DR-004", name: "Dr. Sunita Verma",   specialty: "Gynecologist",       phone: "9876541004" },
  { id: "DR-005", name: "Dr. Manoj Singh",    specialty: "Orthopedic",         phone: "9876541005" },
  { id: "DR-006", name: "Dr. Kavitha Nair",   specialty: "Pediatrician",       phone: "9876541006" },
  { id: "DR-007", name: "Dr. Vikram Reddy",   specialty: "Neurologist",        phone: "9876541007" },
];

export type SaleInvoice = {
  id: string; patient: string; patientId: string; date: string; due: string;
  items: number; subtotal: number; tax: number; total: number; paid: number;
  method: string; status: string;
};
export const salesInvoices: SaleInvoice[] = [];

export const patientInvoiceHistory: Record<string, SaleInvoice[]> = {};
export const patientPrevItems: Record<string, { name: string; qty: number; packs: number }[]> = {};

export type SaleReturn = {
  id: string; invoice: string; patient: string; patientId: string; date: string;
  reason: string; items: number; total: number; status: string; method: string;
  settlementRef: string;
};
export const salesReturns: SaleReturn[] = [];

export const returnPrevItems: Record<string, { name: string; qty: number; packs: number; restock: boolean }[]> = {};

export type SalePayment = {
  id: string; patient: string; patientId: string; invoice: string; invoiceId: string;
  date: string; method: PayMethod; ref: string; amount: number; status: string;
};
export const salesPayments: SalePayment[] = [];

// ─── Patient balance helper ───────────────────────────────────────────────────

export function getPatientBalance(patientId: string): number {
  const invoiceBal = salesInvoices
    .filter(inv => inv.patientId === patientId)
    .reduce((sum, inv) => sum + (inv.total - inv.paid), 0);
  const acctPaid = salesPayments
    .filter(pay => pay.patientId === patientId && !pay.invoiceId)
    .reduce((sum, pay) => sum + pay.amount, 0);
  return Math.max(0, invoiceBal - acctPaid);
}

// ─── Pure utility functions ───────────────────────────────────────────────────

export function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function calcAmount(item: LineItem) {
  const base = item.qty * item.saleRate;
  const disc = base * (item.disc / 100);
  const gst = (base - disc) * (item.gst / 100);
  return base - disc + gst;
}

export function newEmptyRow(id: number): LineItem {
  return { id, barcode: "", productName: "", batch: null, packs: 1, qty: 1, free: 0, mrp: 0, saleRate: 0, disc: 0, gst: 5 };
}

export function pickBatch(batches: Batch[], alloc: Alloc): Batch | null {
  const stocked = batches.filter(b => b.qty > 0);
  const pool = stocked.length > 0 ? stocked : batches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) =>
    alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)
  )[0];
}
