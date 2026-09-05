import { useState, useMemo, useRef, useEffect } from "react";
import { drugs, suppliers } from "../data/mockData";
import { Pill } from "./shared/Pill";
import { Th } from "./shared/Th";
import { usePagination, PaginationFooter } from "./shared/usePagination";
import { useTableSort } from "./shared/useTableSort";
import { DateRangePicker } from "./shared/DateRangePicker";
import { SearchIcon, ChevronDown } from "./shared/Icons";
import PrintDialog from "./shared/PrintDialog";
import type { PrintJobType } from "./shared/PrintDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = "invoices" | "returns" | "payments";
type View = "list" | "new-invoice" | "view-invoice" | "new-return" | "view-return";

interface PurchaseLine {
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
  // Medicine mapping fields — present only on lines imported from CSV/PDF/image
  importedName?: string;
  mappingStatus?: "matched" | "fuzzy" | "unmatched";
  suggestedName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = "2026-08-22";
const PAY_METHODS = ["Bank Transfer", "Cheque", "Cash", "UPI", "RTGS"];
const RETURN_REASONS = [
  "Damaged on arrival",
  "Near-expiry batch",
  "Incorrect item shipped",
  "Wrong quantity received",
  "Quality issue",
  "Other",
];
const BANK_ACCOUNTS = ["Chase — Main Operating", "Chase — Petty Cash", "Wells Fargo — Savings", "HDFC — Current"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Brand / trade name → system drug name alias table.
// Keys are lowercase keywords that may appear inside an imported medicine name.
// Values must exactly match a drug name in the system master (drugs array).
const BRAND_ALIASES: Record<string, string> = {
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

function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function newEmptyLine(id: number): PurchaseLine {
  return { id, medicineName: "", batchNo: "", mfgDate: "", expDate: "", packSize: 1, qty: 0, free: 0, purchaseRate: 0, mrp: 0, disc: 0, gst: 12 };
}

function calcLineSubtotal(l: PurchaseLine): number {
  return l.qty * l.purchaseRate;
}

function calcLineDiscount(l: PurchaseLine): number {
  return calcLineSubtotal(l) * (l.disc / 100);
}

function calcLineTax(l: PurchaseLine): number {
  return (calcLineSubtotal(l) - calcLineDiscount(l)) * (l.gst / 100);
}

function calcLineAmount(l: PurchaseLine): number {
  return calcLineSubtotal(l) - calcLineDiscount(l) + calcLineTax(l);
}

// ─── Medicine classification helpers ──────────────────────────────────────────

// Splits a string into lowercase alphanumeric tokens.
function tokenise(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Jaccard word-overlap score (0–1) between two strings.
function wordOverlapScore(a: string, b: string): number {
  const ta = new Set(tokenise(a));
  const tb = new Set(tokenise(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  let shared = 0;
  ta.forEach(t => { if (tb.has(t)) shared++; });
  return shared / Math.max(ta.size, tb.size);
}

// Character-level Levenshtein edit distance. Early-exits when length difference
// alone exceeds 3, avoiding full DP on clearly unrelated strings.
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

// Scores two strings by matching tokens with edit-distance tolerance.
// Each query token is considered matched if any target token is within
// ceil(tokenLength * 0.25) edits — e.g. 1 typo allowed for tokens of length 4+.
// Returns fraction of query tokens matched (0–1).
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

// Classifies an imported medicine name against the system drug master.
// Returns the best matching system name and a confidence status.
function classifyImportedLine(importedName: string): {
  status: "matched" | "fuzzy" | "unmatched";
  systemName: string;
} {
  const q = importedName.trim().toLowerCase();
  if (!q) return { status: "unmatched", systemName: "" };

  // Layer 1 — exact match
  const exact = drugs.find(d => d.name.toLowerCase() === q);
  if (exact) return { status: "matched", systemName: exact.name };

  // Layer 2 — brand alias lookup (any token in the imported name matches an alias key)
  const tokens = tokenise(q);
  for (const token of tokens) {
    const aliasTarget = BRAND_ALIASES[token];
    if (aliasTarget) {
      const drug = drugs.find(d => d.name === aliasTarget);
      if (drug) return { status: "fuzzy", systemName: drug.name };
      // alias target not in master yet — still flag as fuzzy so user can resolve
      return { status: "fuzzy", systemName: aliasTarget };
    }
  }

  // Layer 2.5 — edit-distance token matching (typos / OCR variants)
  // e.g. "Doolo 650" → "Dolo 650", "Amlodippine 5mg" → "Amlodipine 5mg"
  let bestFuzzy = 0;
  let bestFuzzyName = "";
  for (const d of drugs) {
    const score = fuzzyTokenScore(q, d.name.toLowerCase());
    if (score > bestFuzzy) { bestFuzzy = score; bestFuzzyName = d.name; }
  }
  if (bestFuzzy >= 0.6) return { status: "fuzzy", systemName: bestFuzzyName };

  // Layer 3 — word overlap fallback
  let bestScore = 0;
  let bestName = "";
  for (const d of drugs) {
    const score = wordOverlapScore(q, d.name.toLowerCase());
    if (score > bestScore) { bestScore = score; bestName = d.name; }
  }
  if (bestScore >= 0.3) return { status: "fuzzy", systemName: bestName };

  return { status: "unmatched", systemName: "" };
}

// ─── Parsed drug master (derived fields, no changes to mockData.ts) ──────────

interface DrugWithParsed {
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
  generic: string;   // name without trailing numeric strength token
  strength: string;  // trailing numeric+unit token, e.g. "500mg", "5mg"
}

function parseDrug(d: typeof drugs[0]): DrugWithParsed {
  const tokens = d.name.split(" ");
  // Find the last token that starts with a digit — that is the strength.
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

const parsedDrugs: DrugWithParsed[] = drugs.map(parseDrug);

// ─── Mock data ────────────────────────────────────────────────────────────────

const purchaseInvoices = [
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

const purchaseReturns = [
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

const purchasePayments = [
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

// ─── Local primitives ─────────────────────────────────────────────────────────

function Td({ children, mono, right, bold, color }: { children: React.ReactNode; mono?: boolean; right?: boolean; bold?: boolean; color?: string }) {
  return (
    <td style={{
      padding: "12px 14px", fontSize: 13,
      fontFamily: mono ? "JetBrains Mono" : "Inter",
      fontWeight: bold ? 600 : 400,
      color: color ?? (mono ? "#6B7280" : "#1A2436"),
      textAlign: right ? "right" : "left",
      borderBottom: "1px solid #F4F6FA",
    }}>
      {children}
    </td>
  );
}

function TableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "#F7F9FC" : "transparent", cursor: onClick ? "pointer" : "default", transition: "background 0.1s" }}
    >
      {children}
    </tr>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{children}</label>;
}

function TextInput({ type = "text", value, onChange, placeholder, defaultValue }: { type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; defaultValue?: string }) {
  return (
    <input type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    />
  );
}

function DropdownSelect({ value, onChange, options, placeholder }: { value?: string; onChange?: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

function PrimaryBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ padding: small ? "6px 14px" : "9px 20px", border: "none", background: "#1B6CA8", fontSize: small ? 12 : 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "22px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Filter row primitives (Sales-style) ─────────────────────────────────────

function FilterSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <SearchIcon />
      </span>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
    </div>
  );
}

function FilterDropdown({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: string[]; allLabel: string }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: value === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
        {["All", ...options].map(o => (
          <option key={o} value={o}>{o === "All" ? allLabel : o}</option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
        <ChevronDown />
      </span>
    </div>
  );
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
      Clear
    </button>
  );
}

function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div style={{ marginLeft: "auto" }}>
      <button onClick={onClick}
        style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>
        {label}
      </button>
    </div>
  );
}

// ─── Tab: Purchase Invoice ────────────────────────────────────────────────────

function PurchaseInvoiceList({ onNew, onView }: { onNew: () => void; onView: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => purchaseInvoices.filter(i => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || i.id.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q) || i.poRef.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || i.supplier === supplierFilter;
    const mStatus = statusFilter === "All" || i.status === statusFilter;
    const mFrom = !fromDate || i.date >= fromDate;
    const mTo = !toDate || i.date <= toDate;
    return mSearch && mSupplier && mStatus && mFrom && mTo;
  }), [search, supplierFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Invoices</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search invoice no, distributor, PO..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Paid", "Partial", "Unpaid", "Cancelled"]} allLabel="All Invoice Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <NewButton label="+ New Purchase Invoice" onClick={onNew} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Invoice #</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("poRef")} sortDir={sortCol === "poRef" ? sortDir : null}>PO Ref</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Invoice Date</Th>
                <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due Date</Th>
                <Th right onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th right onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
                <Th right onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(inv => (
                <TableRow key={inv.id} onClick={() => onView(inv.id)}>
                  <Td mono>
                    <button
                      onClick={e => { e.stopPropagation(); onView(inv.id); }}
                      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                      {inv.id}
                    </button>
                  </Td>
                  <Td bold>{inv.supplier}</Td>
                  <Td mono color="#9CA3AF">{inv.poRef}</Td>
                  <Td mono>{formatDMY(inv.date)}</Td>
                  <Td mono color={inv.balance > 0 && inv.due < TODAY ? "#C62828" : "#6B7280"}>{formatDMY(inv.due)}</Td>
                  <Td mono right>{inv.items}</Td>
                  <Td mono right bold color="#1A2436">{money(inv.total)}</Td>
                  <Td mono right color="#2E7D32">{money(inv.paid)}</Td>
                  <Td mono right bold={inv.balance > 0} color={inv.balance > 0 ? "#C62828" : "#9CA3AF"}>{inv.balance > 0 ? money(inv.balance) : "—"}</Td>
                  <Td><Pill status={inv.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No invoices match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── Tab: Purchase Return ─────────────────────────────────────────────────────

function PurchaseReturnList({ onNew, onView }: { onNew: () => void; onView: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => purchaseReturns.filter(r => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || r.id.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q) || r.invoiceRef.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || r.supplier === supplierFilter;
    const mReason = reasonFilter === "All" || r.reason === reasonFilter;
    const mStatus = statusFilter === "All" || r.status === statusFilter;
    const mFrom = !fromDate || r.date >= fromDate;
    const mTo = !toDate || r.date <= toDate;
    return mSearch && mSupplier && mReason && mStatus && mFrom && mTo;
  }), [search, supplierFilter, reasonFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || reasonFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setReasonFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Returns</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search return no, distributor, invoice..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={reasonFilter} onChange={setReasonFilter} options={RETURN_REASONS} allLabel="All Reasons" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Draft", "Posted"]} allLabel="All Return Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <NewButton label="+ New Return" onClick={onNew} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Return #</Th>
                <Th onSort={() => handleSort("invoiceRef")} sortDir={sortCol === "invoiceRef" ? sortDir : null}>Invoice Ref</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Return Date</Th>
                <Th onSort={() => handleSort("reason")} sortDir={sortCol === "reason" ? sortDir : null}>Reason</Th>
                <Th right onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("qty")} sortDir={sortCol === "qty" ? sortDir : null}>Qty</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th onSort={() => handleSort("creditNote")} sortDir={sortCol === "creditNote" ? sortDir : null}>Credit Note</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <TableRow key={r.id}>
                  <Td mono color="#1B6CA8" bold><span onClick={() => onView(r.id)} style={{ cursor: "pointer", textDecoration: "underline" }}>{r.id}</span></Td>
                  <Td mono color="#9CA3AF">{r.invoiceRef}</Td>
                  <Td bold>{r.supplier}</Td>
                  <Td mono>{formatDMY(r.date)}</Td>
                  <Td>{r.reason}</Td>
                  <Td mono right>{r.items}</Td>
                  <Td mono right>{r.qty}</Td>
                  <Td mono right bold color="#1A2436">{money(r.total)}</Td>
                  <Td mono color={r.creditNote ? "#2E7D32" : "#C8CDD8"}>{r.creditNote ?? "—"}</Td>
                  <Td><Pill status={r.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No returns match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── Tab: Purchase Payment ────────────────────────────────────────────────────

function PurchasePaymentList({ onRecord }: { onRecord: () => void }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => purchasePayments.filter(p => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || p.id.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q) || p.invoiceRef.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || p.supplier === supplierFilter;
    const mMethod = methodFilter === "All" || p.method === methodFilter;
    const mStatus = statusFilter === "All" || p.status === statusFilter;
    const mFrom = !fromDate || p.date >= fromDate;
    const mTo = !toDate || p.date <= toDate;
    return mSearch && mSupplier && mMethod && mStatus && mFrom && mTo;
  }), [search, supplierFilter, methodFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || methodFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setMethodFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Payments</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search payment no, distributor, invoice, ref..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={methodFilter} onChange={setMethodFilter} options={PAY_METHODS} allLabel="All Payment Methods" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Cleared", "Pending", "Failed"]} allLabel="All Payment Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <NewButton label="+ Record Payment" onClick={onRecord} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Payment #</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("invoiceRef")} sortDir={sortCol === "invoiceRef" ? sortDir : null}>Invoice</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("method")} sortDir={sortCol === "method" ? sortDir : null}>Method</Th>
                <Th onSort={() => handleSort("bank")} sortDir={sortCol === "bank" ? sortDir : null}>Bank / Ref</Th>
                <Th right onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
                <Th right onSort={() => handleSort("balanceAfter")} sortDir={sortCol === "balanceAfter" ? sortDir : null}>Balance After</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(p => (
                <TableRow key={p.id}>
                  <Td mono color="#1B6CA8" bold>{p.id}</Td>
                  <Td bold>{p.supplier}</Td>
                  <Td mono color="#9CA3AF">{p.invoiceRef}</Td>
                  <Td mono>{formatDMY(p.date)}</Td>
                  <Td>{p.method}</Td>
                  <Td mono>{p.bank} · {p.ref}</Td>
                  <Td mono right bold color="#2E7D32">{money(p.amount)}</Td>
                  <Td mono right color={p.balanceAfter > 0 ? "#C62828" : "#9CA3AF"}>{p.balanceAfter > 0 ? money(p.balanceAfter) : "—"}</Td>
                  <Td><Pill status={p.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No payments match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── Placeholder create modals (Phase 3-4 will replace) ──────────────────────

// ─── New Purchase Return — full-screen overlay ───────────────────────────────

interface ReturnLine {
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

function newEmptyReturnLine(id: number): ReturnLine {
  return { id, medicineName: "", packUnit: "1", batchNo: "", expiryDate: "", purchaseRate: 0, mrp: 0, returnQty: 0, freeQty: 0, disposition: "Replacement" };
}

const MOCK_RETURN_LINES: Record<string, ReturnLine[]> = {
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

const DISPOSITION_OPTIONS = ["Replacement", "Credit Note", "Refund", "Discard"];
const RETURN_TYPES = ["Replacement", "Credit Note", "Refund"];

interface ReturnInitialData {
  id: string;
  supplier: string;
  date: string;
  invoiceRef: string;
  reason: string;
  status: string;
  total: number;
}

function NewPurchaseReturn({ onBack, initialData, defaultViewMode = false }: { onBack: () => void; initialData?: ReturnInitialData; defaultViewMode?: boolean }) {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);

  // Header fields — pre-populated from initialData when viewing an existing return
  const [distributor, setDistributor] = useState(initialData?.supplier ?? "");
  const [supplierList, setSupplierList] = useState(suppliers.map(s => s.name));
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [returnDate, setReturnDate] = useState(initialData?.date ?? TODAY);
  const [originalInvoice, setOriginalInvoice] = useState(initialData?.invoiceRef ?? "");
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState("");
  const [returnType, setReturnType] = useState("Replacement");

  // Return items — pre-populated from mock data when viewing; empty search row pinned at top when editing
  const nextId = useRef(100);
  const [items, setItems] = useState<ReturnLine[]>(() => {
    if (initialData && MOCK_RETURN_LINES[initialData.id]) {
      return MOCK_RETURN_LINES[initialData.id].map((l, i) => ({ ...l, id: i + 1 }));
    }
    return [newEmptyReturnLine(nextId.current++)];
  });

  // Bottom fields
  const [reason, setReason] = useState(initialData?.reason ?? "Wrong item supplied");
  const [creditNoteRef, setCreditNoteRef] = useState("");
  const [notes, setNotes] = useState("");

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof ReturnLine, value: string | number) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      // keep an empty search row pinned at the top
      const hasEmpty = updated.some(i => !i.medicineName);
      if (!hasEmpty && field === "medicineName") {
        return [newEmptyReturnLine(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0) return [newEmptyReturnLine(nextId.current++)];
      // ensure there is always an empty row at the top
      const hasEmpty = filtered.some(i => !i.medicineName);
      if (!hasEmpty) return [newEmptyReturnLine(nextId.current++), ...filtered];
      return filtered;
    });
  };

  // Summary calculations — return value = purchaseRate × returnQty (live computed)
  const filledItems = items.filter(i => i.medicineName);
  const totalUnits = filledItems.reduce((s, i) => s + i.returnQty, 0);
  const supplierCredit = filledItems.reduce((s, i) => s + (i.purchaseRate * i.returnQty), 0);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => viewMode ? onBack() : setShowBackConfirm(true)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Purchase returns</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {initialData ? (viewMode ? "View Return" : "Edit Return") : "New Purchase Return"}
          </span>
          {initialData && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {initialData.id}</span>
          )}
          {initialData && viewMode && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {initialData && viewMode && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Purchase Return", docId: initialData.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setViewMode(false)} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {initialData && !viewMode && (
            <>
              <button onClick={() => setViewMode(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!initialData && (
            <>
              <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => setPrintJob({ jobType: "Purchase Return" })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Print</button>
              <button disabled={!hasItems} onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: hasItems ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Submit Return</button>
            </>
          )}
        </div>
      </div>

      {/* ── Back confirm ── */}
      {showBackConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>Save this return as a draft before going back?</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowBackConfirm(false)} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => { setSaved("draft"); setShowBackConfirm(false); }} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
              <button onClick={onBack} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header fields row ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Distributor */}
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Distributor</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{distributor || "—"}</div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <DistributorSearch
                  selected={distributor}
                  onSelect={setDistributor}
                  distributors={supplierList}
                  onAdd={() => setShowAddSupplier(true)}
                />
                {distributor && (
                  <button style={{ padding: "8px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>Details</button>
                )}
              </div>
            )}
          </div>

          {/* Return Date */}
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{formatDMY(returnDate)}</div>
            ) : (
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, background: "#fff" }} />
            )}
          </div>

          {/* Original Invoice # */}
          <div style={{ flex: "0 0 160px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice #</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{originalInvoice || "—"}</div>
            ) : (
              <input value={originalInvoice} onChange={e => setOriginalInvoice(e.target.value)} placeholder="PINV-2026-0073"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const, background: "#fff" }} />
            )}
          </div>

          {/* Original Invoice Date */}
          <div style={{ flex: "0 0 150px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{originalInvoiceDate ? formatDMY(originalInvoiceDate) : "—"}</div>
            ) : (
              <input type="date" value={originalInvoiceDate} onChange={e => setOriginalInvoiceDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, background: "#fff" }} />
            )}
          </div>

          {/* Return Type */}
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Type</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{returnType}</div>
            ) : (
              <select value={returnType} onChange={e => setReturnType(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none" as const, cursor: "pointer" }}>
                {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>

        </div>
      </div>

      {/* ── Return Items table ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Return Items</span>
            <span style={{ padding: "3px 12px", background: "#E0F7FA", color: "#00838F", fontSize: 12, fontWeight: 700, borderRadius: 999, fontFamily: "Inter" }}>
              {filledItems.length} items
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 1200, width: "100%" }}>
              <thead>
                <tr>
                  <Th>Medicine</Th>
                  <Th>Batch #</Th>
                  <Th>Exp Date</Th>
                  <Th right>Pack/Unit</Th>
                  <Th right>Return Qty</Th>
                  <Th right>Free Qty</Th>
                  <Th right>Rate</Th>
                  <Th right>MRP</Th>
                  <Th right>Return Value</Th>
                  <Th>Disposition</Th>
                  <Th center>Action</Th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                    {/* Medicine — same MedicineNameCell as New Purchase Invoice */}
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      <MedicineNameCell
                        value={item.medicineName}
                        alloc="FEFO"
                        onSelect={(name, batch) => {
                          updateItem(item.id, "medicineName", name);
                          updateItem(item.id, "batchNo", batch.id);
                          updateItem(item.id, "expiryDate", batch.expDate);
                          updateItem(item.id, "mrp", batch.mrp);
                          updateItem(item.id, "purchaseRate", batch.rate);
                        }}
                      />
                    </td>
                    {/* Batch — same inline input style as New Purchase Invoice */}
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      <input value={item.batchNo} onChange={e => updateItem(item.id, "batchNo", e.target.value)} placeholder="BATCH-#"
                        style={{ width: 100, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* Expiry Date */}
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      <input type="date" value={item.expiryDate} onChange={e => updateItem(item.id, "expiryDate", e.target.value)}
                        style={{ width: 130, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: item.expiryDate && item.expiryDate < "2026-12-31" ? "#E65100" : "#1A2436" }} />
                    </td>
                    {/* Pack/Unit */}
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input value={item.packUnit} onChange={e => updateItem(item.id, "packUnit", e.target.value)}
                        style={{ width: 58, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* Return Qty */}
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={item.returnQty || ""} onChange={e => updateItem(item.id, "returnQty", parseFloat(e.target.value) || 0)}
                        style={{ width: 62, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* Free Qty */}
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={item.freeQty || ""} onChange={e => updateItem(item.id, "freeQty", parseFloat(e.target.value) || 0)}
                        style={{ width: 50, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* Purchase Rate */}
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={item.purchaseRate || ""} onChange={e => updateItem(item.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                        style={{ width: 74, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* MRP */}
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={item.mrp || ""} onChange={e => updateItem(item.id, "mrp", parseFloat(e.target.value) || 0)}
                        style={{ width: 70, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                    </td>
                    {/* Return Value (computed) */}
                    <td style={{ padding: "6px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                      {item.medicineName ? `₹${(item.purchaseRate * item.returnQty).toFixed(2)}` : "—"}
                    </td>
                    {/* Disposition */}
                    <td style={{ padding: "6px 10px" }}>
                      <select value={item.disposition} onChange={e => updateItem(item.id, "disposition", e.target.value)}
                        style={{ width: "100%", padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", minWidth: 110 }}>
                        {DISPOSITION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    {/* Delete */}
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      {item.medicineName && (
                        <button onClick={() => deleteItem(item.id)} title="Remove"
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Reason + Notes — inside card footer ── */}
          <div style={{ borderTop: "1px solid #EEF1F6", padding: "12px 16px", flexShrink: 0, display: "flex", gap: 12, background: "#fff" }}>
            <div style={{ flex: "0 0 260px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Reason</div>
              <select value={reason} onChange={e => setReason(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 0 220px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Credit Note / RMA Reference</div>
              <input value={creditNoteRef} onChange={e => setCreditNoteRef(e.target.value)} placeholder="Optional supplier reference"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional notes about this return..."
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box" as const }} />
            </div>
          </div>

        </div>
      </div>

      {showAddSupplier && (
        <AddDistributorDrawer
          onClose={() => setShowAddSupplier(false)}
          onSaved={name => { setSupplierList(prev => [...prev, name]); setDistributor(name); }}
        />
      )}

      {/* ── Return Summary footer ── */}
      <div style={{ margin: "0 20px 0", flexShrink: 0, borderTop: "2px solid #E8ECF4", background: "#fff", display: "flex", alignItems: "stretch", minHeight: 72 }}>
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, flexWrap: "nowrap", overflowX: "auto" }}>
          {/* Items selected */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 120 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Items selected</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{filledItems.length}</div>
            </div>
          </div>
          {/* Units to return */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 120 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Units to return</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{totalUnits}</div>
            </div>
          </div>
          {/* Distributor credit */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Distributor credit</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1B6CA8", background: "#EFF6FF", padding: "2px 6px", display: "inline-block" }}>₹{supplierCredit.toFixed(2)}</div>
            </div>
          </div>
          {/* Return type */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Return type</div>
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{returnType}</div>
            </div>
          </div>
          {/* Distributor */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "2 1 0", minWidth: 180 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Distributor</div>
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: distributor ? "#1A2436" : "#C8CDD8" }}>{distributor || "Not selected"}</div>
            </div>
          </div>
          {/* Original invoice */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "2 1 0", minWidth: 180 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Original invoice</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: originalInvoice ? "#1A2436" : "#C8CDD8" }}>{originalInvoice || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Purchase Return {saved === "posted" ? "Submitted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
              {saved === "posted" ? "Stock updated · Distributor credit raised" : "Draft — not yet submitted"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Purchases</GhostBtn>
              <PrimaryBtn onClick={() => setPrintJob({ jobType: "Purchase Return", docId: initialData?.id ?? "PRN-NEW" })}>Print Return</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState("");
  const eligibleInvoices = supplier ? purchaseInvoices.filter(i => i.supplier === supplier && i.balance > 0) : [];
  return (
    <Modal title="Record Purchase Payment" onClose={onClose} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><FieldLabel>Distributor</FieldLabel><DropdownSelect value={supplier} onChange={setSupplier} options={suppliers.map(s => s.name)} placeholder="— Select —" /></div>
          <div><FieldLabel>Invoice</FieldLabel><DropdownSelect options={eligibleInvoices.map(i => `${i.id} — ${money(i.balance)} due`)} placeholder={supplier ? "— Select invoice —" : "Pick a distributor first"} /></div>
          <div><FieldLabel>Payment Date</FieldLabel><TextInput type="date" defaultValue={TODAY} /></div>
          <div><FieldLabel>Amount (₹)</FieldLabel><TextInput type="number" placeholder="0.00" /></div>
          <div><FieldLabel>Payment Method</FieldLabel><DropdownSelect options={PAY_METHODS} placeholder="— Select method —" /></div>
          <div><FieldLabel>Bank Account</FieldLabel><DropdownSelect options={BANK_ACCOUNTS} placeholder="— Select account —" /></div>
          <div><FieldLabel>Reference / Cheque #</FieldLabel><TextInput placeholder="e.g. TRF-0001 or CHQ-00422" /></div>
          <div><FieldLabel>Remarks</FieldLabel><TextInput placeholder="Optional" /></div>
        </div>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12, color: "#92400E" }}>
          Posting will update the invoice balance and distributor account ledger.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onClose}>Post Payment</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

// ─── New Purchase Invoice — full-screen overlay ──────────────────────────────

function EditableChip({ label, value, onChange, editable, prefix, allowNegative }: {
  label: string; value: number; onChange?: (v: number) => void; editable: boolean; prefix?: string; allowNegative?: boolean;
}) {
  const [text, setText] = useState(value ? Math.abs(value).toFixed(2) : "");
  const commit = () => {
    const n = parseFloat(text) || 0;
    const signed = allowNegative ? n : Math.abs(n);
    onChange?.(signed);
    setText(signed ? Math.abs(signed).toFixed(2) : "");
  };
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderLeft: "1px solid #EEF1F6", background: editable ? "#FAFBFD" : undefined, flex: "0 0 auto", minWidth: 140 }}>
      <div>
        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280" }}>{prefix ?? ""}₹</span>
            <input type="text" value={text} onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()}
              placeholder="0.00"
              style={{ width: 72, padding: "2px 4px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", textAlign: "right" }} />
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280" }}>{prefix ?? ""}₹{Math.abs(value).toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}

function PurchaseInvoiceFooter({ items, paid = 0, cashDiscount = 0, onCashDiscountChange, adjustment = 0, onAdjustmentChange }: {
  items: PurchaseLine[]; paid?: number; cashDiscount?: number; onCashDiscountChange?: (v: number) => void; adjustment?: number; onAdjustmentChange?: (v: number) => void;
}) {
  const active = items.filter(i => i.medicineName);
  const subtotal = active.reduce((s, i) => s + calcLineSubtotal(i), 0);
  const discount = active.reduce((s, i) => s + calcLineDiscount(i), 0);
  const tax = active.reduce((s, i) => s + calcLineTax(i), 0);
  const preRound = subtotal - discount - cashDiscount + tax + adjustment;
  const roundOff = Math.round(preRound) - preRound;
  const total = preRound + roundOff;
  const balance = total - paid;

  const editableCash = onCashDiscountChange !== undefined;
  const editableAdj = onAdjustmentChange !== undefined;

  const readChips = [
    { label: "Subtotal", val: money(subtotal), muted: true },
    { label: "Item Discount", val: `-${money(discount)}`, muted: true },
    { label: "GST / Tax", val: money(tax), muted: true },
    { label: "Round Off", val: `${roundOff >= 0 ? "" : "-"}₹${Math.abs(roundOff).toFixed(2)}`, muted: true },
    { label: "Total", val: money(total), bold: true, highlight: true },
    { label: "Paid", val: money(paid), muted: true, color: "#2E7D32" },
    { label: "Balance", val: money(balance), bold: true, color: balance > 0 ? "#C62828" : "#2E7D32" },
  ];

  return (
    <div style={{ flexShrink: 0, borderTop: "2px solid #E8ECF4", background: "#fff", display: "flex", alignItems: "stretch", minHeight: 76 }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
        <EditableChip label="Cash Discount" value={cashDiscount} onChange={onCashDiscountChange} editable={editableCash} prefix="-" />
        <EditableChip label="Adjustment" value={adjustment} onChange={onAdjustmentChange} editable={editableAdj} allowNegative />
        {readChips.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", padding: "0 16px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 110 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
              <div style={{
                fontFamily: "JetBrains Mono",
                fontSize: s.bold ? 15 : 13,
                fontWeight: s.bold ? 700 : 500,
                color: s.color ?? (s.muted ? "#6B7280" : "#1A2436"),
                background: s.highlight ? "#EFF6FF" : undefined,
                padding: s.highlight ? "2px 6px" : undefined,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarcodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
    </svg>
  );
}

function drugBarcode(id: number): string {
  return `8901234${String(id).padStart(6, "0")}`;
}

interface PriorBatch { id: string; qty: number; packs: number; mfgDate: string; expDate: string; mrp: number; rate: number; }

function shiftIsoMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  let ny = y, nm = m + months;
  while (nm > 12) { nm -= 12; ny += 1; }
  while (nm < 1) { nm += 12; ny -= 1; }
  return `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function priorBatchesFor(drug: typeof drugs[0]): PriorBatch[] {
  const num = String(drug.id).padStart(4, "0");
  return [
    { id: `BT-${num}A`, qty: 240, packs: 24, mfgDate: shiftIsoMonths(drug.expiry, -24), expDate: drug.expiry, mrp: +(drug.price * 1.15).toFixed(2), rate: drug.cost },
    { id: `BT-${num}B`, qty: 60,  packs: 6,  mfgDate: shiftIsoMonths(drug.expiry, -30), expDate: shiftIsoMonths(drug.expiry, -6),  mrp: +(drug.price * 1.10).toFixed(2), rate: +(drug.cost * 0.95).toFixed(2) },
  ];
}

// ─── Add Medicine Drawer (4-step) ─────────────────────────────────────────────

interface AddMedForm {
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

const emptyMedForm = (): AddMedForm => ({
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

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Patch", "Powder", "Suppository"];
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Rectal", "Ocular", "Nasal"];
const PRESCRIPTION_STATUSES = ["OTC", "Prescription", "Schedule H", "Schedule H1", "Schedule X", "Schedule G"];
const PRODUCT_STATUSES = ["Active", "Inactive", "Discontinued", "Under Review"];
const MANUFACTURER_TYPES = ["Pharmaceutical", "Biotechnology", "Generic", "OTC", "Ayurvedic", "Veterinary", "Contract Manufacturing"];

// Known manufacturers seed list (simulates catalog)
const KNOWN_MANUFACTURERS_SEED = [
  "GSK", "Cipla", "Sun Pharma", "Dr. Reddy's", "Lupin", "Alkem", "Torrent Pharma",
  "Abbott India", "Pfizer India", "Novartis India", "Zydus Cadila", "Mankind Pharma",
  "Intas Pharma", "Glenmark", "Aurobindo", "Wockhardt", "Emcure", "Micro Labs",
];

// ─── Add Manufacturer Modal ───────────────────────────────────────────────────

interface ManufacturerEntry { name: string; code: string; type: string; address: string; city: string; }

function AddManufacturerModal({ initialName, onClose, onSaved }: {
  initialName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [mfg, setMfg] = useState<ManufacturerEntry>({
    name: initialName, code: "", type: "Pharmaceutical", address: "", city: "",
  });
  const upd = <K extends keyof ManufacturerEntry>(k: K, v: ManufacturerEntry[K]) =>
    setMfg(prev => ({ ...prev, [k]: v }));
  const canSave = mfg.name.trim().length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Manufacturer</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add manufacturer</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Manufacturer name" required>
              <TextInput value={mfg.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. GSK" />
            </DrawerField>
            <DrawerField label="Manufacturer code">
              <TextInput value={mfg.code} onChange={e => upd("code", e.target.value)} placeholder="e.g. MFG-001" />
            </DrawerField>
            <DrawerField label="Manufacturer type" required>
              <DropdownSelect value={mfg.type} onChange={v => upd("type", v)} options={MANUFACTURER_TYPES} />
            </DrawerField>
            <DrawerField label="City" required>
              <TextInput value={mfg.city} onChange={e => upd("city", e.target.value)} placeholder="e.g. Mumbai" />
            </DrawerField>
            <DrawerField label="Address" gridSpan={2}>
              <TextInput value={mfg.address} onChange={e => upd("address", e.target.value)} placeholder="Street, building, area" />
            </DrawerField>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button onClick={() => { if (canSave) { onSaved(mfg.name.trim()); onClose(); } }}
            disabled={!canSave}
            style={{ padding: "9px 20px", border: "none", background: canSave ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSave ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save manufacturer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manufacturer combobox field ──────────────────────────────────────────────

function ManufacturerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_MANUFACTURERS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = q
    ? knownList.filter(m => m.toLowerCase().includes(q))
    : knownList.slice(0, 8);
  const exactMatch = knownList.some(m => m.toLowerCase() === q);
  const noResults = q.length > 0 && matches.length === 0;
  const showAddButton = q.length > 0 && !exactMatch;

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <TextInput
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          placeholder="e.g. GSK"
        />
        {open && (matches.length > 0 || showAddButton) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(m => (
              <button key={m} onClick={() => { onChange(m); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {m}
              </button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>
                  {noResults
                    ? <>No results — add &ldquo;{value.trim()}&rdquo; as new manufacturer</>
                    : <>Add &ldquo;{value.trim()}&rdquo; as new manufacturer</>}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddManufacturerModal
          initialName={value.trim()}
          onClose={() => setShowAddModal(false)}
          onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }}
        />
      )}
    </>
  );
}

// ─── Add Composition Modal & combobox ────────────────────────────────────────

const KNOWN_COMPOSITIONS_SEED = [
  "Paracetamol 500 mg", "Paracetamol 650 mg", "Amoxicillin 250 mg", "Amoxicillin 500 mg",
  "Metformin 500 mg", "Metformin 850 mg", "Atorvastatin 10 mg", "Atorvastatin 20 mg",
  "Amlodipine 5 mg", "Amlodipine 10 mg", "Azithromycin 250 mg", "Azithromycin 500 mg",
  "Cetirizine 10 mg", "Pantoprazole 40 mg", "Omeprazole 20 mg", "Ranitidine 150 mg",
  "Ibuprofen 400 mg", "Ibuprofen 600 mg", "Diclofenac 50 mg", "Aspirin 75 mg",
];

interface CompositionEntry { name: string; shortName: string; strength: string; sideEffects: string; description: string; }

function AddCompositionModal({ initialName, onClose, onSaved }: {
  initialName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [comp, setComp] = useState<CompositionEntry>({
    name: initialName, shortName: "", strength: "", sideEffects: "", description: "",
  });
  const upd = <K extends keyof CompositionEntry>(k: K, v: CompositionEntry[K]) =>
    setComp(prev => ({ ...prev, [k]: v }));
  const canSave = comp.name.trim().length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Composition</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add composition</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Composition name" required>
              <TextInput value={comp.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Paracetamol 500 mg" />
            </DrawerField>
            <DrawerField label="Short name">
              <TextInput value={comp.shortName} onChange={e => upd("shortName", e.target.value)} placeholder="e.g. PCM" />
            </DrawerField>
            <DrawerField label="Strength" required>
              <TextInput value={comp.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" />
            </DrawerField>
            <DrawerField label="Side effects">
              <TextInput value={comp.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="e.g. Nausea, dizziness" />
            </DrawerField>
            <DrawerField label="Description" gridSpan={2}>
              <textarea value={comp.description} onChange={e => upd("description", e.target.value)}
                placeholder="Pharmacological description or usage notes"
                rows={3}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </DrawerField>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button onClick={() => { if (canSave) { onSaved(comp.name.trim()); onClose(); } }}
            disabled={!canSave}
            style={{ padding: "9px 20px", border: "none", background: canSave ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSave ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save composition
          </button>
        </div>
      </div>
    </div>
  );
}

function CompositionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_COMPOSITIONS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = q ? knownList.filter(c => c.toLowerCase().includes(q)) : knownList.slice(0, 8);
  const exactMatch = knownList.some(c => c.toLowerCase() === q);
  const noResults = q.length > 0 && matches.length === 0;
  const showAddButton = q.length > 0 && !exactMatch;

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <TextInput
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          placeholder="e.g. Paracetamol 500 mg"
        />
        {open && (matches.length > 0 || showAddButton) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(c => (
              <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {c}
              </button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>
                  {noResults
                    ? <>No results — add &ldquo;{value.trim()}&rdquo; as new composition</>
                    : <>Add &ldquo;{value.trim()}&rdquo; as new composition</>}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddCompositionModal
          initialName={value.trim()}
          onClose={() => setShowAddModal(false)}
          onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }}
        />
      )}
    </>
  );
}

function MedCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#4A5875", fontFamily: "Inter" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#1B6CA8" }} />
      {label}
    </label>
  );
}

// Step icon helpers for Add Medicine
function PillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

// Stepper for Add Medicine — matches DistributorStepper exactly in style
function MedStepper({ current }: { current: number }) {
  const steps = ["Medicine", "Compliance", "Operations", "Review"];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 32px", background: "#FAFBFD", borderTop: "1px solid #EEF1F6", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const state: "done" | "active" | "idle" = current > n ? "done" : current === n ? "active" : "idle";
        const isLast = i === steps.length - 1;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: state === "done" ? "#E8F5E9" : state === "active" ? "#EFF6FF" : "#F5F5F5",
                border: `1.5px solid ${state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#DDE3EC"}`,
                color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono",
                flexShrink: 0,
              }}>{state === "done" ? "✓" : String(n).padStart(2, "0")}</div>
              <span style={{ fontSize: 13, fontWeight: state === "idle" ? 500 : 700, color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF", whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 1, background: state === "done" ? "#A5D6A7" : "#DDE3EC", margin: "0 14px", minWidth: 20 }} />}
          </div>
        );
      })}
    </div>
  );
}

function AddMedicineDrawer({ initialName, onClose, onSaved }: {
  initialName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<AddMedForm>({ ...emptyMedForm(), genericName: initialName });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upd = <K extends keyof AddMedForm>(key: K, value: AddMedForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const goNext = () => {
    if (step < 4) setStep(s => (s + 1) as 1 | 2 | 3 | 4);
    else { onSaved(form.genericName || form.brandName || "New Medicine"); onClose(); }
  };
  const goBack = () => { if (step > 1) setStep(s => (s - 1) as 1 | 2 | 3 | 4); };
  const continueDisabled = step === 1 && !form.genericName.trim();

  const reviewName = [form.genericName, form.brandName].filter(Boolean).join(" · ") || "—";
  const reviewStrength = [form.strength, form.dosageForm].filter(Boolean).join(" · ") || "—";
  const reviewPricing = [form.mrp ? `Purchase ₹${form.mrp}` : null, form.sellingPrice ? `MRP ₹${form.sellingPrice}` : null].filter(Boolean).join(" — ") || "—";
  const reviewStock = [form.openingStock || null, form.stockLocation || null].filter(Boolean).join(" · ") || "—";
  const reviewHsn = [form.hsnCode || null, form.gstRate ? `${form.gstRate}% · GST` : null].filter(Boolean).join(" · ") || "—";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.5)", zIndex: 500, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(760px, 58vw)", background: "#fff", zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.15)" }}>

        {/* Header */}
        <div style={{ padding: "22px 32px 20px", position: "relative", flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.14em", textTransform: "uppercase" }}>Inventory · New Medicine</div>
          <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginTop: 6 }}>Add medicine</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, maxWidth: 560 }}>Create a catalog record that is ready for purchasing, batch tracking, and stock control.</div>
          <button onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: 22, right: 22, width: 32, height: 32, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <MedStepper current={step} />

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

          {/* STEP 1 — Medicine identity */}
          {step === 1 && (
            <>
              <DrawerSectionHeader n="01" title="Medicine identity" subtitle="Use the approved catalog name, strength, and pack information." icon={<StepChip><PillIcon /></StepChip>} />
              <DrawerRow>
                <DrawerField label="Generic name" required>
                  <TextInput value={form.genericName} onChange={e => upd("genericName", e.target.value)} placeholder="e.g. Paracetamol" />
                </DrawerField>
                <DrawerField label="Brand name" required>
                  <TextInput value={form.brandName} onChange={e => upd("brandName", e.target.value)} placeholder="e.g. Crocin 500" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Strength" required>
                  <TextInput value={form.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" />
                </DrawerField>
                <DrawerField label="Dosage form" required>
                  <DropdownSelect value={form.dosageForm} onChange={v => upd("dosageForm", v)} options={DOSAGE_FORMS} />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Route" required>
                  <DropdownSelect value={form.route} onChange={v => upd("route", v)} options={ROUTES} />
                </DrawerField>
                <DrawerField label="Pack / Unit" required>
                  <TextInput value={form.packUnit} onChange={e => upd("packUnit", e.target.value)} placeholder="e.g. 10 tablets / strip" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Manufacturer" required>
                  <ManufacturerField value={form.manufacturer} onChange={v => upd("manufacturer", v)} />
                </DrawerField>
                <DrawerField label="Therapeutic category" required>
                  <TextInput value={form.therapeuticCategory} onChange={e => upd("therapeuticCategory", e.target.value)} placeholder="e.g. Analgesic & antipyretic" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Salt composition" required>
                  <CompositionField value={form.saltComposition} onChange={v => upd("saltComposition", v)} />
                </DrawerField>
                <DrawerField label="Therapeutic class" required>
                  <TextInput value={form.therapeuticClass} onChange={e => upd("therapeuticClass", e.target.value)} placeholder="e.g. Analgesic" />
                </DrawerField>
              </DrawerRow>
            </>
          )}

          {/* STEP 2 — Compliance & storage */}
          {step === 2 && (
            <>
              <DrawerSectionHeader n="02" title="Compliance & storage" subtitle="These controls support pharmacy dispensing and inventory safety." icon={<StepChip><ShieldSolidIcon /></StepChip>} />
              <DrawerRow>
                <DrawerField label="HSN code" required>
                  <TextInput value={form.hsnCode} onChange={e => upd("hsnCode", e.target.value)} placeholder="e.g. 3482345" />
                </DrawerField>
                <DrawerField label="Barcode / GTIN">
                  <TextInput value={form.barcode} onChange={e => upd("barcode", e.target.value)} placeholder="Scan or enter barcode" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Prescription status">
                  <DropdownSelect value={form.prescriptionStatus} onChange={v => upd("prescriptionStatus", v)} options={PRESCRIPTION_STATUSES} />
                </DrawerField>
                <DrawerField label="GST / Tax rate" required>
                  <div style={{ display: "flex" }}>
                    <TextInput value={form.gstRate} onChange={e => upd("gstRate", e.target.value)} placeholder="12" />
                    <span style={{ padding: "9px 12px", border: "1px solid #E8ECF4", borderLeft: "none", fontSize: 13, color: "#6B7280", background: "#F9FAFB", whiteSpace: "nowrap", flexShrink: 0 }}>%</span>
                  </div>
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Storage condition" required>
                  <TextInput value={form.storageCondition} onChange={e => upd("storageCondition", e.target.value)} placeholder="Store below 25°C" />
                </DrawerField>
                <DrawerField label="Temperature range" required>
                  <TextInput value={form.tempRange} onChange={e => upd("tempRange", e.target.value)} placeholder="15–25°C" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Storage zone" required>
                  <TextInput value={form.storageZone} onChange={e => upd("storageZone", e.target.value)} placeholder="Main store" />
                </DrawerField>
                <DrawerField label="Manufacturer product code">
                  <TextInput value={form.mfgProductCode} onChange={e => upd("mfgProductCode", e.target.value)} placeholder="Supplier/manufacturer code" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Distributor reference">
                  <TextInput value={form.distributorRef} onChange={e => upd("distributorRef", e.target.value)} placeholder="Preferred supplier or distributor" />
                </DrawerField>
                <DrawerField label="Regulatory notes">
                  <textarea value={form.regulatoryNotes} onChange={e => upd("regulatoryNotes", e.target.value)} placeholder="License, schedule, or dispensing restrictions" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
              </DrawerRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 16 }}>
                <MedCheckbox checked={form.controlledDrug} onChange={v => upd("controlledDrug", v)} label="Controlled drug" />
                <MedCheckbox checked={form.narcotic} onChange={v => upd("narcotic", v)} label="Narcotic / psychotropic" />
                <MedCheckbox checked={form.coldChain} onChange={v => upd("coldChain", v)} label="Cold-chain item" />
                <MedCheckbox checked={form.specialHandling} onChange={v => upd("specialHandling", v)} label="Special handling" />
              </div>
            </>
          )}

          {/* STEP 3 — Operations */}
          {step === 3 && (
            <>
              <DrawerSectionHeader n="03" title="Operations" subtitle="Pricing, stock levels, and unit configuration for this medicine." icon={<StepChip><BoxIcon /></StepChip>} />
              <DrawerRow>
                <DrawerField label="MRP" required>
                  <TextInput value={form.mrp} onChange={e => upd("mrp", e.target.value)} placeholder="e.g. 45" />
                </DrawerField>
                <DrawerField label="Selling price" required>
                  <TextInput value={form.sellingPrice} onChange={e => upd("sellingPrice", e.target.value)} placeholder="e.g. 45" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Opening stock" required>
                  <TextInput value={form.openingStock} onChange={e => upd("openingStock", e.target.value)} placeholder="e.g. 04" />
                </DrawerField>
                <DrawerField label="Reorder threshold" required>
                  <TextInput value={form.reorderThreshold} onChange={e => upd("reorderThreshold", e.target.value)} placeholder="e.g. 10" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Minimum stock" required>
                  <TextInput value={form.minimumStock} onChange={e => upd("minimumStock", e.target.value)} placeholder="e.g. 5" />
                </DrawerField>
                <DrawerField label="Stock location" required>
                  <TextInput value={form.stockLocation} onChange={e => upd("stockLocation", e.target.value)} placeholder="Main store" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Location" required>
                  <TextInput value={form.location} onChange={e => upd("location", e.target.value)} placeholder="e.g. Rack A / Shelf 2 / Bin 04" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Base unit">
                  <TextInput value={form.baseUnit} onChange={e => upd("baseUnit", e.target.value)} placeholder="Unit" />
                </DrawerField>
                <DrawerField label="Purchase unit">
                  <TextInput value={form.purchaseUnit} onChange={e => upd("purchaseUnit", e.target.value)} placeholder="Box" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Sale unit">
                  <TextInput value={form.saleUnit} onChange={e => upd("saleUnit", e.target.value)} placeholder="Strip" />
                </DrawerField>
                <DrawerField label="Unit conversion">
                  <TextInput value={form.unitConversion} onChange={e => upd("unitConversion", e.target.value)} placeholder="1 box = 10 strips" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Wholesale price">
                  <TextInput value={form.wholesalePrice} onChange={e => upd("wholesalePrice", e.target.value)} placeholder="₹ 0.00" />
                </DrawerField>
                <DrawerField label="Margin">
                  <TextInput value={form.margin} onChange={e => upd("margin", e.target.value)} placeholder="Margin %" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Discount limit">
                  <TextInput value={form.discountLimit} onChange={e => upd("discountLimit", e.target.value)} placeholder="Maximum discount %" />
                </DrawerField>
                <DrawerField label="Maximum stock" required>
                  <TextInput value={form.maximumStock} onChange={e => upd("maximumStock", e.target.value)} placeholder="100" />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Reorder quantity" required>
                  <TextInput value={form.reorderQty} onChange={e => upd("reorderQty", e.target.value)} placeholder="50" />
                </DrawerField>
                <DrawerField label="Lead time (days)" required>
                  <TextInput value={form.leadTime} onChange={e => upd("leadTime", e.target.value)} placeholder="1" />
                </DrawerField>
              </DrawerRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 16 }}>
                <MedCheckbox checked={form.batchTracking} onChange={v => upd("batchTracking", v)} label="Batch/lot tracking" />
                <MedCheckbox checked={form.expiryTracking} onChange={v => upd("expiryTracking", v)} label="Expiry tracking" />
                <MedCheckbox checked={form.fefoDispensing} onChange={v => upd("fefoDispensing", v)} label="FEFO dispensing" />
              </div>
            </>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <>
              <DrawerSectionHeader n="04" title="Review medicine" subtitle="Confirm the catalog record before making it available to purchasing." icon={<StepChip><CheckCircleIcon /></StepChip>} />
              <div style={{ border: "1px solid #E8ECF4" }}>
                {[
                  { l1: "Generic / Brand", v1: reviewName, l2: "Strength & Form", v2: reviewStrength },
                  { l1: "Manufacturer", v1: form.manufacturer || "—", l2: "HSN / Tax", v2: reviewHsn },
                  { l1: "Pricing", v1: reviewPricing, l2: "Opening Stock", v2: reviewStock },
                ].map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < 2 ? "1px solid #F4F6FA" : "none" }}>
                    <div style={{ padding: "14px 18px", borderRight: "1px solid #F4F6FA" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l1}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v1}</div>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l2}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v2}</div>
                    </div>
                  </div>
                ))}
              </div>
              <DrawerRow>
                <DrawerField label="Therapeutic indications">
                  <textarea value={form.therapeuticIndications} onChange={e => upd("therapeuticIndications", e.target.value)} placeholder="Approved indications" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
                <DrawerField label="Contraindications">
                  <textarea value={form.contraindications} onChange={e => upd("contraindications", e.target.value)} placeholder="Important contraindications" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Dosage instructions">
                  <textarea value={form.dosageInstructions} onChange={e => upd("dosageInstructions", e.target.value)} placeholder="Patient-facing directions" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
                <DrawerField label="Side effects">
                  <textarea value={form.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="Known common side effects" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Patient label text">
                  <textarea value={form.patientLabelText} onChange={e => upd("patientLabelText", e.target.value)} placeholder="Label instructions shown to patient" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
                <DrawerField label="Review notes">
                  <textarea value={form.reviewNotes} onChange={e => upd("reviewNotes", e.target.value)} placeholder="Catalog review notes" rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                </DrawerField>
              </DrawerRow>
              <DrawerRow>
                <DrawerField label="Product status">
                  <DropdownSelect value={form.productStatus} onChange={v => upd("productStatus", v)} options={PRODUCT_STATUSES} />
                </DrawerField>
                <DrawerField label="Effective from">
                  <TextInput type="date" value={form.effectiveFrom} onChange={e => upd("effectiveFrom", e.target.value)} />
                </DrawerField>
              </DrawerRow>
              <div style={{ marginTop: 18, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
                <ShieldSolidIcon />
                <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected medicine master record and makes it immediately searchable from the purchase invoice.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 32px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
            <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: "50%", border: "1px solid #DDE3EC", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#9CA3AF" }}>?</span>
            Step {step} of 4 · Required fields are marked <span style={{ color: "#C62828" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button onClick={goBack}
                style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                ← Back
              </button>
            )}
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <button onClick={goNext} disabled={continueDisabled}
              style={{ padding: "9px 22px", border: "none", background: continueDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: continueDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {step === 4 ? <>Save medicine <span>✓</span></> : <>Continue <span>→</span></>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Medicine Name Cell ────────────────────────────────────────────────────────

function MedicineNameCell({ value, alloc, onSelect }: {
  value: string;
  alloc: "FEFO" | "LEFO";
  onSelect: (name: string, batch: PriorBatch) => void;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [batchDrug, setBatchDrug] = useState<typeof drugs[0] | null>(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setBatchDrug(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return drugs.slice(0, 8);
    return drugs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      drugBarcode(d.id).includes(q) ||
      d.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [text]);

  const hasQuery = text.trim().length > 0;
  const noResults = hasQuery && matches.length === 0;

  const openBatchesFor = (d: typeof drugs[0]) => {
    setText(d.name);
    setBatchDrug(d);
    setOpen(true);
  };

  const commitBatch = (d: typeof drugs[0], b: PriorBatch) => {
    setText(d.name);
    onSelect(d.name, b);
    setOpen(false);
    setBatchDrug(null);
  };

  const scanCurrent = () => {
    const q = text.trim();
    if (!q) return;
    const exact = drugs.find(d => drugBarcode(d.id) === q);
    if (exact) { openBatchesFor(exact); return; }
    if (matches.length === 1) openBatchesFor(matches[0]);
  };

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", minWidth: 240, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span onClick={() => inputRef.current?.focus()}
            title="Focus to scan a barcode — or type + Enter"
            style={{ display: "inline-flex", padding: "4px 5px", color: "#8A94A8", cursor: "pointer", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
            <BarcodeIcon />
          </span>
          <input
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); setOpen(true); setBatchDrug(null); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scanCurrent(); } }}
            placeholder="Search medicine, barcode..."
            style={{ flex: 1, padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, minWidth: 170 }}
          />
        </div>

        {open && !batchDrug && (matches.length > 0 || noResults || !hasQuery) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 10, maxHeight: 280, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.08)", minWidth: 340 }}>
            {matches.map(d => {
              const bs = priorBatchesFor(d);
              return (
                <button key={d.id} onClick={() => openBatchesFor(d)}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", fontFamily: "Inter" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1, fontFamily: "JetBrains Mono" }}>{drugBarcode(d.id)} · {d.category}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{bs.length} batch{bs.length !== 1 ? "es" : ""}</div>
                  </div>
                </button>
              );
            })}
            {noResults && (
              <div style={{ padding: "10px 12px 4px", fontSize: 12, color: "#6B7280" }}>
                No medicine found for &ldquo;<span style={{ fontWeight: 600, color: "#1A2436" }}>{text.trim()}</span>&rdquo;
              </div>
            )}
            <button
              onClick={() => { setOpen(false); setShowAddMed(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", border: "none", borderTop: "1px solid #EEF1F6", background: "#F0F6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, width: "100%", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
              Add Medicine{text.trim() ? ` — "${text.trim()}"` : ""}
            </button>
          </div>
        )}

        {open && batchDrug && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 20, boxShadow: "0 4px 12px rgba(10,22,44,0.12)", minWidth: 560 }}>
          <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Select Batch — {batchDrug.name}</span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>{alloc}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Batch #", "Qty", "Packs", "Mfg Date", "Exp Date", "MRP", "Rate"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F4F6FA", textAlign: "left", background: "#FAFBFD", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...priorBatchesFor(batchDrug)]
                .sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate))
                .map(b => {
                  const nearExpiry = b.expDate < "2027-06-30";
                  return (
                    <tr key={b.id} onClick={() => commitBatch(batchDrug, b)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA", background: nearExpiry ? "#FFFBEB" : "transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = nearExpiry ? "#FFFBEB" : "transparent")}>
                      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{b.id}</td>
                      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{b.qty}</td>
                      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.packs}</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{b.mfgDate}</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: nearExpiry ? "#E65100" : "#6B7280", fontWeight: nearExpiry ? 600 : 400, whiteSpace: "nowrap" }}>{b.expDate}</td>
                      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.mrp.toFixed(2)}</td>
                      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600 }}>₹{b.rate.toFixed(2)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <div style={{ padding: "7px 12px", borderTop: "1px solid #F4F6FA", background: "#FAFBFD", fontSize: 11, color: "#6B7280" }}>
            Click a row to copy its details, or press <span style={{ fontFamily: "JetBrains Mono", background: "#EEF1F6", padding: "1px 5px", borderRadius: 2 }}>Esc</span> and enter a new batch manually.
          </div>
        </div>
        )}
      </div>
      {showAddMed && (
        <AddMedicineDrawer
          initialName={text.trim()}
          onClose={() => setShowAddMed(false)}
          onSaved={name => { setText(name); setShowAddMed(false); }}
        />
      )}
    </>
  );
}

// ─── Medicine Map Modal ────────────────────────────────────────────────────────

function MedicineMapModal({
  importedName,
  onMap,
  onCreateNew,
  onClose,
}: {
  importedName: string;
  onMap: (systemName: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(importedName);

  // Multi-field search: name · generic/composition · strength · unit · category.
  // Results are scored so exact-name matches bubble up first.
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parsedDrugs.slice(0, 12);
    return parsedDrugs
      .map(d => {
        let score = 0;
        if (d.name.toLowerCase().includes(q))     score += 3;
        if (d.generic.toLowerCase().includes(q))  score += 2;
        if (d.strength.toLowerCase().includes(q)) score += 1;
        if (d.unit.toLowerCase().includes(q))     score += 1;
        if (d.category.toLowerCase().includes(q)) score += 1;
        return { d, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(r => r.d);
  }, [search]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", width: 600, maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid #E8ECF4", boxShadow: "0 12px 40px rgba(10,22,44,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Map Medicine Name</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 5, lineHeight: 1.5 }}>
            Imported as{" "}
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C2410C", background: "#FFF7ED", padding: "1px 6px", border: "1px solid #FED7AA" }}>
              {importedName}
            </span>
            {" "}— select the matching system medicine below.
          </div>
        </div>

        {/* Search — hint text shows all searchable dimensions */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, composition, strength, pack, or category…"
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
          />
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Name", "Composition", "Strength", "Pack/Unit", "Category"].map(tag => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F4F6FA", padding: "2px 7px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              No medicines found for &ldquo;{search}&rdquo;
              <div style={{ marginTop: 10, fontSize: 12 }}>Use <strong>Create New Medicine</strong> below to add it to the master.</div>
            </div>
          ) : (
            suggestions.map(d => (
              <button
                key={d.id}
                onClick={() => onMap(d.name)}
                style={{ width: "100%", padding: "10px 20px", border: "none", borderBottom: "1px solid #F4F6FA", background: "#fff", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                {/* Left: name + composition row */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {d.generic && <span>{d.generic}</span>}
                    {d.generic && <span style={{ margin: "0 4px" }}>·</span>}
                    <span>{d.category}</span>
                  </div>
                </div>
                {/* Right: strength chip + unit + select button */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {d.strength && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", background: "#EFF6FF", padding: "2px 7px", whiteSpace: "nowrap" }}>
                      {d.strength}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{d.unit}</span>
                  <span style={{ fontSize: 11, color: "#1B6CA8", fontWeight: 700, padding: "3px 9px", background: "#EFF6FF", whiteSpace: "nowrap", borderLeft: "1px solid #DBEAFE" }}>
                    Select →
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={onCreateNew}
            style={{ padding: "8px 16px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}
          >
            + Create New Medicine
          </button>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PurchaseLineItemsTable({ items, alloc, onChange, onDelete, onMap, onAccept, lineSearch, onLineSearchChange }: {
  items: PurchaseLine[];
  alloc: "FEFO" | "LEFO";
  onChange: (id: number, field: keyof PurchaseLine, value: number | string) => void;
  onDelete: (id: number) => void;
  onMap?: (id: number) => void;
  onAccept?: (id: number) => void;
  lineSearch?: string;
  onLineSearchChange?: (v: string) => void;
}) {
  const inputStyle = (w: number): React.CSSProperties => ({
    width: w, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none",
    fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436",
  });

  const q = (lineSearch ?? "").trim().toLowerCase();
  const visibleItems = q
    ? items.filter(i =>
        i.medicineName.toLowerCase().includes(q) ||
        (i.importedName ?? "").toLowerCase().includes(q) ||
        i.batchNo.toLowerCase().includes(q)
      )
    : items;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* ── Table ───────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1300, width: "100%" }}>
        <thead>
          <tr>
            <Th>Medicine</Th>
            <Th>Batch #</Th>
            <Th>Exp</Th>
            <Th right>Pack</Th>
            <Th right>Qty</Th>
            <Th right>Free</Th>
            <Th right>Rate</Th>
            <Th right>MRP</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Amount</Th>
            <Th center>Action</Th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map(item => {
            const ms = item.mappingStatus;
            return (
            // No row background or border for any status — colour lives only in the text
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
              <td style={{ padding: "6px 10px", textAlign: "left", minWidth: 260 }}>
                {ms ? (
                  // ── Imported line — mapping UI ──────────────────────────────
                  ms === "matched" ? (
                    // Matched: plain name only — no colour, no badge
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1A2436", fontFamily: "Inter" }}>
                      {item.medicineName}
                    </span>
                  ) : (
                    // Fuzzy / unmatched: coloured name + suggestion + icon actions
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {/* Imported name in colour */}
                      <span style={{
                        fontSize: 13, fontWeight: 500, fontFamily: "Inter",
                        color: ms === "unmatched" ? "#C0392B" : "#A05C00",
                      }}>
                        {item.importedName}
                      </span>
                      {/* Suggestion text + icon buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {ms === "fuzzy" && item.medicineName && (
                          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>
                            → {item.medicineName}
                          </span>
                        )}
                        {ms === "unmatched" && (
                          <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>No match found</span>
                        )}
                        {/* ✓ accept — fuzzy only */}
                        {ms === "fuzzy" && item.medicineName && (
                          <button
                            onClick={() => onAccept?.(item.id)}
                            title="Accept suggestion"
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: "1px 2px", display: "inline-flex", alignItems: "center" }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        {/* ⇄ remap — link/swap icon */}
                        <button
                          onClick={() => onMap?.(item.id)}
                          title="Map to system medicine"
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: "1px 2px", display: "inline-flex", alignItems: "center" }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  // ── Normal editable cell ─────────────────────────────────────
                  <MedicineNameCell
                    value={item.medicineName}
                    alloc={alloc}
                    onSelect={(name, batch) => {
                      onChange(item.id, "medicineName", name);
                      onChange(item.id, "batchNo", batch.id);
                      onChange(item.id, "mfgDate", batch.mfgDate);
                      onChange(item.id, "expDate", batch.expDate);
                      onChange(item.id, "mrp", batch.mrp);
                      onChange(item.id, "purchaseRate", batch.rate);
                    }}
                  />
                )}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "left" }}>
                <input value={item.batchNo} onChange={e => onChange(item.id, "batchNo", e.target.value)} placeholder="BATCH-#"
                  style={{ width: 100, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#1A2436" }} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "left" }}>
                <input type="date" value={item.expDate} onChange={e => onChange(item.id, "expDate", e.target.value)}
                  style={{ width: 130, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: item.expDate && item.expDate < "2026-12-31" ? "#E65100" : "#1A2436" }} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.packSize || ""} onChange={e => onChange(item.id, "packSize", parseFloat(e.target.value) || 0)}
                  style={inputStyle(58)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.qty || ""} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={inputStyle(62)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.free || ""} onChange={e => onChange(item.id, "free", parseFloat(e.target.value) || 0)}
                  style={inputStyle(50)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.purchaseRate || ""} onChange={e => onChange(item.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                  style={inputStyle(74)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.mrp || ""} onChange={e => onChange(item.id, "mrp", parseFloat(e.target.value) || 0)}
                  style={inputStyle(70)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.disc || ""} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={inputStyle(54)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.gst || ""} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={inputStyle(54)} />
              </td>
              <td style={{ padding: "6px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                {item.medicineName ? money(calcLineAmount(item)) : "—"}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>
                {item.medicineName && (
                    <button onClick={() => onDelete(item.id)} title="Remove"
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                  )}
                </td>
              </tr>
              );
            })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

const DISTRIBUTOR_TYPES = ["Stockist", "Wholesaler", "Manufacturer", "Direct"];
const ACCOUNT_STATUSES = ["Active", "Inactive", "On Hold"];
const DISTRIBUTOR_PAYMENT_TERMS = ["COD", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];
const INDIAN_STATES = ["Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];

interface DistributorFormData {
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
}

const emptyDistributor: DistributorFormData = {
  name: "", legalName: "", type: "Stockist", accountStatus: "Active",
  gstin: "", drugLicense1: "", drugLicense2: "", pan: "",
  contactPerson: "", phone: "", email: "", salesRep: "",
  addressLine1: "", addressLine2: "", city: "", state: "", pincode: "",
  creditLimit: "", paymentTerms: "Net 30", expectedDeliveryDays: "",
};

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function ShieldSolidIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="14" height="12" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2" />
      <circle cx="18.5" cy="18.5" r="2" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, background: "#E8F5E9", border: "1px solid #C8E6C9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

function DistributorStepper({ current }: { current: number }) {
  const steps = ["Business", "Compliance", "Terms", "Review"];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 32px", background: "#FAFBFD", borderTop: "1px solid #EEF1F6", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const state: "done" | "active" | "idle" = current > n ? "done" : current === n ? "active" : "idle";
        const isLast = i === steps.length - 1;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: state === "done" ? "#E8F5E9" : state === "active" ? "#EFF6FF" : "#F5F5F5",
                border: `1.5px solid ${state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#DDE3EC"}`,
                color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono",
                flexShrink: 0,
              }}>{state === "done" ? "✓" : String(n).padStart(2, "0")}</div>
              <span style={{ fontSize: 13, fontWeight: state === "idle" ? 500 : 700, color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF", whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 1, background: state === "done" ? "#A5D6A7" : "#DDE3EC", margin: "0 14px", minWidth: 20 }} />}
          </div>
        );
      })}
    </div>
  );
}

function DrawerSectionHeader({ n, title, subtitle, icon }: { n: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ width: 30, height: 30, background: "#F0F6FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#1B6CA8", fontFamily: "JetBrains Mono" }}>{n}</span>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3, maxWidth: 480 }}>{subtitle}</div>
        </div>
      </div>
      {icon}
    </div>
  );
}

function DrawerField({ label, required, children, gridSpan }: { label: string; required?: boolean; children: React.ReactNode; gridSpan?: number }) {
  return (
    <div style={gridSpan ? { gridColumn: `span ${gridSpan}` } : undefined}>
      <div style={{ fontSize: 12, color: "#4A5875", fontWeight: 500, marginBottom: 6, fontFamily: "Inter" }}>
        {label}{required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

function DrawerRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>{children}</div>;
}

type DistributorStepProps = {
  data: DistributorFormData;
  update: <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) => void;
};

function BusinessStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="01" title="Business identity" subtitle="Use the legal name shown on invoices and licenses." icon={<StepChip><BriefcaseIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="Distributor Name" required>
          <TextInput value={data.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Medline Distributors" />
        </DrawerField>
        <DrawerField label="Legal Business Name">
          <TextInput value={data.legalName} onChange={e => update("legalName", e.target.value)} placeholder="Registered legal name" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Distributor Type">
          <DropdownSelect value={data.type} onChange={v => update("type", v)} options={DISTRIBUTOR_TYPES} />
        </DrawerField>
        <DrawerField label="Account status">
          <DropdownSelect value={data.accountStatus} onChange={v => update("accountStatus", v)} options={ACCOUNT_STATUSES} />
        </DrawerField>
      </DrawerRow>
    </>
  );
}

function ComplianceStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="02" title="Compliance & primary contact" subtitle="These details appear on purchase invoices and audit records." icon={<StepChip><ShieldSolidIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="GSTIN" required>
          <TextInput value={data.gstin} onChange={e => update("gstin", e.target.value)} placeholder="27AAAAA0000A1Z5" />
        </DrawerField>
        <DrawerField label="Drug License No. 1" required>
          <TextInput value={data.drugLicense1} onChange={e => update("drugLicense1", e.target.value)} placeholder="DL-20B-123456" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Drug License No. 2">
          <TextInput value={data.drugLicense2} onChange={e => update("drugLicense2", e.target.value)} placeholder="DL-21B-123456" />
        </DrawerField>
        <DrawerField label="PAN">
          <TextInput value={data.pan} onChange={e => update("pan", e.target.value)} placeholder="AAAAA0000A" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Contact person" required>
          <TextInput value={data.contactPerson} onChange={e => update("contactPerson", e.target.value)} placeholder="Full name" />
        </DrawerField>
        <DrawerField label="Phone" required>
          <TextInput value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Email">
          <TextInput type="email" value={data.email} onChange={e => update("email", e.target.value)} placeholder="orders@distributor.com" />
        </DrawerField>
        <DrawerField label="Sales representative">
          <TextInput value={data.salesRep} onChange={e => update("salesRep", e.target.value)} placeholder="Assigned sales rep" />
        </DrawerField>
      </DrawerRow>
    </>
  );
}

function TermsStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="03" title="Address & credit terms" subtitle="Set the defaults your procurement team will use for every order." icon={<StepChip><TruckIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="Address line 1" required>
          <TextInput value={data.addressLine1} onChange={e => update("addressLine1", e.target.value)} placeholder="Street, building" />
        </DrawerField>
        <DrawerField label="Address line 2">
          <TextInput value={data.addressLine2} onChange={e => update("addressLine2", e.target.value)} placeholder="Landmark (optional)" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="City" required>
          <TextInput value={data.city} onChange={e => update("city", e.target.value)} placeholder="City" />
        </DrawerField>
        <DrawerField label="State" required>
          <DropdownSelect value={data.state} onChange={v => update("state", v)} options={INDIAN_STATES} placeholder="— Select state —" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Pincode" required>
          <TextInput value={data.pincode} onChange={e => update("pincode", e.target.value)} placeholder="400001" />
        </DrawerField>
        <DrawerField label="Credit limit">
          <TextInput value={data.creditLimit} onChange={e => update("creditLimit", e.target.value)} placeholder="₹ 0.00" />
        </DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Payment terms" required>
          <DropdownSelect value={data.paymentTerms} onChange={v => update("paymentTerms", v)} options={DISTRIBUTOR_PAYMENT_TERMS} />
        </DrawerField>
        <DrawerField label="Expected delivery days" required>
          <TextInput type="number" value={data.expectedDeliveryDays} onChange={e => update("expectedDeliveryDays", e.target.value)} placeholder="8" />
        </DrawerField>
      </DrawerRow>
    </>
  );
}

function ReviewStep({ data }: { data: DistributorFormData }) {
  const addressLine = [data.addressLine1, data.addressLine2, data.city, data.state, data.pincode].filter(Boolean).join(", ");
  const rows = [
    { l1: "Distributor Name", v1: data.name || "—", l2: "GSTIN", v2: data.gstin || "—" },
    { l1: "Primary Contact", v1: data.contactPerson || "—", l2: "Phone", v2: data.phone || "—" },
    { l1: "Registered Address", v1: addressLine || "—", l2: "Payment Terms", v2: data.paymentTerms || "—" },
  ];
  return (
    <>
      <DrawerSectionHeader n="04" title="Review distributor" subtitle="Confirm the account details before adding it to purchasing." icon={<StepChip><CheckCircleIcon /></StepChip>} />
      <div style={{ border: "1px solid #E8ECF4" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < rows.length - 1 ? "1px solid #F4F6FA" : "none" }}>
            <div style={{ padding: "14px 18px", borderRight: "1px solid #F4F6FA" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l1}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v1}</div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l2}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v2}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
        <ShieldSolidIcon />
        <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected distributor account and makes it immediately searchable from the purchase invoice.</span>
      </div>
    </>
  );
}

function AddDistributorDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: (name: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<DistributorFormData>(emptyDistributor);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  };

  const canContinueStep1 = data.name.trim().length > 0;
  const goNext = () => {
    if (step < 4) setStep(s => (s + 1) as 1 | 2 | 3 | 4);
    else { if (data.name.trim()) onSaved(data.name.trim()); onClose(); }
  };
  const goBack = () => { if (step > 1) setStep(s => (s - 1) as 1 | 2 | 3 | 4); };
  const continueDisabled = step === 1 && !canContinueStep1;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.5)", zIndex: 500, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(760px, 58vw)", background: "#fff", zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.15)" }}>
        <div style={{ padding: "22px 32px 20px", position: "relative", flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.14em", textTransform: "uppercase" }}>Purchasing · New Account</div>
          <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginTop: 6 }}>Add distributor</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, maxWidth: 560 }}>Create a complete distributor profile without leaving your purchase invoice.</div>
          <button onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: 22, right: 22, width: 32, height: 32, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <DistributorStepper current={step} />

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {step === 1 && <BusinessStep data={data} update={update} />}
          {step === 2 && <ComplianceStep data={data} update={update} />}
          {step === 3 && <TermsStep data={data} update={update} />}
          {step === 4 && <ReviewStep data={data} />}
        </div>

        <div style={{ padding: "14px 32px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
            <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: "50%", border: "1px solid #DDE3EC", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#9CA3AF" }}>?</span>
            Step {step} of 4 · Required fields are marked <span style={{ color: "#C62828" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button onClick={goBack}
                style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                ← Back
              </button>
            )}
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <button onClick={goNext} disabled={continueDisabled}
              style={{ padding: "9px 22px", border: "none", background: continueDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: continueDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {step === 4 ? <>Save distributor <span>✓</span></> : <>Continue <span>→</span></>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function DistributorSearch({ selected, onSelect, distributors, onAdd }: {
  selected: string;
  onSelect: (name: string) => void;
  distributors: string[];
  onAdd: () => void;
}) {
  const [query, setQuery] = useState(selected);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(selected); }, [selected]);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length > 0
    ? distributors.filter(d => d.toLowerCase().includes(q))
    : distributors.slice(0, 8);

  const isSelected = !!selected && query === selected;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(""); }}
        onFocus={() => setOpen(true)}
        placeholder="Search distributor..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: isSelected ? "#F0F6FF" : "#fff" }}
      />
      {isSelected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 320, maxHeight: 320, overflowY: "auto" }}>
          {results.map(name => {
            const sup = suppliers.find(s => s.name === name);
            const payable = sup && sup.balance < 0 ? Math.abs(sup.balance) : 0;
            return (
              <button key={name} onMouseDown={e => e.preventDefault()} onClick={() => { onSelect(name); setQuery(name); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sup ? (
                        <>
                          <span style={{ fontFamily: "JetBrains Mono" }}>{sup.id}</span>
                          {" · "}{sup.contact}
                        </>
                      ) : (
                        <span style={{ fontStyle: "italic" }}>Added this session</span>
                      )}
                    </div>
                  </div>
                  {payable > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#C62828", background: "#FFEBEE", padding: "2px 8px", whiteSpace: "nowrap" }}>
                      Due ₹{payable.toFixed(2)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {results.length === 0 && (
            <div style={{ padding: "14px", fontSize: 12, color: "#9CA3AF", textAlign: "center", fontFamily: "Inter" }}>
              No distributors match "{query}"
            </div>
          )}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setOpen(false); onAdd(); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Distributor
          </button>
        </div>
      )}
    </div>
  );
}

type DrawerTab = "overview" | "invoices" | "paid" | "returns";

function DistributorDrawer({ supplierName, onClose }: { supplierName: string; onClose: () => void }) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const sup = suppliers.find(s => s.name === supplierName);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const invoices = purchaseInvoices.filter(i => i.supplier === supplierName);
  const paidInvoices = invoices.filter(i => i.balance === 0 && i.status === "Paid");
  const returns = purchaseReturns.filter(r => r.supplier === supplierName);
  const totalPurchased = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const totalReturned = returns.reduce((s, r) => s + r.total, 0);

  const infoRows = sup ? [
    { label: "Contact", value: sup.contact, mono: false },
    { label: "Phone", value: sup.phone, mono: true },
    { label: "Email", value: sup.email, mono: false },
    { label: "Products", value: sup.products.toString(), mono: true },
    { label: "Last Order", value: sup.lastOrder, mono: true },
    { label: "Rating", value: `${sup.rating} / 5`, mono: true },
  ] : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.3)", zIndex: 299 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 520, background: "#fff", borderLeft: "1px solid #E8ECF4", zIndex: 300, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8ECF4", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{supplierName}</div>
            <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF", marginTop: 1 }}>{sup?.id ?? "New distributor"}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", background: "#FAFBFD", borderBottom: "1px solid #E8ECF4", flexShrink: 0 }}>
          {([
            { id: "overview" as const, label: "Overview" },
            { id: "invoices" as const, label: `Invoices (${invoices.length})` },
            { id: "paid" as const, label: `Paid (${paidInvoices.length})` },
            { id: "returns" as const, label: `Returns (${returns.length})` },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 12px", border: "none",
                borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                background: tab === t.id ? "#fff" : "transparent",
                cursor: "pointer",
                fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "#1B6CA8" : "#6B7280",
                fontFamily: "Inter",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "overview" && (
            sup ? (
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                  {infoRows.map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 13, color: "#1A2436", fontWeight: 500, fontFamily: r.mono ? "JetBrains Mono" : "Inter" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Address</div>
                  <div style={{ fontSize: 13, color: "#1A2436", lineHeight: 1.5 }}>{sup.address}</div>
                </div>

                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div style={{ padding: "12px 14px", background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
                    <div style={{ fontSize: 10, color: "#1B6CA8", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Purchased</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1A2436", marginTop: 4 }}>{money(totalPurchased)}</div>
                  </div>
                  <div style={{ padding: "12px 14px", background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
                    <div style={{ fontSize: 10, color: "#2E7D32", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Paid</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#2E7D32", marginTop: 4 }}>{money(totalPaid)}</div>
                  </div>
                  <div style={{ padding: "12px 14px", background: totalOutstanding > 0 ? "#FFEBEE" : "#F5F5F5", border: `1px solid ${totalOutstanding > 0 ? "#FFCDD2" : "#E8ECF4"}` }}>
                    <div style={{ fontSize: 10, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Outstanding</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", marginTop: 4 }}>{money(totalOutstanding)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                Added this session — save the invoice to persist this distributor's record.
              </div>
            )
          )}

          {(tab === "invoices" || tab === "paid") && (
            <div style={{ padding: "12px 20px" }}>
              {(() => {
                const list = tab === "invoices" ? invoices : paidInvoices;
                if (list.length === 0) {
                  return <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "40px 0" }}>No invoices to show</div>;
                }
                return list.map(inv => (
                  <div key={inv.id} style={{ border: "1px solid #E8ECF4", padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{inv.id}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                        <span style={{ fontFamily: "JetBrains Mono" }}>{formatDMY(inv.date)}</span> · {inv.items} items
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{money(inv.total)}</div>
                      {inv.balance > 0 ? (
                        <div style={{ fontSize: 11, color: "#C62828", fontWeight: 600, marginTop: 2 }}>Due {money(inv.balance)}</div>
                      ) : (
                        <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 2 }}>Paid</div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {tab === "returns" && (
            <div style={{ padding: "12px 20px" }}>
              {returns.length > 0 && (
                <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FAFBFD", border: "1px solid #E8ECF4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Total Returned</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>{money(totalReturned)}</span>
                </div>
              )}
              {returns.length === 0 ? (
                <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "40px 0" }}>No returns to this distributor</div>
              ) : (
                returns.map(r => (
                  <div key={r.id} style={{ border: "1px solid #E8ECF4", padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{r.id}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                          <span style={{ fontFamily: "JetBrains Mono" }}>{formatDMY(r.date)}</span>
                          {" · "}
                          <span style={{ fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.invoiceRef}</span>
                          {" · "}{r.items} item(s) / {r.qty} units
                        </div>
                        <div style={{ fontSize: 12, color: "#4A5875", marginTop: 4 }}>{r.reason}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{money(r.total)}</div>
                        <div style={{ marginTop: 4 }}><Pill status={r.status} /></div>
                      </div>
                    </div>
                    {r.creditNote && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F4F6FA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Credit Note</span>
                        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 600 }}>{r.creditNote}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

type ImportKind = "csv" | "pdf" | "image";

interface AttachedFile {
  kind: ImportKind;
  name: string;
  size: number;
  source: "upload" | "email";
  sender?: string;
  headers?: string[];
}

const SYSTEM_FIELDS: { id: string; label: string; required: boolean; aliases: string[] }[] = [
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

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[_\s\-.]/g, "");
}

function autoMapHeader(header: string): string | null {
  const n = normalizeHeader(header);
  for (const f of SYSTEM_FIELDS) {
    if (normalizeHeader(f.label) === n) return f.id;
    if (f.aliases.some(a => normalizeHeader(a) === n)) return f.id;
  }
  return null;
}

function needsMapping(headers: string[], distributorKnown: boolean): boolean {
  if (!distributorKnown) return true;
  const mapped = new Set(headers.map(autoMapHeader).filter(Boolean) as string[]);
  const requiredIds = SYSTEM_FIELDS.filter(f => f.required).map(f => f.id);
  return !requiredIds.every(id => mapped.has(id));
}

const MOCK_OCR_HEADERS = ["Invoice_Number", "Invoice_Date", "Distributor_Name", "Item_Code", "Item_Name", "Batch_No", "Expiry_Date", "Qty", "Rate"];

const MOCK_EMAILS = [
  { id: 1, sender: "MedLine Pharma", from: "orders@medlinepharma.com", subject: "August invoice — PINV-2026-0067 line items", date: "2026-08-20", attachment: "medline-invoice-0067.csv", sizeKb: 8 },
  { id: 2, sender: "GenPharm Ltd", from: "supply@genpharm.co", subject: "Order confirmation attached (CSV)", date: "2026-08-19", attachment: "GP-2026-0154.csv", sizeKb: 4 },
  { id: 3, sender: "PharmaCo Inc", from: "b2b@pharmacoinc.com", subject: "Please confirm receipt — invoice CSV attached", date: "2026-08-18", attachment: "pharmaco-aug-invoice.csv", sizeKb: 12 },
  { id: 4, sender: "BioPharm AG", from: "orders@biopharm.ag", subject: "Rechnung / Invoice — August batch", date: "2026-08-15", attachment: "biopharm-rechnung.csv", sizeKb: 6 },
  { id: 5, sender: "RespiCare Ltd", from: "sales@respicare.co.uk", subject: "Weekly invoice batch", date: "2026-08-12", attachment: "respicare-weekly-08.csv", sizeKb: 5 },
];

function ImportMenu({ onImport }: { onImport: (file: AttachedFile) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pick = (kind: ImportKind) => {
    setOpen(false);
    const map = { csv: csvRef, pdf: pdfRef, image: imgRef };
    map[kind].current?.click();
  };

  const change = (kind: ImportKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let headers: string[] = [];
    if (kind === "csv") {
      try {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        headers = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, "")).filter(Boolean);
      } catch { headers = []; }
    } else {
      headers = MOCK_OCR_HEADERS;
    }
    onImport({ kind, name: file.name, size: file.size, source: "upload", headers });
    e.target.value = "";
  };

  const options: { kind: ImportKind; label: string; desc: string }[] = [
    { kind: "csv", label: "CSV file", desc: "Distributor invoice as CSV" },
    { kind: "pdf", label: "PDF invoice", desc: "Scanned or digital PDF" },
    { kind: "image", label: "Image", desc: "JPG / PNG photo of an invoice" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
        <UploadIcon />
        Import
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 60, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 220 }}>
          {options.map(o => (
            <button key={o.kind} onClick={() => pick(o.kind)}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", fontFamily: "Inter" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{o.label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      )}
      <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={change("csv")} />
      <input ref={pdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={change("pdf")} />
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={change("image")} />
    </div>
  );
}

const CLEAN_CSV_HEADERS = ["Medicine", "Batch No", "Mfg Date", "Expiry Date", "Pack Size", "Quantity", "Free", "Rate", "MRP", "Discount %", "GST %"];
const MESSY_CSV_HEADERS = ["Invoice_Number", "Invoice_Date", "Distributor_Name", "Item_Code", "Item_Name", "Batch_No", "Expiry_Date", "Qty", "Rate"];

function EmailFetchModal({ onClose, onImport }: { onClose: () => void; onImport: (file: AttachedFile) => void }) {
  const pick = (email: typeof MOCK_EMAILS[0]) => {
    const headers = email.id === 1 ? CLEAN_CSV_HEADERS : MESSY_CSV_HEADERS;
    onImport({ kind: "csv", name: email.attachment, size: email.sizeKb * 1024, source: "email", sender: email.sender, headers });
    onClose();
  };
  return (
    <Modal title="Fetch invoices from email" onClose={onClose} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
          {MOCK_EMAILS.length} recent emails with CSV attachments from your distributors. Click any row to attach the CSV to this invoice.
        </div>
        <div style={{ border: "1px solid #E8ECF4" }}>
          {MOCK_EMAILS.map((email, i) => (
            <button key={email.id} onClick={() => pick(email)}
              style={{ width: "100%", textAlign: "left", padding: "12px 14px", border: "none", borderBottom: i < MOCK_EMAILS.length - 1 ? "1px solid #F4F6FA" : "none", background: "transparent", cursor: "pointer", fontFamily: "Inter" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{email.sender}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>&lt;{email.from}&gt;</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#4A5875", marginTop: 3 }}>{email.subject}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{email.attachment}</span>
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{email.sizeKb} KB</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {email.date}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
    </Modal>
  );
}

function ImportWizard({ file, distributorKnown, onCancel, onConfirm }: {
  file: AttachedFile;
  distributorKnown: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const headers = file.headers ?? [];
  const [step, setStep] = useState<"map" | "review">("map");
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(headers.map(h => [h, autoMapHeader(h) ?? "ignore"]))
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const mappedIds = new Set(Object.values(mapping).filter(v => v !== "ignore"));
  const requiredIds = SYSTEM_FIELDS.filter(f => f.required).map(f => f.id);
  const missingRequired = requiredIds.filter(id => !mappedIds.has(id));
  const mappedCount = headers.filter(h => mapping[h] !== "ignore").length;
  const ignoredCount = headers.length - mappedCount;
  const kindLabel = file.kind === "csv" ? "CSV" : file.kind === "pdf" ? "PDF" : "image";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 920, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 26px", borderBottom: "1px solid #EEF1F6", position: "relative", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Purchase Invoice Utility</div>
          <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>Import invoice {kindLabel}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, maxWidth: 700 }}>
            Match your distributor&apos;s headers to the existing purchase invoice fields before anything enters inventory.
          </div>
          <button onClick={onCancel}
            style={{ position: "absolute", top: 20, right: 20, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", width: 32, height: 32, borderRadius: "50%", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "14px 26px", background: "#FAFBFD", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {[
            { n: "01", label: "Upload " + kindLabel, done: true, active: false },
            { n: "02", label: "Map columns", done: step === "review", active: step === "map" },
            { n: "03", label: "Review & import", done: false, active: step === "review" },
          ].map((s, i, arr) => {
            const state = s.done ? "done" : s.active ? "active" : "idle";
            const circleBg = state === "done" ? "#E8F5E9" : state === "active" ? "#EFF6FF" : "#F5F5F5";
            const circleBorder = state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#DDE3EC";
            const circleColor = state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF";
            const textColor = state === "idle" ? "#9CA3AF" : state === "done" ? "#2E7D32" : "#0C1B33";
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: circleBg, border: `1.5px solid ${circleBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: circleColor, fontFamily: "JetBrains Mono" }}>
                    {state === "done" ? "✓" : s.n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: state === "idle" ? 500 : 700, color: textColor }}>{s.label}</span>
                </div>
                {i < arr.length - 1 && <div style={{ width: 60, height: 1, background: "#DDE3EC" }} />}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {step === "map" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Your CSV Header", "Existing Invoice Field", "Match Status"].map(h => (
                    <th key={h} style={{ padding: "12px 26px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", background: "#fff", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {headers.map(h => {
                  const mapped = mapping[h];
                  const isMapped = mapped !== "ignore";
                  const field = SYSTEM_FIELDS.find(f => f.id === mapped);
                  const letter = h.trim().charAt(0).toUpperCase() || "?";
                  const isUnresolved = !isMapped && missingRequired.length > 0;
                  return (
                    <tr key={h} style={{ borderBottom: "1px solid #F4F6FA" }}>
                      <td style={{ padding: "16px 26px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 24, height: 24, background: "#EEF1F6", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono", flexShrink: 0 }}>{letter}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{h}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 26px", verticalAlign: "middle" }}>
                        <div style={{ position: "relative", maxWidth: 320 }}>
                          <select value={mapped} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                            style={{ width: "100%", padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: "#0C1B33", appearance: "none", WebkitAppearance: "none" }}>
                            <option value="ignore">Ignore this column</option>
                            {SYSTEM_FIELDS.map(f => (
                              <option key={f.id} value={f.id}>{f.label}{f.required ? " · required" : ""}</option>
                            ))}
                          </select>
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
                            <ChevronDown />
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 26px", verticalAlign: "middle" }}>
                        {isMapped ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32", background: "#E8F5E9", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11 }}>✓</span> Matched to {field?.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 500, color: isUnresolved ? "#92400E" : "#9CA3AF", background: isUnresolved ? "#FEF3C7" : "#F5F5F5", padding: "5px 12px", display: "inline-flex" }}>
                            {isUnresolved ? "⚠ Needs mapping" : "Will be ignored"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {step === "review" && (
            <div style={{ padding: "22px 26px" }}>
              {!distributorKnown && (
                <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 16, fontSize: 13, color: "#1B6CA8" }}>
                  Distributor <strong>added this session</strong> — this mapping will be saved as their default when the invoice is posted.
                </div>
              )}
              {missingRequired.length > 0 && (
                <div style={{ padding: "12px 16px", background: "#FFF3E0", border: "1px solid #FDE68A", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
                  <strong>Missing required fields:</strong> {missingRequired.map(id => SYSTEM_FIELDS.find(f => f.id === id)?.label).join(", ")}. Go back and map them before continuing.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Columns Mapped</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#2E7D32", marginTop: 4 }}>{mappedCount}</div>
                </div>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Columns Ignored</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#6B7280", marginTop: 4 }}>{ignoredCount}</div>
                </div>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Source</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{file.source === "email" ? file.sender ?? "Email" : "Local upload"}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Mapping Summary</div>
              <div style={{ border: "1px solid #E8ECF4" }}>
                {headers.map((h, i) => {
                  const mapped = mapping[h];
                  const isMapped = mapped !== "ignore";
                  const field = SYSTEM_FIELDS.find(f => f.id === mapped);
                  return (
                    <div key={h} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: i < headers.length - 1 ? "1px solid #F4F6FA" : "none", fontSize: 12 }}>
                      <span style={{ fontFamily: "JetBrains Mono", color: "#0C1B33" }}>{h}</span>
                      <span style={{ fontFamily: "Inter", color: isMapped ? "#2E7D32" : "#9CA3AF" }}>
                        → {isMapped ? field?.label : "Ignored"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 26px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Safe import · no invoice is posted automatically
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step === "map" ? (
              <>
                <GhostBtn onClick={onCancel}>← Cancel</GhostBtn>
                <button
                  onClick={() => setStep("review")}
                  disabled={missingRequired.length > 0}
                  title={missingRequired.length > 0 ? `Map these required fields first: ${missingRequired.map(id => SYSTEM_FIELDS.find(f => f.id === id)?.label).join(", ")}` : undefined}
                  style={{ padding: "10px 20px", border: "none", background: missingRequired.length > 0 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: missingRequired.length > 0 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Preview normalized rows →
                </button>
              </>
            ) : (
              <>
                <GhostBtn onClick={() => setStep("map")}>← Back</GhostBtn>
                <button onClick={onConfirm} disabled={missingRequired.length > 0}
                  style={{ padding: "10px 20px", border: "none", background: missingRequired.length > 0 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: missingRequired.length > 0 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Confirm & Attach
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ImportCards = () => (
  <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16 }}>
    {/* CSV Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#E8F5E9", border: "1px dashed #81C784", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6, position: "relative" }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#2E7D32" }} />
          <div style={{ width: 14, height: 3, background: "#81C784", borderRadius: 1 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, flex: 1, margin: "6px 0" }}>
          <div style={{ background: "#C8E6C9", height: 6 }} />
          <div style={{ background: "#A5D6A7", height: 6 }} />
          <div style={{ background: "#C8E6C9", height: 6 }} />
          <div style={{ background: "#A5D6A7", height: 6 }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#2E7D32", fontFamily: "JetBrains Mono", background: "#C8E6C9", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>CSV</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>Excel/CSV</span>
    </div>

    {/* PDF Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#FFEBEE", border: "1px dashed #E57373", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#C62828" }} />
          <div style={{ width: 14, height: 3, background: "#E57373", borderRadius: 1 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, margin: "8px 0" }}>
          <div style={{ background: "#FFCDD2", height: 3, width: "80%" }} />
          <div style={{ background: "#FFCDD2", height: 3, width: "100%" }} />
          <div style={{ background: "#FFCDD2", height: 3, width: "60%" }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#C62828", fontFamily: "JetBrains Mono", background: "#FFCDD2", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>PDF</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>PDF Bill</span>
    </div>

    {/* OCR Image Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#E3F2FD", border: "1px dashed #64B5F6", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1565C0" }} />
          <div style={{ width: 14, height: 3, background: "#64B5F6", borderRadius: 1 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, margin: "6px 0", color: "#2196F3" }}>
          <span style={{ fontSize: 16 }}>📷</span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#1565C0", fontFamily: "JetBrains Mono", background: "#BBDEFB", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>IMG</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>Scan/Photo</span>
    </div>
  </div>
);

interface InvoiceInitialData {
  id: string;
  supplier: string;
  poRef: string;
  date: string;
  due: string;
  status: string;
}

// Mock saved line items per invoice (used when opening an existing invoice)
const MOCK_INVOICE_LINES: Record<string, PurchaseLine[]> = {
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

function NewPurchaseInvoice({ onBack, initialData, defaultViewMode = false }: { onBack: () => void; initialData?: InvoiceInitialData; defaultViewMode?: boolean }) {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [supplier, setSupplier] = useState(initialData?.supplier ?? "");
  const [alloc, setAlloc] = useState<"FEFO" | "LEFO">("FEFO");
  const [invoiceNo, setInvoiceNo] = useState(initialData?.id ?? "PINV-2026-0073");
  const [invoiceDate, setInvoiceDate] = useState(initialData?.date ?? TODAY);
  const [dueDate, setDueDate] = useState(initialData?.due ?? "2026-09-21");
  const [poRef, setPoRef] = useState(initialData?.poRef ?? "");
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [mappingItemId, setMappingItemId] = useState<number | null>(null);
  const [showAddMedForMap, setShowAddMedForMap] = useState(false);
  const [showManual, setShowManual] = useState(!!initialData);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [supplierList, setSupplierList] = useState(suppliers.map(s => s.name));
  const [importedFile, setImportedFile] = useState<AttachedFile | null>(null);
  const [showEmailFetch, setShowEmailFetch] = useState(false);
  const [wizardFile, setWizardFile] = useState<AttachedFile | null>(null);

  const [centralOpen, setCentralOpen] = useState(false);
  const [lineSearch, setLineSearch] = useState("");
  const centralCsvRef = useRef<HTMLInputElement>(null);
  const centralPdfRef = useRef<HTMLInputElement>(null);
  const centralImgRef = useRef<HTMLInputElement>(null);

  const pickCentral = (kind: ImportKind) => {
    const map = { csv: centralCsvRef, pdf: centralPdfRef, image: centralImgRef };
    map[kind].current?.click();
  };

  const changeCentral = (kind: ImportKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let headers: string[] = [];
    if (kind === "csv") {
      try {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        headers = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, "")).filter(Boolean);
      } catch { headers = []; }
    } else {
      headers = MOCK_OCR_HEADERS;
    }
    handleAttach({ kind, name: file.name, size: file.size, source: "upload", headers });
    e.target.value = "";
  };

  const handleAttach = (file: AttachedFile) => {
    // Skip the column-mapping wizard and go straight to medicine name mapping.
    // Inject the three representative lines so the mapping UI is immediately visible.
    setImportedFile(file);
    const rawLines = [
      { importedName: "Amoxicillin 500mg", batchNo: "AMX-2026-99", mfgDate: "2025-05-10", expDate: "2026-08-15", packSize: 10, qty: 50,  free: 5,  purchaseRate: 4.50,  mrp: 8.50,  disc: 10, gst: 12 },
      { importedName: "Dolo 650",          batchNo: "PCM-2025-A",  mfgDate: "2025-06-01", expDate: "2027-05-15", packSize: 15, qty: 200, free: 20, purchaseRate: 0.60,  mrp: 1.20,  disc: 15, gst: 5  },
      { importedName: "Atorva-Gold 20",    batchNo: "ATV-1204X",   mfgDate: "2025-04-01", expDate: "2027-01-10", packSize: 30, qty: 100, free: 0,  purchaseRate: 11.40, mrp: 23.40, disc: 5,  gst: 12 },
    ];
    setItems([
      newEmptyLine(nextId.current++),
      ...rawLines.map(raw => {
        const { status, systemName } = classifyImportedLine(raw.importedName);
        return {
          id: nextId.current++,
          importedName: raw.importedName,
          mappingStatus: status,
          suggestedName: status !== "matched" ? systemName : undefined,
          medicineName: status === "matched" ? systemName : (status === "fuzzy" ? systemName : ""),
          batchNo: raw.batchNo, mfgDate: raw.mfgDate, expDate: raw.expDate,
          packSize: raw.packSize, qty: raw.qty, free: raw.free,
          purchaseRate: raw.purchaseRate, mrp: raw.mrp, disc: raw.disc, gst: raw.gst,
        };
      }),
    ]);
  };
  const nextId = useRef(100);
  const [items, setItems] = useState<PurchaseLine[]>(() => {
    if (initialData && MOCK_INVOICE_LINES[initialData.id]) {
      return [newEmptyLine(nextId.current++), ...MOCK_INVOICE_LINES[initialData.id]];
    }
    return [newEmptyLine(nextId.current++)];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof PurchaseLine, value: number | string) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const hasEmpty = updated.some(i => !i.medicineName);
      if (!hasEmpty && field === "medicineName") {
        return [newEmptyLine(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      const hasEmpty = filtered.some(i => !i.medicineName);
      if (filtered.length === 0 || !hasEmpty) {
        return [newEmptyLine(nextId.current++), ...filtered];
      }
      return filtered;
    });
  };

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => viewMode ? onBack() : setShowBackConfirm(true)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Purchases</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {initialData ? (viewMode ? "View Invoice" : "Edit Invoice") : "New Purchase Invoice"}
          </span>
          {initialData && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {invoiceNo}</span>
          )}
          {initialData && viewMode && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {initialData && viewMode && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Purchase Invoice", docId: invoiceNo })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setViewMode(false)} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {initialData && !viewMode && (
            <>
              <button onClick={() => setViewMode(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!initialData && (
            <>
              {(() => {
                const hasUnresolved = items.some(i => i.mappingStatus === "fuzzy" || i.mappingStatus === "unmatched");
                const canPost = hasItems && !hasUnresolved;
                return (
                  <>
                    <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
                    <button disabled={!hasItems} onClick={() => setPrintJob({ jobType: "Purchase Invoice" })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Print</button>
                    <button
                      disabled={!canPost}
                      onClick={() => canPost && setSaved("posted")}
                      title={!hasItems ? "Add items first" : !canPost ? "Resolve all medicine mappings before posting" : undefined}
                      style={{ padding: "7px 20px", border: "none", background: canPost ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: canPost ? "pointer" : "not-allowed", color: canPost ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>
                      Post Invoice
                    </button>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>
              Save this invoice as a draft before going back?
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowBackConfirm(false)} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
                Cancel
              </button>
              <button onClick={() => { setSaved("draft"); setShowBackConfirm(false); }} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Save
              </button>
              <button onClick={onBack} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Distributor</div>
            <div style={{ display: "flex", gap: 6 }}>
              {viewMode ? (
                <div style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{supplier || "—"}</div>
              ) : (
              <DistributorSearch
                selected={supplier}
                onSelect={setSupplier}
                distributors={supplierList}
                onAdd={() => setShowAddSupplier(true)}
              />
              )}
              {supplier && !viewMode && (
                <button onClick={() => setShowDetails(true)}
                  style={{ padding: "8px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Details
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: "0 0 160px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice #</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{invoiceNo}</div>
            ) : (
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{formatDMY(invoiceDate)}</div>
            ) : (
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Due Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{formatDMY(dueDate)}</div>
            ) : (
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>PO Reference</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{poRef || "—"}</div>
            ) : (
              <input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="Optional"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Batch Allocation</div>
            <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden" }} title="Preferred dispense order for these batches when they later leave inventory">
              {(["FEFO", "LEFO"] as const).map(opt => (
                <button key={opt} onClick={() => !viewMode && setAlloc(opt)}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: viewMode ? "default" : "pointer", fontFamily: "Inter", background: alloc === opt ? "#1B6CA8" : "#fff", color: alloc === opt ? "#fff" : "#9CA3AF", letterSpacing: "0.04em" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
              <span style={{ padding: "3px 12px", background: "#E0F7FA", color: "#00838F", fontSize: 12, fontWeight: 700, borderRadius: 999, fontFamily: "Inter" }}>
                {items.filter(i => i.medicineName).length} items
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={lineSearch}
                  onChange={e => setLineSearch(e.target.value)}
                  placeholder="Search medicines..."
                  style={{ padding: "6px 10px 6px 32px", border: "1px solid #EDF0F5", fontSize: 12, outline: "none", fontFamily: "Inter", width: 200, boxSizing: "border-box" as const }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#EDF0F5")}
                />
              </div>
              <button onClick={() => setShowEmailFetch(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                <MailIcon />
                Fetch from Email
              </button>
            </div>
          </div>
          {importedFile && (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
                {importedFile.source === "email" ? <MailIcon /> : <UploadIcon />}
                <span>
                  <strong style={{ fontWeight: 700 }}>{importedFile.kind.toUpperCase()}</strong> attached {importedFile.source === "email" ? "from" : "via upload"}
                  {importedFile.source === "email" && importedFile.sender ? ` ${importedFile.sender} email` : ""}
                  {" · "}
                  <span style={{ fontFamily: "JetBrains Mono" }}>{importedFile.name}</span> ({Math.max(1, Math.round(importedFile.size / 1024))} KB) · parsing on Post
                </span>
              </div>
              <button onClick={() => setImportedFile(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#1B6CA8", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
          )}
          {items.filter(i => i.medicineName).length === 0 && !showManual && !importedFile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", border: "2px dashed #DDE3EC", background: "#FAFBFD", margin: "16px 20px", borderRadius: 8, flex: 1 }}>
              <ImportCards />
              <h3 style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", margin: "0 0 8px 0" }}>Import Distributor Invoice</h3>
              <p style={{ fontFamily: "Inter", fontSize: 12, color: "#6B7280", margin: "0 0 20px 0", textAlign: "center", maxWidth: 450, lineHeight: 1.5 }}>
                Quickly import your CSV, PDF, or image invoices from your distributor. Our system will map columns and parse line items into your table automatically.
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => setCentralOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "#1B6CA8", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Invoice File
                </button>
                <button onClick={() => setShowManual(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Items Manually
                </button>
              </div>
              
              {centralOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,44,0.3)" }} onClick={() => setCentralOpen(false)}>
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px", width: 280, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", borderRadius: 6 }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#0C1B33", margin: "0 0 12px 0" }}>Choose Invoice Type</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { kind: "csv" as const, label: "CSV File", desc: "Distributor CSV spreadsheet" },
                        { kind: "pdf" as const, label: "PDF Document", desc: "Digital or scanned PDF file" },
                        { kind: "image" as const, label: "Photo / Image", desc: "JPG or PNG image scan" }
                      ].map(o => (
                        <button key={o.kind} onClick={() => { setCentralOpen(false); pickCentral(o.kind); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "1px solid #EDF0F5", background: "#FAFBFD", cursor: "pointer", fontFamily: "Inter" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#F0F6FF"; e.currentTarget.style.borderColor = "#1B6CA8"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FAFBFD"; e.currentTarget.style.borderColor = "#EDF0F5"; }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{o.label}</div>
                          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              <input ref={centralCsvRef} type="file" accept=".csv,text/csv" hidden onChange={changeCentral("csv")} />
              <input ref={centralPdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={changeCentral("pdf")} />
              <input ref={centralImgRef} type="file" accept="image/*" hidden onChange={changeCentral("image")} />
            </div>
          ) : (
            <PurchaseLineItemsTable
              items={items}
              alloc={alloc}
              onChange={updateItem}
              onDelete={deleteItem}
              onMap={id => setMappingItemId(id)}
              onAccept={id => {
                const it = items.find(i => i.id === id);
                if (it?.medicineName) updateItem(id, "mappingStatus", "matched");
              }}
              lineSearch={lineSearch}
              onLineSearchChange={setLineSearch}
            />
          )}
        </div>
      </div>

      <div style={{ margin: "8px 20px 0", flexShrink: 0 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add notes, delivery instructions, or distributor remarks..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box" as const }} />
      </div>

      <div style={{ margin: "0 20px 0", flexShrink: 0 }}>
        <PurchaseInvoiceFooter items={items} paid={0} cashDiscount={cashDiscount} onCashDiscountChange={setCashDiscount} adjustment={adjustment} onAdjustmentChange={setAdjustment} />
      </div>

      {showAddSupplier && (
        <AddDistributorDrawer
          onClose={() => setShowAddSupplier(false)}
          onSaved={name => { setSupplierList(prev => [...prev, name]); setSupplier(name); }}
        />
      )}

      {showDetails && supplier && (
        <DistributorDrawer supplierName={supplier} onClose={() => setShowDetails(false)} />
      )}

      {showEmailFetch && (
        <EmailFetchModal onClose={() => setShowEmailFetch(false)} onImport={handleAttach} />
      )}

      {wizardFile && (
        <ImportWizard
          file={wizardFile}
          distributorKnown={!!supplier && suppliers.some(s => s.name === supplier)}
          onCancel={() => setWizardFile(null)}
          onConfirm={() => {
            setImportedFile(wizardFile);
            setWizardFile(null);
            // Simulate three representative import scenarios so all mapping states are visible immediately.
            const rawLines: Array<{ importedName: string; batchNo: string; mfgDate: string; expDate: string; packSize: number; qty: number; free: number; purchaseRate: number; mrp: number; disc: number; gst: number }> = [
              { importedName: "Amoxicillin 500mg", batchNo: "AMX-2026-99", mfgDate: "2025-05-10", expDate: "2026-08-15", packSize: 10, qty: 50,  free: 5,  purchaseRate: 4.50,  mrp: 8.50,  disc: 10, gst: 12 },
              { importedName: "Dolo 650",          batchNo: "PCM-2025-A",  mfgDate: "2025-06-01", expDate: "2027-05-15", packSize: 15, qty: 200, free: 20, purchaseRate: 0.60,  mrp: 1.20,  disc: 15, gst: 5  },
              { importedName: "Atorva-Gold 20",    batchNo: "ATV-1204X",   mfgDate: "2025-04-01", expDate: "2027-01-10", packSize: 30, qty: 100, free: 0,  purchaseRate: 11.40, mrp: 23.40, disc: 5,  gst: 12 },
            ];
            setItems([
              newEmptyLine(nextId.current++),
              ...rawLines.map(raw => {
                const { status, systemName } = classifyImportedLine(raw.importedName);
                return {
                  id: nextId.current++,
                  importedName: raw.importedName,
                  mappingStatus: status,
                  suggestedName: status !== "matched" ? systemName : undefined,
                  medicineName: status === "matched" ? systemName : (status === "fuzzy" ? systemName : ""),
                  batchNo: raw.batchNo, mfgDate: raw.mfgDate, expDate: raw.expDate,
                  packSize: raw.packSize, qty: raw.qty, free: raw.free,
                  purchaseRate: raw.purchaseRate, mrp: raw.mrp, disc: raw.disc, gst: raw.gst,
                };
              }),
            ]);
          }}
        />
      )}
      {mappingItemId !== null && !showAddMedForMap && (() => {
        const mapItem = items.find(i => i.id === mappingItemId);
        if (!mapItem) return null;
        return (
          <MedicineMapModal
            importedName={mapItem.importedName ?? mapItem.medicineName}
            onMap={systemName => {
              updateItem(mappingItemId, "medicineName", systemName);
              updateItem(mappingItemId, "mappingStatus", "matched");
              setMappingItemId(null);
            }}
            onCreateNew={() => setShowAddMedForMap(true)}
            onClose={() => setMappingItemId(null)}
          />
        );
      })()}

      {showAddMedForMap && mappingItemId !== null && (() => {
        const mapItem = items.find(i => i.id === mappingItemId);
        if (!mapItem) return null;
        return (
          <AddMedicineDrawer
            initialName={mapItem.importedName ?? mapItem.medicineName}
            onClose={() => setShowAddMedForMap(false)}
            onSaved={name => {
              updateItem(mappingItemId, "medicineName", name);
              updateItem(mappingItemId, "mappingStatus", "matched");
              setShowAddMedForMap(false);
              setMappingItemId(null);
            }}
          />
        );
      })()}

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Purchase Invoice {saved === "posted" ? "Posted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
              {invoiceNo} · {saved === "posted" ? "Stock updated · Distributor ledger updated" : "Draft — not yet posted"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Purchases</GhostBtn>
              <PrimaryBtn onClick={() => setPrintJob({ jobType: "Purchase Invoice", docId: invoiceNo })}>Print Invoice</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS: { id: SubTab; label: string; sub: string }[] = [
  { id: "invoices", label: "Purchase Invoice", sub: "Bills from distributors" },
  { id: "returns", label: "Purchase Return", sub: "Credit notes" },
  { id: "payments", label: "Purchase Payment", sub: "Distributor settlements" },
];

export default function Purchases() {
  const [tab, setTab] = useState<SubTab>("invoices");
  const [view, setView] = useState<View>("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  if (view === "new-invoice") {
    return <NewPurchaseInvoice onBack={() => setView("list")} />;
  }

  if (view === "view-invoice" && selectedInvoiceId) {
    const inv = purchaseInvoices.find(i => i.id === selectedInvoiceId);
    return (
      <NewPurchaseInvoice
        onBack={() => { setView("list"); setSelectedInvoiceId(null); }}
        initialData={inv ? { id: inv.id, supplier: inv.supplier, poRef: inv.poRef, date: inv.date, due: inv.due, status: inv.status } : undefined}
        defaultViewMode={true}
      />
    );
  }

  if (view === "new-return") {
    return <NewPurchaseReturn onBack={() => setView("list")} />;
  }

  if (view === "view-return" && selectedReturnId) {
    const ret = purchaseReturns.find(r => r.id === selectedReturnId);
    return (
      <NewPurchaseReturn
        onBack={() => { setView("list"); setSelectedReturnId(null); }}
        initialData={ret ? { id: ret.id, supplier: ret.supplier, date: ret.date, invoiceRef: ret.invoiceRef, reason: ret.reason, status: ret.status, total: ret.total } : undefined}
        defaultViewMode={true}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Purchases</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Invoices from distributors · Returns · Payments</div>
      </div>

      <div style={{ display: "flex", background: "#fff", border: "1px solid #E8ECF4" }}>
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "14px 16px", border: "none",
              borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
              background: tab === t.id ? "#F0F6FF" : "transparent",
              borderRight: i < TABS.length - 1 ? "1px solid #EEF1F6" : undefined,
              cursor: "pointer", textAlign: "left",
            }}>
            <div style={{ fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#1B6CA8" : "#6B7280", fontFamily: "Inter" }}>{t.label}</div>
            <div style={{ fontSize: 11, color: tab === t.id ? "#5AA0D6" : "#C8CDD8", marginTop: 2, fontFamily: "Inter" }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {tab === "invoices" && <PurchaseInvoiceList onNew={() => setView("new-invoice")} onView={id => { setSelectedInvoiceId(id); setView("view-invoice"); }} />}
      {tab === "returns" && <PurchaseReturnList onNew={() => setView("new-return")} onView={id => { setSelectedReturnId(id); setView("view-return"); }} />}
      {tab === "payments" && <PurchasePaymentList onRecord={() => setShowRecordPayment(true)} />}

      {showRecordPayment && <RecordPaymentModal onClose={() => setShowRecordPayment(false)} />}
    </div>
  );
}
