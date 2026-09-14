import { useState, useMemo, useRef } from "react";
import { patients } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import PrintDialog from "../shared/PrintDialog";
import type { PrintJobType } from "../shared/PrintDialog";
import {
  type PayMethod,
  TODAY, PAY_METHODS,
  salesInvoices, salesPayments,
} from "./salesData";
import {
  CalendarIcon, ChevronDown, DateRangePicker,
} from "./salesShared";
import { PatientSearch } from "./SalesInvoices";

// ─── Date formatting helper (DD-MM-YYYY) ─────────────────────────────────────

function formatDMYDash(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
}

// ─── Date field button (styled date picker) ───────────────────────────────────

function DateFieldButton({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const display = value ? formatDMYDash(value) : "Select date";
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E8ECF4", background: disabled ? "#F8FAFC" : "#fff", fontSize: 13, fontFamily: "Inter", cursor: disabled ? "default" : "pointer", color: disabled ? "#6B7280" : (value ? "#1A2436" : "#9CA3AF"), boxSizing: "border-box" }}
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

// ─── Method icon (SVG per payment method) ────────────────────────────────────

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

// ─── Seed payment method fields from existing record ─────────────────────────

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

// ─── Record Payment (full-screen overlay) ─────────────────────────────────────

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

  const allocations = useMemo(() => {
    const result: Record<string, number> = {};
    const selectedIds = outstandingInvoices.filter(i => checked[i.id]).map(i => i.id);
    if (allocMode === "fifo") {
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

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 20px" }}>

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

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

// ─── Sales Payments list ──────────────────────────────────────────────────────

function SalesPaymentsList({ onNew, onOpen }: { onNew: () => void; onOpen: (p: typeof salesPayments[0]) => void }) {
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
  );
}

// ─── SalesPayments wrapper ────────────────────────────────────────────────────

export default function SalesPayments() {
  const [view, setView] = useState<"list" | "record-payment">("list");
  const [openPayment, setOpenPayment] = useState<typeof salesPayments[0] | null>(null);

  if (view === "record-payment") {
    return (
      <RecordPayment
        payment={openPayment ?? undefined}
        onBack={() => { setView("list"); setOpenPayment(null); }}
      />
    );
  }

  return (
    <SalesPaymentsList
      onNew={() => setView("record-payment")}
      onOpen={(p) => { setOpenPayment(p); setView("record-payment"); }}
    />
  );
}
