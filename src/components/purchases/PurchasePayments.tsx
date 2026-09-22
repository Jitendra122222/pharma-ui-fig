import { useState, useMemo, useEffect } from "react";
import { formatDMY, money } from "./purchasesData";
import {
  Td, TableRow, FieldLabel, TextInput, DropdownSelect, PrimaryBtn, GhostBtn, Modal,
  FilterSearch, FilterDropdown, ClearFiltersButton, EmptyTableRow,
} from "./purchasesShared";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAY_TODAY = "2026-09-15";
const PAY_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];
const PAYMENT_TYPES = ["Invoice Payment", "Multiple Invoice Payment", "Advance Payment", "On Account"];
const ADJ_TYPES = ["Purchase Return", "Credit Note", "Expiry Claim", "Scheme Claim", "Rate Difference", "Settlement Discount", "Other"];
const HOLD_TYPES = ["Short Qty", "Rate Variance", "Expiry Issue", "Quality Issue", "Damaged", "Other"];
const REVERSAL_REASONS = ["Wrong Amount", "Wrong Distributor", "Wrong Invoice", "Duplicate Payment", "Payment Method Error", "Other"];
const BANK_NAMES = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Yes Bank"];
const DISTRIBUTOR_NAMES = ["MedLine Pharma", "GenPharm Ltd", "PharmaCo Inc", "BioPharm AG", "RespiCare Ltd"];

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentSubTab = "outstanding" | "history" | "advances" | "holds";

interface OutstandingInvoice {
  id: string;
  distributor: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  dueStatus: "Overdue" | "Due Today" | "Due Soon" | "Not Due" | "Payment Hold";
}

interface AllocationRow {
  invoiceId: string;
  dueDate: string;
  outstanding: number;
  allocate: number;
  status: "Overdue" | "Due Today" | "Due Soon" | "Not Due";
}

interface AdjustmentRow {
  type: string;
  reference: string;
  amount: number;
}

interface PaymentRecord {
  id: string;
  distributor: string;
  date: string;
  method: string;
  amount: number;
  invoiceCount: number;
  status: "Posted" | "Pending Approval" | "Reversed";
  reference: string;
  bank?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  allocation: { invoiceId: string; amount: number }[];
  adjustments: AdjustmentRow[];
  reversalReason?: string;
}

interface AdvanceRecord {
  id: string;
  distributor: string;
  paymentNo: string;
  date: string;
  original: number;
  applied: number;
  available: number;
  method: string;
  reference: string;
  remarks: string;
}

