import { useState, useRef } from "react";
import { S } from "../styles/common";
import { RX } from "../styles/prescriptions";
import { prescriptions as initialPrescriptions, patients } from "../data/mockData";
import { DOCTORS } from "./sales/salesData";
import PrintDialog from "./shared/PrintDialog";
import type { PrintJobType } from "./shared/PrintDialog";
import { Th } from "./shared/Th";
import { Pill, STATUS_PILL } from "./shared/Pill";
import { useTableSort } from "./shared/useTableSort";
import { usePagination, PaginationFooter } from "./shared/usePagination";

type RxStatus = "Pending" | "Partial" | "Dispensed" | "Cancelled";
type RxItem = { drug: string; qty: number; days: number; instructions: string };
type Rx = {
  id: string; patient: string; patientId: string;
  doctor: string; date: string; status: RxStatus;
  items: RxItem[]; total: number; notes?: string; linkedInvoiceId?: string;
};
type View = "list" | "detail";

const todayStr = () => new Date().toISOString().slice(0, 10);
const startOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); };
const startOfMonth = () => new Date().toISOString().slice(0, 8) + "01";

const SAMPLE_INSTRUCTIONS = [
  "1 capsule twice daily after meals",
  "1 tablet before bedtime with water",
  "2 tablets thrice daily after food",
  "As directed by physician",
  "1 tablet once daily in the morning",
  "Inhale as needed, max 4 puffs/day",
];

const rxSeed: Rx[] = initialPrescriptions.map(p => ({
  id: p.id,
  patient: p.patient,
  patientId: p.patientId,
  doctor: p.doctor,
  date: p.date,
  status: p.status as RxStatus,
  total: p.total,
  items: p.items.map((it, i) => ({ ...it, instructions: SAMPLE_INSTRUCTIONS[i % SAMPLE_INSTRUCTIONS.length] })),
}));


// ─── Toast helper ─────────────────────────────────────────────────────────────

