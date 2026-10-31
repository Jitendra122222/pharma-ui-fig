import { useState, useEffect } from "react";
import { DatePicker } from "./shared/DatePicker";
import type { CSSProperties } from "react";
import { S } from "../styles/common";
import { PT } from "../styles/patients";
import { patients, prescriptions, type PaymentTerms } from "../data/mockData";
import { fetchPatients } from "../lib/patientApi";
import { getPatientBalance, salesInvoices, salesPayments } from "./sales/salesData";
import AddPatientDrawer from "./AddPatientDrawer";
import { Th } from "./shared/Th";
import { useTableSort } from "./shared/useTableSort";
import { usePagination, PaginationFooter } from "./shared/usePagination";

type View = "list" | "detail";

function calcAge(dob: string): number {
  const b = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

const RX_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Dispensed: { bg: "#E8F5E9", color: "#2E7D32" },
  Pending:   { bg: "#FFF3E0", color: "#E65100" },
  Partial:   { bg: "#E3F2FD", color: "#1B6CA8" },
  Cancelled: { bg: "#F5F5F5", color: "#9E9E9E" },
};

const TODAY_ISO       = new Date().toISOString().split("T")[0];
const PAY_METHODS_LIST = ["Cash", "Card", "UPI", "Bank Transfer", "Insurance"];
const ACCT_PURPOSES   = ["Advance Deposit", "Manual Charge", "Adjustment", "Write-off"] as const;
type AcctPurpose      = typeof ACCT_PURPOSES[number];