interface HoldRecord {
  id: string;
  invoiceId: string;
  distributor: string;
  holdType: string;
  amount: number;
  date: string;
  status: "Open" | "Review" | "Resolved";
  reason: string;
  invoiceAmount: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const OUTSTANDING: OutstandingInvoice[] = [
  { id: "PINV-2026-0072", distributor: "MedLine Pharma",  invoiceDate: "2026-08-15", dueDate: "2026-09-14", total: 45200, paid: 0,     balance: 45200, dueStatus: "Overdue" },
  { id: "PINV-2026-0071", distributor: "GenPharm Ltd",    invoiceDate: "2026-08-12", dueDate: "2026-09-11", total: 31400, paid: 0,     balance: 31400, dueStatus: "Overdue" },
  { id: "PINV-2026-0070", distributor: "PharmaCo Inc",    invoiceDate: "2026-08-20", dueDate: "2026-09-19", total: 28700, paid: 0,     balance: 28700, dueStatus: "Due Soon" },
  { id: "PINV-2026-0069", distributor: "GenPharm Ltd",    invoiceDate: "2026-08-22", dueDate: "2026-09-21", total: 12400, paid: 0,     balance: 12400, dueStatus: "Due Soon" },
  { id: "PINV-2026-0068", distributor: "BioPharm AG",     invoiceDate: "2026-08-25", dueDate: "2026-09-24", total: 18900, paid: 5000,  balance: 13900, dueStatus: "Not Due" },
  { id: "PINV-2026-0067", distributor: "RespiCare Ltd",   invoiceDate: "2026-07-28", dueDate: "2026-08-27", total: 9800,  paid: 0,     balance: 9800,  dueStatus: "Overdue" },
  { id: "PINV-2026-0066", distributor: "MedLine Pharma",  invoiceDate: "2026-07-15", dueDate: "2026-08-14", total: 22100, paid: 8500,  balance: 13600, dueStatus: "Overdue" },
  { id: "PINV-2026-0065", distributor: "GenPharm Ltd",    invoiceDate: "2026-08-18", dueDate: "2026-09-17", total: 15000, paid: 0,     balance: 15000, dueStatus: "Due Soon" },
  { id: "PINV-2026-0064", distributor: "PharmaCo Inc",    invoiceDate: "2026-08-28", dueDate: "2026-09-27", total: 33500, paid: 10000, balance: 23500, dueStatus: "Not Due" },
  { id: "PINV-2026-0063", distributor: "MedLine Pharma",  invoiceDate: "2026-08-20", dueDate: "2026-09-15", total: 8400,  paid: 0,     balance: 8400,  dueStatus: "Due Today" },
  { id: "PINV-2026-0062", distributor: "BioPharm AG",     invoiceDate: "2026-08-30", dueDate: "2026-09-29", total: 19800, paid: 0,     balance: 19800, dueStatus: "Not Due" },
  { id: "PINV-2026-0061", distributor: "RespiCare Ltd",   invoiceDate: "2026-08-10", dueDate: "2026-09-09", total: 6200,  paid: 0,     balance: 6200,  dueStatus: "Overdue" },
];

const HOLD_INVOICES = ["PINV-2026-0071", "PINV-2026-0067"];
const OUTSTANDING_WITH_HOLDS: OutstandingInvoice[] = OUTSTANDING.map(i =>
  HOLD_INVOICES.includes(i.id) ? { ...i, dueStatus: "Payment Hold" } : i
);

const PAYMENTS: PaymentRecord[] = [
  {
    id: "PAY-2026-0044", distributor: "GenPharm Ltd", date: "2026-09-15", method: "UPI",
    amount: 25000, invoiceCount: 3, status: "Posted", reference: "UPI-982345",
    createdBy: "Rahul", createdAt: "2026-09-15T10:42:00", postedAt: "2026-09-15T10:45:00",
    allocation: [{ invoiceId: "PINV-2026-0071", amount: 12500 }, { invoiceId: "PINV-2026-0069", amount: 6500 }, { invoiceId: "PINV-2026-0065", amount: 6000 }],
    adjustments: [{ type: "Purchase Return", reference: "PR-2026-0032", amount: 2000 }, { type: "Credit Note", reference: "CN-2026-0012", amount: 500 }],
  },
  {
    id: "PAY-2026-0043", distributor: "MedLine Pharma", date: "2026-09-14", method: "Cash",
    amount: 12000, invoiceCount: 1, status: "Posted", reference: "CASH-00043",
    createdBy: "Amit", createdAt: "2026-09-14T09:30:00", postedAt: "2026-09-14T09:35:00",
    allocation: [{ invoiceId: "PINV-2026-0066", amount: 12000 }],
    adjustments: [],
  },
  {
    id: "PAY-2026-0042", distributor: "PharmaCo Inc", date: "2026-09-12", method: "Cheque",
    amount: 40000, invoiceCount: 4, status: "Reversed", reference: "CHQ-004521",
    createdBy: "Rahul", createdAt: "2026-09-12T11:00:00", postedAt: "2026-09-12T11:10:00",
    allocation: [{ invoiceId: "PINV-2026-0064", amount: 23500 }, { invoiceId: "PINV-2026-0070", amount: 16500 }],
    adjustments: [], reversalReason: "Wrong Amount",
  },
  {
    id: "PAY-2026-0041", distributor: "BioPharm AG", date: "2026-09-10", method: "Bank Transfer",
    amount: 18500, invoiceCount: 2, status: "Posted", reference: "NEFT-20260910",
    bank: "HDFC Bank", createdBy: "Sonal", createdAt: "2026-09-10T14:20:00", postedAt: "2026-09-10T14:25:00",
    allocation: [{ invoiceId: "PINV-2026-0068", amount: 18500 }],
    adjustments: [{ type: "Expiry Claim", reference: "EXP-2026-0004", amount: 750 }],
  },
  {
    id: "PAY-2026-0040", distributor: "GenPharm Ltd", date: "2026-09-08", method: "UPI",
    amount: 30000, invoiceCount: 3, status: "Pending Approval", reference: "UPI-876543",
    createdBy: "Rahul", createdAt: "2026-09-08T16:00:00",
    allocation: [{ invoiceId: "PINV-2026-0071", amount: 12400 }, { invoiceId: "PINV-2026-0065", amount: 11600 }, { invoiceId: "PINV-2026-0069", amount: 6000 }],
    adjustments: [],
  },
  {
    id: "PAY-2026-0039", distributor: "RespiCare Ltd", date: "2026-09-05", method: "Bank Transfer",
    amount: 9800, invoiceCount: 1, status: "Posted", reference: "NEFT-20260905",
    bank: "SBI", createdBy: "Amit", createdAt: "2026-09-05T10:00:00", postedAt: "2026-09-05T10:05:00",
    allocation: [{ invoiceId: "PINV-2026-0067", amount: 9800 }],
    adjustments: [],
  },
  {
    id: "PAY-2026-0038", distributor: "MedLine Pharma", date: "2026-09-03", method: "Cheque",
    amount: 22000, invoiceCount: 2, status: "Posted", reference: "CHQ-004498",
    createdBy: "Sonal", createdAt: "2026-09-03T11:30:00", postedAt: "2026-09-03T11:35:00",
    allocation: [{ invoiceId: "PINV-2026-0072", amount: 22000 }],
    adjustments: [{ type: "Scheme Claim", reference: "SCH-2026-0010", amount: 1200 }],
  },
];

const ADVANCES: AdvanceRecord[] = [
  { id: "ADV-001", distributor: "GenPharm Ltd",   paymentNo: "PAY-2026-0040", date: "2026-09-10", original: 30000, applied: 18000, available: 12000, method: "UPI",          reference: "UPI-876543",    remarks: "Advance for upcoming purchases" },
  { id: "ADV-002", distributor: "MedLine Pharma", paymentNo: "PAY-2026-0038", date: "2026-09-05", original: 15000, applied: 2000,  available: 13000, method: "Bank Transfer", reference: "NEFT-20260905", remarks: "Advance payment September" },
];

const HOLDS: HoldRecord[] = [
  { id: "HOLD-001", invoiceId: "PINV-2026-0072", distributor: "MedLine Pharma", holdType: "Short Qty",    amount: 1250, date: "2026-09-15", status: "Open",   reason: "Physical verification found quantity variance of 5 strips of Paracetamol 500mg.", invoiceAmount: 45200 },
  { id: "HOLD-002", invoiceId: "PINV-2026-0071", distributor: "GenPharm Ltd",   holdType: "Rate Variance", amount: 800,  date: "2026-09-14", status: "Open",   reason: "Billed rate for Amoxicillin differs from agreed purchase rate by ₹2.50 per strip.", invoiceAmount: 31400 },
  { id: "HOLD-003", invoiceId: "PINV-2026-0067", distributor: "RespiCare Ltd",  holdType: "Expiry Issue",  amount: 1500, date: "2026-09-13", status: "Review", reason: "2 packs of Salbutamol Inhaler received with expiry within 3 months — below minimum threshold.", invoiceAmount: 9800 },
  { id: "HOLD-004", invoiceId: "PINV-2026-0064", distributor: "PharmaCo Inc",   holdType: "Quality Issue", amount: 600,  date: "2026-09-10", status: "Resolved", reason: "Damaged packaging on 10 strips. Replacement arranged by distributor.", invoiceAmount: 33500 },
];

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: "1px solid #E8ECF4", borderTop: `2px solid ${accent ?? "#1B6CA8"}`, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono", fontSize: 17, fontWeight: 700, color: accent ?? "#1A2436", marginTop: 5, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Status Dot / Chip ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { color: string; bg?: string }> = {
  "Overdue":       { color: "#C62828", bg: "#FFEBEE" },
  "Due Today":     { color: "#E65100", bg: "#FFF3E0" },
  "Due Soon":      { color: "#E65100", bg: "#FFF8E1" },
  "Not Due":       { color: "#2E7D32", bg: "#E8F5E9" },
  "Payment Hold":  { color: "#C62828", bg: "#FFEBEE" },
  "Open":          { color: "#C62828", bg: "#FFEBEE" },
  "Review":        { color: "#E65100", bg: "#FFF3E0" },
  "Resolved":      { color: "#2E7D32", bg: "#E8F5E9" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { color: "#6B7280", bg: "#F5F5F5" };
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 9px", background: s.bg, color: s.color, borderRadius: 3, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { color: "#9CA3AF" };
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: s.color, marginRight: 5, flexShrink: 0 }} />;
}

// ─── Info Box ─────────────────────────────────────────────────────────────────

function InfoBox({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "danger" | "success" }) {
  const styles = {
    info:    { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
    warning: { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
    danger:  { bg: "#FFEBEE", border: "#FFCDD2", color: "#C62828" },
    success: { bg: "#E8F5E9", border: "#A5D6A7", color: "#2E7D32" },
  }[type];
  return (
    <div style={{ background: styles.bg, border: `1px solid ${styles.border}`, padding: "10px 14px", fontSize: 12, color: styles.color, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

// ─── Payment Method Fields ────────────────────────────────────────────────────

function PaymentMethodFields({ method, chequeNo, setChequeNo, chequeDate, setChequeDate, bankName, setBankName, refUtr, setRefUtr }: {
  method: string;
  chequeNo: string; setChequeNo: (v: string) => void;
  chequeDate: string; setChequeDate: (v: string) => void;
  bankName: string; setBankName: (v: string) => void;
  refUtr: string; setRefUtr: (v: string) => void;
}) {
  if (method === "Cash") return null;
  if (method === "UPI") return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div><FieldLabel>Reference / UTR</FieldLabel><TextInput value={refUtr} onChange={e => setRefUtr(e.target.value)} placeholder="UPI transaction UTR" /></div>
    </div>
  );
  if (method === "Bank Transfer") return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div><FieldLabel>Bank Name</FieldLabel><DropdownSelect value={bankName} onChange={setBankName} options={BANK_NAMES} placeholder="— Select bank —" /></div>
      <div><FieldLabel>Reference / UTR</FieldLabel><TextInput value={refUtr} onChange={e => setRefUtr(e.target.value)} placeholder="NEFT/RTGS reference" /></div>
    </div>
  );
  if (method === "Cheque") return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <div><FieldLabel>Cheque Number</FieldLabel><TextInput value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="Cheque number" /></div>
      <div><FieldLabel>Cheque Date</FieldLabel><TextInput type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} /></div>
      <div><FieldLabel>Bank Name</FieldLabel><DropdownSelect value={bankName} onChange={setBankName} options={BANK_NAMES} placeholder="— Select bank —" /></div>
    </div>
  );
  if (method === "Card") return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div><FieldLabel>Reference No.</FieldLabel><TextInput value={refUtr} onChange={e => setRefUtr(e.target.value)} placeholder="Card transaction reference" /></div>
      <div><FieldLabel>Bank Name</FieldLabel><DropdownSelect value={bankName} onChange={setBankName} options={BANK_NAMES} placeholder="— Select bank —" /></div>
    </div>
  );
  return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div><FieldLabel>Reference / Description</FieldLabel><TextInput value={refUtr} onChange={e => setRefUtr(e.target.value)} placeholder="Payment reference" /></div>
    </div>
  );
}