function Toast({ message, ok, toastKey, onClose }: { message: string; ok: boolean; toastKey: number; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
      <div key={toastKey} style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: ok ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
            <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{message}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontFamily: "Inter", padding: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Prescriptions
    </button>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Prescriptions() {
  const [view, setView] = useState<View>("list");
  const [rxList, setRxList] = useState<Rx[]>(rxSeed);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [dispenseModal, setDispenseModal] = useState(false);
  const [dispenseChecked, setDispenseChecked] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastOk, setToastOk] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg); setToastOk(ok); setToastKey(k => k + 1);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const updateRx = (id: string, patch: Partial<Rx>) =>
    setRxList(list => list.map(r => r.id === id ? { ...r, ...patch } : r));

  const goBack = () => { setView("list"); setDispenseModal(false); };

  const openDetail = (rx: Rx) => { setSelectedId(rx.id); setView("detail"); };

  // ─── List-view data (hooks must be called unconditionally) ──────────────────
  const filtered = rxList.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.patient.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.doctor.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const today = todayStr();
    const matchDate =
      dateFilter === "all" ||
      (dateFilter === "today" && p.date === today) ||
      (dateFilter === "week" && p.date >= startOfWeek()) ||
      (dateFilter === "month" && p.date >= startOfMonth());
    return matchSearch && matchStatus && matchDate;
  });
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedRows, 10);

  const handleDispense = (rx: Rx) => {
    if (rx.items.length <= 1) {
      updateRx(rx.id, { status: "Dispensed" });
      showToast(`${rx.id} dispensed successfully`);
    } else {
      const init: Record<number, boolean> = {};
      rx.items.forEach((_, i) => { init[i] = true; });
      setDispenseChecked(init);
      setDispenseModal(true);
    }
  };

  const confirmDispense = (rx: Rx) => {
    const allChecked = rx.items.every((_, i) => dispenseChecked[i]);
    const anyChecked = rx.items.some((_, i) => dispenseChecked[i]);
    if (!anyChecked) { setDispenseModal(false); return; }
    const newStatus: RxStatus = allChecked ? "Dispensed" : "Partial";
    updateRx(rx.id, { status: newStatus });
    setDispenseModal(false);
    showToast(`${rx.id} marked as ${newStatus}`);
  };

  // ─── Detail View ─────────────────────────────────────────────────────────────

  if (view === "detail") {
    const rx = rxList.find(r => r.id === selectedId);
    if (!rx) { goBack(); return null; }
    const patientInfo = patients.find(p => p.id === rx.patientId);
    const doctorInfo = DOCTORS.find(d => d.name === rx.doctor);
    const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 };
    const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "18px 20px" };

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <BackBtn onClick={goBack} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPrintJob({ jobType: "Prescription Label", docId: rx.id })} style={{ ...S.btnSecondary, fontSize: 12 }}>
                Print Label
              </button>
              {(rx.status === "Pending" || rx.status === "Partial") && (
                <button onClick={() => handleDispense(rx)} style={{ ...S.btnPrimary, fontSize: 12 }}>
                  {rx.items.length > 1 ? "Dispense Items" : "Dispense"}
                </button>
              )}
            </div>
          </div>

          {/* Rx header card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: "#1B6CA8", letterSpacing: "-0.01em" }}>{rx.id}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{rx.date} · {rx.doctor}</div>
              </div>
              <Pill status={rx.status} />
            </div>
            {rx.linkedInvoiceId && (
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 4, padding: "4px 10px", fontSize: 12 }}>
                <span style={{ color: "#6B7280" }}>Linked Invoice:</span>
                <span style={{ fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{rx.linkedInvoiceId}</span>
              </div>
            )}
          </div>

          {/* 2-col body */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

            {/* Left: patient + items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Patient */}
              <div style={cardStyle}>
                <div style={sectionTitle}>Patient Information</div>
                {patientInfo ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                    {[
                      { label: "Name", value: patientInfo.name },
                      { label: "Patient ID", value: patientInfo.id, mono: true },
                      { label: "Phone", value: patientInfo.phone },
                      { label: "Date of Birth", value: patientInfo.dob },
                      { label: "Blood Group", value: patientInfo.bloodGroup },
                      { label: "Gender", value: patientInfo.gender === "M" ? "Male" : "Female" },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>{r.label}</div>
                        <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500, fontFamily: r.mono ? "JetBrains Mono" : "Inter" }}>{r.value}</div>
                      </div>
                    ))}
                    {patientInfo.allergies.length > 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>Allergies</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                          {patientInfo.allergies.map(a => (
                            <span key={a} style={{ background: "#FFEBEE", color: "#C62828", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{rx.patient}</div>
                )}
              </div>

              {/* Prescribed Items */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={sectionTitle}>Prescribed Items</div>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{rx.items.length} drug{rx.items.length !== 1 ? "s" : ""}</span>
                </div>
                {rx.items.map((item, i) => (
                  <div key={i} style={{ padding: "14px 0", borderBottom: i < rx.items.length - 1 ? "1px solid #F0F3F7" : "none" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0C1B33" }}>{item.drug}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                      Qty: <span style={{ fontFamily: "JetBrains Mono" }}>{item.qty}</span> &nbsp;·&nbsp; {item.days} days supply
                    </div>
                    {item.instructions && (
                      <div style={{ fontSize: 12, color: "#1B6CA8", marginTop: 4, fontStyle: "italic" }}>{item.instructions}</div>
                    )}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #DDE3EC", paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "Outfit", color: "#0C1B33" }}>Total</span>
                  <span style={{ fontSize: 16, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>₹{rx.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {rx.notes && (
                <div style={cardStyle}>
                  <div style={sectionTitle}>Notes</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{rx.notes}</div>
                </div>
              )}
            </div>

            {/* Right: doctor + summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Doctor */}
              <div style={cardStyle}>
                <div style={sectionTitle}>Prescribing Doctor</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0C1B33" }}>{rx.doctor}</div>
                {doctorInfo && (
                  <>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{doctorInfo.specialty}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", marginTop: 2 }}>{doctorInfo.phone}</div>
                  </>
                )}
              </div>

              {/* Summary */}
              <div style={cardStyle}>
                <div style={sectionTitle}>Prescription Summary</div>
                {[
                  { label: "Rx ID", value: rx.id, mono: true },
                  { label: "Date", value: rx.date, mono: true },
                  { label: "Total Items", value: String(rx.items.length) },
                  { label: "Total Amount", value: `₹${rx.total.toFixed(2)}`, mono: true },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F3F7" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0C1B33", fontFamily: r.mono ? "JetBrains Mono" : "Inter" }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Status</span>
                  <Pill status={rx.status} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Partial dispense modal */}
        {dispenseModal && (
          <>
            <div onClick={() => setDispenseModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.4)", zIndex: 200 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", padding: 24, zIndex: 201, width: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>Dispense Items</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 18 }}>Select which items are available to dispense:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {rx.items.map((item, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: `1px solid ${dispenseChecked[i] ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, cursor: "pointer", background: dispenseChecked[i] ? "#EFF6FF" : "#fff" }}>
                    <input type="checkbox" checked={!!dispenseChecked[i]} onChange={e => setDispenseChecked(c => ({ ...c, [i]: e.target.checked }))} style={{ width: 15, height: 15, accentColor: "#1B6CA8", cursor: "pointer" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{item.drug}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Qty: {item.qty} · {item.days} days</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDispenseModal(false)} style={{ ...S.btnSecondary, flex: 1 }}>Cancel</button>
                <button onClick={() => confirmDispense(rx)} style={{ ...S.btnPrimary, flex: 1 }}>Confirm Dispense</button>
              </div>
            </div>
          </>
        )}

        {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
        {toast && <Toast message={toast} ok={toastOk} toastKey={toastKey} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={S.pageTitle}>Prescriptions</h1>
            <div style={{ ...S.mutedText, marginTop: 2 }}>℞ {rxList.length} total · {rxList.filter(r => r.status === "Pending").length} pending</div>
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {["Pending", "Partial", "Dispensed", "Cancelled"].map(s => {
            const count = rxList.filter(p => p.status === s).length;
            const pill = STATUS_PILL[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "All" : s)}
                style={{ ...RX.statusCard, borderRadius: 6, border: `1px solid ${statusFilter === s ? (pill?.color ?? "#6B7280") : "#DDE3EC"}` }}>
                <div style={RX.statusLabel}>{s}</div>
                <div style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, color: pill?.color ?? "#6B7280" }}>{count}</div>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div style={RX.tableCard}>
          {/* Toolbar — single row: search | date chips | status */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search bar — fixed width, taller */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "9px 12px", width: 280, flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search patient, Rx ID, doctor..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
            </div>
            {/* Date dropdown */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value as "all" | "today" | "week" | "month")}
                style={{ padding: "8px 28px 8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none", WebkitAppearance: "none", cursor: "pointer", color: "#1A2436", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")}>
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>&#9660;</span>
            </div>
            {/* Status pill buttons */}
            {(["All", "Pending", "Partial", "Dispensed", "Cancelled"] as const).map(s => {
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${active ? "#1B6CA8" : "transparent"}`, background: active ? "#fff" : "#F0F3F7", color: active ? "#1B6CA8" : "#6B7280", fontSize: 12, fontFamily: "Inter", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                  {s}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Rx ID</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
                <Th onSort={() => handleSort("doctor")} sortDir={sortCol === "doctor" ? sortDir : null}>Prescribing Doctor</Th>
                <Th>Items</Th>
                <Th onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No prescriptions match the current filters</td></tr>
              ) : pageRows.map(rx => (
                <tr key={rx.id} onClick={() => openDetail(rx)}
                  style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={RX.rowId}>{rx.id}</td>
                  <td style={RX.rowMuted}>{rx.date}</td>
                  <td style={RX.rowName}>{rx.patient}</td>
                  <td style={RX.rowMuted}>{rx.doctor}</td>
                  <td style={RX.rowMono}>{rx.items.length}</td>
                  <td style={RX.rowMonoBold}>₹{rx.total.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px" }}><Pill status={rx.status} /></td>
                  <td style={RX.rowLink}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter {...footerProps} />
        </div>
      </div>

      {toast && <Toast message={toast} ok={toastOk} toastKey={toastKey} onClose={() => setToast(null)} />}
    </>
  );
}
