import { useState, useEffect, useRef, useMemo } from "react";
import { patients } from "../data/mockData";
import AddPatientDrawer from "./AddPatientDrawer";
import { Pill } from "./shared/Pill";
import { Th } from "./shared/Th";
import { StatTile } from "./shared/StatTile";
import { usePagination, PaginationFooter } from "./shared/usePagination";
import { useTableSort } from "./shared/useTableSort";
import PrintDialog from "./shared/PrintDialog";
import type { PrintJobType } from "./shared/PrintDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Batch {
  id: string; qty: number; packs: number;
  mfgDate: string; expDate: string; mrp: number; saleRate: number;
  ptr: number; distributor: string;
}
interface LineItem {
  id: number; barcode: string; medicineName: string;
  batch: Batch | null; packs: number; qty: number; free: number;
  mrp: number; saleRate: number; disc: number; gst: number;
  restock?: boolean;
}

type Tab = "invoices" | "counter" | "returns" | "payments";
type View = "list" | "new-invoice" | "new-return" | "record-payment";
type Alloc = "FEFO" | "LEFO";
type PayMethod = "Cash" | "Card" | "Insurance" | "UPI" | "Bank Transfer";

const TODAY = "2026-08-15";
const RETURN_REASONS = ["Medication changed by doctor", "Wrong product dispensed", "Adverse reaction", "Quantity overfilled", "Near expiry", "Other"];
const RETURN_STATUSES = ["Pending", "Processed", "Failed", "On Hold"];
const PAY_METHODS: PayMethod[] = ["Cash", "Card", "Insurance", "UPI", "Bank Transfer"];

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MEDICINES = [
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

const DOCTORS = [
  { id: "DR-001", name: "Dr. Rajesh Sharma",  specialty: "General Physician", phone: "9876541001" },
  { id: "DR-002", name: "Dr. Priya Patel",    specialty: "Cardiologist",       phone: "9876541002" },
  { id: "DR-003", name: "Dr. Anil Kumar",     specialty: "Diabetologist",      phone: "9876541003" },
  { id: "DR-004", name: "Dr. Sunita Verma",   specialty: "Gynecologist",       phone: "9876541004" },
  { id: "DR-005", name: "Dr. Manoj Singh",    specialty: "Orthopedic",         phone: "9876541005" },
  { id: "DR-006", name: "Dr. Kavitha Nair",   specialty: "Pediatrician",       phone: "9876541006" },
  { id: "DR-007", name: "Dr. Vikram Reddy",   specialty: "Neurologist",        phone: "9876541007" },
];

const salesInvoices = [
  { id: "SINV-2025-0221", patient: "Margaret Thompson", patientId: "P-001", date: "2025-07-28", due: "2025-07-28", items: 2, subtotal: 18.65, tax: 1.63, total: 20.28, paid: 20.28, method: "Card", status: "Paid" },
  { id: "SINV-2025-0220", patient: "David Okafor", patientId: "P-004", date: "2025-07-27", due: "2025-08-26", items: 2, subtotal: 34.80, tax: 3.05, total: 37.85, paid: 0, method: "Insurance", status: "Unpaid" },
  { id: "SINV-2025-0219", patient: "Elena Vasquez", patientId: "P-005", date: "2025-07-27", due: "2025-07-27", items: 1, subtotal: 24.30, tax: 2.13, total: 26.43, paid: 26.43, method: "Card", status: "Paid" },
  { id: "SINV-2025-0218", patient: "James Whitfield", patientId: "P-006", date: "2025-07-26", due: "2025-08-25", items: 1, subtotal: 16.70, tax: 1.46, total: 18.16, paid: 9.08, method: "Insurance", status: "Partial" },
  { id: "SINV-2025-0217", patient: "Amara Nwosu", patientId: "P-003", date: "2025-07-25", due: "2025-07-25", items: 1, subtotal: 7.83, tax: 0.69, total: 8.52, paid: 8.52, method: "Cash", status: "Paid" },
  { id: "SINV-2025-0216", patient: "Walk-in Customer", patientId: "—", date: "2025-07-24", due: "2025-07-24", items: 3, subtotal: 11.76, tax: 1.03, total: 12.79, paid: 12.79, method: "Cash", status: "Paid" },
  { id: "SINV-2025-0215", patient: "Sofia Lindqvist", patientId: "P-007", date: "2025-07-23", due: "2025-07-23", items: 1, subtotal: 17.13, tax: 1.50, total: 18.63, paid: 18.63, method: "Card", status: "Paid" },
];

const patientInvoiceHistory: Record<string, typeof salesInvoices> = {
  "P-001": [salesInvoices[0], { ...salesInvoices[0], id: "SINV-2025-0210", date: "2025-07-15", total: 15.50, paid: 15.50, status: "Paid" }],
  "P-004": [salesInvoices[1], { ...salesInvoices[1], id: "SINV-2025-0205", date: "2025-07-10", total: 26.40, paid: 26.40, status: "Paid" }],
  "P-006": [salesInvoices[3]],
};

const patientPrevItems: Record<string, { name: string; qty: number; packs: number }[]> = {
  "SINV-2025-0221": [{ name: "Amoxicillin 500mg", qty: 21, packs: 3 }, { name: "Paracetamol 500mg", qty: 30, packs: 3 }],
  "SINV-2025-0220": [{ name: "Amlodipine 5mg", qty: 30, packs: 3 }, { name: "Atorvastatin 20mg", qty: 30, packs: 3 }],
  "SINV-2025-0219": [{ name: "Omeprazole 20mg", qty: 30, packs: 3 }],
  "SINV-2025-0218": [{ name: "Sertraline 50mg", qty: 30, packs: 3 }],
  "SINV-2025-0217": [{ name: "Ciprofloxacin 500mg", qty: 14, packs: 2 }],
  "SINV-2025-0216": [{ name: "Paracetamol 500mg", qty: 20, packs: 2 }, { name: "Amoxicillin 500mg", qty: 14, packs: 2 }, { name: "Salbutamol Inhaler", qty: 1, packs: 1 }],
  "SINV-2025-0215": [{ name: "Metformin 1000mg", qty: 30, packs: 3 }],
};

const salesReturns = [
  { id: "SRN-2025-0009", invoice: "SINV-2025-0210", patient: "Robert Kiefer", patientId: "P-009", date: "2025-07-20", reason: "Medication changed by doctor", items: 1, total: 19.20, status: "Posted", method: "Cash", settlementRef: "CASH-REF-0009" },
  { id: "SRN-2025-0008", invoice: "SINV-2025-0202", patient: "James Whitfield", patientId: "P-006", date: "2025-07-14", reason: "Quantity overfilled", items: 1, total: 8.80, status: "Posted", method: "Card", settlementRef: "VIS-****4421" },
  { id: "SRN-2025-0007", invoice: "SINV-2025-0198", patient: "Walk-in Customer", patientId: "—", date: "2025-07-10", reason: "Wrong product dispensed", items: 2, total: 14.40, status: "Draft", method: "Cash", settlementRef: "" },
];

const returnPrevItems: Record<string, { name: string; qty: number; packs: number; restock: boolean }[]> = {
  "SRN-2025-0009": [{ name: "Metformin 1000mg", qty: 10, packs: 1, restock: true }],
  "SRN-2025-0008": [{ name: "Amoxicillin 500mg", qty: 8, packs: 1, restock: false }],
  "SRN-2025-0007": [{ name: "Paracetamol 500mg", qty: 10, packs: 1, restock: true }, { name: "Omeprazole 20mg", qty: 5, packs: 1, restock: true }],
};

const salesPayments = [
  { id: "SPAY-2025-0084", patient: "Margaret Thompson", invoice: "SINV-2025-0221", date: "2025-07-28", method: "Card", ref: "VIS-****4421", amount: 20.28, status: "Cleared" },
  { id: "SPAY-2025-0083", patient: "Elena Vasquez", invoice: "SINV-2025-0219", date: "2025-07-27", method: "Card", ref: "VIS-****7732", amount: 26.43, status: "Cleared" },
  { id: "SPAY-2025-0082", patient: "James Whitfield", invoice: "SINV-2025-0218", date: "2025-07-26", method: "Insurance", ref: "INS-BlueCross-0421", amount: 9.08, status: "Cleared" },
  { id: "SPAY-2025-0081", patient: "Amara Nwosu", invoice: "SINV-2025-0217", date: "2025-07-25", method: "Cash", ref: "CASH", amount: 8.52, status: "Cleared" },
  { id: "SPAY-2025-0079", patient: "Sofia Lindqvist", invoice: "SINV-2025-0215", date: "2025-07-23", method: "Card", ref: "MAS-****1190", amount: 18.63, status: "Cleared" },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5875" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronDown({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function DateRangePicker({
  from, to, onChange, placeholder = "Date range",
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const label = from && to ? `${formatDMY(from)} – ${formatDMY(to)}`
    : from ? `From ${formatDMY(from)}`
    : to ? `Until ${formatDMY(to)}`
    : placeholder;

  const active = !!from || !!to;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff",
          fontSize: 13, fontFamily: "Inter", cursor: "pointer",
          color: active ? "#2B3A4F" : "#8A94A8", whiteSpace: "nowrap",
          minHeight: 40,
        }}>
        <CalendarIcon />
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ marginLeft: 6, display: "inline-flex" }}><ChevronDown /></span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #EDF0F5", zIndex: 200, boxShadow: "0 10px 32px rgba(15, 30, 60, 0.10)", padding: 16, minWidth: 340 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>From</div>
              <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>To</div>
              <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F3F8" }}>
            {[
              { label: "Last 7 days", from: "2026-08-08", to: "2026-08-15" },
              { label: "This month", from: "2026-08-01", to: "2026-08-31" },
              { label: "Last month", from: "2026-07-01", to: "2026-07-31" },
              { label: "This year", from: "2026-01-01", to: "2026-12-31" },
            ].map(preset => (
              <button key={preset.label} onClick={() => { onChange(preset.from, preset.to); setOpen(false); }}
                style={{ padding: "5px 12px", border: "1px solid #EDF0F5", background: "#F8FAFC", fontSize: 11, cursor: "pointer", color: "#4A5875", fontFamily: "Inter", fontWeight: 500 }}>
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={() => onChange("", "")}
              style={{ padding: "7px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
              Clear
            </button>
            <button onClick={() => setOpen(false)}
              style={{ padding: "7px 18px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      style={{
        width: 30, height: 16, borderRadius: 8, border: "none",
        background: checked ? "#1B6CA8" : "#DDE3EC",
        position: "relative", cursor: disabled ? "default" : "pointer", padding: 0,
        opacity: disabled ? 0.5 : 1, transition: "background 0.15s",
      }}>
      <span style={{
        position: "absolute", top: 2, left: checked ? 16 : 2,
        width: 12, height: 12, borderRadius: "50%", background: "#fff",
        transition: "left 0.15s",
      }} />
    </button>
  );
}

function calcAmount(item: LineItem) {
  const base = item.qty * item.saleRate;
  const disc = base * (item.disc / 100);
  const gst = (base - disc) * (item.gst / 100);
  return base - disc + gst;
}

function newEmptyRow(id: number): LineItem {
  return { id, barcode: "", medicineName: "", batch: null, packs: 1, qty: 1, free: 0, mrp: 0, saleRate: 0, disc: 0, gst: 5 };
}

// ─── Medicine search input with autocomplete ──────────────────────────────────

function pickBatch(batches: Batch[], alloc: Alloc): Batch | null {
  const stocked = batches.filter(b => b.qty > 0);
  const pool = stocked.length > 0 ? stocked : batches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) =>
    alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)
  )[0];
}