// ─── Record Payment Modal (Multi-step) ────────────────────────────────────────

function RecordPaymentModal({ onClose, preselectedDistributor, onPost }: { onClose: () => void; preselectedDistributor?: string; onPost: (result: { type: "success" | "error"; message: string }) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [distributor, setDistributor] = useState(preselectedDistributor ?? "");
  const [paymentType, setPaymentType] = useState("Invoice Payment");
  const [payDate, setPayDate] = useState(PAY_TODAY);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [refUtr, setRefUtr] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [remarks, setRemarks] = useState("");

  // Step 2 fields
  const [allocMode, setAllocMode] = useState<"recommended" | "manual">("recommended");
  const distInvoices = useMemo(() =>
    OUTSTANDING_WITH_HOLDS.filter(i => i.distributor === distributor && i.dueStatus !== "Payment Hold"),
    [distributor]
  );
  const outstanding = useMemo(() => distInvoices.reduce((s, i) => s + i.balance, 0), [distInvoices]);
  const payAmt = parseFloat(amount) || 0;

  const initAllocation = useMemo((): AllocationRow[] => {
    let remaining = payAmt;
    return distInvoices
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map(inv => {
        const alloc = Math.min(inv.balance, remaining);
        remaining = Math.max(0, remaining - alloc);
        return { invoiceId: inv.id, dueDate: inv.dueDate, outstanding: inv.balance, allocate: alloc, status: inv.dueStatus as AllocationRow["status"] };
      });
  }, [distInvoices, payAmt]);

  const [allocation, setAllocation] = useState<AllocationRow[]>([]);
  const totalAllocated = allocation.reduce((s, r) => s + r.allocate, 0);
  const allocDiff = payAmt - totalAllocated;
  const overAllocated = totalAllocated > payAmt;

  // Step 3 fields
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([
    { type: "Purchase Return", reference: "", amount: 0 },
  ]);
  const totalAdj = adjustments.reduce((s, a) => s + (parseFloat(String(a.amount)) || 0), 0);
  const netPayable = outstanding - totalAdj;

  const dupCheck = PAYMENTS.find(p =>
    p.distributor === distributor &&
    p.amount === payAmt &&
    p.reference === refUtr &&
    p.status !== "Reversed"
  );
  const overPayment = payAmt > outstanding && outstanding > 0;

  const goToStep2 = () => { setAllocation(initAllocation); setStep(2); };
  const goToStep3 = () => setStep(3);
  const postPayment = () => {
    const success = Math.random() > 0.3;
    if (success) {
      onPost({ type: "success", message: `Payment of ${money(payAmt)} for ${distributor} posted successfully.` });
    } else {
      onPost({ type: "error", message: `Failed to post payment for ${distributor}. Please try again.` });
    }
    onClose();
  };

  const modalWidth = step === 1 ? 640 : 720;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: modalWidth, border: "1px solid #E8ECF4", maxHeight: "92vh", overflowY: "auto", transition: "width 0.15s" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>
              {step === 1 ? "Record Purchase Payment" : step === 2 ? "Payment Allocation" : "Payment Adjustments"}
            </div>
            {step > 1 && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Step {step} of 3</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "22px" }}>
          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <FieldLabel>Distributor</FieldLabel>
                  <DropdownSelect value={distributor} onChange={setDistributor} options={DISTRIBUTOR_NAMES} placeholder="— Select —" />
                </div>
                <div>
                  <FieldLabel>Payment Type</FieldLabel>
                  <DropdownSelect value={paymentType} onChange={setPaymentType} options={PAYMENT_TYPES} />
                </div>
                {distributor && (
                  <div>
                    <FieldLabel>Outstanding</FieldLabel>
                    <div style={{ padding: "9px 12px", border: "1px solid #E8ECF4", background: "#F8FAFC", fontSize: 13, fontFamily: "JetBrains Mono", color: outstanding > 0 ? "#C62828" : "#2E7D32", fontWeight: 600 }}>
                      {money(outstanding)}
                    </div>
                  </div>
                )}
                <div>
                  <FieldLabel>Payment Date</FieldLabel>
                  <TextInput type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Payment Method</FieldLabel>
                  <DropdownSelect value={method} onChange={setMethod} options={PAY_METHODS} />
                </div>
                <div>
                  <FieldLabel>Amount (₹)</FieldLabel>
                  <TextInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <PaymentMethodFields
                  method={method}
                  chequeNo={chequeNo} setChequeNo={setChequeNo}
                  chequeDate={chequeDate} setChequeDate={setChequeDate}
                  bankName={bankName} setBankName={setBankName}
                  refUtr={refUtr} setRefUtr={setRefUtr}
                />
                <div>
                  <FieldLabel>Remarks</FieldLabel>
                  <TextInput value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              {/* Duplicate warning */}
              {dupCheck && (
                <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "10px 14px", fontSize: 12, color: "#C62828" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Possible duplicate payment</div>
                  <div>Similar payment found: {dupCheck.id} · Amount: {money(dupCheck.amount)} · Ref: {dupCheck.reference}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button style={{ padding: "4px 12px", border: "1px solid #EF9A9A", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>View Existing</button>
                    <button style={{ padding: "4px 12px", border: "none", background: "#C62828", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Continue Anyway</button>
                  </div>
                </div>
              )}

              {/* Overpayment warning */}
              {overPayment && !dupCheck && (
                <div style={{ background: "#FFF3E0", border: "1px solid #FFE082", padding: "10px 14px", fontSize: 12, color: "#E65100" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment exceeds outstanding by {money(payAmt - outstanding)}</div>
                  <button style={{ marginTop: 4, padding: "4px 12px", border: "none", background: "#E65100", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                    Apply {money(outstanding)} + Keep {money(payAmt - outstanding)} as Advance
                  </button>
                </div>
              )}

              <InfoBox type="warning">
                Posting will update the invoice balance and distributor account ledger.
              </InfoBox>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                <PrimaryBtn onClick={goToStep2} disabled={!distributor || !amount || parseFloat(amount) <= 0}>
                  Continue →
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* STEP 2 — Allocation */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Payment Amount</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>{money(payAmt)}</div>
              </div>

              {/* Allocation mode */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Allocation Mode</div>
                <div style={{ display: "flex", gap: 20 }}>
                  {(["recommended", "manual"] as const).map(m => (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>
                      <input type="radio" checked={allocMode === m} onChange={() => setAllocMode(m)} style={{ accentColor: "#1B6CA8", cursor: "pointer" }} />
                      {m === "recommended" ? "Recommended Allocation" : "Manual Allocation"}
                    </label>
                  ))}
                </div>
                {allocMode === "recommended" && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Oldest overdue invoices paid first</div>
                )}
              </div>

              {/* Allocation table */}
              {allocation.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 13, border: "1px solid #E8ECF4" }}>
                  No outstanding invoices for this distributor.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {["Invoice", "Due Date", "Outstanding", "Allocate", "Status"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: h === "Outstanding" || h === "Allocate" ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allocation.map((row, idx) => (
                        <tr key={row.invoiceId} style={{ borderBottom: "1px solid #F4F6FA" }}>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{row.invoiceId}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(row.dueDate)}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{money(row.outstanding)}</td>
                          <td style={{ padding: "6px 12px", textAlign: "right" }}>
                            {allocMode === "manual" ? (
                              <input
                                type="number"
                                value={row.allocate}
                                onChange={e => {
                                  const v = Math.max(0, Math.min(row.outstanding, parseFloat(e.target.value) || 0));
                                  setAllocation(prev => prev.map((r, i) => i === idx ? { ...r, allocate: v } : r));
                                }}
                                style={{ width: 100, padding: "5px 8px", border: `1px solid ${overAllocated ? "#EF9A9A" : "#E8ECF4"}`, fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none" }}
                                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                                onBlur={e => (e.currentTarget.style.borderColor = overAllocated ? "#EF9A9A" : "#E8ECF4")}
                              />
                            ) : (
                              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{money(row.allocate)}</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}><StatusChip status={row.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Allocation summary */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 16px", fontSize: 13 }}>
                  <span style={{ color: "#6B7280" }}>Payment Amount</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{money(payAmt)}</span>
                  <span style={{ color: "#6B7280" }}>Allocated Amount</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: overAllocated ? "#C62828" : "#2E7D32", fontWeight: 700, textAlign: "right" }}>{money(totalAllocated)}{!overAllocated && totalAllocated === payAmt && " ✓"}</span>
                  <span style={{ color: allocDiff !== 0 ? "#E65100" : "#6B7280", fontWeight: allocDiff !== 0 ? 600 : 400 }}>Difference</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: allocDiff !== 0 ? "#E65100" : "#6B7280", textAlign: "right" }}>{money(Math.abs(allocDiff))}</span>
                </div>
                {overAllocated && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#C62828", fontWeight: 700 }}>
                    Allocated amount exceeds payment. Please reduce allocation.
                  </div>
                )}
                {allocDiff > 0 && !overAllocated && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#E65100" }}>{money(allocDiff)} remains unallocated.</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ padding: "4px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Allocate Remaining</button>
                      <button style={{ padding: "4px 10px", border: "none", background: "#E65100", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Keep as Advance</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
                <div style={{ display: "flex", gap: 10 }}>
                  <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                  <PrimaryBtn onClick={goToStep3} disabled={overAllocated || allocation.length === 0}>Continue →</PrimaryBtn>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Adjustments */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Adjustments table */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Adjustment Type", "Reference", "Amount (₹)", ""].map((h, i) => (
                      <th key={h + i} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: i === 2 ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F4F6FA" }}>
                      <td style={{ padding: "8px 12px" }}>
                        <DropdownSelect value={adj.type} onChange={v => setAdjustments(prev => prev.map((a, i) => i === idx ? { ...a, type: v } : a))} options={ADJ_TYPES} />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <TextInput value={adj.reference} onChange={e => setAdjustments(prev => prev.map((a, i) => i === idx ? { ...a, reference: e.target.value } : a))} placeholder="Reference number" />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <input
                          type="number"
                          value={adj.amount || ""}
                          onChange={e => setAdjustments(prev => prev.map((a, i) => i === idx ? { ...a, amount: parseFloat(e.target.value) || 0 } : a))}
                          placeholder="0.00"
                          style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", boxSizing: "border-box" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                          onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
                        />
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <button onClick={() => setAdjustments(prev => prev.filter((_, i) => i !== idx))}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setAdjustments(prev => [...prev, { type: "Purchase Return", reference: "", amount: 0 }])}
                style={{ alignSelf: "flex-start", padding: "6px 14px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                + Add Adjustment
              </button>

              {/* Net payable summary */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 16px", fontSize: 13 }}>
                  <span style={{ color: "#6B7280" }}>Invoice Outstanding</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{money(outstanding)}</span>
                  {adjustments.map((a, i) => a.amount > 0 && (
                    <>
                      <span key={`l${i}`} style={{ color: "#6B7280" }}>{a.type}</span>
                      <span key={`v${i}`} style={{ fontFamily: "JetBrains Mono", color: "#C62828", textAlign: "right" }}>-{money(a.amount)}</span>
                    </>
                  ))}
                  <div style={{ gridColumn: "span 2", height: 1, background: "#DDE3EC", margin: "4px 0" }} />
                  <span style={{ color: "#1A2436", fontWeight: 700 }}>Net Payable</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 700, textAlign: "right" }}>{money(netPayable)}</span>
                  <span style={{ color: "#6B7280" }}>Payment Amount</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: payAmt === netPayable ? "#2E7D32" : "#E65100", fontWeight: 600, textAlign: "right" }}>{money(payAmt)}{payAmt === netPayable ? " ✓" : ""}</span>
                </div>
              </div>

              <InfoBox type="warning">
                Posting will update the invoice balance and distributor account ledger.
              </InfoBox>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
                <div style={{ display: "flex", gap: 10 }}>
                  <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                  <PrimaryBtn onClick={postPayment}>Post Payment</PrimaryBtn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Record Advance Modal ─────────────────────────────────────────────────────

function RecordAdvanceModal({ onClose }: { onClose: () => void }) {
  const [distributor, setDistributor] = useState("");
  const [payDate, setPayDate] = useState(PAY_TODAY);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [refUtr, setRefUtr] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [remarks, setRemarks] = useState("");

  return (
    <Modal title="Record Advance" onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}>
            <FieldLabel>Distributor</FieldLabel>
            <DropdownSelect value={distributor} onChange={setDistributor} options={DISTRIBUTOR_NAMES} placeholder="— Select —" />
          </div>
          <div>
            <FieldLabel>Payment Date</FieldLabel>
            <TextInput type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Amount (₹)</FieldLabel>
            <TextInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <FieldLabel>Payment Method</FieldLabel>
            <DropdownSelect value={method} onChange={setMethod} options={PAY_METHODS} />
          </div>
          <div />
          <PaymentMethodFields
            method={method}
            chequeNo={chequeNo} setChequeNo={setChequeNo}
            chequeDate={chequeDate} setChequeDate={setChequeDate}
            bankName={bankName} setBankName={setBankName}
            refUtr={refUtr} setRefUtr={setRefUtr}
          />
          <div style={{ gridColumn: "span 2" }}>
            <FieldLabel>Remarks</FieldLabel>
            <TextInput value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Advance for upcoming purchases" />
          </div>
        </div>
        <InfoBox type="info">
          This amount will remain available until applied to distributor invoices.
        </InfoBox>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onClose} disabled={!distributor || !amount || parseFloat(amount) <= 0}>Record Advance</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Apply Advance Modal ──────────────────────────────────────────────────────

function ApplyAdvanceModal({ advance, onClose, onSuccess, onError }: { advance: AdvanceRecord; onClose: () => void; onSuccess: (msg: string) => void; onError: (msg: string) => void }) {
  const invoices = OUTSTANDING_WITH_HOLDS.filter(i => i.distributor === advance.distributor);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [applyAmts, setApplyAmts] = useState<Record<string, number>>(
    Object.fromEntries(invoices.map(i => [i.id, 0]))
  );
  const totalApplied = Object.values(applyAmts).reduce((s, v) => s + v, 0);
  const remaining = advance.available - totalApplied;

  const toggleRow = (id: string) => {
    const now = !checked[id];
    setChecked(prev => ({ ...prev, [id]: now }));
    if (now) {
      const inv = invoices.find(i => i.id === id)!;
      const alloc = Math.min(inv.balance, Math.max(0, advance.available - (totalApplied - (applyAmts[id] || 0))));
      setApplyAmts(prev => ({ ...prev, [id]: alloc }));
    } else {
      setApplyAmts(prev => ({ ...prev, [id]: 0 }));
    }
  };

  return (
    <Modal title="Apply Distributor Advance" onClose={onClose} width={640}>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>
        <span style={{ color: "#1A2436", fontWeight: 600 }}>{advance.distributor}</span> · Available Advance: <span style={{ fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 700 }}>{money(advance.available)}</span>
      </div>
      <div style={{ overflowX: "auto", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #E8ECF4", width: 36 }}></th>
              {["Invoice", "Outstanding", "Apply Amount"].map((h, i) => (
                <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: i > 0 ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={!!checked[inv.id]} onChange={() => toggleRow(inv.id)} style={{ accentColor: "#1B6CA8", cursor: "pointer" }} />
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{inv.id}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{money(inv.balance)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {checked[inv.id] ? (
                    <input
                      type="number"
                      value={applyAmts[inv.id] || ""}
                      onChange={e => setApplyAmts(prev => ({ ...prev, [inv.id]: Math.min(inv.balance, parseFloat(e.target.value) || 0) }))}
                      style={{ width: 100, padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
                    />
                  ) : (
                    <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 16px", fontSize: 13 }}>
          <span style={{ color: "#6B7280" }}>Advance Available</span>
          <span style={{ fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{money(advance.available)}</span>
          <span style={{ color: "#6B7280" }}>Applied</span>
          <span style={{ fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 600, textAlign: "right" }}>{money(totalApplied)}</span>
          <span style={{ color: remaining < 0 ? "#C62828" : "#6B7280" }}>Remaining</span>
          <span style={{ fontFamily: "JetBrains Mono", color: remaining < 0 ? "#C62828" : "#1A2436", fontWeight: remaining < 0 ? 700 : 400, textAlign: "right" }}>{money(Math.abs(remaining))}</span>
        </div>
        {remaining < 0 && <div style={{ marginTop: 6, fontSize: 12, color: "#C62828", fontWeight: 700 }}>Applied amount exceeds available advance.</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            const success = Math.random() > 0.4;
            if (success) {
              onSuccess(`Advance of ${money(totalApplied)} applied to ${Object.values(checked).filter(Boolean).length} invoice(s) successfully.`);
            } else {
              onError("Failed to apply advance. Please try again or contact support.");
            }
            onClose();
          }}
          disabled={totalApplied === 0 || remaining < 0}
        >Apply Advance</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ─── Reverse Payment Modal ────────────────────────────────────────────────────

function ReversePaymentModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  return (
    <Modal title="Reverse Payment" onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#FFF3E0", border: "1px solid #FFE082", padding: "12px 16px", fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "#E65100", marginBottom: 6 }}>Reverse this payment?</div>
          <div style={{ color: "#4A5875", lineHeight: 1.5 }}>
            <div>Payment: <strong>{payment.id}</strong></div>
            <div>Distributor: <strong>{payment.distributor}</strong></div>
            <div>Amount: <strong style={{ fontFamily: "JetBrains Mono" }}>{money(payment.amount)}</strong></div>
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
            This will restore the outstanding balance of the allocated invoices.
          </div>
        </div>
        <div>
          <FieldLabel>Reason *</FieldLabel>
          <DropdownSelect value={reason} onChange={setReason} options={REVERSAL_REASONS} placeholder="— Select reason —" />
        </div>
        <div>
          <FieldLabel>Additional Remarks *</FieldLabel>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe the reason for reversal..."
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", resize: "vertical", minHeight: 72, boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#C62828")}
            onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button onClick={onClose} disabled={!reason || !remarks.trim()}
            style={{ padding: "9px 20px", border: "none", background: (!reason || !remarks.trim()) ? "#C8CDD8" : "#C62828", fontSize: 13, cursor: (!reason || !remarks.trim()) ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Reverse Payment
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

function AuditTrailModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  const events = [
    { time: "15 Sep 10:42 AM", title: "Payment Created", detail: `By ${payment.createdBy}`, sub: `Amount ${money(payment.amount)}` },
    { time: "15 Sep 10:43 AM", title: "Allocation Added", detail: payment.allocation.map(a => `${a.invoiceId} ${money(a.amount)}`).join(" · "), sub: "" },
    ...(payment.adjustments.length > 0 ? [{ time: "15 Sep 10:44 AM", title: "Adjustments Applied", detail: payment.adjustments.map(a => `${a.type} ${money(a.amount)}`).join(" · "), sub: "" }] : []),
    ...(payment.status === "Posted" ? [
      { time: "15 Sep 10:44 AM", title: "Payment Approved", detail: "By Manager", sub: "" },
      { time: "15 Sep 10:45 AM", title: "Payment Posted", detail: "Distributor balance updated", sub: "" },
    ] : payment.status === "Reversed" ? [
      { time: "15 Sep 10:44 AM", title: "Payment Approved", detail: "By Manager", sub: "" },
      { time: "15 Sep 10:45 AM", title: "Payment Posted", detail: "Distributor balance updated", sub: "" },
      { time: "15 Sep 14:20 PM", title: "Payment Reversed", detail: `Reason: ${payment.reversalReason ?? "—"}`, sub: "Invoice balances restored" },
    ] : []),
  ];

  return (
    <Modal title={`Payment Audit — ${payment.id}`} onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: "flex", gap: 16, paddingBottom: 20, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1B6CA8", marginTop: 3, flexShrink: 0 }} />
              {i < events.length - 1 && <div style={{ width: 2, flex: 1, background: "#E8ECF4", marginTop: 4 }} />}
            </div>
            <div style={{ paddingTop: 0 }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono", marginBottom: 3 }}>{ev.time}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{ev.title}</div>
              {ev.detail && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{ev.detail}</div>}
              {ev.sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{ev.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Payment Detail View ──────────────────────────────────────────────────────

function PaymentDetailView({ payment, onClose, onReverse }: { payment: PaymentRecord; onClose: () => void; onReverse: () => void }) {
  const [showAudit, setShowAudit] = useState(false);
  const [showApproval, setShowApproval] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.32)", zIndex: 100 }} />

      {/* Drawer */}
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 500, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-6px 0 28px rgba(0,0,0,0.13)" }}>

        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #E8ECF4", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>{payment.id}</div>
            <Pill status={payment.status} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {payment.status === "Pending Approval" && (
              <button onClick={() => setShowApproval(true)} style={{ padding: "6px 12px", border: "none", background: "#E65100", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Review Approval</button>
            )}
            <button style={{ padding: "6px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
            {payment.status === "Posted" && (
              <button onClick={onReverse} style={{ padding: "6px 12px", border: "1px solid #EF9A9A", background: "#FFEBEE", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>Reverse</button>
            )}
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px", marginBottom: 22 }}>
            {[
              { l: "Distributor", v: payment.distributor },
              { l: "Payment Date", v: formatDMY(payment.date) },
              { l: "Method", v: payment.method },
              { l: "Amount", v: money(payment.amount) },
              { l: "Reference", v: payment.reference || "—" },
              { l: "Remarks", v: payment.remarks || "—" },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>{l}</div>
                <div style={{ fontSize: 13, fontFamily: l === "Amount" || l === "Reference" ? "JetBrains Mono" : "Inter", fontWeight: l === "Amount" ? 700 : 500, color: l === "Amount" ? "#2E7D32" : "#1A2436" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Allocation */}
          {payment.allocation.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter" }}>Allocation</div>
              <div style={{ border: "1px solid #E8ECF4" }}>
                {payment.allocation.map((a, i) => (
                  <div key={a.invoiceId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < payment.allocation.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                    <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{a.invoiceId}</span>
                    <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600 }}>{money(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjustments */}
          {payment.adjustments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter" }}>Adjustments</div>
              <div style={{ border: "1px solid #E8ECF4" }}>
                {payment.adjustments.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < payment.adjustments.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                    <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter" }}>{a.type}{a.reference ? ` · ${a.reference}` : ""}</span>
                    <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#C62828", fontWeight: 600 }}>-{money(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reversal reason */}
          {payment.status === "Reversed" && payment.reversalReason && (
            <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#C62828" }}>
              <span style={{ fontWeight: 700 }}>Reversed:</span> {payment.reversalReason}
            </div>
          )}

          {/* Footer meta */}
          <div style={{ borderTop: "1px solid #EEF1F6", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter" }}>Created By</div>
                <div style={{ fontSize: 12, color: "#1A2436", marginTop: 3 }}>{payment.createdBy} · {formatDMY(payment.date)}</div>
              </div>
              {payment.postedAt && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter" }}>Posted At</div>
                  <div style={{ fontSize: 12, color: "#1A2436", marginTop: 3 }}>{formatDMY(payment.date)} 10:45 AM</div>
                </div>
              )}
            </div>
            <button onClick={() => setShowAudit(true)} style={{ padding: "7px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
              View Audit Trail
            </button>
          </div>
        </div>
      </div>

      {showAudit && <AuditTrailModal payment={payment} onClose={() => setShowAudit(false)} />}
      {showApproval && <ApprovalReviewModal payment={payment} onClose={() => setShowApproval(false)} />}
    </>
  );
}

// ─── Approval Review Modal ────────────────────────────────────────────────────

function ApprovalReviewModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  return (
    <Modal title="Review Payment" onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
          <div><span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Distributor</span><div style={{ fontSize: 13, color: "#1A2436", marginTop: 2 }}>{payment.distributor}</div></div>
          <div><span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Amount</span><div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#2E7D32", marginTop: 2 }}>{money(payment.amount)}</div></div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Invoice Allocation</div>
          {payment.allocation.map(a => (
            <div key={a.invoiceId} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F6FA", fontSize: 13 }}>
              <span style={{ fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{a.invoiceId}</span>
              <span style={{ fontFamily: "JetBrains Mono", color: "#1A2436" }}>{money(a.amount)}</span>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid #E8ECF4", padding: "12px 14px" }}>
          {[
            { l: "Purchase Verification", v: "Passed", ok: true },
            { l: "Payment Hold", v: "₹0", ok: true },
            { l: "Duplicate Check", v: "Passed", ok: true },
          ].map(({ l, v, ok }) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: "#6B7280" }}>{l}</span>
              <span style={{ color: ok ? "#2E7D32" : "#C62828", fontWeight: 600 }}>{ok ? "✓ " : "✗ "}{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", border: "1px solid #EF9A9A", background: "#FFEBEE", fontSize: 13, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>Reject</button>
          <GhostBtn onClick={onClose}>Send Back</GhostBtn>
          <PrimaryBtn onClick={onClose}>Approve Payment</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Hold Detail Modal ────────────────────────────────────────────────────────

function HoldDetailModal({ hold, onClose, onResolve }: { hold: HoldRecord; onClose: () => void; onResolve: () => void }) {
  const eligible = hold.invoiceAmount - hold.amount;
  return (
    <Modal title="Payment Hold" onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
          <div><span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Invoice</span><div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#1B6CA8", fontWeight: 600, marginTop: 2 }}>{hold.invoiceId}</div></div>
          <div><span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Distributor</span><div style={{ fontSize: 13, color: "#1A2436", marginTop: 2 }}>{hold.distributor}</div></div>
        </div>
        <div style={{ border: "1px solid #E8ECF4", padding: "12px 14px" }}>
          {[
            { l: "Invoice Amount", v: money(hold.invoiceAmount), color: "#1A2436" },
            { l: "Payment Hold", v: money(hold.amount), color: "#C62828" },
            { l: "Eligible Payment", v: money(eligible), color: "#2E7D32" },
          ].map(({ l, v, color }) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F6FA", fontSize: 13 }}>
              <span style={{ color: "#6B7280" }}>{l}</span>
              <span style={{ fontFamily: "JetBrains Mono", color, fontWeight: l !== "Invoice Amount" ? 700 : 400 }}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Reason</div>
          <div style={{ fontSize: 13, color: "#4A5875", lineHeight: 1.6, padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FDE68A" }}>{hold.reason}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>View Purchase Verification</button>
          <button onClick={onResolve} style={{ flex: 1, padding: "9px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Resolve Hold</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Distributor Detail View ──────────────────────────────────────────────────

function DistributorDetail({ distributor, onBack, onRecord }: { distributor: string; onBack: () => void; onRecord: (dist: string) => void }) {
  const invoices = OUTSTANDING_WITH_HOLDS.filter(i => i.distributor === distributor);
  const outstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const overdue = invoices.filter(i => i.dueStatus === "Overdue").reduce((s, i) => s + i.balance, 0);
  const dueSoon = invoices.filter(i => i.dueStatus === "Due Soon").reduce((s, i) => s + i.balance, 0);
  const advance = ADVANCES.filter(a => a.distributor === distributor).reduce((s, a) => s + a.available, 0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1px solid #E8ECF4", borderBottom: "none" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontFamily: "Inter", padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Outstanding
        </button>
        <button onClick={() => onRecord(distributor)} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
          Record Payment
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "18px 16px" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 14 }}>{distributor}</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <KpiTile label="Outstanding" value={money(outstanding)} accent="#C62828" />
          <KpiTile label="Overdue" value={money(overdue)} accent={overdue > 0 ? "#C62828" : "#9CA3AF"} />
          <KpiTile label="Due Soon" value={money(dueSoon)} accent={dueSoon > 0 ? "#E65100" : "#9CA3AF"} />
          <KpiTile label="Advance" value={money(advance)} accent="#2E7D32" />
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
          Credit Period: <strong style={{ color: "#1A2436" }}>30 Days</strong>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Outstanding Invoices</div>
        <div style={{ border: "1px solid #E8ECF4" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "9px 14px", width: 36 }}><input type="checkbox" style={{ accentColor: "#1B6CA8" }} /></th>
                {["Invoice", "Date", "Due", "Total", "Paid", "Balance", "Status"].map((h, i) => (
                  <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: ["Total", "Paid", "Balance"].includes(h) ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F4F6FA" }}>
                    <input type="checkbox" checked={!!checked[inv.id]} onChange={() => setChecked(p => ({ ...p, [inv.id]: !p[inv.id] }))} style={{ accentColor: "#1B6CA8", cursor: "pointer" }} />
                  </td>
                  <Td mono color="#1B6CA8" bold>{inv.id}</Td>
                  <Td mono>{formatDMY(inv.invoiceDate)}</Td>
                  <Td mono>{formatDMY(inv.dueDate)}</Td>
                  <Td mono right>{money(inv.total)}</Td>
                  <Td mono right color="#2E7D32">{inv.paid > 0 ? money(inv.paid) : "—"}</Td>
                  <Td mono right bold color={inv.dueStatus === "Overdue" || inv.dueStatus === "Payment Hold" ? "#C62828" : "#1A2436"}>{money(inv.balance)}</Td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F4F6FA" }}><StatusChip status={inv.dueStatus} /></td>
                </TableRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Outstanding Tab ──────────────────────────────────────────────────────────

type OutstandingFilter = "All" | "Overdue" | "Due Today" | "Due Soon" | "Payment Hold";

function OutstandingTab({ onRecord }: { onRecord: (dist?: string) => void }) {
  const [view, setView] = useState<"list" | "distributor">("list");
  const [selectedDist, setSelectedDist] = useState("");
  const [distFilter, setDistFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutstandingFilter>("All");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => OUTSTANDING_WITH_HOLDS.filter(inv => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || inv.id.toLowerCase().includes(q) || inv.distributor.toLowerCase().includes(q);
    const mDist = distFilter === "All" || inv.distributor === distFilter;
    const mStatus = statusFilter === "All" || inv.dueStatus === statusFilter;
    return mSearch && mDist && mStatus;
  }), [search, distFilter, statusFilter]);

  const { pageRows: outPageRows, footerProps: outFooterProps } = usePagination(filtered, 10);
  const selectedCount = Object.values(checked).filter(Boolean).length;
  const allChecked = filtered.length > 0 && filtered.every(inv => checked[inv.id]);
  const someChecked = !allChecked && filtered.some(inv => checked[inv.id]);

  const toggleAll = () => {
    if (allChecked) {
      setChecked({});
    } else {
      const next: Record<string, boolean> = {};
      filtered.forEach(inv => { next[inv.id] = true; });
      setChecked(next);
    }
  };

  if (view === "distributor" && selectedDist) {
    return (
      <DistributorDetail
        distributor={selectedDist}
        onBack={() => setView("list")}
        onRecord={dist => onRecord(dist)}
      />
    );
  }


  const ROW_ACCENT: Record<string, string> = {
    "Overdue": "#C62828",
    "Due Today": "#E65100",
    "Due Soon": "#F59E0B",
    "Payment Hold": "#C62828",
    "Not Due": "#2E7D32",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        {/* Single combined filter row */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search invoice / distributor..." />
          <FilterDropdown value={distFilter} onChange={setDistFilter} options={DISTRIBUTOR_NAMES} allLabel="All Distributors" />
          <div style={{ width: 1, height: 18, background: "#E8ECF4", flexShrink: 0, marginLeft: 2 }} />
          {(["All", "Overdue", "Due Today", "Due Soon", "Payment Hold"] as OutstandingFilter[]).map(f => {
            const active = statusFilter === f;
            return (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", background: active ? "#E8ECF4" : "transparent", fontSize: 13, cursor: "pointer", color: active ? "#1A2436" : "#6B7280", fontFamily: "Inter", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                {f}
              </button>
            );
          })}
          {selectedCount > 0 && (
            <div style={{ marginLeft: "auto" }}>
              <button onClick={() => onRecord()} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                Record Payment ({selectedCount})
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "8px 12px", width: 36, borderBottom: "1px solid #E8ECF4" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    style={{ accentColor: "#1B6CA8", cursor: "pointer" }}
                  />
                </th>
                {["Invoice", "Distributor", "Invoice Date", "Due Date", "Total", "Balance", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: ["Total", "Balance"].includes(h) ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outPageRows.map(inv => {
                const accent = ROW_ACCENT[inv.dueStatus] ?? "#9CA3AF";
                const isUrgent = inv.dueStatus === "Overdue" || inv.dueStatus === "Payment Hold";
                return (
                  <tr key={inv.id}
                    onClick={() => { setSelectedDist(inv.distributor); setView("distributor"); }}
                    style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#FAFBFD"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                    <td style={{ padding: "9px 12px", borderLeft: `3px solid ${accent}` }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={!!checked[inv.id]} onChange={() => setChecked(p => ({ ...p, [inv.id]: !p[inv.id] }))} style={{ accentColor: "#1B6CA8", cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#1B6CA8", whiteSpace: "nowrap" }}>{inv.id}</td>
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{inv.distributor}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF" }}>{formatDMY(inv.invoiceDate)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: isUrgent ? "#C62828" : "#6B7280", fontWeight: isUrgent ? 600 : 400 }}>{formatDMY(inv.dueDate)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF", textAlign: "right" }}>{money(inv.total)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: isUrgent ? "#C62828" : inv.dueStatus === "Due Today" ? "#E65100" : "#1A2436", textAlign: "right" }}>{money(inv.balance)}</td>
                    <td style={{ padding: "9px 12px" }}><StatusChip status={inv.dueStatus} /></td>
                  </tr>
                );
              })}
              {outPageRows.length === 0 && <EmptyTableRow colSpan={8} message="No invoices match your filters." />}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...outFooterProps} />
      </div>
  );
}

// ─── Payment History Tab ──────────────────────────────────────────────────────

function PaymentHistoryTab({ onRecord, initialViewId, onDeepLinkConsumed }: { onRecord: () => void; initialViewId?: string; onDeepLinkConsumed?: () => void }) {
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [showReverse, setShowReverse] = useState(false);
  const [search, setSearch] = useState("");
  const [distFilter, setDistFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => PAYMENTS.filter(p => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || p.id.toLowerCase().includes(q) || p.distributor.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
    const mDist = distFilter === "All" || p.distributor === distFilter;
    const mMethod = methodFilter === "All" || p.method === methodFilter;
    const mStatus = statusFilter === "All" || p.status === statusFilter;
    const mFrom = !fromDate || p.date >= fromDate;
    const mTo = !toDate || p.date <= toDate;
    return mSearch && mDist && mMethod && mStatus && mFrom && mTo;
  }), [search, distFilter, methodFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || distFilter !== "All" || methodFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setDistFilter("All"); setMethodFilter("All"); setStatusFilter("All"); };

  useEffect(() => {
    if (!initialViewId) return;
    const pay = PAYMENTS.find(p => p.id === initialViewId) ?? null;
    setSelected(pay);
    onDeepLinkConsumed?.();
  }, [initialViewId]);

  return (
    <>
    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <FilterSearch value={search} onChange={setSearch} placeholder="Payment no / invoice / reference..." />
        <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        <FilterDropdown value={distFilter} onChange={setDistFilter} options={DISTRIBUTOR_NAMES} allLabel="All Distributors" />
        <FilterDropdown value={methodFilter} onChange={setMethodFilter} options={PAY_METHODS} allLabel="All Methods" />
        <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Posted", "Pending Approval", "Reversed"]} allLabel="All Status" />
        {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={onRecord} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>+ Record Payment</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Payment #</Th>
              <Th onSort={() => handleSort("distributor")} sortDir={sortCol === "distributor" ? sortDir : null}>Distributor</Th>
              <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
              <Th onSort={() => handleSort("method")} sortDir={sortCol === "method" ? sortDir : null}>Method</Th>
              <Th right onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
              <Th center>Invoices</Th>
              <Th>Reference</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(p => (
              <TableRow key={p.id} onClick={() => setSelected(p)}>
                <Td mono color="#1B6CA8" bold>{p.id}</Td>
                <Td bold>{p.distributor}</Td>
                <Td mono>{formatDMY(p.date)}</Td>
                <Td>{p.method}</Td>
                <Td mono right bold color="#2E7D32">{money(p.amount)}</Td>
                <Td center>{p.invoiceCount}</Td>
                <Td mono color="#9CA3AF">{p.reference}</Td>
                <td style={{ padding: "12px 14px", borderBottom: "1px solid #F4F6FA" }}>
                  <Pill status={p.status} />
                </td>
              </TableRow>
            ))}
            {pageRows.length === 0 && <EmptyTableRow colSpan={8} message="No payments match your filters." />}
          </tbody>
        </table>
      </div>
      <PaginationFooter {...footerProps} />
    </div>
    {selected && (
      <PaymentDetailView
        payment={selected}
        onClose={() => { setSelected(null); setShowReverse(false); }}
        onReverse={() => setShowReverse(true)}
      />
    )}
    {showReverse && selected && <ReversePaymentModal payment={selected} onClose={() => setShowReverse(false)} />}
    </>
  );
}

// ─── Advances Tab ─────────────────────────────────────────────────────────────

function AdvancesTab() {
  const [showRecord, setShowRecord] = useState(false);
  const [applyFor, setApplyFor] = useState<AdvanceRecord | null>(null);
  const [search, setSearch] = useState("");
  const [distFilter, setDistFilter] = useState("All");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => ADVANCES.filter(a => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || a.distributor.toLowerCase().includes(q) || a.paymentNo.toLowerCase().includes(q);
    const mDist = distFilter === "All" || a.distributor === distFilter;
    return mSearch && mDist;
  }), [search, distFilter]);

  const { pageRows: advPageRows, footerProps: advFooterProps } = usePagination(filtered, 10);

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search distributor / payment no..." />
          <FilterDropdown value={distFilter} onChange={setDistFilter} options={DISTRIBUTOR_NAMES} allLabel="All Distributors" />
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowRecord(true)} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>+ Record Advance</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Distributor", "Payment No", "Date", "Method", "Original", "Applied", "Available", ""].map((h, i) => (
                  <th key={h + i} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: ["Original", "Applied", "Available"].includes(h) ? "right" : "left", borderBottom: "1px solid #E8ECF4", background: "#F8FAFC" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advPageRows.map(a => (
                <TableRow key={a.id}>
                  <Td bold>{a.distributor}</Td>
                  <Td mono color="#1B6CA8">{a.paymentNo}</Td>
                  <Td mono>{formatDMY(a.date)}</Td>
                  <Td>{a.method}</Td>
                  <Td mono right>{money(a.original)}</Td>
                  <Td mono right color="#E65100">{money(a.applied)}</Td>
                  <Td mono right bold color="#2E7D32">{money(a.available)}</Td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F4F6FA" }}>
                    {a.available > 0 && (
                      <button onClick={() => setApplyFor(a)} style={{ padding: "5px 12px", border: "none", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Apply</button>
                    )}
                  </td>
                </TableRow>
              ))}
              {advPageRows.length === 0 && <EmptyTableRow colSpan={8} message="No advance payments recorded." />}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...advFooterProps} />

        {showRecord && <RecordAdvanceModal onClose={() => setShowRecord(false)} />}
        {applyFor && (
          <ApplyAdvanceModal
            advance={applyFor}
            onClose={() => setApplyFor(null)}
            onSuccess={msg => setToast({ type: "success", message: msg })}
            onError={msg => setToast({ type: "error", message: msg })}
          />
        )}
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 500, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 5s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Payment Holds Tab ────────────────────────────────────────────────────────

function HoldsTab() {
  const [holds, setHolds] = useState<HoldRecord[]>(HOLDS);
  const [search, setSearch] = useState("");
  const [viewHold, setViewHold] = useState<HoldRecord | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => holds.filter(h => {
    const q = search.trim().toLowerCase();
    return !q || h.invoiceId.toLowerCase().includes(q) || h.distributor.toLowerCase().includes(q) || h.holdType.toLowerCase().includes(q);
  }), [holds, search]);

  const { pageRows: holdPageRows, footerProps: holdFooterProps } = usePagination(filtered, 10);

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search invoice / distributor / reason..." />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Invoice", "Distributor", "Hold Type", "Amount", "Date", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: h === "Amount" ? "right" : "left", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdPageRows.map(h => (
                <TableRow key={h.id}>
                  <Td mono color="#1B6CA8" bold>{h.invoiceId}</Td>
                  <Td>{h.distributor}</Td>
                  <Td>{h.holdType}</Td>
                  <Td mono right bold color="#C62828">{money(h.amount)}</Td>
                  <Td mono>{formatDMY(h.date)}</Td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F4F6FA" }}><StatusChip status={h.status} /></td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F4F6FA" }}>
                    <button onClick={() => setViewHold(h)} style={{ padding: "5px 12px", border: "none", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>View</button>
                  </td>
                </TableRow>
              ))}
              {holdPageRows.length === 0 && <EmptyTableRow colSpan={7} message="No payment holds found." />}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...holdFooterProps} />
        {viewHold && (
          <HoldDetailModal
            hold={viewHold}
            onClose={() => {
              setViewHold(null);
              setToast({ type: "error", message: `Payment hold for ${viewHold.invoiceId} was not resolved.` });
            }}
            onResolve={() => {
              const inv = viewHold.invoiceId;
              setHolds(prev => prev.map(h => h.id === viewHold.id ? { ...h, status: "Resolved" } : h));
              setViewHold(null);
              setToast({ type: "success", message: `Payment hold for ${inv} resolved successfully.` });
            }}
          />
        )}
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 500, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 5s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main PurchasePayments Component ─────────────────────────────────────────

const PAY_TABS: { id: PaymentSubTab; label: string }[] = [
  { id: "history",     label: "Payment History" },
  { id: "outstanding", label: "Outstanding" },
  { id: "advances",    label: "Advances" },
  { id: "holds",       label: "Payment Holds" },
];

export default function PurchasePayments({ initialViewId, onDeepLinkConsumed }: {
  initialViewId?: string;
  onDeepLinkConsumed?: () => void;
} = {}) {
  const [tab, setTab] = useState<PaymentSubTab>("history");
  const [recordOpen, setRecordOpen] = useState(false);
  const [preselectedDist, setPreselectedDist] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const openRecord = (dist?: string) => {
    setPreselectedDist(dist);
    setRecordOpen(true);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Inline tab bar — lives inside the content area, not at the module border */}
        <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #E8ECF4", flexShrink: 0, padding: "0 16px" }}>
          {PAY_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                marginBottom: -1,
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "#1B6CA8" : "#6B7280",
                fontFamily: "Inter",
                whiteSpace: "nowrap",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 0 0 0" }}>
          {tab === "history"     && <PaymentHistoryTab onRecord={() => openRecord()} initialViewId={initialViewId} onDeepLinkConsumed={onDeepLinkConsumed} />}
          {tab === "outstanding" && <OutstandingTab onRecord={openRecord} />}
          {tab === "advances"    && <AdvancesTab />}
          {tab === "holds"       && <HoldsTab />}
        </div>

        {recordOpen && (
          <RecordPaymentModal
            onClose={() => { setRecordOpen(false); setPreselectedDist(undefined); }}
            preselectedDistributor={preselectedDist}
            onPost={result => setToast(result)}
          />
        )}
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 500, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
