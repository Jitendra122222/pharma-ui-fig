import { drugs, suppliers } from "../../data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubTab = "orders" | "invoices" | "returns" | "payments";
export type View = "list" | "new-order" | "view-order" | "new-invoice" | "view-invoice" | "new-return" | "view-return";

export interface POLine {
  id: number;
  medicineName: string;
  pack: string;
  currentStock: number;
  avgSales: string;
  suggestedQty: number;
  orderQty: number;
  purchaseRate: number;
  scheme: string;
  freeQty: number;
  mrp: number;
  gst: number;
  stockOnPO: number;
  pendingOrders: number;
  branchStock: number;
  nearExpiryQty: number;
  safetyStock: number;
}

export interface PurchaseOrderRecord {
  id: string;
  supplier: string;
  date: string;
  expectedDelivery: string;
  items: number;
  orderValue: number;
  received: number;
  pending: number;
  status: string;
  warehouse: string;
  paymentTerms: string;
  reference?: string;
}

export interface PurchaseLine {
  id: number;
  medicineName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  packSize: number;
  qty: number;
  free: number;
  purchaseRate: number;
  mrp: number;
  disc: number;
  gst: number;
  importedName?: string;
  mappingStatus?: "matched" | "fuzzy" | "unmatched";
  suggestedName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TODAY = "2026-08-22";
export const PAY_METHODS = ["Bank Transfer", "Cheque", "Cash", "UPI", "RTGS"];
export const RETURN_REASONS = [
  "Damaged on arrival",
  "Near-expiry batch",
  "Incorrect item shipped",
  "Wrong quantity received",
  "Quality issue",
  "Other",
];
export const BANK_ACCOUNTS = ["Chase — Main Operating", "Chase — Petty Cash", "Wells Fargo — Savings", "HDFC — Current"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const BRAND_ALIASES: Record<string, string> = {
  "dolo":        "Paracetamol 500mg",
  "crocin":      "Paracetamol 500mg",
  "calpol":      "Paracetamol 500mg",
  "combiflam":   "Paracetamol 500mg",
  "paracetamol": "Paracetamol 500mg",
  "atorva":      "Atorvastatin 20mg",
  "lipitor":     "Atorvastatin 20mg",
  "storvas":     "Atorvastatin 20mg",
  "amox":        "Amoxicillin 500mg",
  "augmentin":   "Amoxicillin 500mg",
  "mox":         "Amoxicillin 500mg",
  "metformin":   "Metformin 1000mg",
  "glycomet":    "Metformin 1000mg",
  "glucophage":  "Metformin 1000mg",
  "azithro":     "Amoxicillin 500mg",
  "cipro":       "Ciprofloxacin 500mg",
  "ciplox":      "Ciprofloxacin 500mg",
  "omez":        "Omeprazole 20mg",
  "pan":         "Omeprazole 20mg",
  "pantop":      "Omeprazole 20mg",
  "rabeprazole": "Omeprazole 20mg",
  "telma":       "Amlodipine 5mg",
  "amlodip":     "Amlodipine 5mg",
  "norvasc":     "Amlodipine 5mg",
  "sertraline":  "Sertraline 50mg",
  "zoloft":      "Sertraline 50mg",
  "serta":       "Sertraline 50mg",
  "salbutamol":  "Salbutamol Inhaler",
  "ventolin":    "Salbutamol Inhaler",
  "asthalin":    "Salbutamol Inhaler",
  "insulin":     "Insulin Glargine",
  "lantus":      "Insulin Glargine",
};

export function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function newEmptyLine(id: number): PurchaseLine {
  return { id, medicineName: "", batchNo: "", mfgDate: "", expDate: "", packSize: 1, qty: 0, free: 0, purchaseRate: 0, mrp: 0, disc: 0, gst: 12 };
}

export function calcLineSubtotal(l: PurchaseLine): number {
  return l.qty * l.purchaseRate;
}

export function calcLineDiscount(l: PurchaseLine): number {
  return calcLineSubtotal(l) * (l.disc / 100);
}

export function calcLineTax(l: PurchaseLine): number {
  return (calcLineSubtotal(l) - calcLineDiscount(l)) * (l.gst / 100);
}

export function calcLineAmount(l: PurchaseLine): number {
  return calcLineSubtotal(l) - calcLineDiscount(l) + calcLineTax(l);
}

export function parseSchemeFree(scheme: string, orderQty: number): number {
  if (!scheme) return 0;
  const m = scheme.match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) return 0;
  const paid = parseInt(m[1], 10);
  const free = parseInt(m[2], 10);
  if (paid <= 0) return 0;
  return Math.floor(orderQty / paid) * free;
}

export function calcEffectiveCost(rate: number, scheme: string, orderQty: number): number {
  const free = parseSchemeFree(scheme, orderQty);
  const totalQty = orderQty + free;
  if (totalQty <= 0) return rate;
  return (rate * orderQty) / totalQty;
}

export function calcMarginPct(mrp: number, effectiveCost: number): number {
  if (mrp <= 0) return 0;
  return ((mrp - effectiveCost) / mrp) * 100;
}

export function newEmptyPOLine(id: number): POLine {
  return { id, medicineName: "", pack: "", currentStock: 0, avgSales: "", suggestedQty: 0, orderQty: 0, purchaseRate: 0, scheme: "", freeQty: 0, mrp: 0, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 };
}

// ─── Medicine classification helpers ──────────────────────────────────────────

function tokenise(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function wordOverlapScore(a: string, b: string): number {
  const ta = new Set(tokenise(a));
  const tb = new Set(tokenise(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  let shared = 0;
  ta.forEach(t => { if (tb.has(t)) shared++; });
  return shared / Math.max(ta.size, tb.size);
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return Math.abs(a.length - b.length);
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function fuzzyTokenScore(query: string, target: string): number {
  const qt = tokenise(query);
  const tt = tokenise(target);
  if (qt.length === 0) return 0;
  let matched = 0;
  for (const q of qt) {
    const threshold = Math.max(1, Math.ceil(q.length * 0.25));
    for (const t of tt) {
      if (levenshtein(q, t) <= threshold) { matched++; break; }
    }
  }
  return matched / qt.length;
}

export function classifyImportedLine(importedName: string): {
  status: "matched" | "fuzzy" | "unmatched";
  systemName: string;
} {
  const q = importedName.trim().toLowerCase();
  if (!q) return { status: "unmatched", systemName: "" };

  const exact = drugs.find(d => d.name.toLowerCase() === q);
  if (exact) return { status: "matched", systemName: exact.name };

  const tokens = tokenise(q);
  for (const token of tokens) {
    const aliasTarget = BRAND_ALIASES[token];
    if (aliasTarget) {
      const drug = drugs.find(d => d.name === aliasTarget);
      if (drug) return { status: "fuzzy", systemName: drug.name };
      return { status: "fuzzy", systemName: aliasTarget };
    }
  }

  let bestFuzzy = 0;
  let bestFuzzyName = "";
  for (const d of drugs) {
    const score = fuzzyTokenScore(q, d.name.toLowerCase());
    if (score > bestFuzzy) { bestFuzzy = score; bestFuzzyName = d.name; }
  }
  if (bestFuzzy >= 0.6) return { status: "fuzzy", systemName: bestFuzzyName };

  let bestScore = 0;
  let bestName = "";
  for (const d of drugs) {
    const score = wordOverlapScore(q, d.name.toLowerCase());
    if (score > bestScore) { bestScore = score; bestName = d.name; }
  }
  if (bestScore >= 0.3) return { status: "fuzzy", systemName: bestName };

  return { status: "unmatched", systemName: "" };
}

// ─── Parsed drug master ───────────────────────────────────────────────────────

export interface DrugWithParsed {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
  cost: number;
  expiry: string;
  supplier: string;
  location: string;
  status: string;
  generic: string;
  strength: string;
}

function parseDrug(d: typeof drugs[0]): DrugWithParsed {
  const tokens = d.name.split(" ");
  let strengthIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^[0-9]/.test(tokens[i])) { strengthIdx = i; break; }
  }
  const strength = strengthIdx >= 0 ? tokens[strengthIdx] : "";
  const generic = strengthIdx >= 0
    ? tokens.slice(0, strengthIdx).join(" ")
    : d.name;
  return { ...d, generic, strength };
}

export const parsedDrugs: DrugWithParsed[] = drugs.map(parseDrug);

// ─── Mock data ────────────────────────────────────────────────────────────────

export const purchaseInvoices = [
  { id: "PINV-2026-0072", supplier: "MedLine Pharma", poRef: "PO-2026-0155", grnRef: "GRN-2026-0072", date: "2026-08-18", due: "2026-09-17", items: 9, subtotal: 3120.45, tax: 273.05, total: 3393.50, paid: 0, balance: 3393.50, status: "Unpaid" },
  { id: "PINV-2026-0071", supplier: "GenPharm Ltd", poRef: "PO-2026-0154", grnRef: "GRN-2026-0071", date: "2026-08-15", due: "2026-09-14", items: 5, subtotal: 1420.30, tax: 124.28, total: 1544.58, paid: 1544.58, balance: 0, status: "Paid" },
  { id: "PINV-2026-0070", supplier: "PharmaCo Inc", poRef: "PO-2026-0153", grnRef: "GRN-2026-0070", date: "2026-08-12", due: "2026-09-11", items: 12, subtotal: 4080.75, tax: 357.07, total: 4437.82, paid: 2218.91, balance: 2218.91, status: "Partial" },
  { id: "PINV-2026-0069", supplier: "BioPharm AG", poRef: "PO-2026-0152", grnRef: "GRN-2026-0069", date: "2026-08-05", due: "2026-09-04", items: 4, subtotal: 2820.00, tax: 246.75, total: 3066.75, paid: 3066.75, balance: 0, status: "Paid" },
  { id: "PINV-2026-0068", supplier: "RespiCare Ltd", poRef: "PO-2026-0151", grnRef: "GRN-2026-0068", date: "2026-08-02", due: "2026-09-01", items: 2, subtotal: 588.09, tax: 51.46, total: 639.55, paid: 639.55, balance: 0, status: "Paid" },
  { id: "PINV-2026-0067", supplier: "MedLine Pharma", poRef: "PO-2026-0150", grnRef: "GRN-2026-0067", date: "2026-07-28", due: "2026-08-27", items: 8, subtotal: 2692.85, tax: 235.63, total: 2928.48, paid: 2928.48, balance: 0, status: "Paid" },
  { id: "PINV-2026-0066", supplier: "GenPharm Ltd", poRef: "PO-2026-0149", grnRef: "GRN-2026-0066", date: "2026-07-25", due: "2026-08-24", items: 4, subtotal: 909.52, tax: 79.58, total: 989.10, paid: 494.55, balance: 494.55, status: "Partial" },
  { id: "PINV-2026-0065", supplier: "PharmaCo Inc", poRef: "PO-2026-0148", grnRef: "GRN-2026-0065", date: "2026-07-22", due: "2026-08-21", items: 11, subtotal: 3582.64, tax: 313.48, total: 3896.12, paid: 0, balance: 3896.12, status: "Unpaid" },
  { id: "PINV-2026-0064", supplier: "MedLine Pharma", poRef: "PO-2026-0147", grnRef: "GRN-2026-0064", date: "2026-07-15", due: "2026-08-14", items: 15, subtotal: 4781.65, tax: 418.35, total: 5200.00, paid: 5200.00, balance: 0, status: "Paid" },
  { id: "PINV-2026-0063", supplier: "BioPharm AG", poRef: "PO-2026-0146", grnRef: "GRN-2026-0063", date: "2026-07-08", due: "2026-08-07", items: 6, subtotal: 3120.00, tax: 273.00, total: 3393.00, paid: 0, balance: 3393.00, status: "Unpaid" },
  { id: "PINV-2026-0062", supplier: "GenPharm Ltd", poRef: "PO-2026-0145", grnRef: "GRN-2026-0062", date: "2026-06-30", due: "2026-07-30", items: 5, subtotal: 1580.00, tax: 138.25, total: 1718.25, paid: 1718.25, balance: 0, status: "Paid" },
  { id: "PINV-2026-0061", supplier: "PharmaCo Inc", poRef: "PO-2026-0144", grnRef: "GRN-2026-0061", date: "2026-06-25", due: "2026-07-25", items: 9, subtotal: 2960.40, tax: 259.03, total: 3219.43, paid: 1609.72, balance: 1609.71, status: "Partial" },
  { id: "PINV-2026-0060", supplier: "MedLine Pharma", poRef: "PO-2026-0143", grnRef: "GRN-2026-0060", date: "2026-06-18", due: "2026-07-18", items: 7, subtotal: 2145.00, tax: 187.69, total: 2332.69, paid: 2332.69, balance: 0, status: "Paid" },
  { id: "PINV-2026-0059", supplier: "RespiCare Ltd", poRef: "PO-2026-0142", grnRef: "GRN-2026-0059", date: "2026-06-10", due: "2026-07-10", items: 3, subtotal: 780.00, tax: 68.25, total: 848.25, paid: 848.25, balance: 0, status: "Paid" },
  { id: "PINV-2026-0058", supplier: "BioPharm AG", poRef: "PO-2026-0141", grnRef: "GRN-2026-0058", date: "2026-06-02", due: "2026-07-02", items: 4, subtotal: 2200.00, tax: 192.50, total: 2392.50, paid: 0, balance: 2392.50, status: "Unpaid" },
  { id: "PINV-2026-0057", supplier: "GenPharm Ltd", poRef: "PO-2026-0140", grnRef: "GRN-2026-0057", date: "2026-05-28", due: "2026-06-27", items: 6, subtotal: 1420.30, tax: 124.28, total: 1544.58, paid: 1544.58, balance: 0, status: "Paid" },
  { id: "PINV-2026-0056", supplier: "PharmaCo Inc", poRef: "PO-2026-0139", grnRef: "GRN-2026-0056", date: "2026-05-22", due: "2026-06-21", items: 10, subtotal: 3480.20, tax: 304.52, total: 3784.72, paid: 3784.72, balance: 0, status: "Paid" },
  { id: "PINV-2026-0055", supplier: "MedLine Pharma", poRef: "PO-2026-0138", grnRef: "GRN-2026-0055", date: "2026-05-18", due: "2026-06-17", items: 8, subtotal: 2680.00, tax: 234.50, total: 2914.50, paid: 0, balance: 0, status: "Cancelled" },
  { id: "PINV-2026-0054", supplier: "RespiCare Ltd", poRef: "PO-2026-0137", grnRef: "GRN-2026-0054", date: "2026-05-12", due: "2026-06-11", items: 2, subtotal: 495.00, tax: 43.31, total: 538.31, paid: 538.31, balance: 0, status: "Paid" },
  { id: "PINV-2026-0053", supplier: "BioPharm AG", poRef: "PO-2026-0136", grnRef: "GRN-2026-0053", date: "2026-05-05", due: "2026-06-04", items: 5, subtotal: 2820.00, tax: 246.75, total: 3066.75, paid: 3066.75, balance: 0, status: "Paid" },
  { id: "PINV-2026-0052", supplier: "GenPharm Ltd", poRef: "PO-2026-0135", grnRef: "GRN-2026-0052", date: "2026-04-28", due: "2026-05-28", items: 4, subtotal: 1240.00, tax: 108.50, total: 1348.50, paid: 674.25, balance: 674.25, status: "Partial" },
  { id: "PINV-2026-0051", supplier: "PharmaCo Inc", poRef: "PO-2026-0134", grnRef: "GRN-2026-0051", date: "2026-04-22", due: "2026-05-22", items: 12, subtotal: 4120.00, tax: 360.50, total: 4480.50, paid: 4480.50, balance: 0, status: "Paid" },
];

export const purchaseOrders: PurchaseOrderRecord[] = [
  { id: "PO-2026-0155", supplier: "MedLine Pharma", date: "2026-08-18", expectedDelivery: "2026-08-20", items: 9, orderValue: 3650.00, received: 7, pending: 2, status: "Partially Received", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0154", supplier: "GenPharm Ltd", date: "2026-08-15", expectedDelivery: "2026-08-17", items: 5, orderValue: 1544.58, received: 5, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0153", supplier: "PharmaCo Inc", date: "2026-08-12", expectedDelivery: "2026-08-15", items: 12, orderValue: 4437.82, received: 0, pending: 12, status: "Approved", warehouse: "Main Warehouse", paymentTerms: "Credit 45 Days" },
  { id: "PO-2026-0152", supplier: "BioPharm AG", date: "2026-08-05", expectedDelivery: "2026-08-07", items: 4, orderValue: 3066.75, received: 4, pending: 0, status: "Completed", warehouse: "Cold Store", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0151", supplier: "RespiCare Ltd", date: "2026-08-02", expectedDelivery: "2026-08-04", items: 2, orderValue: 639.55, received: 2, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Cash on Delivery" },
  { id: "PO-2026-0150", supplier: "MedLine Pharma", date: "2026-07-26", expectedDelivery: "2026-07-28", items: 8, orderValue: 2928.48, received: 8, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0149", supplier: "GenPharm Ltd", date: "2026-07-23", expectedDelivery: "2026-07-25", items: 4, orderValue: 989.10, received: 4, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0148", supplier: "PharmaCo Inc", date: "2026-07-20", expectedDelivery: "2026-07-22", items: 11, orderValue: 3896.12, received: 0, pending: 11, status: "Sent", warehouse: "Main Warehouse", paymentTerms: "Credit 45 Days" },
  { id: "PO-2026-0147", supplier: "MedLine Pharma", date: "2026-07-13", expectedDelivery: "2026-07-16", items: 15, orderValue: 5200.00, received: 15, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0146", supplier: "BioPharm AG", date: "2026-07-06", expectedDelivery: "2026-07-09", items: 6, orderValue: 3393.00, received: 0, pending: 6, status: "Pending Approval", warehouse: "Cold Store", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0145", supplier: "GenPharm Ltd", date: "2026-06-28", expectedDelivery: "2026-07-01", items: 5, orderValue: 1718.25, received: 5, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0144", supplier: "PharmaCo Inc", date: "2026-06-23", expectedDelivery: "2026-06-26", items: 9, orderValue: 3219.43, received: 5, pending: 4, status: "Partially Received", warehouse: "Main Warehouse", paymentTerms: "Credit 45 Days" },
  { id: "PO-2026-0143", supplier: "MedLine Pharma", date: "2026-06-16", expectedDelivery: "2026-06-19", items: 7, orderValue: 2332.69, received: 7, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Credit 30 Days" },
  { id: "PO-2026-0142", supplier: "RespiCare Ltd", date: "2026-06-08", expectedDelivery: "2026-06-11", items: 3, orderValue: 848.25, received: 3, pending: 0, status: "Completed", warehouse: "Main Warehouse", paymentTerms: "Cash on Delivery" },
  { id: "PO-2026-0141", supplier: "BioPharm AG", date: "2026-05-30", expectedDelivery: "2026-06-02", items: 4, orderValue: 2392.50, received: 0, pending: 4, status: "Draft", warehouse: "Cold Store", paymentTerms: "Credit 30 Days" },
];

export const PO_MOCK_LINES: Record<string, POLine[]> = {
  "PO-2026-0155": [
    { id: 1, medicineName: "Paracetamol 500mg", pack: "10 Tabs", currentStock: 120, avgSales: "40/day", suggestedQty: 400, orderQty: 400, purchaseRate: 1.80, scheme: "10+1", freeQty: 40, mrp: 3.50, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 2, medicineName: "Amoxicillin 500mg", pack: "10 Caps", currentStock: 45, avgSales: "12/day", suggestedQty: 120, orderQty: 120, purchaseRate: 5.20, scheme: "5+1", freeQty: 20, mrp: 10.00, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 3, medicineName: "Atorvastatin 20mg", pack: "10 Tabs", currentStock: 80, avgSales: "8/day", suggestedQty: 100, orderQty: 100, purchaseRate: 11.40, scheme: "10+1", freeQty: 10, mrp: 23.40, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 4, medicineName: "Metformin 1000mg", pack: "10 Tabs", currentStock: 60, avgSales: "15/day", suggestedQty: 150, orderQty: 150, purchaseRate: 4.50, scheme: "10+1", freeQty: 15, mrp: 9.00, gst: 5, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 5, medicineName: "Omeprazole 20mg", pack: "10 Caps", currentStock: 30, avgSales: "10/day", suggestedQty: 100, orderQty: 100, purchaseRate: 3.20, scheme: "5+1", freeQty: 16, mrp: 6.50, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 6, medicineName: "Amlodipine 5mg", pack: "10 Tabs", currentStock: 50, avgSales: "6/day", suggestedQty: 60, orderQty: 60, purchaseRate: 2.10, scheme: "", freeQty: 0, mrp: 4.80, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 7, medicineName: "Ciprofloxacin 500mg", pack: "10 Tabs", currentStock: 20, avgSales: "8/day", suggestedQty: 80, orderQty: 80, purchaseRate: 6.80, scheme: "10+1", freeQty: 8, mrp: 14.00, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 8, medicineName: "Sertraline 50mg", pack: "10 Tabs", currentStock: 15, avgSales: "4/day", suggestedQty: 40, orderQty: 40, purchaseRate: 9.20, scheme: "", freeQty: 0, mrp: 18.50, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 9, medicineName: "Salbutamol Inhaler", pack: "1 Inhaler", currentStock: 8, avgSales: "2/day", suggestedQty: 20, orderQty: 20, purchaseRate: 68.00, scheme: "5+1", freeQty: 3, mrp: 130.00, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
  ],
  "PO-2026-0153": [
    { id: 1, medicineName: "Insulin Glargine", pack: "3ml Pen", currentStock: 5, avgSales: "2/day", suggestedQty: 30, orderQty: 30, purchaseRate: 420.00, scheme: "", freeQty: 0, mrp: 850.00, gst: 5, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 2, medicineName: "Paracetamol 500mg", pack: "10 Tabs", currentStock: 80, avgSales: "40/day", suggestedQty: 500, orderQty: 500, purchaseRate: 1.80, scheme: "10+1", freeQty: 50, mrp: 3.50, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
    { id: 3, medicineName: "Amoxicillin 500mg", pack: "10 Caps", currentStock: 20, avgSales: "12/day", suggestedQty: 150, orderQty: 150, purchaseRate: 5.20, scheme: "5+1", freeQty: 25, mrp: 10.00, gst: 12, stockOnPO: 0, pendingOrders: 0, branchStock: 0, nearExpiryQty: 0, safetyStock: 0 },
  ],
};

export interface MedCatalogItem {
  name: string; pack: string; dosageForm: string; composition: string; totalQty: number;
  cost: number; price: number; gst: number;
  avgSalesPerDay: number;
  leadTime: number;
}

export const PO_MED_CATALOG: MedCatalogItem[] = [
  { name: "Paracetamol 500mg",      pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Paracetamol 500mg",                    totalQty: 1200, cost: 1.80,  price: 3.50,   gst: 12, avgSalesPerDay: 40, leadTime: 3 },
  { name: "Amoxicillin 500mg",      pack: "10 Caps",    dosageForm: "Capsule",   composition: "Amoxicillin Trihydrate 500mg",          totalQty: 240,  cost: 5.20,  price: 10.00,  gst: 12, avgSalesPerDay: 8,  leadTime: 4 },
  { name: "Metformin 500mg",        pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Metformin Hydrochloride 500mg",         totalQty: 320,  cost: 2.10,  price: 4.50,   gst: 5,  avgSalesPerDay: 10, leadTime: 3 },
  { name: "Metformin 1000mg",       pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Metformin Hydrochloride 1000mg",        totalQty: 180,  cost: 4.50,  price: 9.00,   gst: 5,  avgSalesPerDay: 6,  leadTime: 3 },
  { name: "Atorvastatin 20mg",      pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Atorvastatin Calcium 20mg",             totalQty: 312,  cost: 11.40, price: 23.40,  gst: 12, avgSalesPerDay: 10, leadTime: 5 },
  { name: "Omeprazole 20mg",        pack: "10 Caps",    dosageForm: "Capsule",   composition: "Omeprazole 20mg",                      totalQty: 145,  cost: 3.20,  price: 6.50,   gst: 12, avgSalesPerDay: 5,  leadTime: 4 },
  { name: "Amlodipine 5mg",         pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Amlodipine Besylate 5mg",               totalQty: 380,  cost: 2.10,  price: 4.80,   gst: 12, avgSalesPerDay: 12, leadTime: 3 },
  { name: "Ciprofloxacin 500mg",    pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Ciprofloxacin Hydrochloride 500mg",     totalQty: 12,   cost: 6.80,  price: 14.00,  gst: 12, avgSalesPerDay: 4,  leadTime: 4 },
  { name: "Sertraline 50mg",        pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Sertraline Hydrochloride 50mg",         totalQty: 220,  cost: 9.20,  price: 18.50,  gst: 12, avgSalesPerDay: 7,  leadTime: 5 },
  { name: "Salbutamol Inhaler",     pack: "1 Inhaler",  dosageForm: "Inhaler",   composition: "Salbutamol Sulphate 100mcg/dose",       totalQty: 28,   cost: 68.00, price: 130.00, gst: 12, avgSalesPerDay: 1,  leadTime: 6 },
  { name: "Insulin Glargine",       pack: "3ml Pen",    dosageForm: "Injection", composition: "Insulin Glargine 100 IU/mL",            totalQty: 45,   cost: 420.00,price: 850.00, gst: 5,  avgSalesPerDay: 1,  leadTime: 7 },
  { name: "Warfarin 5mg",           pack: "28 Tabs",    dosageForm: "Tablet",    composition: "Warfarin Sodium 5mg",                  totalQty: 6,    cost: 8.50,  price: 18.00,  gst: 12, avgSalesPerDay: 1,  leadTime: 5 },
  { name: "Lisinopril 10mg",        pack: "14 Tabs",    dosageForm: "Tablet",    composition: "Lisinopril Dihydrate 10mg",             totalQty: 0,    cost: 4.20,  price: 8.50,   gst: 12, avgSalesPerDay: 3,  leadTime: 4 },
  { name: "Azithromycin 500mg",     pack: "5 Tabs",     dosageForm: "Tablet",    composition: "Azithromycin Dihydrate 500mg",          totalQty: 60,   cost: 18.00, price: 36.00,  gst: 12, avgSalesPerDay: 3,  leadTime: 4 },
  { name: "Pantoprazole 40mg",      pack: "14 Tabs",    dosageForm: "Tablet",    composition: "Pantoprazole Sodium Sesquihydrate 40mg",totalQty: 90,   cost: 4.50,  price: 9.00,   gst: 12, avgSalesPerDay: 4,  leadTime: 3 },
  { name: "Cetirizine 10mg",        pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Cetirizine Hydrochloride 10mg",         totalQty: 150,  cost: 1.80,  price: 3.60,   gst: 12, avgSalesPerDay: 6,  leadTime: 3 },
  { name: "Montelukast 10mg",       pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Montelukast Sodium 10mg",               totalQty: 80,   cost: 7.20,  price: 14.00,  gst: 12, avgSalesPerDay: 3,  leadTime: 4 },
  { name: "Losartan 50mg",          pack: "28 Tabs",    dosageForm: "Tablet",    composition: "Losartan Potassium 50mg",               totalQty: 112,  cost: 5.50,  price: 11.00,  gst: 12, avgSalesPerDay: 4,  leadTime: 4 },
  { name: "Ibuprofen 400mg",        pack: "10 Tabs",    dosageForm: "Tablet",    composition: "Ibuprofen 400mg",                      totalQty: 200,  cost: 2.20,  price: 4.80,   gst: 12, avgSalesPerDay: 8,  leadTime: 3 },
];

export const PO_PRICE_HISTORY: Record<string, Array<{ supplier: string; rate: number; date: string }>> = {
  "Paracetamol 500mg": [
    { supplier: "MedLine Pharma", rate: 1.95, date: "2026-07-15" },
    { supplier: "GenPharm Ltd", rate: 1.88, date: "2026-06-28" },
    { supplier: "PharmaCo Inc", rate: 1.82, date: "2026-06-10" },
  ],
  "Amoxicillin 500mg": [
    { supplier: "MedLine Pharma", rate: 5.40, date: "2026-07-20" },
    { supplier: "GenPharm Ltd", rate: 5.25, date: "2026-07-05" },
    { supplier: "BioPharm AG", rate: 5.20, date: "2026-06-22" },
  ],
  "Atorvastatin 20mg": [
    { supplier: "MedLine Pharma", rate: 11.80, date: "2026-07-28" },
    { supplier: "GenPharm Ltd", rate: 11.60, date: "2026-07-10" },
    { supplier: "PharmaCo Inc", rate: 11.40, date: "2026-06-30" },
  ],
};

export const SUPPLIER_COMPARISON: Record<string, Array<{ supplier: string; rate: number; scheme: string; disc: number; availability: string; score: number }>> = {
  "Paracetamol 500mg": [
    { supplier: "MedLine Pharma", rate: 1.95, scheme: "10+1", disc: 2, availability: "Available", score: 91 },
    { supplier: "GenPharm Ltd", rate: 1.80, scheme: "10+1", disc: 0, availability: "Available", score: 95 },
    { supplier: "PharmaCo Inc", rate: 1.85, scheme: "5+1", disc: 1, availability: "Partial", score: 84 },
  ],
  "Amoxicillin 500mg": [
    { supplier: "GenPharm Ltd", rate: 5.20, scheme: "5+1", disc: 0, availability: "Available", score: 95 },
    { supplier: "MedLine Pharma", rate: 5.40, scheme: "10+1", disc: 2, availability: "Available", score: 91 },
    { supplier: "BioPharm AG", rate: 5.30, scheme: "10+1", disc: 1, availability: "Partial", score: 82 },
  ],
};

export interface MedRec { supplier: string; rate: number; mrp: number; scheme: string; expiryAllowed: boolean; expiryReturnPeriod: string; damageReturn: boolean; minExpiry: string; availability: string; score: number; }
export const MEDICINE_RECS: Record<string, MedRec[]> = {
  "Paracetamol 500mg": [
    { supplier: "GenPharm Ltd",   rate: 1.80, mrp: 3.50, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "3 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 95 },
    { supplier: "MedLine Pharma", rate: 1.95, mrp: 3.50, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "2 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 91 },
    { supplier: "PharmaCo Inc",   rate: 1.85, mrp: 3.50, scheme: "5+1",  expiryAllowed: false, expiryReturnPeriod: "—",                       damageReturn: false, minExpiry: "6 months",  availability: "Partial",   score: 84 },
  ],
  "Amoxicillin 500mg": [
    { supplier: "GenPharm Ltd",   rate: 5.20, mrp: 10.00, scheme: "5+1",  expiryAllowed: true,  expiryReturnPeriod: "3 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 95 },
    { supplier: "MedLine Pharma", rate: 5.40, mrp: 10.00, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "2 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 91 },
    { supplier: "BioPharm AG",    rate: 5.30, mrp: 10.00, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "1 month before expiry",  damageReturn: false, minExpiry: "9 months",  availability: "Partial",   score: 82 },
  ],
  "Atorvastatin 20mg": [
    { supplier: "MedLine Pharma", rate: 11.40, mrp: 23.40, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "3 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 93 },
    { supplier: "GenPharm Ltd",   rate: 11.60, mrp: 23.40, scheme: "5+1",  expiryAllowed: true,  expiryReturnPeriod: "2 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 88 },
    { supplier: "PharmaCo Inc",   rate: 11.80, mrp: 23.40, scheme: "",     expiryAllowed: false, expiryReturnPeriod: "—",                       damageReturn: false, minExpiry: "6 months",  availability: "Available", score: 80 },
  ],
  "Metformin 1000mg": [
    { supplier: "GenPharm Ltd",   rate: 4.20, mrp: 9.00, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "3 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 94 },
    { supplier: "PharmaCo Inc",   rate: 4.50, mrp: 9.00, scheme: "5+1",  expiryAllowed: true,  expiryReturnPeriod: "2 months before expiry", damageReturn: true,  minExpiry: "9 months",  availability: "Available", score: 87 },
    { supplier: "MedLine Pharma", rate: 4.60, mrp: 9.00, scheme: "10+1", expiryAllowed: false, expiryReturnPeriod: "—",                       damageReturn: false, minExpiry: "6 months",  availability: "Partial",   score: 79 },
  ],
  "Omeprazole 20mg": [
    { supplier: "BioPharm AG",    rate: 3.00, mrp: 6.50, scheme: "5+1",  expiryAllowed: true,  expiryReturnPeriod: "2 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 92 },
    { supplier: "MedLine Pharma", rate: 3.20, mrp: 6.50, scheme: "10+1", expiryAllowed: true,  expiryReturnPeriod: "3 months before expiry", damageReturn: true,  minExpiry: "12 months", availability: "Available", score: 90 },
    { supplier: "GenPharm Ltd",   rate: 3.10, mrp: 6.50, scheme: "",     expiryAllowed: false, expiryReturnPeriod: "—",                       damageReturn: false, minExpiry: "9 months",  availability: "Partial",   score: 83 },
  ],
};

export const STOCK_ON_PO: Record<string, number> = {
  "Paracetamol 500mg": 200, "Amoxicillin 500mg": 50, "Metformin 1000mg": 60,
  "Atorvastatin 20mg": 30,  "Omeprazole 20mg": 40,   "Ciprofloxacin 500mg": 20,
  "Salbutamol Inhaler": 5,  "Insulin Glargine": 8,
};

export const PENDING_ORDERS: Record<string, number> = {
  "Paracetamol 500mg": 80,  "Metformin 500mg": 30,   "Metformin 1000mg": 45,
  "Atorvastatin 20mg": 20,  "Amlodipine 5mg": 15,    "Sertraline 50mg": 10,
  "Lisinopril 10mg": 28,    "Omeprazole 20mg": 25,
};

export const BRANCH_STOCK: Record<string, number> = {
  "Paracetamol 500mg": 150, "Amoxicillin 500mg": 30,  "Metformin 500mg": 60,
  "Amlodipine 5mg": 40,     "Salbutamol Inhaler": 4,  "Cetirizine 10mg": 50,
  "Ibuprofen 400mg": 80,    "Pantoprazole 40mg": 20,
};

export const NEAR_EXPIRY_QTY: Record<string, number> = {
  "Warfarin 5mg": 6,   "Insulin Glargine": 10, "Ciprofloxacin 500mg": 8,
  "Metformin 1000mg": 20, "Amoxicillin 500mg": 15, "Omeprazole 20mg": 10,
};

export const COVERAGE_DAYS = 30;

export interface DistributorPolicy {
  expiryReturn: boolean;
  damageReturn: boolean;
  returnWindow: string;
  minExpiry: string;
  nearExpiryDiscount: string;
}

export const DISTRIBUTOR_POLICIES: Record<string, DistributorPolicy> = {
  "MedLine Pharma": { expiryReturn: true,  damageReturn: true,  returnWindow: "30 days", minExpiry: "12 months", nearExpiryDiscount: "10% for < 6 months" },
  "GenPharm Ltd":   { expiryReturn: true,  damageReturn: true,  returnWindow: "30 days", minExpiry: "12 months", nearExpiryDiscount: "—" },
  "PharmaCo Inc":   { expiryReturn: false, damageReturn: false, returnWindow: "—",       minExpiry: "6 months",  nearExpiryDiscount: "—" },
  "BioPharm AG":    { expiryReturn: true,  damageReturn: false, returnWindow: "15 days", minExpiry: "9 months",  nearExpiryDiscount: "—" },
  "RespiCare Ltd":  { expiryReturn: true,  damageReturn: true,  returnWindow: "45 days", minExpiry: "12 months", nearExpiryDiscount: "5% for < 3 months" },
};

export const CANCEL_REASONS = ["Distributor unavailable", "Price negotiation pending", "Order placed in error", "Budget constraint", "Alternative distributor selected", "Other"];
export const WAREHOUSES = ["Main Warehouse", "Cold Store", "Branch Store"];
export const PAYMENT_TERMS_OPTIONS = ["Cash on Delivery", "Credit 15 Days", "Credit 30 Days", "Credit 45 Days", "Credit 60 Days"];

export const purchaseReturns = [
  { id: "PRN-2026-0014", invoiceRef: "PINV-2026-0070", supplier: "PharmaCo Inc", date: "2026-08-19", reason: "Damaged on arrival", items: 2, qty: 60, total: 342.00, creditNote: "CN-2026-0009", status: "Posted" },
  { id: "PRN-2026-0013", invoiceRef: "PINV-2026-0067", supplier: "MedLine Pharma", date: "2026-08-14", reason: "Near-expiry batch", items: 1, qty: 20, total: 170.00, creditNote: "CN-2026-0008", status: "Posted" },
  { id: "PRN-2026-0012", invoiceRef: "PINV-2026-0065", supplier: "PharmaCo Inc", date: "2026-08-08", reason: "Incorrect item shipped", items: 3, qty: 150, total: 512.40, creditNote: null, status: "Draft" },
  { id: "PRN-2026-0011", invoiceRef: "PINV-2026-0064", supplier: "MedLine Pharma", date: "2026-07-30", reason: "Wrong quantity received", items: 2, qty: 40, total: 220.00, creditNote: "CN-2026-0007", status: "Posted" },
  { id: "PRN-2026-0010", invoiceRef: "PINV-2026-0063", supplier: "BioPharm AG", date: "2026-07-18", reason: "Quality issue", items: 4, qty: 80, total: 640.00, creditNote: "CN-2026-0006", status: "Posted" },
  { id: "PRN-2026-0009", invoiceRef: "PINV-2026-0061", supplier: "PharmaCo Inc", date: "2026-07-05", reason: "Damaged on arrival", items: 1, qty: 25, total: 195.00, creditNote: null, status: "Draft" },
  { id: "PRN-2026-0008", invoiceRef: "PINV-2026-0059", supplier: "RespiCare Ltd", date: "2026-06-22", reason: "Near-expiry batch", items: 2, qty: 45, total: 380.50, creditNote: "CN-2026-0005", status: "Posted" },
  { id: "PRN-2026-0007", invoiceRef: "PINV-2026-0058", supplier: "BioPharm AG", date: "2026-06-14", reason: "Other", items: 1, qty: 12, total: 92.40, creditNote: "CN-2026-0004", status: "Posted" },
  { id: "PRN-2026-0006", invoiceRef: "PINV-2026-0056", supplier: "PharmaCo Inc", date: "2026-05-30", reason: "Damaged on arrival", items: 3, qty: 55, total: 445.00, creditNote: "CN-2026-0003", status: "Posted" },
  { id: "PRN-2026-0005", invoiceRef: "PINV-2026-0054", supplier: "RespiCare Ltd", date: "2026-05-20", reason: "Wrong quantity received", items: 1, qty: 10, total: 62.00, creditNote: "CN-2026-0002", status: "Posted" },
  { id: "PRN-2026-0004", invoiceRef: "PINV-2026-0053", supplier: "BioPharm AG", date: "2026-05-15", reason: "Near-expiry batch", items: 2, qty: 30, total: 285.00, creditNote: "CN-2026-0001", status: "Posted" },
];

export const purchasePayments = [
  { id: "PPAY-2026-0044", supplier: "MedLine Pharma", invoiceRef: "PINV-2026-0067", date: "2026-08-19", method: "Bank Transfer", bank: "Chase", ref: "TRF-882100", amount: 2928.48, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0043", supplier: "GenPharm Ltd", invoiceRef: "PINV-2026-0071", date: "2026-08-16", method: "UPI", bank: "HDFC", ref: "UPI/genpharm/9922", amount: 1544.58, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0042", supplier: "PharmaCo Inc", invoiceRef: "PINV-2026-0070", date: "2026-08-14", method: "Cheque", bank: "Wells Fargo", ref: "CHQ-04421", amount: 2218.91, balanceAfter: 2218.91, status: "Pending" },
  { id: "PPAY-2026-0041", supplier: "BioPharm AG", invoiceRef: "PINV-2026-0069", date: "2026-08-07", method: "RTGS", bank: "Chase", ref: "RTGS-8829", amount: 3066.75, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0040", supplier: "RespiCare Ltd", invoiceRef: "PINV-2026-0068", date: "2026-08-04", method: "Bank Transfer", bank: "Chase", ref: "TRF-876400", amount: 639.55, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0039", supplier: "GenPharm Ltd", invoiceRef: "PINV-2026-0066", date: "2026-07-30", method: "Cheque", bank: "Wells Fargo", ref: "CHQ-04412", amount: 494.55, balanceAfter: 494.55, status: "Pending" },
  { id: "PPAY-2026-0038", supplier: "MedLine Pharma", invoiceRef: "PINV-2026-0064", date: "2026-07-20", method: "RTGS", bank: "Chase", ref: "RTGS-8721", amount: 5200.00, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0037", supplier: "GenPharm Ltd", invoiceRef: "PINV-2026-0062", date: "2026-07-05", method: "UPI", bank: "HDFC", ref: "UPI/genpharm/9812", amount: 1718.25, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0036", supplier: "PharmaCo Inc", invoiceRef: "PINV-2026-0061", date: "2026-06-28", method: "Bank Transfer", bank: "Chase", ref: "TRF-874002", amount: 1609.72, balanceAfter: 1609.71, status: "Pending" },
  { id: "PPAY-2026-0035", supplier: "MedLine Pharma", invoiceRef: "PINV-2026-0060", date: "2026-06-22", method: "Bank Transfer", bank: "Chase", ref: "TRF-873100", amount: 2332.69, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0034", supplier: "RespiCare Ltd", invoiceRef: "PINV-2026-0059", date: "2026-06-12", method: "Bank Transfer", bank: "Chase", ref: "TRF-872400", amount: 848.25, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0033", supplier: "GenPharm Ltd", invoiceRef: "PINV-2026-0057", date: "2026-05-30", method: "UPI", bank: "HDFC", ref: "UPI/genpharm/9701", amount: 1544.58, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0032", supplier: "PharmaCo Inc", invoiceRef: "PINV-2026-0056", date: "2026-05-25", method: "Bank Transfer", bank: "Chase", ref: "TRF-871900", amount: 3784.72, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0031", supplier: "RespiCare Ltd", invoiceRef: "PINV-2026-0054", date: "2026-05-18", method: "Cheque", bank: "Wells Fargo", ref: "CHQ-04398", amount: 538.31, balanceAfter: 0, status: "Failed" },
  { id: "PPAY-2026-0030", supplier: "BioPharm AG", invoiceRef: "PINV-2026-0053", date: "2026-05-10", method: "RTGS", bank: "Chase", ref: "RTGS-8615", amount: 3066.75, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0029", supplier: "PharmaCo Inc", invoiceRef: "PINV-2026-0051", date: "2026-04-25", method: "Cheque", bank: "Wells Fargo", ref: "CHQ-04387", amount: 4480.50, balanceAfter: 0, status: "Cleared" },
  { id: "PPAY-2026-0028", supplier: "GenPharm Ltd", invoiceRef: "PINV-2026-0052", date: "2026-04-30", method: "Bank Transfer", bank: "Chase", ref: "TRF-871200", amount: 674.25, balanceAfter: 674.25, status: "Pending" },
];

// ─── New Purchase Return data ─────────────────────────────────────────────────

export interface ReturnLine {
  id: number;
  medicineName: string;
  packUnit: string;
  batchNo: string;
  expiryDate: string;
  purchaseRate: number;
  mrp: number;
  returnQty: number;
  freeQty: number;
  disposition: string;
}

export function newEmptyReturnLine(id: number): ReturnLine {
  return { id, medicineName: "", packUnit: "1", batchNo: "", expiryDate: "", purchaseRate: 0, mrp: 0, returnQty: 0, freeQty: 0, disposition: "Replacement" };
}

export const MOCK_RETURN_LINES: Record<string, ReturnLine[]> = {
  "PRN-2026-0014": [
    { id: 1, medicineName: "Amoxicillin 500mg", packUnit: "10", batchNo: "AMX-2026-99", expiryDate: "2026-08-15", purchaseRate: 4.50, mrp: 8.50, returnQty: 30, freeQty: 0, disposition: "Replacement" },
    { id: 2, medicineName: "Paracetamol 500mg", packUnit: "15", batchNo: "PCM-2025-A", expiryDate: "2027-05-15", purchaseRate: 0.60, mrp: 1.20, returnQty: 30, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0013": [
    { id: 1, medicineName: "Atorvastatin 20mg", packUnit: "30", batchNo: "ATV-1204X", expiryDate: "2026-09-10", purchaseRate: 11.40, mrp: 23.40, returnQty: 20, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0012": [
    { id: 1, medicineName: "Metformin 500mg", packUnit: "20", batchNo: "MET-2025-C", expiryDate: "2026-11-20", purchaseRate: 2.10, mrp: 4.50, returnQty: 50, freeQty: 0, disposition: "Replacement" },
    { id: 2, medicineName: "Cetirizine 10mg", packUnit: "10", batchNo: "CET-2025-B", expiryDate: "2027-02-28", purchaseRate: 1.80, mrp: 3.60, returnQty: 60, freeQty: 0, disposition: "Refund" },
    { id: 3, medicineName: "Omeprazole 20mg", packUnit: "14", batchNo: "OMP-2025-D", expiryDate: "2027-01-10", purchaseRate: 3.20, mrp: 6.80, returnQty: 40, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0011": [
    { id: 1, medicineName: "Losartan 50mg", packUnit: "28", batchNo: "LOS-2025-A", expiryDate: "2027-03-15", purchaseRate: 5.50, mrp: 11.00, returnQty: 28, freeQty: 0, disposition: "Credit Note" },
    { id: 2, medicineName: "Amlodipine 5mg", packUnit: "30", batchNo: "AML-2025-B", expiryDate: "2027-04-20", purchaseRate: 3.00, mrp: 6.50, returnQty: 12, freeQty: 0, disposition: "Replacement" },
  ],
  "PRN-2026-0010": [
    { id: 1, medicineName: "Ibuprofen 400mg", packUnit: "10", batchNo: "IBU-2025-C", expiryDate: "2026-10-01", purchaseRate: 2.20, mrp: 4.80, returnQty: 20, freeQty: 0, disposition: "Discard" },
    { id: 2, medicineName: "Azithromycin 500mg", packUnit: "5", batchNo: "AZI-2025-A", expiryDate: "2026-09-30", purchaseRate: 18.00, mrp: 36.00, returnQty: 20, freeQty: 0, disposition: "Discard" },
    { id: 3, medicineName: "Pantoprazole 40mg", packUnit: "14", batchNo: "PAN-2025-B", expiryDate: "2027-06-10", purchaseRate: 4.50, mrp: 9.00, returnQty: 20, freeQty: 0, disposition: "Credit Note" },
    { id: 4, medicineName: "Montelukast 10mg", packUnit: "10", batchNo: "MON-2025-A", expiryDate: "2027-08-15", purchaseRate: 7.20, mrp: 14.00, returnQty: 20, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0009": [
    { id: 1, medicineName: "Ciprofloxacin 500mg", packUnit: "10", batchNo: "CIP-2025-D", expiryDate: "2026-08-01", purchaseRate: 7.80, mrp: 15.60, returnQty: 25, freeQty: 0, disposition: "Discard" },
  ],
  "PRN-2026-0008": [
    { id: 1, medicineName: "Salbutamol 100mcg", packUnit: "200", batchNo: "SAL-2025-A", expiryDate: "2026-09-15", purchaseRate: 45.00, mrp: 90.00, returnQty: 25, freeQty: 0, disposition: "Replacement" },
    { id: 2, medicineName: "Fluticasone 50mcg", packUnit: "150", batchNo: "FLU-2025-B", expiryDate: "2026-10-20", purchaseRate: 62.00, mrp: 124.00, returnQty: 20, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0007": [
    { id: 1, medicineName: "Atorvastatin 40mg", packUnit: "30", batchNo: "ATV-2025-B", expiryDate: "2026-12-10", purchaseRate: 7.70, mrp: 15.40, returnQty: 12, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0006": [
    { id: 1, medicineName: "Amoxicillin 250mg", packUnit: "10", batchNo: "AMX-2025-C", expiryDate: "2026-07-20", purchaseRate: 3.20, mrp: 6.50, returnQty: 20, freeQty: 0, disposition: "Discard" },
    { id: 2, medicineName: "Metronidazole 400mg", packUnit: "14", batchNo: "MTZ-2025-A", expiryDate: "2026-08-05", purchaseRate: 2.50, mrp: 5.00, returnQty: 20, freeQty: 0, disposition: "Discard" },
    { id: 3, medicineName: "Doxycycline 100mg", packUnit: "10", batchNo: "DOX-2025-B", expiryDate: "2026-09-01", purchaseRate: 6.00, mrp: 12.00, returnQty: 15, freeQty: 0, disposition: "Replacement" },
  ],
  "PRN-2026-0005": [
    { id: 1, medicineName: "Salbutamol Syrup", packUnit: "100ml", batchNo: "SAL-2025-C", expiryDate: "2026-11-30", purchaseRate: 62.00, mrp: 124.00, returnQty: 10, freeQty: 0, disposition: "Credit Note" },
  ],
  "PRN-2026-0004": [
    { id: 1, medicineName: "Atorvastatin 20mg", packUnit: "30", batchNo: "ATV-1104X", expiryDate: "2026-09-05", purchaseRate: 11.40, mrp: 23.40, returnQty: 15, freeQty: 0, disposition: "Credit Note" },
    { id: 2, medicineName: "Rosuvastatin 10mg", packUnit: "30", batchNo: "ROS-2025-A", expiryDate: "2026-10-15", purchaseRate: 14.00, mrp: 28.00, returnQty: 15, freeQty: 0, disposition: "Credit Note" },
  ],
};

export const DISPOSITION_OPTIONS = ["Replacement", "Credit Note", "Refund", "Discard"];
export const RETURN_TYPES = ["Replacement", "Credit Note", "Refund"];

export interface ReturnInitialData {
  id: string;
  supplier: string;
  date: string;
  invoiceRef: string;
  reason: string;
  status: string;
  total: number;
}

// ─── Prior batch helpers ──────────────────────────────────────────────────────

export function drugBarcode(id: number): string {
  return `8901234${String(id).padStart(6, "0")}`;
}

export interface PriorBatch { id: string; qty: number; packs: number; mfgDate: string; expDate: string; mrp: number; rate: number; }

export function shiftIsoMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  let ny = y, nm = m + months;
  while (nm > 12) { nm -= 12; ny += 1; }
  while (nm < 1) { nm += 12; ny -= 1; }
  return `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function priorBatchesFor(drug: typeof drugs[0]): PriorBatch[] {
  const num = String(drug.id).padStart(4, "0");
  return [
    { id: `BT-${num}A`, qty: 240, packs: 24, mfgDate: shiftIsoMonths(drug.expiry, -24), expDate: drug.expiry, mrp: +(drug.price * 1.15).toFixed(2), rate: drug.cost },
    { id: `BT-${num}B`, qty: 60,  packs: 6,  mfgDate: shiftIsoMonths(drug.expiry, -30), expDate: shiftIsoMonths(drug.expiry, -6),  mrp: +(drug.price * 1.10).toFixed(2), rate: +(drug.cost * 0.95).toFixed(2) },
  ];
}

// ─── Add Medicine form ────────────────────────────────────────────────────────

export interface AddMedForm {
  genericName: string; brandName: string; strength: string; dosageForm: string;
  route: string; packUnit: string; manufacturer: string; therapeuticCategory: string;
  saltComposition: string; therapeuticClass: string;
  hsnCode: string; barcode: string; prescriptionStatus: string; gstRate: string;
  storageCondition: string; tempRange: string; storageZone: string; mfgProductCode: string;
  distributorRef: string; regulatoryNotes: string;
  controlledDrug: boolean; narcotic: boolean; coldChain: boolean; specialHandling: boolean;
  mrp: string; sellingPrice: string; openingStock: string; reorderThreshold: string;
  minimumStock: string; stockLocation: string; location: string; baseUnit: string; purchaseUnit: string;
  saleUnit: string; unitConversion: string; wholesalePrice: string; margin: string;
  discountLimit: string; maximumStock: string; reorderQty: string; leadTime: string;
  batchTracking: boolean; expiryTracking: boolean; fefoDispensing: boolean;
  therapeuticIndications: string; contraindications: string; dosageInstructions: string;
  sideEffects: string; patientLabelText: string; reviewNotes: string;
  productStatus: string; effectiveFrom: string;
}

export const emptyMedForm = (): AddMedForm => ({
  genericName: "", brandName: "", strength: "", dosageForm: "Tablet",
  route: "Oral", packUnit: "", manufacturer: "", therapeuticCategory: "",
  saltComposition: "", therapeuticClass: "",
  hsnCode: "", barcode: "", prescriptionStatus: "OTC", gstRate: "12",
  storageCondition: "", tempRange: "", storageZone: "Main store", mfgProductCode: "",
  distributorRef: "", regulatoryNotes: "",
  controlledDrug: false, narcotic: false, coldChain: false, specialHandling: false,
  mrp: "", sellingPrice: "", openingStock: "", reorderThreshold: "",
  minimumStock: "", stockLocation: "Main store", location: "", baseUnit: "Unit", purchaseUnit: "Box",
  saleUnit: "Strip", unitConversion: "", wholesalePrice: "0.00", margin: "",
  discountLimit: "", maximumStock: "100", reorderQty: "50", leadTime: "1",
  batchTracking: true, expiryTracking: true, fefoDispensing: true,
  therapeuticIndications: "", contraindications: "", dosageInstructions: "",
  sideEffects: "", patientLabelText: "", reviewNotes: "",
  productStatus: "Active", effectiveFrom: TODAY,
});

export const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Patch", "Powder", "Suppository"];
export const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Rectal", "Ocular", "Nasal"];
export const SCHEDULES = ["Schedule H", "Schedule H1", "Schedule X", "Schedule G", "Schedule J", "OTC", "None"];
export const PRESCRIPTION_STATUSES = ["OTC", "Prescription", "Schedule H", "Schedule H1", "Schedule X", "Schedule G"];
export const PRODUCT_STATUSES = ["Active", "Inactive", "Discontinued", "Under Review"];
export const MANUFACTURER_TYPES = ["Pharmaceutical", "Biotechnology", "Generic", "OTC", "Ayurvedic", "Veterinary", "Contract Manufacturing"];

export const KNOWN_MANUFACTURERS_SEED = [
  "GSK", "Cipla", "Sun Pharma", "Dr. Reddy's", "Lupin", "Alkem", "Torrent Pharma",
  "Abbott India", "Pfizer India", "Novartis India", "Zydus Cadila", "Mankind Pharma",
  "Intas Pharma", "Glenmark", "Aurobindo", "Wockhardt", "Emcure", "Micro Labs",
];

// ─── Composition data ─────────────────────────────────────────────────────────

export const KNOWN_COMPOSITIONS_SEED = [
  "Paracetamol 500 mg", "Paracetamol 650 mg", "Amoxicillin 250 mg", "Amoxicillin 500 mg",
  "Metformin 500 mg", "Metformin 850 mg", "Atorvastatin 10 mg", "Atorvastatin 20 mg",
  "Amlodipine 5 mg", "Amlodipine 10 mg", "Azithromycin 250 mg", "Azithromycin 500 mg",
  "Cetirizine 10 mg", "Pantoprazole 40 mg", "Omeprazole 20 mg", "Ranitidine 150 mg",
  "Ibuprofen 400 mg", "Ibuprofen 600 mg", "Diclofenac 50 mg", "Aspirin 75 mg",
];

export interface CompositionEntry { name: string; shortName: string; strength: string; sideEffects: string; description: string; }

// ─── Distributor form data ────────────────────────────────────────────────────

export const DISTRIBUTOR_TYPES = ["Stockist", "Wholesaler", "Manufacturer", "Direct"];
export const ACCOUNT_STATUSES = ["Active", "Inactive", "On Hold"];
export const DISTRIBUTOR_PAYMENT_TERMS = ["COD", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];
export const INDIAN_STATES = ["Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];

export interface DistributorFormData {
  name: string;
  legalName: string;
  type: string;
  accountStatus: string;
  gstin: string;
  drugLicense1: string;
  drugLicense2: string;
  pan: string;
  contactPerson: string;
  phone: string;
  email: string;
  salesRep: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  creditLimit: string;
  paymentTerms: string;
  expectedDeliveryDays: string;
  deliveryDays: string[];
  salespersonVisitDays: string[];
  expiryReturnAllowed: string;
  expiryReturnPeriod: string;
  returnAllowed: string;
  damageReturnAllowed: string;
  sameDayDelivery: string;
  notifyChannel: string;
}

export const NOTIFY_CHANNEL_OPTIONS = ["Email", "WhatsApp", "Email & WhatsApp"];

export const emptyDistributor: DistributorFormData = {
  name: "", legalName: "", type: "Stockist", accountStatus: "Active",
  gstin: "", drugLicense1: "", drugLicense2: "", pan: "",
  contactPerson: "", phone: "", email: "", salesRep: "",
  addressLine1: "", addressLine2: "", city: "", state: "", pincode: "",
  creditLimit: "", paymentTerms: "Net 30", expectedDeliveryDays: "",
  deliveryDays: [], salespersonVisitDays: [],
  expiryReturnAllowed: "No", expiryReturnPeriod: "",
  returnAllowed: "No", damageReturnAllowed: "No",
  sameDayDelivery: "No", notifyChannel: "Email",
};

// ─── Drawer tab type ──────────────────────────────────────────────────────────

export type DrawerTab = "overview" | "invoices" | "paid" | "returns";

// ─── Import / header mapping data ─────────────────────────────────────────────

export type ImportKind = "csv" | "pdf" | "image";

export interface AttachedFile {
  kind: ImportKind;
  name: string;
  size: number;
  source: "upload" | "email";
  sender?: string;
  headers?: string[];
}

export const SYSTEM_FIELDS: { id: string; label: string; required: boolean; aliases: string[] }[] = [
  { id: "medicine", label: "Medicine", required: true, aliases: ["item_name", "item name", "product", "product_name", "drug", "medicine_name"] },
  { id: "batchNo", label: "Batch No.", required: true, aliases: ["batch", "batch_no", "batch_number", "lot", "lot_no"] },
  { id: "expDate", label: "Expiry Date", required: true, aliases: ["expiry", "expiry_date", "exp_date", "exp"] },
  { id: "qty", label: "Quantity", required: true, aliases: ["qty", "quantity", "units", "count", "received_qty"] },
  { id: "purchaseRate", label: "Rate", required: true, aliases: ["rate", "purchase_rate", "cost", "unit_cost", "buying_price"] },
  { id: "mfgDate", label: "Mfg Date", required: false, aliases: ["mfg_date", "manufactured", "manufacturing_date", "mfg"] },
  { id: "packSize", label: "Pack Size", required: false, aliases: ["pack", "pack_size", "packs"] },
  { id: "free", label: "Free Qty", required: false, aliases: ["free", "free_qty", "bonus"] },
  { id: "mrp", label: "MRP", required: false, aliases: ["retail_price", "list_price", "max_retail_price"] },
  { id: "disc", label: "Discount %", required: false, aliases: ["disc", "discount", "discount_pct", "disc_pct"] },
  { id: "gst", label: "GST %", required: false, aliases: ["gst", "tax", "vat", "gst_pct"] },
];

export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[_\s\-.]/g, "");
}

export function autoMapHeader(header: string): string | null {
  const n = normalizeHeader(header);
  for (const f of SYSTEM_FIELDS) {
    if (normalizeHeader(f.label) === n) return f.id;
    if (f.aliases.some(a => normalizeHeader(a) === n)) return f.id;
  }
  return null;
}

export function needsMapping(headers: string[], distributorKnown: boolean): boolean {
  if (!distributorKnown) return true;
  const mapped = new Set(headers.map(autoMapHeader).filter(Boolean) as string[]);
  const requiredIds = SYSTEM_FIELDS.filter(f => f.required).map(f => f.id);
  return !requiredIds.every(id => mapped.has(id));
}

export const MOCK_OCR_HEADERS = ["Invoice_Number", "Invoice_Date", "Distributor_Name", "Item_Code", "Item_Name", "Batch_No", "Expiry_Date", "Qty", "Rate"];

export const MOCK_EMAILS = [
  { id: 1, sender: "MedLine Pharma", from: "orders@medlinepharma.com", subject: "August invoice — PINV-2026-0067 line items", date: "2026-08-20", attachment: "medline-invoice-0067.csv", sizeKb: 8 },
  { id: 2, sender: "GenPharm Ltd", from: "supply@genpharm.co", subject: "Order confirmation attached (CSV)", date: "2026-08-19", attachment: "GP-2026-0154.csv", sizeKb: 4 },
  { id: 3, sender: "PharmaCo Inc", from: "b2b@pharmacoinc.com", subject: "Please confirm receipt — invoice CSV attached", date: "2026-08-18", attachment: "pharmaco-aug-invoice.csv", sizeKb: 12 },
  { id: 4, sender: "BioPharm AG", from: "orders@biopharm.ag", subject: "Rechnung / Invoice — August batch", date: "2026-08-15", attachment: "biopharm-rechnung.csv", sizeKb: 6 },
  { id: 5, sender: "RespiCare Ltd", from: "sales@respicare.co.uk", subject: "Weekly invoice batch", date: "2026-08-12", attachment: "respicare-weekly-08.csv", sizeKb: 5 },
];

export const CLEAN_CSV_HEADERS = ["Medicine", "Batch No", "Mfg Date", "Expiry Date", "Pack Size", "Quantity", "Free", "Rate", "MRP", "Discount %", "GST %"];
export const MESSY_CSV_HEADERS = ["Invoice_Number", "Invoice_Date", "Distributor_Name", "Item_Code", "Item_Name", "Batch_No", "Expiry_Date", "Qty", "Rate"];

export const MOCK_INVOICE_LINES: Record<string, PurchaseLine[]> = {
  "PINV-2026-0072": [
    { id: 1, medicineName: "Amoxicillin 500mg", batchNo: "AMX-2026-99", mfgDate: "2025-05-10", expDate: "2026-08-15", packSize: 10, qty: 50, free: 5, purchaseRate: 4.50, mrp: 8.50, disc: 10, gst: 12 },
    { id: 2, medicineName: "Atorvastatin 20mg", batchNo: "ATV-1204X", mfgDate: "2025-04-01", expDate: "2027-01-10", packSize: 30, qty: 100, free: 0, purchaseRate: 11.40, mrp: 23.40, disc: 5, gst: 12 },
    { id: 3, medicineName: "Paracetamol 500mg", batchNo: "PCM-2025-A", mfgDate: "2025-06-01", expDate: "2027-05-15", packSize: 15, qty: 200, free: 20, purchaseRate: 0.60, mrp: 1.20, disc: 15, gst: 5 },
    { id: 4, medicineName: "Metformin 500mg", batchNo: "MTF-2026-11", mfgDate: "2025-07-01", expDate: "2027-06-30", packSize: 20, qty: 150, free: 10, purchaseRate: 1.20, mrp: 2.80, disc: 8, gst: 12 },
    { id: 5, medicineName: "Omeprazole 20mg", batchNo: "OMP-2025-B", mfgDate: "2025-03-15", expDate: "2027-03-14", packSize: 14, qty: 80, free: 0, purchaseRate: 3.20, mrp: 6.50, disc: 5, gst: 12 },
  ],
  "PINV-2026-0071": [
    { id: 1, medicineName: "Cetirizine 10mg", batchNo: "CTZ-2026-04", mfgDate: "2025-08-01", expDate: "2027-07-31", packSize: 10, qty: 120, free: 10, purchaseRate: 1.80, mrp: 3.50, disc: 5, gst: 12 },
    { id: 2, medicineName: "Azithromycin 500mg", batchNo: "AZT-2026-02", mfgDate: "2025-06-10", expDate: "2027-06-09", packSize: 5, qty: 60, free: 5, purchaseRate: 8.40, mrp: 16.00, disc: 10, gst: 12 },
    { id: 3, medicineName: "Ibuprofen 400mg", batchNo: "IBU-2026-07", mfgDate: "2025-07-20", expDate: "2027-07-19", packSize: 15, qty: 90, free: 0, purchaseRate: 1.50, mrp: 3.00, disc: 0, gst: 12 },
  ],
  "PINV-2026-0070": [
    { id: 1, medicineName: "Amlodipine 5mg", batchNo: "AML-2026-03", mfgDate: "2025-05-01", expDate: "2027-04-30", packSize: 30, qty: 200, free: 20, purchaseRate: 2.10, mrp: 4.20, disc: 5, gst: 12 },
    { id: 2, medicineName: "Losartan 50mg", batchNo: "LOS-2026-08", mfgDate: "2025-06-15", expDate: "2027-06-14", packSize: 30, qty: 150, free: 15, purchaseRate: 3.80, mrp: 7.50, disc: 8, gst: 12 },
    { id: 3, medicineName: "Metoprolol 25mg", batchNo: "MTP-2025-C", mfgDate: "2025-04-01", expDate: "2027-03-31", packSize: 30, qty: 100, free: 0, purchaseRate: 2.60, mrp: 5.20, disc: 5, gst: 12 },
  ],
};

export interface InvoiceInitialData {
  id: string;
  supplier: string;
  poRef: string;
  date: string;
  due: string;
  status: string;
}

// ─── PO status / recommended qty ─────────────────────────────────────────────

export const PO_STATUS_STEPS = ["Draft", "Approved", "Sent", "Confirmed", "Supplied", "Invoiced", "Verified", "Closed"];

export function poStatusStepIndex(s: string): number {
  if (s === "Draft" || s === "Pending Approval") return 0;
  if (s === "Approved") return 1;
  if (s === "Sent") return 2;
  if (s === "Partially Received") return 4;
  if (s === "Completed") return 7;
  return 0;
}

export interface RecommendedQtyResult {
  qty: number;
  avgSalesPerDay: number;
  leadTime: number;
  coverageDays: number;
  safetyStock: number;
  pendingOrders: number;
  stockOnPO: number;
  branchStock: number;
  nearExpiryQty: number;
  usableStock: number;
  expectedSales: number;
  expiryLoss: number;
  expiryReturnAllowed: boolean;
}

export function calcRecommendedQty(medName: string, currentStock: number, distributorName?: string): RecommendedQtyResult {
  const catalog = PO_MED_CATALOG.find(m => m.name === medName);
  const drugInfo = drugs.find(d => d.name === medName);
  const coverageDays = COVERAGE_DAYS;
  const avgSalesPerDay = catalog?.avgSalesPerDay ?? 1;
  const leadTime = catalog?.leadTime ?? 3;
  const safetyStock = (drugInfo as { minStock?: number } | undefined)?.minStock ?? 20;
  const pendingOrders = PENDING_ORDERS[medName] ?? 0;
  const stockOnPO = STOCK_ON_PO[medName] ?? 0;
  const branchStock = BRANCH_STOCK[medName] ?? 0;
  const nearExpiryQty = NEAR_EXPIRY_QTY[medName] ?? 0;
  const usableStock = Math.max(0, currentStock - nearExpiryQty);
  const expectedSales = avgSalesPerDay * (leadTime + coverageDays);
  const policy = distributorName ? DISTRIBUTOR_POLICIES[distributorName] : undefined;
  const expiryReturnAllowed = policy ? policy.expiryReturn : true;
  const expiryLoss = !expiryReturnAllowed ? nearExpiryQty : 0;
  const qty = Math.max(0, Math.ceil(expectedSales + safetyStock + pendingOrders + expiryLoss - usableStock - stockOnPO - branchStock));
  return { qty, avgSalesPerDay, leadTime, coverageDays, safetyStock, pendingOrders, stockOnPO, branchStock, nearExpiryQty, usableStock, expectedSales, expiryLoss, expiryReturnAllowed };
}

// suppress unused import warning — suppliers is re-exported for downstream use
export { suppliers };