function MedicineSearchCell({
  value, onSelect, alloc = "FEFO", readOnly = false,
}: {
  value: string;
  onSelect: (med: typeof MEDICINES[0], batch: Batch) => void;
  alloc?: Alloc;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div style={{ padding: "5px 8px", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#1A2436", background: "#F8FAFC", border: "1px solid #E8ECF4", minWidth: 200, whiteSpace: "nowrap" }}>
        {value || "—"}
      </div>
    );
  }
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [batchMed, setBatchMed] = useState<typeof MEDICINES[0] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 0
    ? MEDICINES.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.barcode.includes(query))
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setBatchMed(null); } }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const scanCurrent = () => {
    const q = query.trim();
    if (!q) return;
    const exact = MEDICINES.find(m => m.barcode === q);
    if (exact) {
      const batch = pickBatch(exact.batches, alloc);
      if (batch) {
        onSelect(exact, batch);
        setQuery(""); setOpen(false); setBatchMed(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (results.length === 1) {
      const only = results[0];
      const batch = pickBatch(only.batches, alloc);
      if (batch) {
        onSelect(only, batch);
        setQuery(""); setOpen(false); setBatchMed(null);
        inputRef.current?.focus();
      }
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span onClick={() => inputRef.current?.focus()} style={{ fontSize: 14, color: "#C8CDD8", cursor: "pointer" }} title="Scan barcode — focus and scan, or type + Enter">⬛</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setBatchMed(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scanCurrent(); } }}
          placeholder="Search medicine, barcode..."
          style={{ flex: 1, padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", minWidth: 170 }}
        />
      </div>

      {open && !batchMed && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 280 }}>
          {results.map(m => (
            <button key={m.name} onClick={() => { setBatchMed(m); setQuery(m.name); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{m.barcode}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{m.batches.length} batch{m.batches.length !== 1 ? "es" : ""}</div>
            </button>
          ))}
        </div>
      )}

      {batchMed && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 680 }}>
          <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Select Batch — {batchMed.name}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Batch #", "Qty", "Packs", "Exp Date", "MRP", "PTR", "Margin", "Distributor"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F4F6FA", textAlign: "left", background: "#FAFBFD", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...batchMed.batches].sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)).map(b => {
                const nearExpiry = new Date(b.expDate) < new Date("2025-12-31");
                const margin = ((b.saleRate - b.ptr) / b.saleRate * 100);
                return (
                  <tr key={b.id} onClick={() => { onSelect(batchMed, b); setOpen(false); setBatchMed(null); }}
                    style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA", background: nearExpiry ? "#FFFBEB" : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = nearExpiry ? "#FFFBEB" : "transparent")}>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: b.qty < 20 ? "#C62828" : "#1A2436" }}>{b.qty}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.packs}</td>
                    <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: nearExpiry ? "#E65100" : "#6B7280", fontWeight: nearExpiry ? 600 : 400 }}>{b.expDate}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.mrp.toFixed(2)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.ptr.toFixed(2)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: margin >= 15 ? "#2E7D32" : "#E65100" }}>{margin.toFixed(1)}%</td>
                    <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "Inter", color: "#6B7280", whiteSpace: "nowrap" }}>{b.distributor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Patient search autocomplete ──────────────────────────────────────────────

function PatientSearch({
  onSelect,
}: {
  onSelect: (p: typeof patients[0] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof patients[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = query.length > 0
    ? patients.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase()) || p.phone.includes(query))
    : patients.slice(0, 5);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const choose = (p: typeof patients[0]) => {
    setSelected(p); setQuery(p.name); setOpen(false); onSelect(p);
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search patient or customer..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 340 }}>
          {results.map(p => {
            const outstanding = p.balance;
            return (
              <button key={p.id} onClick={() => choose(p)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                      <span style={{ fontFamily: "JetBrains Mono" }}>{p.id}</span>
                      {" · "}{p.phone}
                    </div>
                  </div>
                  {outstanding > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#C62828", background: "#FFEBEE", padding: "2px 8px" }}>
                      Due ₹{outstanding.toFixed(2)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => { setOpen(false); setDrawerOpen(true); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Patient
          </button>
        </div>
      )}

      <AddPatientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

// ─── Doctor search autocomplete ───────────────────────────────────────────────

function DoctorSearch({
  onSelect,
  readOnly = false,
  displayValue = "",
}: {
  onSelect: (d: typeof DOCTORS[0] | null) => void;
  readOnly?: boolean;
  displayValue?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof DOCTORS[0] | null>(null);
  const [extras, setExtras] = useState<typeof DOCTORS>([]);
  const ref = useRef<HTMLDivElement>(null);

  const allDocs = [...DOCTORS, ...extras];
  const results = query.length > 0
    ? allDocs.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.specialty.toLowerCase().includes(query.toLowerCase()))
    : allDocs.slice(0, 6);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const choose = (d: typeof DOCTORS[0]) => {
    setSelected(d); setQuery(d.name); setOpen(false); onSelect(d);
  };

  if (readOnly) {
    return (
      <div style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
        {displayValue || "—"}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search doctor..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 300 }}>
          {results.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}>
              No doctor found{query ? ` for "${query}"` : ""}
            </div>
          )}
          {results.map(d => (
            <button key={d.id} onClick={() => choose(d)}
              style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                <span>{d.specialty}</span>
                <span style={{ fontFamily: "JetBrains Mono", marginLeft: 8 }}>{d.phone}</span>
              </div>
            </button>
          ))}
          <button
            onClick={() => {
              if (!query.trim()) return;
              const newDoc = { id: `DR-NEW-${extras.length + 1}`, name: query.trim(), specialty: "—", phone: "—" };
              setExtras(prev => [...prev, newDoc]);
              choose(newDoc);
            }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Doctor
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Invoice ref search autocomplete ──────────────────────────────────────────

function InvoiceRefSearch({
  value, options, onSelect, onClear,
}: {
  value: string;
  options: typeof salesInvoices;
  onSelect: (inv: typeof salesInvoices[0]) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length > 0
    ? options.filter(i => i.id.toLowerCase().includes(q) || i.patient.toLowerCase().includes(q))
    : options.slice(0, 6);

  const selected = !!value && query === value;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onClear(); }}
        onFocus={() => setOpen(true)}
        placeholder="Search invoice # or patient..."
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}

      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 320, maxHeight: 260, overflowY: "auto" }}>
          {results.map(i => (
            <button key={i.id} onClick={() => { onSelect(i); setQuery(i.id); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1B6CA8", fontFamily: "JetBrains Mono" }}>{i.id}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {i.patient} · <span style={{ fontFamily: "JetBrains Mono" }}>{i.date}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", whiteSpace: "nowrap" }}>₹{i.total.toFixed(2)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Patient Details Drawer ───────────────────────────────────────────────────

function PatientDrawer({
  patient, onClose, onAddItems,
}: {
  patient: typeof patients[0];
  onClose: () => void;
  onAddItems: (items: { name: string; qty: number; packs: number }[]) => void;
}) {
  const [expandedInv, setExpandedInv] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const history = patientInvoiceHistory[patient.id] ?? [];
  const prevItems = expandedInv ? (patientPrevItems[expandedInv] ?? []) : [];

  const handleToggleItem = (name: string) => setSelected(s => ({ ...s, [name]: !s[name] }));
  const handleSelectAll = () => {
    const allSelected = prevItems.every(i => selected[i.name]);
    const next: Record<string, boolean> = {};
    prevItems.forEach(i => { next[i.name] = !allSelected; });
    setSelected(next);
  };

  const handleAdd = () => {
    const items = prevItems.filter(i => selected[i.name]);
    if (items.length > 0) { onAddItems(items); onClose(); }
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.3)", zIndex: 299 }} />
      {/* Drawer */}
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 460, background: "#fff", borderLeft: "1px solid #E8ECF4", zIndex: 300, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8ECF4", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Patient Details</div>
            <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF", marginTop: 1 }}>{patient.id}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Patient info */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              {[
                { label: "Name", value: patient.name },
                { label: "Phone", value: patient.phone },
                { label: "Date of Birth", value: patient.dob },
                { label: "Blood Group", value: patient.bloodGroup },
                { label: "Last Visit", value: patient.lastVisit },
                { label: "Total Prescriptions", value: patient.prescriptions.toString() },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#1A2436", fontWeight: 500 }}>{r.value}</div>
                </div>
              ))}
            </div>

            {patient.allergies.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Allergies</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {patient.allergies.map(a => <span key={a} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#FFEBEE", color: "#C62828" }}>⚠ {a}</span>)}
                </div>
              </div>
            )}

            {patient.balance > 0 && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#C62828", fontWeight: 600 }}>Outstanding Balance</span>
                <span style={{ fontSize: 18, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>₹{patient.balance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Invoice history */}
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Invoice History</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>No invoice history</div>
            ) : (
              history.map(inv => {
                const isExpanded = expandedInv === inv.id;
                const items = patientPrevItems[inv.id] ?? [];
                const allSel = items.length > 0 && items.every(i => selected[i.name]);
                return (
                  <div key={inv.id} style={{ border: "1px solid #E8ECF4", marginBottom: 8 }}>
                    <button onClick={() => setExpandedInv(isExpanded ? null : inv.id)}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: isExpanded ? "#F0F6FF" : "#FAFBFD", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{inv.id}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{inv.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>₹{inv.total.toFixed(2)}</div>
                        {(inv.total - inv.paid) > 0 ? (
                          <div style={{ fontSize: 11, color: "#C62828", fontWeight: 600 }}>Due ₹{(inv.total - inv.paid).toFixed(2)}</div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#2E7D32" }}>Paid</div>
                        )}
                      </div>
                    </button>

                    {isExpanded && items.length > 0 && (
                      <div style={{ padding: "10px 14px", borderTop: "1px solid #E8ECF4" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Items</span>
                          <button onClick={handleSelectAll} style={{ fontSize: 11, color: "#1B6CA8", border: "none", background: "transparent", cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                            {allSel ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        {items.map(item => (
                          <label key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!selected[item.name]} onChange={() => handleToggleItem(item.name)}
                              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#1B6CA8" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#1A2436" }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Qty: {item.qty} · {item.packs} Packs</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer: Add to Invoice */}
        {Object.values(selected).some(Boolean) && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #E8ECF4", flexShrink: 0 }}>
            <button onClick={handleAdd} style={{ width: "100%", padding: "11px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter" }}>
              Add {Object.values(selected).filter(Boolean).length} Item{Object.values(selected).filter(Boolean).length !== 1 ? "s" : ""} to Sales Invoice
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Line Items Table (shared between New Invoice and Counter Sales) ──────────

function LineItemsTable({
  items, onChange, onDelete, showCheckbox, checked, onCheck, onCheckAll, alloc = "FEFO", readOnly = false, stickySearch = false,
}: {
  items: LineItem[];
  onChange: (id: number, field: keyof LineItem, value: any) => void;
  onDelete: (id: number) => void;
  showCheckbox?: boolean;
  checked?: Record<number, boolean>;
  onCheck?: (id: number) => void;
  onCheckAll?: () => void;
  alloc?: Alloc;
  readOnly?: boolean;
  stickySearch?: boolean;
}) {
  const allChecked = items.length > 0 && items.filter(i => i.medicineName).every(i => checked?.[i.id]);

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1100, width: "100%" }}>
        <thead>
          <tr>
            {showCheckbox && (
              <th style={{ padding: "9px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", position: "sticky", top: 0, zIndex: 2, width: 36 }}>
                <input type="checkbox" checked={!!allChecked} onChange={onCheckAll}
                  style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
              </th>
            )}
            <Th>Barcode</Th>
            <Th>Medicine Name</Th>
            <Th>Batch</Th>
            <Th>Packs</Th>
            <Th>Mfg Date</Th>
            <Th>Exp Date</Th>
            <Th>Qty</Th>
            <Th>Free</Th>
            <Th right>MRP</Th>
            <Th right>Sale Rate</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Amount</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA", background: showCheckbox && checked?.[item.id] ? "#F0F6FF" : (stickySearch && idx === 0 ? "#F8FAFC" : "transparent"), ...(stickySearch && idx === 0 ? { position: "sticky", top: 35, zIndex: 1 } : {}) }}>
              {showCheckbox && (
                <td style={{ padding: "6px 10px" }}>
                  {item.medicineName && (
                    <input type="checkbox" checked={!!checked?.[item.id]} onChange={() => onCheck?.(item.id)}
                      style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                  )}
                </td>
              )}
              {/* Barcode scanner */}
              <td style={{ padding: "4px 6px", width: 36 }}>
                {!readOnly && (
                  <button title="Scan" style={{ border: "1px solid #E8ECF4", background: "#FAFBFD", padding: "4px 6px", cursor: "pointer", fontSize: 13, color: "#9CA3AF" }}>⬛</button>
                )}
              </td>
              {/* Medicine search */}
              <td style={{ padding: "4px 6px", minWidth: 220 }}>
                <MedicineSearchCell
                  value={item.medicineName}
                  alloc={alloc}
                  readOnly={readOnly}
                  onSelect={(med, batch) => {
                    onChange(item.id, "medicineName", med.name);
                    onChange(item.id, "barcode", med.barcode);
                    onChange(item.id, "batch", batch);
                    onChange(item.id, "mrp", batch.mrp);
                    onChange(item.id, "saleRate", batch.saleRate);
                    onChange(item.id, "packs", batch.packs);
                  }}
                />
              </td>
              {/* Batch */}
              <td style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                  {item.batch?.id ?? "—"}
                </div>
              </td>
              {/* Packs */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Mfg Date */}
              <td style={{ padding: "4px 8px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                {item.batch?.mfgDate ?? "—"}
              </td>
              {/* Exp Date */}
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                  {item.batch?.expDate ?? "—"}
                </span>
              </td>
              {/* Qty */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Free */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.free || ""} disabled={readOnly} onChange={e => onChange(item.id, "free", parseFloat(e.target.value) || 0)}
                  style={{ width: 44, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* MRP */}
              <td style={{ padding: "4px 8px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#9CA3AF" }}>
                {item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "—"}
              </td>
              {/* Sale Rate */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.saleRate || ""} disabled={readOnly} onChange={e => onChange(item.id, "saleRate", parseFloat(e.target.value) || 0)}
                  style={{ width: 64, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Disc % */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.disc || ""} disabled={readOnly} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* GST % */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.gst || ""} disabled={readOnly} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Amount */}
              <td style={{ padding: "4px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                {item.medicineName ? `₹${calcAmount(item).toFixed(2)}` : "—"}
              </td>
              {/* Action */}
              <td style={{ padding: "4px 8px" }}>
                {item.medicineName && !readOnly && (
                  <button onClick={() => onDelete(item.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Return Items Table ───────────────────────────────────────────────────────

function ReturnItemsTable({
  items, onChange, onDelete, alloc = "FEFO", readOnly = false,
}: {
  items: LineItem[];
  onChange: (id: number, field: keyof LineItem, value: any) => void;
  onDelete: (id: number) => void;
  alloc?: Alloc;
  readOnly?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1200, width: "100%" }}>
        <thead>
          <tr>
            <Th>Medicine Name</Th>
            <Th>Batch No</Th>
            <Th>Exp Date</Th>
            <Th right>Pack</Th>
            <Th right>Return Qty</Th>
            <Th right>MRP</Th>
            <Th right>Sale Rate</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Refund Amt</Th>
            <Th center>Restock</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
              {/* Medicine search */}
              <td style={{ padding: "4px 6px", minWidth: 220 }}>
                <MedicineSearchCell
                  value={item.medicineName}
                  alloc={alloc}
                  readOnly={readOnly}
                  onSelect={(med, batch) => {
                    onChange(item.id, "medicineName", med.name);
                    onChange(item.id, "barcode", med.barcode);
                    onChange(item.id, "batch", batch);
                    onChange(item.id, "mrp", batch.mrp);
                    onChange(item.id, "saleRate", batch.saleRate);
                    onChange(item.id, "packs", batch.packs);
                  }}
                />
              </td>
              {/* Batch */}
              <td style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                  {item.batch?.id ?? "—"}
                </div>
              </td>
              {/* Exp Date */}
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                  {item.batch?.expDate ?? "—"}
                </span>
              </td>
              {/* Pack */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Return Qty */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={{ width: 60, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 600, color: readOnly ? "#6B7280" : "#C62828", background: readOnly ? "#F8FAFC" : "#fff" }} />
              </td>
              {/* MRP */}
              <td style={{ padding: "4px 8px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#9CA3AF" }}>
                {item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "—"}
              </td>
              {/* Sale Rate */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.saleRate || ""} disabled={readOnly} onChange={e => onChange(item.id, "saleRate", parseFloat(e.target.value) || 0)}
                  style={{ width: 64, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Disc % */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.disc || ""} disabled={readOnly} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* GST % */}
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.gst || ""} disabled={readOnly} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              {/* Refund Amt */}
              <td style={{ padding: "4px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#C62828", whiteSpace: "nowrap" }}>
                {item.medicineName ? `-₹${calcAmount(item).toFixed(2)}` : "—"}
              </td>
              {/* Restock */}
              <td style={{ padding: "4px 8px", textAlign: "center" }}>
                {item.medicineName && (
                  <ToggleSwitch
                    checked={item.restock ?? true}
                    disabled={readOnly}
                    onChange={v => onChange(item.id, "restock", v)}
                  />
                )}
              </td>
              {/* Action */}
              <td style={{ padding: "4px 8px" }}>
                {item.medicineName && !readOnly && (
                  <button onClick={() => onDelete(item.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Invoice Summary Footer ───────────────────────────────────────────────────

function InvoiceSummaryFooter({
  items,
  paid = 0,
  cashDiscount = 0,
  onCashDiscountChange,
  adjustment = 0,
  onAdjustmentChange,
}: {
  items: LineItem[];
  paid?: number;
  cashDiscount?: number;
  onCashDiscountChange?: (v: number) => void;
  adjustment?: number;
  onAdjustmentChange?: (v: number) => void;
}) {
  const subtotal = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate : 0), 0);
  const discount = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate * (i.disc / 100) : 0), 0);
  const tax = items.reduce((s, i) => s + (i.medicineName ? (i.qty * i.saleRate - i.qty * i.saleRate * (i.disc / 100)) * (i.gst / 100) : 0), 0);
  const roundOff = 0;
  const total = subtotal - discount - cashDiscount + tax + roundOff + adjustment;
  const balance = total - paid;

  const editableCashDisc = onCashDiscountChange !== undefined;
  const editableAdjust = onAdjustmentChange !== undefined;

  const readChips = [
    { label: "Subtotal", val: `₹${subtotal.toFixed(2)}`, muted: true },
    { label: "Item Discount", val: `-₹${discount.toFixed(2)}`, muted: true },
    { label: "GST / Tax", val: `₹${tax.toFixed(2)}`, muted: true },
    { label: "Round Off", val: `₹${roundOff.toFixed(2)}`, muted: true },
    { label: "Total", val: `₹${total.toFixed(2)}`, bold: true, highlight: true },
    { label: "Paid", val: `₹${paid.toFixed(2)}`, muted: true, color: "#2E7D32" },
    { label: "Balance", val: `₹${balance.toFixed(2)}`, bold: true, color: balance > 0 ? "#C62828" : "#2E7D32" },
  ];

  return (
    <div style={{
      flexShrink: 0,
      borderTop: "2px solid #E8ECF4",
      background: "#fff",
      display: "flex",
      alignItems: "stretch",
      minHeight: 76,
    }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
        <EditableChip
          label="Cash Discount"
          value={cashDiscount}
          onChange={onCashDiscountChange}
          editable={editableCashDisc}
          color="#6B7280"
          prefix="-"
        />
        <EditableChip
          label="Adjustment"
          value={adjustment}
          onChange={onAdjustmentChange}
          editable={editableAdjust}
          color={adjustment < 0 ? "#C62828" : "#6B7280"}
          allowNegative
        />
        {readChips.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              borderLeft: "1px solid #EEF1F6",
              flex: "1 1 0",
              minWidth: 110,
            }}
          >
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

function EditableChip({
  label, value, onChange, editable, color, prefix, allowNegative,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  editable: boolean;
  color: string;
  prefix?: string;
  allowNegative?: boolean;
}) {
  const displayVal = `${prefix ?? ""}₹${Math.abs(value).toFixed(2)}`;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      borderLeft: "1px solid #EEF1F6",
      background: editable ? "#FAFBFD" : undefined,
      flex: "0 0 auto",
      minWidth: 140,
    }}>
      <div>
        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>₹</span>
            <input
              type="number"
              step="0.01"
              value={value === 0 ? "" : value}
              placeholder="0.00"
              onChange={e => {
                const raw = e.target.value;
                if (raw === "" || raw === "-") { onChange?.(0); return; }
                const n = parseFloat(raw);
                if (!isNaN(n)) onChange?.(allowNegative ? n : Math.max(0, n));
              }}
              style={{
                width: 80,
                padding: "3px 6px",
                border: "1px solid #E8ECF4",
                fontSize: 13,
                fontFamily: "JetBrains Mono",
                fontWeight: 500,
                outline: "none",
                background: "#fff",
                color: "#1A2436",
              }}
            />
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color }}>
            {displayVal}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Invoice View (full-screen overlay) ───────────────────────────────────

function NewInvoice({
  onBack,
  preloadItems,
  invoice,
}: {
  onBack: () => void;
  preloadItems?: { name: string; qty: number; packs: number }[];
  invoice?: typeof salesInvoices[0];
}) {
  const isExisting = !!invoice;
  const seedItems = invoice ? (patientPrevItems[invoice.id] ?? []) : preloadItems;

  const [patient, setPatient] = useState<typeof patients[0] | null>(
    invoice ? (patients.find(p => p.id === invoice.patientId) ?? null) : null
  );
  const [doctor, setDoctor] = useState<typeof DOCTORS[0] | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [alloc, setAlloc] = useState<Alloc>("FEFO");
  const [payMethod, setPayMethod] = useState(invoice?.method ?? "Cash");
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [readOnly, setReadOnly] = useState(isExisting);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const nextId = useRef(1);

  const [items, setItems] = useState<LineItem[]>(() => {
    if (seedItems && seedItems.length > 0) {
      const rows = seedItems.map(item => {
        const med = MEDICINES.find(m => m.name === item.name);
        const batch = med?.batches[0] ?? null;
        const row = newEmptyRow(nextId.current++);
        return {
          ...row,
          medicineName: item.name,
          barcode: med?.barcode ?? "",
          qty: item.qty,
          packs: item.packs,
          batch,
          mrp: batch?.mrp ?? 0,
          saleRate: batch?.saleRate ?? 0,
        };
      });
      return [...rows, newEmptyRow(nextId.current++)];
    }
    return [newEmptyRow(nextId.current++)];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      // if last item now has a medicine, add new empty row
      const last = updated[updated.length - 1];
      if (last.medicineName && field === "medicineName") {
        return [...updated, newEmptyRow(nextId.current++)];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[filtered.length - 1].medicineName) {
        return [...filtered, newEmptyRow(nextId.current++)];
      }
      return filtered;
    });
  };

  const addScannedBarcode = (barcode: string) => {
    const med = MEDICINES.find(m => m.barcode === barcode);
    if (!med) return false;
    const batch = pickBatch(med.batches, alloc);
    if (!batch) return false;
    setItems(prev => {
      const filled = prev.filter(i => i.medicineName);
      const newRow: LineItem = {
        ...newEmptyRow(nextId.current++),
        medicineName: med.name,
        barcode: med.barcode,
        batch,
        mrp: batch.mrp,
        saleRate: batch.saleRate,
        packs: batch.packs,
      };
      return [...filled, newRow, newEmptyRow(nextId.current++)];
    });
    return true;
  };

  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const RAPID_MS = 50;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = performance.now();
      if (now - lastKey > RAPID_MS) buffer = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer.length >= 4) { addScannedBarcode(buffer); }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alloc]);

  const addFromDrawer = (incoming: { name: string; qty: number; packs: number }[]) => {
    setItems(prev => {
      const filled = prev.filter(i => i.medicineName);
      const newRows = incoming.map(item => {
        const med = MEDICINES.find(m => m.name === item.name);
        const batch = med?.batches[0] ?? null;
        const row = newEmptyRow(nextId.current++);
        return { ...row, medicineName: item.name, qty: item.qty, packs: item.packs, batch, mrp: batch?.mrp ?? 0, saleRate: batch?.saleRate ?? 0 };
      });
      return [...filled, ...newRows, newEmptyRow(nextId.current++)];
    });
  };

  const viewItems = useMemo(() => {
    const empty = items.filter(i => !i.medicineName);
    const filled = items.filter(i => i.medicineName);
    filled.sort((a, b) => {
      const ad = a.batch?.expDate ?? "";
      const bd = b.batch?.expDate ?? "";
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return alloc === "FEFO" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    if (readOnly) return filled;
    return [...empty, ...filled];
  }, [items, alloc, readOnly]);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Page header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={!isExisting ? () => setShowBackConfirm(true) : onBack} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Sales</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {isExisting ? (readOnly ? "View Invoice" : "Edit Invoice") : "New Invoice"}
          </span>
          {isExisting && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {invoice!.id}</span>
          )}
          {isExisting && readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExisting && readOnly && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Sales Invoice", docId: invoice?.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setReadOnly(false)}
                style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {isExisting && !readOnly && (
            <>
              <button onClick={() => setReadOnly(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!isExisting && (
            <>
              <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => setPrintJob({ jobType: "Sales Invoice" })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Print</button>
              <button disabled={!hasItems} onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: hasItems ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Post Invoice</button>
            </>
          )}
        </div>
      </div>

      {/* Back confirm modal */}
      {showBackConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>Save this invoice as a draft before going back?</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowBackConfirm(false)} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => { setSaved("draft"); setShowBackConfirm(false); }} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
              <button onClick={onBack} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details — one horizontal row */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "nowrap" }}>
          {/* Patient search */}
          <div style={{ flex: "0 0 280px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Patient / Customer</div>
            <div style={{ display: "flex", gap: 6 }}>
              {readOnly ? (
                <div style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
                  {patient ? patient.name : (invoice?.patient ?? "—")}
                </div>
              ) : (
                <PatientSearch onSelect={setPatient} />
              )}
              {patient && (
                <button onClick={() => setShowDrawer(true)}
                  style={{ padding: "8px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Details
                </button>
              )}
            </div>
          </div>

          {/* Doctor search */}
          <div style={{ flex: "0 0 220px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Doctor</div>
            {readOnly ? (
              <DoctorSearch readOnly displayValue={doctor?.name ?? ""} onSelect={() => {}} />
            ) : (
              <DoctorSearch onSelect={setDoctor} />
            )}
          </div>

          {/* Invoice Date */}
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice Date</div>
            <input type="date" defaultValue={invoice?.date ?? "2026-08-14"} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
          </div>

          {/* Payment Type */}
          <div style={{ flex: "0 0 130px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Payment Type</div>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
              {["Cash", "Card", "UPI", "Insurance", "Credit"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Due Date</div>
            <input type="date" defaultValue={invoice?.due ?? "2026-09-14"} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
          </div>

          {/* LEFO / FEFO toggle */}
          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Stock Allocation</div>
            <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", opacity: readOnly ? 0.6 : 1 }}>
              {(["FEFO", "LEFO"] as const).map(opt => (
                <button key={opt} onClick={() => !readOnly && setAlloc(opt)} disabled={readOnly}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: readOnly ? "default" : "pointer", fontFamily: "Inter", background: alloc === opt ? "#1B6CA8" : "#fff", color: alloc === opt ? "#fff" : "#9CA3AF", letterSpacing: "0.04em" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items — takes remaining space, scrolls internally */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                {readOnly ? "Read-only view — click Edit to modify" : "Search and add medicines to this invoice"}
              </span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>Allocation: {alloc}</span>
          </div>
          <LineItemsTable items={viewItems} onChange={updateItem} onDelete={deleteItem} alloc={alloc} readOnly={readOnly} />
        </div>
      </div>

      {/* Notes — above the footer */}
      <div style={{ margin: "8px 20px 0", flexShrink: 0 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={readOnly}
          placeholder={readOnly ? "" : "Add notes, special instructions or remarks..."}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436", boxSizing: "border-box" }} />
      </div>

      {/* Fixed summary footer — cash discount, adjustment, totals */}
      <div style={{ margin: "0 20px 0", flexShrink: 0 }}>
        <InvoiceSummaryFooter
          items={items}
          paid={invoice?.paid ?? 0}
          cashDiscount={cashDiscount}
          onCashDiscountChange={readOnly ? undefined : setCashDiscount}
          adjustment={adjustment}
          onAdjustmentChange={readOnly ? undefined : setAdjustment}
        />
      </div>

      {/* Patient drawer */}
      {showDrawer && patient && (
        <PatientDrawer patient={patient} onClose={() => setShowDrawer(false)} onAddItems={addFromDrawer} />
      )}

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Invoice {saved === "posted" ? "Posted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>SINV-2025-0222 · {saved === "posted" ? `Posted · ${payMethod}` : "Draft — not yet posted"}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onBack} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Back to Sales</button>
              <button onClick={() => setPrintJob({ jobType: "Sales Invoice", docId: "SINV-2025-0222" })} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── New Sales Return (full-screen overlay) ───────────────────────────────────

function NewSalesReturn({ onBack, returnRecord }: { onBack: () => void; returnRecord?: typeof salesReturns[0] }) {
  const isExisting = !!returnRecord;
  const [patient, setPatient] = useState<typeof patients[0] | null>(
    returnRecord ? (patients.find(p => p.id === returnRecord.patientId) ?? null) : null
  );
  const [showDrawer, setShowDrawer] = useState(false);
  const [returnDate, setReturnDate] = useState(returnRecord?.date ?? TODAY);
  const [origInvoiceId, setOrigInvoiceId] = useState<string>(returnRecord?.invoice ?? "");
  const [payMethod, setPayMethod] = useState(returnRecord?.method ?? "Cash");
  const [alloc, setAlloc] = useState<Alloc>("FEFO");
  const [returnReason, setReturnReason] = useState<string>(returnRecord?.reason ?? RETURN_REASONS[0]);
  const [note, setNote] = useState("");
  const [settlementRef, setSettlementRef] = useState(returnRecord?.settlementRef ?? "");
  const [settlementStatus, setSettlementStatus] = useState<string>(returnRecord?.status ?? RETURN_STATUSES[0]);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [readOnly, setReadOnly] = useState(isExisting);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const nextId = useRef(1);
  const [items, setItems] = useState<LineItem[]>(() => {
    if (returnRecord) {
      const seed = returnPrevItems[returnRecord.id] ?? [];
      const rows = seed.map(s => {
        const med = MEDICINES.find(m => m.name === s.name);
        const batch = med?.batches[0] ?? null;
        return {
          ...newEmptyRow(nextId.current++),
          medicineName: s.name,
          barcode: med?.barcode ?? "",
          packs: s.packs,
          qty: s.qty,
          batch,
          mrp: batch?.mrp ?? 0,
          saleRate: batch?.saleRate ?? 0,
          gst: 5,
          restock: s.restock,
        };
      });
      return [...rows, { ...newEmptyRow(nextId.current++), restock: true }];
    }
    return [{ ...newEmptyRow(nextId.current++), restock: true }];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  // Available invoices for the invoice picker (filtered by patient when known)
  const invoiceOptions = useMemo(() => {
    if (patient) {
      const hist = patientInvoiceHistory[patient.id] ?? salesInvoices.filter(i => i.patientId === patient.id);
      return hist;
    }
    return salesInvoices;
  }, [patient]);

  // When user selects an Original Invoice Ref, auto-populate items and patient.
  // Skip when viewing an existing return — its items are already seeded.
  useEffect(() => {
    if (isExisting) return;
    if (!origInvoiceId) return;
    const inv = salesInvoices.find(i => i.id === origInvoiceId);
    if (!inv) return;
    if (!patient) {
      const p = patients.find(pp => pp.id === inv.patientId);
      if (p) setPatient(p);
    }
    const seed = patientPrevItems[origInvoiceId] ?? [];
    if (seed.length === 0) return;
    const rows = seed.map(s => {
      const med = MEDICINES.find(m => m.name === s.name);
      const batch = med?.batches[0] ?? null;
      return {
        ...newEmptyRow(nextId.current++),
        medicineName: s.name,
        barcode: med?.barcode ?? "",
        packs: s.packs,
        qty: s.qty,
        batch,
        mrp: batch?.mrp ?? 0,
        saleRate: batch?.saleRate ?? 0,
        gst: 5,
        restock: true,
      };
    });
    setItems([...rows, { ...newEmptyRow(nextId.current++), restock: true }]);
  }, [origInvoiceId]);

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const last = updated[updated.length - 1];
      if (last.medicineName && field === "medicineName") {
        return [...updated, { ...newEmptyRow(nextId.current++), restock: true }];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[filtered.length - 1].medicineName) {
        return [...filtered, { ...newEmptyRow(nextId.current++), restock: true }];
      }
      return filtered;
    });
  };

  // Global barcode scan — same pattern as NewInvoice
  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const RAPID_MS = 50;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = performance.now();
      if (now - lastKey > RAPID_MS) buffer = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          const med = MEDICINES.find(m => m.barcode === buffer);
          const batch = med ? pickBatch(med.batches, alloc) : null;
          if (med && batch) {
            setItems(prev => {
              const filled = prev.filter(i => i.medicineName);
              return [...filled, {
                ...newEmptyRow(nextId.current++),
                medicineName: med.name, barcode: med.barcode, batch,
                mrp: batch.mrp, saleRate: batch.saleRate, packs: batch.packs,
                restock: true,
              }, { ...newEmptyRow(nextId.current++), restock: true }];
            });
          }
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alloc]);

  // Sort items — empty row on top, filled below by FEFO/LEFO
  const viewItems = useMemo(() => {
    const empty = items.filter(i => !i.medicineName);
    const filled = items.filter(i => i.medicineName);
    filled.sort((a, b) => {
      const ad = a.batch?.expDate ?? "";
      const bd = b.batch?.expDate ?? "";
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return alloc === "FEFO" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    if (readOnly) return filled;
    return [...empty, ...filled];
  }, [items, alloc, readOnly]);

  // Totals for footer & settlement
  const subtotal = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate : 0), 0);
  const discount = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate * (i.disc / 100) : 0), 0);
  const gstAdjustment = items.reduce((s, i) => s + (i.medicineName ? (i.qty * i.saleRate - i.qty * i.saleRate * (i.disc / 100)) * (i.gst / 100) : 0), 0);
  const refundAmount = subtotal - discount + gstAdjustment;

  // Return eligibility check — within 7 days of original invoice
  const eligibility = useMemo(() => {
    if (!origInvoiceId) return { label: "Select invoice", color: "#9CA3AF", bg: "#F5F5F5" };
    const inv = salesInvoices.find(i => i.id === origInvoiceId);
    if (!inv) return { label: "Unknown", color: "#9CA3AF", bg: "#F5F5F5" };
    const diff = (new Date(returnDate).getTime() - new Date(inv.date).getTime()) / 86400000;
    if (diff <= 7 && diff >= 0) return { label: `Eligible · ${Math.round(7 - diff)}d left`, color: "#2E7D32", bg: "#E8F5E9" };
    return { label: "Not eligible · > 7 days", color: "#C62828", bg: "#FFEBEE" };
  }, [origInvoiceId, returnDate]);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Page header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={!isExisting ? () => setShowBackConfirm(true) : onBack} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Sales</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {isExisting ? (readOnly ? "View Sales Return" : "Edit Sales Return") : "New Sales Return"}
          </span>
          {isExisting && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {returnRecord!.id}</span>
          )}
          {isExisting && readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExisting && readOnly && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Sales Return", docId: returnRecord?.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setReadOnly(false)}
                style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {isExisting && !readOnly && (
            <>
              <button onClick={() => setReadOnly(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!isExisting && (
            <>
              <button onClick={onBack} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => { setSaved("posted"); setPrintJob({ jobType: "Sales Return", docId: "SRN-2025-0010" }); }} style={{ padding: "7px 20px", border: "none", background: hasItems ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Save &amp; Print Return</button>
            </>
          )}
        </div>
      </div>

      {/* Back confirm modal */}
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

      {/* Details row */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Customer */}
          <div style={{ flex: "0 0 260px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Customer / Patient</div>
            <div style={{ display: "flex", gap: 6 }}>
              {readOnly ? (
                <div style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
                  {patient ? patient.name : (returnRecord?.patient ?? "—")}
                </div>
              ) : (
                <PatientSearch onSelect={setPatient} />
              )}
              {patient && (
                <button onClick={() => setShowDrawer(true)}
                  style={{ padding: "8px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Details
                </button>
              )}
            </div>
          </div>

          {/* Return Date */}
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Date</div>
            <input type="date" value={returnDate} disabled={readOnly} onChange={e => setReturnDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
          </div>

          {/* Original Invoice Ref */}
          <div style={{ flex: "0 0 240px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice Ref</div>
            {readOnly ? (
              <div style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#F8FAFC", color: "#1B6CA8", boxSizing: "border-box" }}>
                {origInvoiceId || "—"}
              </div>
            ) : (
              <InvoiceRefSearch
                value={origInvoiceId}
                options={invoiceOptions}
                onSelect={(inv) => setOrigInvoiceId(inv.id)}
                onClear={() => setOrigInvoiceId("")}
              />
            )}
          </div>

          {/* Return Payment Type */}
          <div style={{ flex: "0 0 150px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Payment Type</div>
            <select value={payMethod} disabled={readOnly} onChange={e => setPayMethod(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
              {["Cash", "Card", "UPI", "Insurance", "Credit Note"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Stock Allocation */}
          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Stock Allocation</div>
            <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", opacity: readOnly ? 0.6 : 1 }}>
              {(["FEFO", "LEFO"] as const).map(opt => (
                <button key={opt} onClick={() => !readOnly && setAlloc(opt)} disabled={readOnly}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: readOnly ? "default" : "pointer", fontFamily: "Inter", background: alloc === opt ? "#1B6CA8" : "#fff", color: alloc === opt ? "#fff" : "#9CA3AF", letterSpacing: "0.04em" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Return Eligible chip */}
          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Eligibility</div>
            <div style={{ padding: "8px 12px", background: eligibility.bg, border: `1px solid ${eligibility.color}33`, fontSize: 12, fontWeight: 700, color: eligibility.color, whiteSpace: "nowrap" }}>
              {eligibility.label}
            </div>
          </div>
        </div>
      </div>

      {/* Return Items */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0", minHeight: 0 }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 12 }}>
            <div>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Return Items</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                {origInvoiceId ? "Items pre-filled from original invoice — set Return Qty and Restock" : "Search or scan to add items"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Return Reason</label>
              <select value={returnReason} disabled={readOnly} onChange={e => setReturnReason(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", cursor: readOnly ? "default" : "pointer", minWidth: 220, color: readOnly ? "#6B7280" : "#1A2436" }}>
                {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <ReturnItemsTable items={viewItems} onChange={updateItem} onDelete={deleteItem} alloc={alloc} readOnly={readOnly} />
        </div>
      </div>

      {/* Return Note + Return Settlement cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "10px 20px 0", flexShrink: 0 }}>
        {/* Return Note */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Return Note</div>
          <div style={{ padding: "10px 14px" }}>
            <textarea value={note} disabled={readOnly} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={readOnly ? "" : "Notes, condition of returned items, additional remarks..."}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Return Settlement */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Return Settlement</div>
          <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Payment Reference No</div>
              <input value={settlementRef} disabled={readOnly} onChange={e => setSettlementRef(e.target.value)}
                placeholder={readOnly ? "" : "TXN / cheque / voucher #"}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Payment Type</div>
              <select value={payMethod} disabled={readOnly} onChange={e => setPayMethod(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
                {["Cash", "Card", "UPI", "Insurance", "Credit Note"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Refund Amount</div>
              <div style={{ padding: "7px 10px", border: "1px solid #E8ECF4", background: "#F8FAFC", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>
                -₹{refundAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
              <select value={settlementStatus} disabled={readOnly} onChange={e => setSettlementStatus(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
                {RETURN_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — Return Summary */}
      <div style={{ margin: "10px 20px 12px", flexShrink: 0, background: "#fff", borderTop: "2px solid #E8ECF4", display: "flex", minHeight: 68 }}>
        {[
          { label: "Return Subtotal", val: `₹${subtotal.toFixed(2)}`, color: "#6B7280" },
          { label: "GST Adjustment", val: `₹${gstAdjustment.toFixed(2)}`, color: "#6B7280" },
          { label: "Refund Amount", val: `-₹${refundAmount.toFixed(2)}`, color: "#C62828", bold: true, highlight: true },
        ].map(chip => (
          <div key={chip.label} style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{chip.label}</div>
              <div style={{
                fontFamily: "JetBrains Mono",
                fontSize: chip.bold ? 17 : 14,
                fontWeight: chip.bold ? 700 : 500,
                color: chip.color,
                background: chip.highlight ? "#FFEBEE" : undefined,
                padding: chip.highlight ? "3px 8px" : undefined,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>{chip.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient drawer */}
      {showDrawer && patient && (
        <PatientDrawer patient={patient} onClose={() => setShowDrawer(false)} onAddItems={() => {}} />
      )}

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Return {saved === "posted" ? "Saved & Printed" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>SRN-2025-0010 · Refund ₹{refundAmount.toFixed(2)}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onBack} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Back to Sales</button>
              <button onClick={() => setPrintJob({ jobType: "Sales Return", docId: "SRN-2025-0010" })} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Print Return</button>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── Record Payment (full-screen overlay) ─────────────────────────────────────

function formatDMYDash(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
}

function DateFieldButton({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const display = value ? formatDMYDash(value) : "Select date";
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E8ECF4", background: disabled ? "#F8FAFC" : "#fff", fontSize: 13, fontFamily: "Inter", cursor: disabled ? "default" : "pointer", color: disabled ? "#6B7280" : (value ? "#1A2436" : "#9CA3AF"), boxSizing: "border-box" }}
        onClick={() => { if (disabled) return; ref.current?.showPicker?.() || ref.current?.focus(); }}>
        <CalendarIcon />
        <span style={{ flex: 1 }}>{display}</span>
        <ChevronDown />
      </div>
      <input ref={ref} type="date" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

function MethodIcon({ method }: { method: PayMethod }) {
  const size = 14;
  const stroke = "currentColor";
  if (method === "Cash") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v.01" /><path d="M18 14v.01" />
    </svg>
  );
  if (method === "Card") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
  if (method === "Insurance") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L4 5 v6 c0 4 4 9 8 11 c4-2 8-7 8-11 V5 Z" /><path d="M9 12 l2 2 l4-4" />
    </svg>
  );
  if (method === "UPI") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4 L4 12 l4 8" /><path d="M14 4 L18 12 l-4 8" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21 h18" /><path d="M4 10 h16 M12 3 L3 8 h18 Z" /><path d="M5 10 v10 M9 10 v10 M15 10 v10 M19 10 v10" />
    </svg>
  );
}

function seedPaymentMethodFields(p?: typeof salesPayments[0]): Record<string, string> {
  if (!p) return {};
  const ref = p.ref;
  if (p.method === "Cash") return { cashRef: ref };
  if (p.method === "Card") {
    const m = ref.match(/^(\w+)-\*+(\d+)$/);
    if (m) {
      const typeMap: Record<string, string> = { VIS: "Visa", MAS: "Mastercard", AMX: "Amex", RUP: "RuPay", DIS: "Discover" };
      return { cardType: typeMap[m[1]] ?? "Visa", cardLast4: m[2], cardTxn: ref };
    }
    return { cardTxn: ref };
  }
  if (p.method === "Insurance") {
    const m = ref.match(/^INS-([^-]+)-(.+)$/);
    if (m) return { insProvider: m[1], insClaim: m[2] };
    return { insClaim: ref };
  }
  if (p.method === "UPI") return { upiTxn: ref };
  return { bankRef: ref };
}

const VALID_PAY_METHODS: PayMethod[] = ["Cash", "Card", "Insurance", "UPI", "Bank Transfer"];

function RecordPayment({ onBack, payment }: { onBack: () => void; payment?: typeof salesPayments[0] }) {
  const isExisting = !!payment;
  const initFields = seedPaymentMethodFields(payment);
  const seededMethod: PayMethod = payment && VALID_PAY_METHODS.includes(payment.method as PayMethod)
    ? (payment.method as PayMethod) : "Cash";

  const [readOnly, setReadOnly] = useState(isExisting);
  const [patient, setPatient] = useState<typeof patients[0] | null>(() => {
    if (!payment) return null;
    const inv = salesInvoices.find(i => i.id === payment.invoice);
    if (inv) return patients.find(p => p.id === inv.patientId) ?? null;
    return patients.find(p => p.name === payment.patient) ?? null;
  });
  const [paymentDate, setPaymentDate] = useState(payment?.date ?? TODAY);
  const [invSearch, setInvSearch] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>(
    payment ? { [payment.invoice]: true } : {}
  );
  const [manualAlloc, setManualAlloc] = useState<Record<string, number>>(
    payment ? { [payment.invoice]: payment.amount } : {}
  );
  const [allocMode, setAllocMode] = useState<"fifo" | "manual">(payment ? "manual" : "fifo");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>(seededMethod);
  const [payAmount, setPayAmount] = useState<number>(payment?.amount ?? 0);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [sendReceipt, setSendReceipt] = useState(true);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  // Method-specific fields
  const [cashRef, setCashRef] = useState(initFields.cashRef ?? "");
  const [cardType, setCardType] = useState(initFields.cardType ?? "Visa");
  const [cardLast4, setCardLast4] = useState(initFields.cardLast4 ?? "");
  const [cardAuth, setCardAuth] = useState("");
  const [cardTxn, setCardTxn] = useState(initFields.cardTxn ?? "");
  const [insProvider, setInsProvider] = useState(initFields.insProvider ?? "");
  const [insPolicy, setInsPolicy] = useState("");
  const [insClaim, setInsClaim] = useState(initFields.insClaim ?? "");
  const [upiId, setUpiId] = useState("");
  const [upiTxn, setUpiTxn] = useState(initFields.upiTxn ?? "");
  const [bankName, setBankName] = useState("");
  const [bankInstrument, setBankInstrument] = useState("IMPS");
  const [bankRef, setBankRef] = useState(initFields.bankRef ?? "");

  // Outstanding invoices (optionally filtered by patient).
  // When viewing/editing an existing payment, always include its linked invoice
  // even if fully paid — otherwise the row disappears from the allocation table.
  const outstandingInvoices = useMemo(() => {
    const list = salesInvoices.filter(i => i.total - i.paid > 0.001)
      .filter(i => !patient || i.patientId === patient.id);
    if (payment) {
      const linked = salesInvoices.find(i => i.id === payment.invoice);
      if (linked && !list.some(i => i.id === linked.id)) list.unshift(linked);
    }
    return list;
  }, [patient, payment]);

  const filteredInvoices = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    if (!q) return outstandingInvoices;
    return outstandingInvoices.filter(i => i.id.toLowerCase().includes(q) || i.patient.toLowerCase().includes(q));
  }, [outstandingInvoices, invSearch]);

  const selectAllOutstanding = () => {
    const next: Record<string, boolean> = {};
    filteredInvoices.forEach(i => { next[i.id] = true; });
    setChecked(next);
  };

  const toggleAll = () => {
    const allOn = filteredInvoices.every(i => checked[i.id]);
    const next: Record<string, boolean> = {};
    if (!allOn) filteredInvoices.forEach(i => { next[i.id] = true; });
    setChecked(next);
  };

  const outstandingFor = (id: string) => {
    const inv = salesInvoices.find(i => i.id === id);
    return inv ? inv.total - inv.paid : 0;
  };

  // Effective allocation per invoice — FIFO or manual
  const allocations = useMemo(() => {
    const result: Record<string, number> = {};
    const selectedIds = outstandingInvoices.filter(i => checked[i.id]).map(i => i.id);
    if (allocMode === "fifo") {
      // Sort by date ASC (oldest first)
      const ordered = [...selectedIds].sort((a, b) => {
        const da = salesInvoices.find(i => i.id === a)?.date ?? "";
        const db = salesInvoices.find(i => i.id === b)?.date ?? "";
        return da.localeCompare(db);
      });
      let remaining = payAmount;
      for (const id of ordered) {
        const out = outstandingFor(id);
        const take = Math.max(0, Math.min(remaining, out));
        result[id] = take;
        remaining -= take;
      }
    } else {
      selectedIds.forEach(id => { result[id] = manualAlloc[id] ?? 0; });
    }
    return result;
  }, [outstandingInvoices, checked, allocMode, payAmount, manualAlloc]);

  const selectedIds = outstandingInvoices.filter(i => checked[i.id]).map(i => i.id);
  const selectedOutstanding = selectedIds.reduce((s, id) => s + outstandingFor(id), 0);
  const allocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remainingUnallocated = Math.max(0, payAmount - allocated);
  const remainingCustomerBalance = Math.max(0, selectedOutstanding - allocated);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Page header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Sales</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {isExisting ? (readOnly ? "View Payment" : "Edit Payment") : "Record Payment"}
          </span>
          {isExisting && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {payment!.id}</span>
          )}
          {isExisting && readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExisting && readOnly && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Payment Receipt", docId: payment?.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print Receipt</button>
              <button onClick={() => setReadOnly(false)}
                style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {isExisting && !readOnly && (
            <>
              <button onClick={() => setReadOnly(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!isExisting && (
            <>
              <button onClick={onBack} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Save Draft</button>
              <button onClick={() => setPrintJob({ jobType: "Payment Receipt" })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Preview Receipt</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Payment</button>
            </>
          )}
        </div>
      </div>

      {/* Body — scrolls */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 20px" }}>

          {/* Patient + Date + Payment Amount row */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "10px 20px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Patient / Customer</div>
              {readOnly ? (
                <div style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
                  {patient ? patient.name : (payment?.patient ?? "—")}
                </div>
              ) : (
                <PatientSearch onSelect={setPatient} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Payment Date <span style={{ color: "#C62828" }}>*</span></div>
              <DateFieldButton value={paymentDate} onChange={setPaymentDate} disabled={readOnly} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Payment Amount (₹) <span style={{ color: "#C62828" }}>*</span></div>
              <input type="number" step="0.01" value={payAmount || ""} disabled={readOnly} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "left", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
            </div>
          </div>

          {/* Select Invoices for Payment */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Select Invoices for Payment</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selectedIds.length} invoices selected</span>
                <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", opacity: readOnly ? 0.6 : 1 }}>
                  <button onClick={() => !readOnly && setAllocMode("fifo")} disabled={readOnly}
                    style={{ padding: "6px 12px", border: "none", background: allocMode === "fifo" ? "#1B6CA8" : "#fff", color: allocMode === "fifo" ? "#fff" : "#9CA3AF", fontSize: 12, fontFamily: "Inter", fontWeight: 700, cursor: readOnly ? "default" : "pointer", letterSpacing: "0.04em" }}>
                    FIFO / Oldest First
                  </button>
                  <button onClick={() => !readOnly && setAllocMode("manual")} disabled={readOnly}
                    style={{ padding: "6px 12px", border: "none", background: allocMode === "manual" ? "#1B6CA8" : "#fff", color: allocMode === "manual" ? "#fff" : "#9CA3AF", fontSize: 12, fontFamily: "Inter", fontWeight: 700, cursor: readOnly ? "default" : "pointer", letterSpacing: "0.04em" }}>
                    Manual
                  </button>
                </div>
              </div>
            </div>

            {/* Search + Select All row */}
            {!readOnly && (
              <div style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
                <input type="text" placeholder="Search invoice number or patient..." value={invSearch} onChange={e => setInvSearch(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
                <button onClick={selectAllOutstanding}
                  style={{ padding: "7px 16px", border: "1px solid #1B6CA8", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Select All Outstanding
                </button>
              </div>
            )}

            {/* Invoice table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ padding: "9px 12px", width: 40, textAlign: "center", borderBottom: "1px solid #E8ECF4" }}>
                      <input type="checkbox" checked={filteredInvoices.length > 0 && filteredInvoices.every(i => checked[i.id])} onChange={toggleAll} disabled={readOnly}
                        style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: readOnly ? "default" : "pointer" }} />
                    </th>
                    {(["Invoice No.", "Invoice Date", "Total (₹)", "Paid (₹)", "Outstanding (₹)", "Allocate (₹)"] as const).map((h, i) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 || i === 1 ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const out = inv.total - inv.paid;
                    const isChecked = !!checked[inv.id];
                    const rowAlloc = allocations[inv.id] ?? 0;
                    return (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA", background: isChecked ? "#F7FAFF" : "#fff" }}>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <input type="checkbox" checked={isChecked} disabled={readOnly} onChange={() => setChecked(c => ({ ...c, [inv.id]: !c[inv.id] }))}
                            style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: readOnly ? "default" : "pointer" }} />
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{inv.id}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMYDash(inv.date)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{inv.total.toFixed(2)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>{inv.paid.toFixed(2)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{out.toFixed(2)}</td>
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          {isChecked ? (
                            <input type="number" step="0.01" min={0} max={out}
                              value={allocMode === "fifo" ? rowAlloc.toFixed(2) : (manualAlloc[inv.id] ?? 0)}
                              disabled={readOnly || allocMode === "fifo"}
                              onChange={e => setManualAlloc(m => ({ ...m, [inv.id]: parseFloat(e.target.value) || 0 }))}
                              style={{ width: 100, padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", background: (readOnly || allocMode === "fifo") ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                          ) : (
                            <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#C8CDD8" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px 12px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                        {patient ? "No outstanding invoices for this customer." : "No outstanding invoices."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4 stat tiles inside the card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: "1px solid #EEF1F6" }}>
              {[
                { label: "Selected Outstanding (₹)", value: selectedOutstanding.toFixed(2), color: "#1A2436" },
                { label: "Payment Amount (₹)", value: payAmount.toFixed(2), color: "#1A2436" },
                { label: "Allocated (₹)", value: allocated.toFixed(2), color: "#1A2436" },
                { label: "Remaining Unallocated (₹)", value: remainingUnallocated.toFixed(2), color: remainingUnallocated > 0 ? "#E65100" : "#1A2436" },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: "10px 16px", borderLeft: i === 0 ? "none" : "1px solid #EEF1F6", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes + Payment Method */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            {/* Notes */}
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Notes</div>
              <div style={{ padding: "10px 16px" }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} disabled={readOnly}
                  placeholder={readOnly ? "" : "Add any notes about this payment..."}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "vertical", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436", boxSizing: "border-box" }} />
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Attach Supporting Document (optional)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => !readOnly && fileInputRef.current?.click()} disabled={readOnly}
                      style={{ padding: "7px 14px", border: "1px solid #E8ECF4", background: readOnly ? "#F8FAFC" : "#fff", fontSize: 12, cursor: readOnly ? "default" : "pointer", color: readOnly ? "#9CA3AF" : "#1A2436", fontFamily: "Inter" }}>
                      Choose File
                    </button>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{fileName || "No file chosen"}</span>
                    <input ref={fileInputRef} type="file" onChange={e => setFileName(e.target.files?.[0]?.name ?? "")}
                      style={{ display: "none" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Payment Method</div>
              <div style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", marginBottom: 12, opacity: readOnly ? 0.7 : 1 }}>
                  {PAY_METHODS.map(m => (
                    <button key={m} onClick={() => !readOnly && setPayMethod(m)} disabled={readOnly}
                      style={{ flex: 1, padding: "7px 6px", border: "none", background: payMethod === m ? "#1B6CA8" : "#fff", color: payMethod === m ? "#fff" : "#9CA3AF", fontSize: 12, fontFamily: "Inter", fontWeight: 700, cursor: readOnly ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRight: m === "Bank Transfer" ? "none" : "1px solid #E8ECF4", letterSpacing: "0.04em" }}>
                      <MethodIcon method={m} />
                      {m}
                    </button>
                  ))}
                </div>

                {/* Method-specific fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {payMethod === "Cash" && (
                    <div style={{ gridColumn: "span 3" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Receipt / Voucher No.</div>
                      <input value={cashRef} disabled={readOnly} onChange={e => setCashRef(e.target.value)}
                        placeholder={readOnly ? "" : "e.g. CASH-VCH-001"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                  )}

                  {payMethod === "Card" && (<>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Card Type <span style={{ color: "#C62828" }}>*</span></div>
                      <select value={cardType} disabled={readOnly} onChange={e => setCardType(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", cursor: readOnly ? "default" : "pointer", boxSizing: "border-box", color: readOnly ? "#6B7280" : "#1A2436" }}>
                        {["Visa", "Mastercard", "Amex", "RuPay", "Discover"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Last 4 Digits <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={cardLast4} maxLength={4} disabled={readOnly} onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder={readOnly ? "" : "4421"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Authorization Code <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={cardAuth} disabled={readOnly} onChange={e => setCardAuth(e.target.value)}
                        placeholder={readOnly ? "" : "AUTH-000123"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Transaction Reference</div>
                      <input value={cardTxn} disabled={readOnly} onChange={e => setCardTxn(e.target.value)}
                        placeholder={readOnly ? "" : "TXN-000000000"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                  </>)}

                  {payMethod === "Insurance" && (<>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Insurance Provider <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={insProvider} disabled={readOnly} onChange={e => setInsProvider(e.target.value)}
                        placeholder={readOnly ? "" : "e.g. BlueCross"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Policy Number <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={insPolicy} disabled={readOnly} onChange={e => setInsPolicy(e.target.value)}
                        placeholder={readOnly ? "" : "POL-0000000"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Claim Reference <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={insClaim} disabled={readOnly} onChange={e => setInsClaim(e.target.value)}
                        placeholder={readOnly ? "" : "CLM-0000000"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                  </>)}

                  {payMethod === "UPI" && (<>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>UPI ID / VPA <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={upiId} disabled={readOnly} onChange={e => setUpiId(e.target.value)}
                        placeholder={readOnly ? "" : "name@bank"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Transaction ID (UTR) <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={upiTxn} disabled={readOnly} onChange={e => setUpiTxn(e.target.value)}
                        placeholder={readOnly ? "" : "UTR-000000000000"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                  </>)}

                  {payMethod === "Bank Transfer" && (<>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Bank Name <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={bankName} disabled={readOnly} onChange={e => setBankName(e.target.value)}
                        placeholder={readOnly ? "" : "e.g. HDFC Bank"}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Instrument <span style={{ color: "#C62828" }}>*</span></div>
                      <select value={bankInstrument} disabled={readOnly} onChange={e => setBankInstrument(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", cursor: readOnly ? "default" : "pointer", boxSizing: "border-box", color: readOnly ? "#6B7280" : "#1A2436" }}>
                        {["IMPS", "NEFT", "RTGS", "Cheque", "DD"].map(i => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Reference / Txn No. <span style={{ color: "#C62828" }}>*</span></div>
                      <input value={bankRef} disabled={readOnly} onChange={e => setBankRef(e.target.value)}
                        placeholder={readOnly ? "" : (bankInstrument === "Cheque" || bankInstrument === "DD" ? "Instrument No." : "Transaction ID")}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                    </div>
                  </>)}
                </div>

                {/* Receipt checkboxes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, paddingTop: 10, borderTop: "1px solid #EEF1F6" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: readOnly ? "#6B7280" : "#1A2436", cursor: readOnly ? "default" : "pointer", fontFamily: "Inter" }}>
                    <input type="checkbox" checked={printReceipt} disabled={readOnly} onChange={e => setPrintReceipt(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: readOnly ? "default" : "pointer" }} />
                    Print receipt after payment
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: readOnly ? "#6B7280" : "#1A2436", cursor: readOnly ? "default" : "pointer", fontFamily: "Inter" }}>
                    <input type="checkbox" checked={sendReceipt} disabled={readOnly} onChange={e => setSendReceipt(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: readOnly ? "default" : "pointer" }} />
                    Send receipt via SMS/Email
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Summary */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Allocation Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {[
                { label: "Invoices Selected", value: String(selectedIds.length), color: "#1A2436", mono: false },
                { label: "Total Outstanding (₹)", value: selectedOutstanding.toFixed(2), color: "#1A2436", mono: true },
                { label: "Amount Allocated (₹)", value: allocated.toFixed(2), color: "#2E7D32", mono: true },
                { label: "Remaining Customer Balance (₹)", value: remainingCustomerBalance.toFixed(2), color: remainingCustomerBalance > 0 ? "#E65100" : "#2E7D32", mono: true },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: "12px 16px", borderLeft: i === 0 ? "none" : "1px solid #EEF1F6", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontFamily: k.mono ? "JetBrains Mono" : "Outfit", fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Payment {saved === "posted" ? "Posted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>SPAY-2025-0085 · ₹{payAmount.toFixed(2)} · {payMethod}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onBack} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Back to Sales</button>
              <button onClick={() => setPrintJob({ jobType: "Payment Receipt", docId: "SPAY-2025-0085" })} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── Counter Sales ────────────────────────────────────────────────────────────

function CounterSales({
  onGenerate,
}: {
  onGenerate: (items: { name: string; qty: number; packs: number }[]) => void;
}) {
  const nextId = useRef(2);
  const [items, setItems] = useState<LineItem[]>([newEmptyRow(1)]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      // When the top search row (index 0) gets a medicine, prepend a fresh search row
      if (field === "medicineName" && value && updated[0]?.id === id) {
        return [newEmptyRow(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      // Always keep an empty search row at the top
      if (filtered.length === 0 || filtered[0].medicineName) {
        return [newEmptyRow(nextId.current++), ...filtered];
      }
      return filtered;
    });
  };

  const filledItems = items.filter(i => i.medicineName);
  const allChecked = filledItems.length > 0 && filledItems.every(i => checked[i.id]);
  const selectedCount = Object.values(checked).filter(Boolean).length;

  const handleCheckAll = () => {
    const next: Record<number, boolean> = {};
    filledItems.forEach(i => { next[i.id] = !allChecked; });
    setChecked(next);
  };

  const handleGenerate = () => {
    const selected = filledItems
      .filter(i => checked[i.id])
      .map(i => ({ name: i.medicineName, qty: i.qty, packs: i.packs }));
    if (selected.length === 0) return;
    onGenerate(selected);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Line Items */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
            <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>Scan or search medicines · Select rows · Generate Invoice</span>
          </div>
          <button
            disabled={selectedCount === 0}
            onClick={handleGenerate}
            style={{
              padding: "8px 20px", border: "none", fontSize: 13, fontWeight: 600, cursor: selectedCount > 0 ? "pointer" : "default",
              background: selectedCount > 0 ? "#1B6CA8" : "#E8ECF4",
              color: selectedCount > 0 ? "#fff" : "#9CA3AF", fontFamily: "Inter",
            }}>
            {selectedCount > 0 ? `Generate Invoice (${selectedCount})` : "Generate Invoice"}
          </button>
        </div>
        <LineItemsTable
          items={items} onChange={updateItem} onDelete={deleteItem}
          showCheckbox checked={checked}
          onCheck={id => setChecked(s => ({ ...s, [id]: !s[id] }))}
          onCheckAll={handleCheckAll}
          stickySearch
        />
      </div>

      {/* Notes — above the footer */}
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder="Add notes, special instructions or remarks..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box", marginTop: 8, flexShrink: 0 }} />

      {/* Summary footer */}
      <InvoiceSummaryFooter
        items={items.filter(i => checked[i.id] && i.medicineName)}
        paid={0}
        cashDiscount={cashDiscount}
        onCashDiscountChange={setCashDiscount}
        adjustment={adjustment}
        onAdjustmentChange={setAdjustment}
      />
    </div>
  );
}

// ─── Invoice List ─────────────────────────────────────────────────────────────

function InvoiceList({ onNew, onOpen }: { onNew: () => void; onOpen: (inv: typeof salesInvoices[0]) => void }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = salesInvoices.filter(i => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || i.id.toLowerCase().includes(q) || i.patient.toLowerCase().includes(q);
    const matchFrom = !fromDate || i.date >= fromDate;
    const matchTo = !toDate || i.date <= toDate;
    const matchMethod = methodFilter === "All" || i.method === methodFilter;
    const matchStatus = statusFilter === "All" || i.status === statusFilter;
    return matchSearch && matchFrom && matchTo && matchMethod && matchStatus;
  });
  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || methodFilter !== "All" || statusFilter !== "All";

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Sales Invoices</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input type="text" placeholder="Search invoice no, patient..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
          </div>
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div style={{ position: "relative" }}>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: methodFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Cash", "Card", "UPI", "Insurance", "Credit"].map(m => (
                <option key={m} value={m}>{m === "All" ? "All Payment Methods" : m}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: statusFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Paid", "Partial", "Unpaid", "Cancelled"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Invoice Status" : s}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          {anyFilter && (
            <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setMethodFilter("All"); setStatusFilter("All"); }}
              style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={onNew} style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>+ New Invoice</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Invoice #</Th>
                <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due</Th>
                <Th center onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("subtotal")} sortDir={sortCol === "subtotal" ? sortDir : null}>Subtotal</Th>
                <Th right onSort={() => handleSort("tax")} sortDir={sortCol === "tax" ? sortDir : null}>Tax</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th right onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
                <Th right>Balance</Th>
                <Th onSort={() => handleSort("method")} sortDir={sortCol === "method" ? sortDir : null}>Method</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(inv => {
                const balance = inv.total - inv.paid;
                return (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono" }}>
                      <button onClick={() => onOpen(inv)}
                        style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                        {inv.id}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436", whiteSpace: "nowrap" }}>{inv.patient}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.date}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.due}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" }}>{inv.items}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{inv.subtotal.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{inv.tax.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>₹{inv.total.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#2E7D32", textAlign: "right" }}>₹{inv.paid.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: balance > 0 ? 600 : 400, color: balance > 0 ? "#C62828" : "#9CA3AF", textAlign: "right" }}>
                      {balance > 0 ? `₹${balance.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#6B7280" }}>{inv.method}</td>
                    <td style={{ padding: "12px 14px" }}><Pill status={inv.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── Sales Returns ────────────────────────────────────────────────────────────

function SalesReturns({ onNew, onOpen }: { onNew: () => void; onOpen: (r: typeof salesReturns[0]) => void }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = salesReturns.filter(r => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || r.id.toLowerCase().includes(q)
      || r.invoice.toLowerCase().includes(q)
      || r.patient.toLowerCase().includes(q)
      || r.reason.toLowerCase().includes(q);
    const matchFrom = !fromDate || r.date >= fromDate;
    const matchTo = !toDate || r.date <= toDate;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchFrom && matchTo && matchStatus;
  });
  const { sortCol: sortColR, sortDir: sortDirR, handleSort: handleSortR, sorted: sortedR } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedR, 10);
  const anyFilter = search || fromDate || toDate || statusFilter !== "All";

  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Sales Return Notes</div>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input type="text" placeholder="Search return no, invoice no, patient..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
        </div>
        <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        <div style={{ position: "relative" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: statusFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
            {["All", "Posted", "Draft"].map(s => (
              <option key={s} value={s}>{s === "All" ? "All Return Status" : s}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
            <ChevronDown />
          </span>
        </div>
        {anyFilter && (
          <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setStatusFilter("All"); }}
            style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={onNew} style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>+ New Return</button>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th onSort={() => handleSortR("id")} sortDir={sortColR === "id" ? sortDirR : null}>Return #</Th>
            <Th onSort={() => handleSortR("invoice")} sortDir={sortColR === "invoice" ? sortDirR : null}>Invoice Ref</Th>
            <Th onSort={() => handleSortR("patient")} sortDir={sortColR === "patient" ? sortDirR : null}>Patient</Th>
            <Th onSort={() => handleSortR("date")} sortDir={sortColR === "date" ? sortDirR : null}>Date</Th>
            <Th onSort={() => handleSortR("reason")} sortDir={sortColR === "reason" ? sortDirR : null}>Reason</Th>
            <Th center onSort={() => handleSortR("items")} sortDir={sortColR === "items" ? sortDirR : null}>Items</Th>
            <Th right onSort={() => handleSortR("total")} sortDir={sortColR === "total" ? sortDirR : null}>Refund Amount</Th>
            <Th onSort={() => handleSortR("status")} sortDir={sortColR === "status" ? sortDirR : null}>Status</Th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(r => (
            <tr key={r.id} style={{ borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono" }}>
                <button onClick={() => onOpen(r)}
                  style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                  {r.id}
                </button>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.invoice}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.patient}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.date}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, color: "#6B7280" }}>{r.reason}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" }}>{r.items}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#C62828", textAlign: "right" }}>-₹{r.total.toFixed(2)}</td>
              <td style={{ padding: "12px 14px" }}><Pill status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationFooter {...footerProps} />
    </div>
  );
}

// ─── Sales Payments ───────────────────────────────────────────────────────────

function SalesPayments({ onNew, onOpen }: { onNew: () => void; onOpen: (p: typeof salesPayments[0]) => void }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = salesPayments.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || p.id.toLowerCase().includes(q)
      || p.patient.toLowerCase().includes(q)
      || p.invoice.toLowerCase().includes(q)
      || p.ref.toLowerCase().includes(q);
    const matchFrom = !fromDate || p.date >= fromDate;
    const matchTo = !toDate || p.date <= toDate;
    const matchMethod = methodFilter === "All" || p.method === methodFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchFrom && matchTo && matchMethod && matchStatus;
  });
  const { sortCol: sortColP, sortDir: sortDirP, handleSort: handleSortP, sorted: sortedP } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedP, 10);

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Payment Register</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input type="text" placeholder="Search receipt no, invoice no, customer..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
          </div>
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div style={{ position: "relative" }}>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: methodFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Cash", "Card", "UPI", "Insurance", "Credit Note"].map(m => (
                <option key={m} value={m}>{m === "All" ? "All Payment Methods" : m}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: statusFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Cleared", "Pending", "Failed", "On Hold"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Payment Status" : s}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          {(search || fromDate || toDate || methodFilter !== "All" || statusFilter !== "All") && (
            <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setMethodFilter("All"); setStatusFilter("All"); }}
              style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={onNew} style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>+ Record Payment</button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th onSort={() => handleSortP("id")} sortDir={sortColP === "id" ? sortDirP : null}>Payment #</Th>
              <Th onSort={() => handleSortP("patient")} sortDir={sortColP === "patient" ? sortDirP : null}>Patient</Th>
              <Th onSort={() => handleSortP("invoice")} sortDir={sortColP === "invoice" ? sortDirP : null}>Invoice</Th>
              <Th onSort={() => handleSortP("date")} sortDir={sortColP === "date" ? sortDirP : null}>Date</Th>
              <Th onSort={() => handleSortP("method")} sortDir={sortColP === "method" ? sortDirP : null}>Method</Th>
              <Th onSort={() => handleSortP("ref")} sortDir={sortColP === "ref" ? sortDirP : null}>Reference</Th>
              <Th right onSort={() => handleSortP("amount")} sortDir={sortColP === "amount" ? sortDirP : null}>Amount</Th>
              <Th onSort={() => handleSortP("status")} sortDir={sortColP === "status" ? sortDirP : null}>Status</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono" }}>
                  <button onClick={() => onOpen(p)}
                    style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                    {p.id}
                  </button>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.patient}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{p.invoice}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.date}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: "#6B7280" }}>{p.method}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.ref}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#2E7D32", textAlign: "right" }}>₹{p.amount.toFixed(2)}</td>
                <td style={{ padding: "12px 14px" }}><Pill status={p.status} /></td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "40px 14px", textAlign: "center", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>
                  No payments match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "invoices", label: "Sales Invoices", sub: "Customer billing" },
  { id: "counter", label: "Counter Sales", sub: "Walk-in checkout" },
  { id: "returns", label: "Sales Returns", sub: "Refunds & credits" },
  { id: "payments", label: "Sales Payments", sub: "Received payments" },
];

export default function Sales() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [view, setView] = useState<View>("list");
  const [preloadItems, setPreloadItems] = useState<{ name: string; qty: number; packs: number }[] | undefined>(undefined);
  const [openInvoice, setOpenInvoice] = useState<typeof salesInvoices[0] | null>(null);
  const [openReturn, setOpenReturn] = useState<typeof salesReturns[0] | null>(null);
  const [openPayment, setOpenPayment] = useState<typeof salesPayments[0] | null>(null);

  if (view === "new-invoice") {
    return (
      <NewInvoice
        preloadItems={preloadItems}
        invoice={openInvoice ?? undefined}
        onBack={() => { setView("list"); setPreloadItems(undefined); setOpenInvoice(null); }}
      />
    );
  }

  if (view === "new-return") {
    return (
      <NewSalesReturn
        returnRecord={openReturn ?? undefined}
        onBack={() => { setView("list"); setOpenReturn(null); }}
      />
    );
  }

  if (view === "record-payment") {
    return (
      <RecordPayment
        payment={openPayment ?? undefined}
        onBack={() => { setView("list"); setOpenPayment(null); }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexShrink: 0 }}>
        <h1 style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Sales</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "#fff", border: "1px solid #E8ECF4", flexShrink: 0 }}>
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

      {/* Counter Sales needs fixed-height layout */}
      {tab === "counter" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CounterSales onGenerate={(items) => { setPreloadItems(items); setView("new-invoice"); }} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          {tab === "invoices" && <InvoiceList onNew={() => setView("new-invoice")} onOpen={(inv) => { setOpenInvoice(inv); setView("new-invoice"); }} />}
          {tab === "returns" && <SalesReturns onNew={() => setView("new-return")} onOpen={(r) => { setOpenReturn(r); setView("new-return"); }} />}
          {tab === "payments" && <SalesPayments onNew={() => setView("record-payment")} onOpen={(p) => { setOpenPayment(p); setView("record-payment"); }} />}
        </div>
      )}
    </div>
  );
}
