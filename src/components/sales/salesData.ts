// ─── Types ────────────────────────────────────────────────────────────────────

export interface Batch {
  id: string; qty: number; packs: number;
  mfgDate: string; expDate: string; mrp: number; saleRate: number;
  ptr: number; distributor: string;
}
export interface LineItem {
  id: number; barcode: string; medicineName: string;
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

export const MEDICINES = [
  { name: "Amoxicillin 500mg", barcode: "8901234567890", batches: [
    { id: "BT-0118", qty: 240, packs: 24, mfgDate: "2024-02-01", expDate: "2026-08-15", mrp: 0.95, saleRate: 0.85, ptr: 0.72, distributor: "MedPlus Distributors" },
    { id: "BT-0102", qty: 60, packs: 6, mfgDate: "2023-10-01", expDate: "2025-10-15", mrp: 0.95, saleRate: 0.80, ptr: 0.68, distributor: "Apollo Healthcare Dist." },
  ]},
  { name: "Metformin 1000mg", barcode: "8901234561234", batches: [
    { id: "BT-0117", qty: 18, packs: 2, mfgDate: "2024-06-01", expDate: "2025-12-31", mrp: 0.35, saleRate: 0.32, ptr: 0.27, distributor: "Sun Pharma Dist." },
  ]},
  { name: "Paracetamol 500mg", barcode: "8901234569876", batches: [
    { id: "BT-0120", qty: 1200, packs: 120, mfgDate: "2024-01-15", expDate: "2027-05-15", mrp: 0.09, saleRate: 0.08, ptr: 0.065, distributor: "Cipla Healthcare Dist." },
    { id: "BT-0098", qty: 400, packs: 40, mfgDate: "2023-08-01", expDate: "2026-08-01", mrp: 0.09, saleRate: 0.08, ptr: 0.062, distributor: "Cipla Healthcare Dist." },
  ]},
  { name: "Atorvastatin 20mg", barcode: "8901234562345", batches: [
    { id: "BT-0115", qty: 312, packs: 31, mfgDate: "2024-03-01", expDate: "2027-01-10", mrp: 0.82, saleRate: 0.78, ptr: 0.65, distributor: "MedPlus Distributors" },
  ]},
  { name: "Omeprazole 20mg", barcode: "8901234563456", batches: [
    { id: "BT-0114", qty: 145, packs: 15, mfgDate: "2024-04-01", expDate: "2026-09-05", mrp: 0.65, saleRate: 0.62, ptr: 0.51, distributor: "Apollo Healthcare Dist." },
  ]},
  { name: "Salbutamol Inhaler", barcode: "8901234564567", batches: [
    { id: "BT-0113", qty: 28, packs: 28, mfgDate: "2024-05-01", expDate: "2026-06-30", mrp: 9.00, saleRate: 8.50, ptr: 7.20, distributor: "GSK Healthcare Dist." },
  ]},
  { name: "Amlodipine 5mg", barcode: "8901234565678", batches: [
    { id: "BT-0112", qty: 380, packs: 38, mfgDate: "2024-02-15", expDate: "2026-11-30", mrp: 0.48, saleRate: 0.45, ptr: 0.38, distributor: "Sun Pharma Dist." },
  ]},
  { name: "Sertraline 50mg", barcode: "8901234566789", batches: [
    { id: "BT-0111", qty: 220, packs: 22, mfgDate: "2024-01-01", expDate: "2027-02-20", mrp: 0.92, saleRate: 0.88, ptr: 0.72, distributor: "Medline Distributors" },
  ]},
  { name: "Ciprofloxacin 500mg", barcode: "8901234567891", batches: [
    { id: "BT-0110", qty: 12, packs: 1, mfgDate: "2024-03-15", expDate: "2025-11-20", mrp: 1.25, saleRate: 1.20, ptr: 0.98, distributor: "Cipla Healthcare Dist." },
  ]},
  { name: "Insulin Glargine", barcode: "8901234568902", batches: [
    { id: "BT-0109", qty: 45, packs: 45, mfgDate: "2024-07-01", expDate: "2025-10-15", mrp: 44.00, saleRate: 42.00, ptr: 36.00, distributor: "Sanofi India Dist." },
  ]},
];

export const DOCTORS = [
  { id: "DR-001", name: "Dr. Rajesh Sharma",  specialty: "General Physician", phone: "9876541001" },
  { id: "DR-002", name: "Dr. Priya Patel",    specialty: "Cardiologist",       phone: "9876541002" },
  { id: "DR-003", name: "Dr. Anil Kumar",     specialty: "Diabetologist",      phone: "9876541003" },
  { id: "DR-004", name: "Dr. Sunita Verma",   specialty: "Gynecologist",       phone: "9876541004" },
  { id: "DR-005", name: "Dr. Manoj Singh",    specialty: "Orthopedic",         phone: "9876541005" },
  { id: "DR-006", name: "Dr. Kavitha Nair",   specialty: "Pediatrician",       phone: "9876541006" },
  { id: "DR-007", name: "Dr. Vikram Reddy",   specialty: "Neurologist",        phone: "9876541007" },
];

export const salesInvoices = [
  { id: "SINV-2025-0221", patient: "Margaret Thompson", patientId: "P-001", date: "2025-07-28", due: "2025-07-28", items: 2, subtotal: 18.65, tax: 1.63, total: 20.28, paid: 20.28, method: "Card", status: "Paid" },
  { id: "SINV-2025-0220", patient: "David Okafor", patientId: "P-004", date: "2025-07-27", due: "2025-08-26", items: 2, subtotal: 34.80, tax: 3.05, total: 37.85, paid: 0, method: "Insurance", status: "Unpaid" },
  { id: "SINV-2025-0219", patient: "Elena Vasquez", patientId: "P-005", date: "2025-07-27", due: "2025-07-27", items: 1, subtotal: 24.30, tax: 2.13, total: 26.43, paid: 26.43, method: "Card", status: "Paid" },
  { id: "SINV-2025-0218", patient: "James Whitfield", patientId: "P-006", date: "2025-07-26", due: "2025-08-25", items: 1, subtotal: 16.70, tax: 1.46, total: 18.16, paid: 9.08, method: "Insurance", status: "Partial" },
  { id: "SINV-2025-0217", patient: "Amara Nwosu", patientId: "P-003", date: "2025-07-25", due: "2025-07-25", items: 1, subtotal: 7.83, tax: 0.69, total: 8.52, paid: 8.52, method: "Cash", status: "Paid" },
  { id: "SINV-2025-0216", patient: "Walk-in Customer", patientId: "—", date: "2025-07-24", due: "2025-07-24", items: 3, subtotal: 11.76, tax: 1.03, total: 12.79, paid: 12.79, method: "Cash", status: "Paid" },
  { id: "SINV-2025-0215", patient: "Sofia Lindqvist", patientId: "P-007", date: "2025-07-23", due: "2025-07-23", items: 1, subtotal: 17.13, tax: 1.50, total: 18.63, paid: 18.63, method: "Card", status: "Paid" },
];

export const patientInvoiceHistory: Record<string, typeof salesInvoices> = {
  "P-001": [salesInvoices[0], { ...salesInvoices[0], id: "SINV-2025-0210", date: "2025-07-15", total: 15.50, paid: 15.50, status: "Paid" }],
  "P-004": [salesInvoices[1], { ...salesInvoices[1], id: "SINV-2025-0205", date: "2025-07-10", total: 26.40, paid: 26.40, status: "Paid" }],
  "P-006": [salesInvoices[3]],
};

export const patientPrevItems: Record<string, { name: string; qty: number; packs: number }[]> = {
  "SINV-2025-0221": [{ name: "Amoxicillin 500mg", qty: 21, packs: 3 }, { name: "Paracetamol 500mg", qty: 30, packs: 3 }],
  "SINV-2025-0220": [{ name: "Amlodipine 5mg", qty: 30, packs: 3 }, { name: "Atorvastatin 20mg", qty: 30, packs: 3 }],
  "SINV-2025-0219": [{ name: "Omeprazole 20mg", qty: 30, packs: 3 }],
  "SINV-2025-0218": [{ name: "Sertraline 50mg", qty: 30, packs: 3 }],
  "SINV-2025-0217": [{ name: "Ciprofloxacin 500mg", qty: 14, packs: 2 }],
  "SINV-2025-0216": [{ name: "Paracetamol 500mg", qty: 20, packs: 2 }, { name: "Amoxicillin 500mg", qty: 14, packs: 2 }, { name: "Salbutamol Inhaler", qty: 1, packs: 1 }],
  "SINV-2025-0215": [{ name: "Metformin 1000mg", qty: 30, packs: 3 }],
};

export const salesReturns = [
  { id: "SRN-2025-0009", invoice: "SINV-2025-0210", patient: "Robert Kiefer", patientId: "P-009", date: "2025-07-20", reason: "Medication changed by doctor", items: 1, total: 19.20, status: "Posted", method: "Cash", settlementRef: "CASH-REF-0009" },
  { id: "SRN-2025-0008", invoice: "SINV-2025-0202", patient: "James Whitfield", patientId: "P-006", date: "2025-07-14", reason: "Quantity overfilled", items: 1, total: 8.80, status: "Posted", method: "Card", settlementRef: "VIS-****4421" },
  { id: "SRN-2025-0007", invoice: "SINV-2025-0198", patient: "Walk-in Customer", patientId: "—", date: "2025-07-10", reason: "Wrong product dispensed", items: 2, total: 14.40, status: "Draft", method: "Cash", settlementRef: "" },
];

export const returnPrevItems: Record<string, { name: string; qty: number; packs: number; restock: boolean }[]> = {
  "SRN-2025-0009": [{ name: "Metformin 1000mg", qty: 10, packs: 1, restock: true }],
  "SRN-2025-0008": [{ name: "Amoxicillin 500mg", qty: 8, packs: 1, restock: false }],
  "SRN-2025-0007": [{ name: "Paracetamol 500mg", qty: 10, packs: 1, restock: true }, { name: "Omeprazole 20mg", qty: 5, packs: 1, restock: true }],
};

export const salesPayments = [
  { id: "SPAY-2025-0084", patient: "Margaret Thompson", invoice: "SINV-2025-0221", date: "2025-07-28", method: "Card", ref: "VIS-****4421", amount: 20.28, status: "Cleared" },
  { id: "SPAY-2025-0083", patient: "Elena Vasquez", invoice: "SINV-2025-0219", date: "2025-07-27", method: "Card", ref: "VIS-****7732", amount: 26.43, status: "Cleared" },
  { id: "SPAY-2025-0082", patient: "James Whitfield", invoice: "SINV-2025-0218", date: "2025-07-26", method: "Insurance", ref: "INS-BlueCross-0421", amount: 9.08, status: "Cleared" },
  { id: "SPAY-2025-0081", patient: "Amara Nwosu", invoice: "SINV-2025-0217", date: "2025-07-25", method: "Cash", ref: "CASH", amount: 8.52, status: "Cleared" },
  { id: "SPAY-2025-0079", patient: "Sofia Lindqvist", invoice: "SINV-2025-0215", date: "2025-07-23", method: "Card", ref: "MAS-****1190", amount: 18.63, status: "Cleared" },
];

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
  return { id, barcode: "", medicineName: "", batch: null, packs: 1, qty: 1, free: 0, mrp: 0, saleRate: 0, disc: 0, gst: 5 };
}

export function pickBatch(batches: Batch[], alloc: Alloc): Batch | null {
  const stocked = batches.filter(b => b.qty > 0);
  const pool = stocked.length > 0 ? stocked : batches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) =>
    alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)
  )[0];
}