function RecordPaymentModal({ patient, onClose }: { patient: typeof patients[0]; onClose: () => void }) {
  const [tab, setTab]             = useState<"invoice" | "account">("invoice");
  const [savedMsg, setSavedMsg]   = useState<string | null>(null);

  const [selInvId, setSelInvId]   = useState("");
  const [invAmt, setInvAmt]       = useState("");
  const [invMethod, setInvMethod] = useState("Cash");
  const [invRef, setInvRef]       = useState("");
  const [invDate, setInvDate]     = useState(TODAY_ISO);

  const [accAmt, setAccAmt]           = useState("");
  const [accPurpose, setAccPurpose]   = useState<AcctPurpose>("Advance Deposit");
  const [accMethod, setAccMethod]     = useState("Cash");
  const [accRef, setAccRef]           = useState("");
  const [accNotes, setAccNotes]       = useState("");
  const [accDate, setAccDate]         = useState(TODAY_ISO);

  const unpaid    = salesInvoices.filter(inv => inv.patientId === patient.id && (inv.total - inv.paid) > 0.001);
  const selInv    = unpaid.find(i => i.id === selInvId) ?? null;
  const invBalance = selInv ? +(selInv.total - selInv.paid).toFixed(2) : 0;

  useEffect(() => {
    if (selInv) setInvAmt(invBalance.toFixed(2));
    else        setInvAmt("");
  }, [selInvId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveInvoice = () => {
    if (!selInv) return;
    const amt = Math.min(Math.max(0, parseFloat(invAmt) || 0), invBalance);
    if (amt <= 0) return;
    setSavedMsg(`₹${amt.toFixed(2)} applied to ${selInv.id}`);
  };

  const handleSaveAccount = () => {
    const amt = Math.max(0, parseFloat(accAmt) || 0);
    if (amt <= 0) return;
    setSavedMsg(`₹${amt.toFixed(2)} recorded as ${accPurpose}`);
  };

  const inp: CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" as const, background: "#fff" };
  const lbl: CSSProperties = { fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5, letterSpacing: "0.04em" };
  const col: CSSProperties = { display: "flex", flexDirection: "column" as const };

  if (savedMsg) {
    return (
      <>
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.4)", zIndex: 400 }} />
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 8, border: "1px solid #E8ECF4", padding: "40px", zIndex: 401, textAlign: "center", minWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 6 }}>Payment Recorded</div>
          <div style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter", marginBottom: 24 }}>{savedMsg}</div>
          <button onClick={onClose} style={{ padding: "9px 28px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>Done</button>
        </div>
      </>
    );
  }

  const canSave = tab === "invoice"
    ? (!!selInv && parseFloat(invAmt) > 0 && parseFloat(invAmt) <= invBalance + 0.001)
    : (parseFloat(accAmt) > 0);

  const Sel = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inp, appearance: "none", WebkitAppearance: "none", paddingRight: 28, cursor: "pointer" }}
        onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
        onBlur={e => (e.target.style.borderColor = "#DDE3EC")}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>▼</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.4)", zIndex: 400 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 8, border: "1px solid #E8ECF4", zIndex: 401, width: 520, maxWidth: "calc(100vw - 40px)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", maxHeight: "84vh" }}>

        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Record Payment</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{patient.name} · <span style={{ fontFamily: "JetBrains Mono" }}>{patient.id}</span></div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "2px 4px" }}>×</button>
          </div>
          <div style={{ display: "flex" }}>
            {(["invoice", "account"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "8px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Inter", borderBottom: `2.5px solid ${tab === t ? "#1B6CA8" : "transparent"}`, color: tab === t ? "#1B6CA8" : "#6B7280", marginBottom: -1 }}>
                {t === "invoice" ? "Invoice Payment" : "Account Payment"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {tab === "invoice" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {unpaid.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "#9CA3AF", fontSize: 13 }}>No unpaid invoices for this patient.</div>
              ) : (
                <>
                  <div style={col}>
                    <label style={lbl}>Select Invoice</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {unpaid.map(inv => {
                        const due = +(inv.total - inv.paid).toFixed(2);
                        const isSel = selInvId === inv.id;
                        return (
                          <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: `1.5px solid ${isSel ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, cursor: "pointer", background: isSel ? "#EFF6FF" : "#FAFBFD" }}>
                            <input type="radio" name="selInv" checked={isSel} onChange={() => setSelInvId(inv.id)} style={{ accentColor: "#1B6CA8", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#1B6CA8" }}>{inv.id}</span>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: "#C62828" }}>₹{due.toFixed(2)} due</span>
                              </div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{inv.date} · {inv.items} item{inv.items !== 1 ? "s" : ""} · Total ₹{inv.total.toFixed(2)}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={col}>
                      <label style={lbl}>Amount (₹)</label>
                      <input type="number" value={invAmt} onChange={e => setInvAmt(e.target.value)} min="0.01" step="0.01" placeholder="0.00"
                        style={{ ...inp, fontFamily: "JetBrains Mono" }}
                        onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
                        onBlur={e => (e.target.style.borderColor = "#DDE3EC")} />
                      {selInv && parseFloat(invAmt) > invBalance + 0.001 && (
                        <span style={{ fontSize: 11, color: "#E65100", marginTop: 3 }}>Max: ₹{invBalance.toFixed(2)}</span>
                      )}
                    </div>
                    <div style={col}>
                      <label style={lbl}>Payment Date</label>
                      <DatePicker value={invDate} onChange={setInvDate} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={col}>
                      <label style={lbl}>Payment Mode</label>
                      <Sel value={invMethod} onChange={setInvMethod}>{PAY_METHODS_LIST.map(m => <option key={m}>{m}</option>)}</Sel>
                    </div>
                    <div style={col}>
                      <label style={lbl}>Reference / Txn No.</label>
                      <input type="text" value={invRef} onChange={e => setInvRef(e.target.value)} placeholder="e.g. UPI-REF-123" style={inp}
                        onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
                        onBlur={e => (e.target.style.borderColor = "#DDE3EC")} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={col}>
                  <label style={lbl}>Amount (₹)</label>
                  <input type="number" value={accAmt} onChange={e => setAccAmt(e.target.value)} min="0.01" step="0.01" placeholder="0.00"
                    style={{ ...inp, fontFamily: "JetBrains Mono" }}
                    onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
                    onBlur={e => (e.target.style.borderColor = "#DDE3EC")} />
                </div>
                <div style={col}>
                  <label style={lbl}>Purpose</label>
                  <Sel value={accPurpose} onChange={v => setAccPurpose(v as AcctPurpose)}>{ACCT_PURPOSES.map(p => <option key={p}>{p}</option>)}</Sel>
                </div>
              </div>
              {accPurpose === "Write-off" && (
                <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#E65100", lineHeight: 1.5 }}>
                  Write-off permanently reduces the outstanding balance. Record the reason in the Reference field.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={col}>
                  <label style={lbl}>Payment Mode</label>
                  <Sel value={accMethod} onChange={setAccMethod}>{PAY_METHODS_LIST.map(m => <option key={m}>{m}</option>)}</Sel>
                </div>
                <div style={col}>
                  <label style={lbl}>Payment Date</label>
                  <DatePicker value={accDate} onChange={setAccDate} />
                </div>
              </div>
              <div style={col}>
                <label style={lbl}>Reference / Reason</label>
                <input type="text" value={accRef} onChange={e => setAccRef(e.target.value)}
                  placeholder={accPurpose === "Write-off" ? "e.g. Patient hardship — approved by manager" : "e.g. UPI-REF-123"}
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
                  onBlur={e => (e.target.style.borderColor = "#DDE3EC")} />
              </div>
              <div style={col}>
                <label style={lbl}>Notes</label>
                <textarea value={accNotes} onChange={e => setAccNotes(e.target.value)} rows={2}
                  placeholder="Additional notes..."
                  style={{ ...inp, resize: "none" as const }}
                  onFocus={e => (e.target.style.borderColor = "#1B6CA8")}
                  onBlur={e => (e.target.style.borderColor = "#DDE3EC")} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
          <button disabled={!canSave} onClick={tab === "invoice" ? handleSaveInvoice : handleSaveAccount}
            style={{ padding: "8px 22px", borderRadius: 6, border: "none", background: canSave ? "#1B6CA8" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: canSave ? "pointer" : "default", color: "#fff", fontFamily: "Inter" }}>
            Record Payment
          </button>
        </div>
      </div>
    </>
  );
}

export default function Patients() {
  const [view, setView]                 = useState<View>("list");
  const [search, setSearch]             = useState("");
  const [genderFilter, setGenderFilter] = useState<"All" | "M" | "F">("All");
  const [balanceFilter, setBalanceFilter] = useState(false);
  const [selected, setSelected]         = useState<typeof patients[0] | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [showPayModal, setShowPayModal]   = useState(false);
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [patientList, setPatientList] = useState(patients);
  useEffect(() => {
    fetchPatients().then(d => setPatientList(d.items as typeof patients)).catch(() => {});
  }, []);

  const todayStr       = new Date().toISOString().split("T")[0];
  const overdueSet     = new Set(
    salesInvoices
      .filter(inv => inv.patientId !== "—" && (inv.total - inv.paid) > 0.001 && inv.due < todayStr)
      .map(inv => inv.patientId),
  );
  const totalReceivables = salesInvoices
    .filter(inv => inv.patientId !== "—")
    .reduce((sum, inv) => sum + Math.max(0, inv.total - inv.paid), 0);

  const agingBuckets = [
    { label: "Current",   days: "Not yet due",  count: 0, amount: 0, color: "#2E7D32", bg: "#E8F5E9" },
    { label: "1–30 days", days: "1 – 30 days",  count: 0, amount: 0, color: "#E65100", bg: "#FFF3E0" },
    { label: "31–60 days",days: "31 – 60 days", count: 0, amount: 0, color: "#C62828", bg: "#FFEBEE" },
    { label: "61–90 days",days: "61 – 90 days", count: 0, amount: 0, color: "#7B1FA2", bg: "#F3E5F5" },
    { label: "90+ days",  days: "Over 90 days", count: 0, amount: 0, color: "#4527A0", bg: "#EDE9FE" },
  ];
  for (const inv of salesInvoices) {
    const bal = inv.total - inv.paid;
    if (bal <= 0.001 || inv.patientId === "—") continue;
    const daysOverdue = Math.round((Date.now() - new Date(inv.due).getTime()) / 86400000);
    const idx = daysOverdue <= 0 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : daysOverdue <= 90 ? 3 : 4;
    agingBuckets[idx].count++;
    agingBuckets[idx].amount += bal;
  }

  const filtered = patientList.filter(p => {
    const q = search.toLowerCase();
    const matchSearch  = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q);
    const matchGender  = genderFilter === "All" || p.gender === genderFilter;
    const matchBalance = !balanceFilter || p.balance > 0;
    const matchOverdue = !overdueFilter || overdueSet.has(p.id);
    return matchSearch && matchGender && matchBalance && matchOverdue;
  });

  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedRows, 10);

  const totalPatients = patientList.length;
  const maleCount     = patientList.filter(p => p.gender === "M").length;
  const femaleCount   = patientList.filter(p => p.gender === "F").length;

  // ─── Detail View ────────────────────────────────────────────────────────────

  if (view === "detail" && selected) {
    const patientRx = prescriptions.filter(rx => rx.patientId === selected.id);

    const liveBal  = getPatientBalance(selected.id);
    const termsMap: Record<PaymentTerms, number> = { "Cash Only": 0, "Net 15": 15, "Net 30": 30, "Net 60": 60 };
    const utilPct  = selected.creditLimit > 0 ? Math.min((liveBal / selected.creditLimit) * 100, 100) : 0;

    const unpaidInvoices = salesInvoices
      .filter(inv => inv.patientId === selected.id && (inv.total - inv.paid) > 0.001)
      .sort((a, b) => a.date.localeCompare(b.date));
    const oldestUnpaid = unpaidInvoices[0] ?? null;

    const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let dueStatus = { dateStr: "—", overdue: false, daysLabel: "" };
    if (oldestUnpaid && selected.paymentTerms !== "Cash Only") {
      const termsDays   = termsMap[selected.paymentTerms];
      const invoiceDate = new Date(oldestUnpaid.date);
      const dueDate     = new Date(invoiceDate.getTime() + termsDays * 24 * 60 * 60 * 1000);
      const today       = new Date();
      const diffDays    = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      const dueDateStr  = `${dueDate.getDate()} ${MO[dueDate.getMonth()]} ${dueDate.getFullYear()}`;
      if (diffDays < 0)      dueStatus = { dateStr: dueDateStr, overdue: true,  daysLabel: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue` };
      else if (diffDays === 0) dueStatus = { dateStr: dueDateStr, overdue: false, daysLabel: "Due today" };
      else                   dueStatus = { dateStr: dueDateStr, overdue: false, daysLabel: `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining` };
    }

    const patientPayments = salesPayments
      .filter(pay => pay.patientId === selected.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const card: CSSProperties     = { background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "18px 20px" };
    const secTitle: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 };
    const fLabel: CSSProperties   = { fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 };
    const fValue: CSSProperties   = { fontSize: 13, color: "#0C1B33", fontWeight: 500 };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setView("list")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontFamily: "Inter", padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Patients
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnSecondary, fontSize: 12 }}>Print</button>
            <button style={{ ...S.btnSecondary, fontSize: 12 }}>Edit</button>
            <button onClick={() => setShowPayModal(true)} style={{ ...S.btnPrimary, fontSize: 12 }}>Record Payment</button>
            <button style={{ ...S.btnSecondary, fontSize: 12 }}>Prescription</button>
          </div>
        </div>

        {/* Patient identity */}
        <div>
          <h1 style={S.pageTitle}>{selected.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8" }}>{selected.id}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", background: "#E8F5E9", color: "#2E7D32", fontWeight: 700 }}>Active</span>
            {selected.allergies.length > 0 && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#FFEBEE", color: "#C62828", fontWeight: 700 }}>
                ⚠ {selected.allergies.length} Allerg{selected.allergies.length > 1 ? "ies" : "y"}
              </span>
            )}
            {liveBal > 0 && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#FFF3E0", color: "#E65100", fontWeight: 700, fontFamily: "JetBrains Mono" }}>
                ₹{liveBal.toFixed(2)} due
              </span>
            )}
          </div>
        </div>

        {/* Overdue alert banner */}
        {overdueSet.has(selected.id) && (
          <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C62828" }}>Overdue balance — payment required</span>
              <span style={{ fontSize: 12, color: "#C62828", marginLeft: 8, fontFamily: "JetBrains Mono" }}>₹{liveBal.toFixed(2)} outstanding</span>
            </div>
            <button onClick={() => setShowPayModal(true)}
              style={{ padding: "6px 14px", background: "#C62828", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              Record Payment
            </button>
          </div>
        )}

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Personal */}
          <div style={card}>
            <div style={secTitle}>Personal Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Date of Birth",       value: `${selected.dob}  (${calcAge(selected.dob)}y)` },
                { label: "Gender",              value: selected.gender === "M" ? "Male" : "Female" },
                { label: "Blood Group",         value: selected.bloodGroup },
                { label: "Phone",               value: selected.phone },
                { label: "Last Visit",          value: selected.lastVisit },
                { label: "Total Prescriptions", value: String(selected.prescriptions) },
              ].map(f => (
                <div key={f.label}>
                  <div style={fLabel}>{f.label}</div>
                  <div style={fValue}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Medical */}
          <div style={card}>
            <div style={secTitle}>Medical Information</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...fLabel, marginBottom: 8 }}>Known Allergies</div>
              {selected.allergies.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.allergies.map(a => (
                    <span key={a} style={{ fontSize: 12, padding: "4px 10px", background: "#FFEBEE", color: "#C62828", fontWeight: 700 }}>⚠ {a}</span>
                  ))}
                </div>
              ) : <span style={{ fontSize: 13, color: "#9CA3AF" }}>No known allergies</span>}
            </div>
            {liveBal > 0 ? (
              <div style={{ background: "#FFF3E0", border: "1px solid #FFB74D", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#E65100", textTransform: "uppercase", letterSpacing: "0.06em" }}>Outstanding Balance</div>
                <div style={{ fontSize: 22, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#E65100", marginTop: 4 }}>₹{liveBal.toFixed(2)}</div>
              </div>
            ) : (
              <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", padding: "10px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32" }}>No outstanding balance</div>
              </div>
            )}
          </div>
        </div>

        {/* Credit & Payments */}
        <div style={card}>
          <div style={secTitle}>Credit &amp; Payments</div>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: "0 28px" }}>

            {/* Col 1: Status + Balance */}
            <div style={{ borderRight: "1px solid #EEF1F6", paddingRight: 28 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={fLabel}>Credit Status</div>
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", marginTop: 5, borderRadius: 4,
                  ...(!selected.creditEnabled
                    ? { background: "#F0F3F7", color: "#6B7280", border: "1px solid #DDE3EC" }
                    : (selected.creditLimit > 0 && liveBal > selected.creditLimit * 0.9)
                      ? { background: "#FFEBEE", color: "#C62828", border: "1px solid #EF9A9A" }
                      : { background: "#E8F5E9", color: "#2E7D32", border: "1px solid #A5D6A7" })
                }}>
                  {!selected.creditEnabled
                    ? "Cash Only"
                    : (selected.creditLimit > 0 && liveBal > selected.creditLimit * 0.9)
                      ? "Credit Hold"
                      : "Credit Active"}
                </span>
              </div>
              <div>
                <div style={fLabel}>Balance Due</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: liveBal > 0 ? "#C62828" : "#2E7D32", marginTop: 4 }}>
                  ₹{liveBal.toFixed(2)}
                </div>
                {liveBal === 0 && (
                  <div style={{ fontSize: 11, color: "#2E7D32", fontWeight: 600, marginTop: 2 }}>No outstanding</div>
                )}
              </div>
            </div>

            {/* Col 2: Credit Limit + Utilization + Terms */}
            <div style={{ borderRight: "1px solid #EEF1F6", paddingRight: 28 }}>
              {selected.creditEnabled ? (
                <>
                  <div style={fLabel}>Credit Limit</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 17, fontWeight: 700, color: "#0C1B33", marginTop: 4, marginBottom: 8 }}>
                    ₹{selected.creditLimit.toLocaleString("en-IN")}
                  </div>
                  <div style={{ background: "#F0F3F7", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(utilPct, 100)}%`,
                      background: utilPct >= 90 ? "#C62828" : utilPct >= 70 ? "#E65100" : "#2E7D32",
                      borderRadius: 4,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 5 }}>
                    {utilPct.toFixed(0)}% utilized ·{" "}
                    <span style={{ fontFamily: "JetBrains Mono" }}>₹{Math.max(0, selected.creditLimit - liveBal).toLocaleString("en-IN")}</span> available
                  </div>
                </>
              ) : (
                <div>
                  <div style={fLabel}>Credit Limit</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 6 }}>Not applicable</div>
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                <div style={fLabel}>Payment Terms</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{selected.paymentTerms}</div>
              </div>
            </div>

            {/* Col 3: Due Date */}
            <div>
              {oldestUnpaid ? (
                <>
                  <div style={fLabel}>Oldest Unpaid Invoice</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#1B6CA8", marginTop: 4 }}>{oldestUnpaid.id}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "JetBrains Mono", marginTop: 2, marginBottom: 18 }}>
                    {oldestUnpaid.date} · ₹{(oldestUnpaid.total - oldestUnpaid.paid).toFixed(2)} due
                  </div>
                  {selected.paymentTerms !== "Cash Only" && (
                    <>
                      <div style={fLabel}>Due Date</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: dueStatus.overdue ? "#C62828" : "#0C1B33", marginTop: 4 }}>
                        {dueStatus.dateStr}
                      </div>
                      {dueStatus.daysLabel && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: dueStatus.overdue ? "#C62828" : "#6B7280", marginTop: 3 }}>
                          {dueStatus.daysLabel}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div>
                  <div style={fLabel}>Open Invoices</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 6 }}>No open invoices</div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Payment History */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ ...secTitle, marginBottom: 0 }}>Payment History ({patientPayments.length})</div>
            {patientPayments.length > 0 && (
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#2E7D32", fontWeight: 700 }}>
                ₹{patientPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)} total received
              </div>
            )}
          </div>
          {patientPayments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#9CA3AF", fontSize: 13 }}>No payment records for this patient</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E8ECF4" }}>
                    {["Date", "Payment ID", "Type", "Invoice", "Amount", "Mode", "Reference", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patientPayments.map(pay => {
                    const isInv = !!pay.invoiceId;
                    const sc    = pay.status === "Cleared"
                      ? { bg: "#E8F5E9", color: "#2E7D32" }
                      : pay.status === "Pending"
                      ? { bg: "#FFF3E0", color: "#E65100" }
                      : { bg: "#FFEBEE", color: "#C62828" };
                    return (
                      <tr key={pay.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                        <td style={{ padding: "9px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{pay.date}</td>
                        <td style={{ padding: "9px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", whiteSpace: "nowrap" }}>{pay.id}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", fontWeight: 700, background: isInv ? "#EFF6FF" : "#F0F3F7", color: isInv ? "#1B6CA8" : "#6B7280" }}>
                            {isInv ? "Invoice" : "Account"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: pay.invoice !== "—" ? "#1B6CA8" : "#9CA3AF", whiteSpace: "nowrap" }}>
                          {pay.invoice}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#2E7D32", whiteSpace: "nowrap" }}>
                          ₹{pay.amount.toFixed(2)}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#0C1B33" }}>{pay.method}</td>
                        <td style={{ padding: "9px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{pay.ref}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", fontWeight: 700, background: sc.bg, color: sc.color }}>{pay.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conditions + Medications row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Chronic Conditions */}
          <div style={card}>
            <div style={secTitle}>Chronic Conditions</div>
            {selected.conditions.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selected.conditions.map(c => (
                  <span key={c} style={{ fontSize: 12, padding: "5px 12px", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 600, border: "1px solid #BFDBFE" }}>{c}</span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>No chronic conditions recorded</span>
            )}
          </div>

          {/* Current Medications */}
          <div style={card}>
            <div style={secTitle}>Current Medications</div>
            {selected.currentMedications.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.currentMedications.map((med, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span style={{ fontSize: 13, color: "#0C1B33", fontFamily: "Inter" }}>{med}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>No current medications recorded</span>
            )}
          </div>
        </div>

        {/* Prescription history */}
        <div style={card}>
          <div style={secTitle}>Prescription History ({patientRx.length})</div>
          {patientRx.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#9CA3AF", fontSize: 13 }}>No prescriptions found for this patient</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E8ECF4" }}>
                  {["Rx ID", "Date", "Doctor", "Items", "Status", "Total"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patientRx.map(rx => {
                  const sc = RX_STATUS_COLORS[rx.status] ?? RX_STATUS_COLORS.Pending;
                  return (
                    <tr key={rx.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{rx.id}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{rx.date}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#0C1B33" }}>{rx.doctor}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#6B7280" }}>{rx.items.length} drug{rx.items.length > 1 ? "s" : ""}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, padding: "3px 8px", background: sc.bg, color: sc.color, fontWeight: 700 }}>{rx.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33" }}>₹{rx.total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showPayModal && <RecordPaymentModal patient={selected} onClose={() => setShowPayModal(false)} />}
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={S.pageTitle}>Patients</h1>
          <div style={{ ...S.mutedText, marginTop: 2 }}>{patientList.length} registered patients</div>
        </div>
        <button onClick={() => setDrawerOpen(true)} style={S.btnPrimary}>+ Add Patient</button>
      </div>

      <AddPatientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Patients", value: String(totalPatients),               sub: null,                                         color: "#1B6CA8" },
          { label: "Male",           value: String(maleCount),                   sub: null,                                         color: "#1B6CA8" },
          { label: "Female",         value: String(femaleCount),                 sub: null,                                         color: "#E65100" },
          { label: "Total Outstanding", value: `₹${totalReceivables.toFixed(2)}`, sub: overdueSet.size > 0 ? `${overdueSet.size} overdue` : null, color: "#C62828" },
        ].map(t => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{t.label}</div>
            <div style={{ fontSize: t.label === "Total Outstanding" ? 20 : 26, fontFamily: "JetBrains Mono", fontWeight: 700, color: t.color }}>{t.value}</div>
            {t.sub && <div style={{ fontSize: 11, color: "#E65100", fontWeight: 600, marginTop: 4 }}>{t.sub}</div>}
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={PT.tableCard}>

        {/* Toolbar */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "9px 12px", width: 280, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search by name, ID, or phone..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
          </div>
          {(["All", "M", "F"] as const).map(g => {
            const label  = g === "All" ? "All" : g === "M" ? "Male" : "Female";
            const active = genderFilter === g;
            return (
              <button key={g} onClick={() => setGenderFilter(g)}
                style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${active ? "#1B6CA8" : "transparent"}`, background: active ? "#fff" : "#F0F3F7", color: active ? "#1B6CA8" : "#6B7280", fontSize: 12, fontFamily: "Inter", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                {label}
              </button>
            );
          })}
          <button onClick={() => setBalanceFilter(v => !v)}
            style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${balanceFilter ? "#C62828" : "transparent"}`, background: balanceFilter ? "#fff" : "#F0F3F7", color: balanceFilter ? "#C62828" : "#6B7280", fontSize: 12, fontFamily: "Inter", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            Has Balance
          </button>
          <button onClick={() => setOverdueFilter(v => !v)}
            style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${overdueFilter ? "#C62828" : "transparent"}`, background: overdueFilter ? "#FFEBEE" : "#F0F3F7", color: overdueFilter ? "#C62828" : "#6B7280", fontSize: 12, fontFamily: "Inter", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
            Overdue
            {overdueSet.size > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "#C62828", color: "#fff", borderRadius: 10, padding: "0 5px", lineHeight: "14px" }}>{overdueSet.size}</span>}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th onSort={() => handleSort("id")}            sortDir={sortCol === "id"            ? sortDir : null}>Patient ID</Th>
              <Th onSort={() => handleSort("name")}          sortDir={sortCol === "name"          ? sortDir : null}>Name</Th>
              <Th onSort={() => handleSort("dob")}           sortDir={sortCol === "dob"           ? sortDir : null}>DOB</Th>
              <Th>Age</Th>
              <Th onSort={() => handleSort("gender")}        sortDir={sortCol === "gender"        ? sortDir : null}>Gender</Th>
              <Th onSort={() => handleSort("bloodGroup")}    sortDir={sortCol === "bloodGroup"    ? sortDir : null}>Blood Group</Th>
              <Th onSort={() => handleSort("phone")}         sortDir={sortCol === "phone"         ? sortDir : null}>Phone</Th>
              <Th onSort={() => handleSort("allergies")}     sortDir={sortCol === "allergies"     ? sortDir : null}>Allergies</Th>
              <Th onSort={() => handleSort("lastVisit")}     sortDir={sortCol === "lastVisit"     ? sortDir : null}>Last Visit</Th>
              <Th onSort={() => handleSort("prescriptions")} sortDir={sortCol === "prescriptions" ? sortDir : null}>Rx</Th>
              <Th onSort={() => handleSort("balance")}       sortDir={sortCol === "balance"       ? sortDir : null}>Balance</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(p => (
              <tr key={p.id} onClick={() => { setSelected(p); setView("detail"); }}
                style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <td style={PT.rowId}>{p.id}</td>
                <td style={PT.rowName}>{p.name}</td>
                <td style={PT.rowMono}>{p.dob}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#0C1B33", fontWeight: 600 }}>{calcAge(p.dob)}y</td>
                <td style={PT.rowMuted}>{p.gender === "M" ? "Male" : "Female"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, padding: "2px 7px", background: "#FFF3E0", color: "#E65100" }}>{p.bloodGroup}</span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" as const }}>{p.phone}</td>
                <td style={{ padding: "11px 14px" }}>
                  {p.allergies.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.allergies.map(a => (
                        <span key={a} style={{ fontSize: 10, padding: "2px 6px", background: "#FFEBEE", color: "#C62828", fontWeight: 600 }}>{a}</span>
                      ))}
                    </div>
                  ) : <span style={{ fontSize: 12, color: "#9CA3AF" }}>None</span>}
                </td>
                <td style={PT.rowMuted}>{p.lastVisit}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.prescriptions}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: p.balance > 0 ? 600 : 400, color: p.balance > 0 ? "#C62828" : "#9CA3AF" }}>
                  {p.balance > 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      ₹{p.balance.toFixed(2)}
                      {overdueSet.has(p.id) && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", background: "#FFEBEE", color: "#C62828", letterSpacing: "0.05em" }}>OVERDUE</span>
                      )}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <PaginationFooter {...footerProps} />
      </div>

      {/* Ageing Report */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "16px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 }}>Receivables Ageing</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 12 }}>
          {agingBuckets.map(b => (
            <div key={b.label} style={{ background: b.bg, borderRadius: 5, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: b.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{b.label}</div>
              <div style={{ fontSize: 20, fontFamily: "JetBrains Mono", fontWeight: 700, color: b.color }}>{b.count}</div>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: b.color, marginTop: 2 }}>₹{b.amount.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: b.color, opacity: 0.7, marginTop: 3 }}>{b.days}</div>
            </div>
          ))}
        </div>
        {totalReceivables > 0 && (
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
            {agingBuckets.filter(b => b.amount > 0).map(b => (
              <div key={b.label} title={`${b.label}: ₹${b.amount.toFixed(2)}`}
                style={{ flex: b.amount / totalReceivables, background: b.color, minWidth: 3 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
