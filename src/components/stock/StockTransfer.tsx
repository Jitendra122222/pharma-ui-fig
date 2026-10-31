import { useState, useRef } from "react";
import { SK } from "../../styles/stock";
import { drugs } from "../../data/mockData";
import { usePagination, PaginationFooter } from "../shared/usePagination";

// ── Types ───────────────────────────────────────────────────────────────────
interface CustodyEvent {
  id: string; transferRef: string; drug: string; qty: number; action: string;
  from: string; to: string; handedBy: string; receivedBy: string; datetime: string; signature: boolean;
}

interface TransferVarianceRecord {
  id: string; transferRef: string; drug: string; sentQty: number; receivedQty: number;
  variance: number; status: "Matched" | "Short" | "Over" | "Pending"; investigationRef?: string;
}

type TransferStatus = "Drafted" | "In Transit" | "Received" | "Cancelled";

interface TransferRecord {
  id: string; date: string; from: string; to: string; items: number;
  requestedBy: string; approvedBy: string; status: TransferStatus; notes?: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const CUSTODY_TRAIL: CustodyEvent[] = [
  { id: "COC-2025-0014", transferRef: "TR-2025-0041", drug: "Amoxicillin 500mg",    qty: 60, action: "Transfer", from: "Main Store",   to: "Dispensary Counter",         handedBy: "Store Manager", receivedBy: "Cashier A",      datetime: "2025-07-28 14:32", signature: true },
  { id: "COC-2025-0013", transferRef: "TR-2025-0039", drug: "Insulin Glargine",     qty: 10, action: "Transfer", from: "Cold Storage",  to: "Dispensary Counter",         handedBy: "Admin",         receivedBy: "Pharmacist",     datetime: "2025-07-22 09:18", signature: true },
  { id: "COC-2025-0012", transferRef: "TR-2025-0038", drug: "Warfarin 5mg",         qty: 3,  action: "Transfer", from: "Main Store",   to: "Controlled Substances Safe", handedBy: "Jane Doe",      receivedBy: "Dr. R. Sharma",  datetime: "2025-07-18 16:05", signature: true },
  { id: "COC-2025-0011", transferRef: "TR-2025-0038", drug: "Escitalopram 10mg",    qty: 20, action: "Transfer", from: "Main Store",   to: "Controlled Substances Safe", handedBy: "Jane Doe",      receivedBy: "Dr. R. Sharma",  datetime: "2025-07-18 16:07", signature: true },
  { id: "COC-2025-0010", transferRef: "TR-2025-0040", drug: "Insulin Glargine",     qty: 15, action: "Transfer", from: "Main Store",   to: "Cold Storage",               handedBy: "Admin",         receivedBy: "—",              datetime: "2025-07-25 11:44", signature: false },
];

const TRANSFER_VARIANCE: TransferVarianceRecord[] = [
  { id: "TV-2025-0006", transferRef: "TR-2025-0041", drug: "Amoxicillin 500mg",  sentQty: 60,  receivedQty: 60, variance:   0, status: "Matched" },
  { id: "TV-2025-0005", transferRef: "TR-2025-0041", drug: "Paracetamol 500mg",  sentQty: 100, receivedQty: 98, variance:  -2, status: "Short",   investigationRef: "INV-2026-0002" },
  { id: "TV-2025-0004", transferRef: "TR-2025-0039", drug: "Insulin Glargine",   sentQty: 10,  receivedQty: 10, variance:   0, status: "Matched" },
  { id: "TV-2025-0003", transferRef: "TR-2025-0038", drug: "Warfarin 5mg",       sentQty: 3,   receivedQty: 3,  variance:   0, status: "Matched" },
  { id: "TV-2025-0002", transferRef: "TR-2025-0038", drug: "Escitalopram 10mg",  sentQty: 20,  receivedQty: 21, variance:   1, status: "Over" },
  { id: "TV-2025-0001", transferRef: "TR-2025-0040", drug: "Insulin Glargine",   sentQty: 15,  receivedQty: 0,  variance: -15, status: "Pending" },
];

const SEED_HISTORY: TransferRecord[] = [
  { id: "TR-2025-0041", date: "2025-07-28", from: "Main Store",  to: "Dispensary Counter",         items: 3, requestedBy: "Jane Doe",      approvedBy: "Mark Stevens",  status: "Received",   notes: "Routine replenishment" },
  { id: "TR-2025-0040", date: "2025-07-25", from: "Main Store",  to: "Cold Storage",               items: 2, requestedBy: "Admin",         approvedBy: "Jane Doe",      status: "In Transit" },
  { id: "TR-2025-0039", date: "2025-07-22", from: "Cold Storage",to: "Dispensary Counter",         items: 1, requestedBy: "Pharmacist",    approvedBy: "Mark Stevens",  status: "Received" },
  { id: "TR-2025-0038", date: "2025-07-18", from: "Main Store",  to: "Controlled Substances Safe", items: 2, requestedBy: "Jane Doe",      approvedBy: "Dr. R. Sharma", status: "Received" },
  { id: "TR-2025-0037", date: "2025-07-14", from: "Main Store",  to: "Dispensary Counter",         items: 4, requestedBy: "Anna Kowalski", approvedBy: "Mark Stevens",  status: "Cancelled",  notes: "Items not available" },
];

const STATUS_STYLE: Record<TransferStatus, { bg: string; color: string }> = {
  "Drafted":    { bg: "#F0F3F7", color: "#6B7280" },
  "In Transit": { bg: "#FFF3E0", color: "#E65100" },
  "Received":   { bg: "#E8F5E9", color: "#2E7D32" },
  "Cancelled":  { bg: "#FFEBEE", color: "#C62828" },
};

const LOCATIONS = ["Main Store", "Cold Storage", "Dispensary Counter", "Controlled Substances Safe"];
const STAFF     = ["Jane Doe", "Mark Stevens", "Anna Kowalski", "Admin", "Pharmacist", "Dr. R. Sharma"];

const EMPTY_FORM = { from: "", to: "", date: "", requestedBy: "", approvedBy: "", notes: "" };

// ── Label component ──────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
      {children}
    </label>
  );
}

export default function StockTransfer() {
  const [transferView, setTransferView] = useState<"history" | "variance" | "custody">("history");

  // Transfer history
  const [allTransfers, setAllTransfers] = useState<TransferRecord[]>(SEED_HISTORY);
  const [histSearch,  setHistSearch]  = useState("");
  const [histStatus,  setHistStatus]  = useState<"All" | TransferStatus>("All");

  // New Transfer modal
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [lines,      setLines]      = useState([{ drug: "", qty: "" }]);

  // Searchable dropdown state for modal fields
  const [fromOpen,   setFromOpen]   = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const fromRef = useRef<HTMLInputElement>(null);

  const [toOpen,     setToOpen]     = useState(false);
  const [toSearch,   setToSearch]   = useState("");
  const toRef = useRef<HTMLInputElement>(null);

  const [reqOpen,    setReqOpen]    = useState(false);
  const [reqSearch,  setReqSearch]  = useState("");
  const reqRef = useRef<HTMLInputElement>(null);

  const [appOpen,    setAppOpen]    = useState(false);
  const [appSearch,  setAppSearch]  = useState("");
  const appRef = useRef<HTMLInputElement>(null);

  const [drugOpenIdx,    setDrugOpenIdx]    = useState<number | null>(null);
  const [drugSearchText, setDrugSearchText] = useState("");

  // Variance + CoC
  const [varianceFilter, setVarianceFilter] = useState<"All" | "Short" | "Over" | "Matched" | "Pending">("All");
  const [cocSearch,      setCocSearch]      = useState("");

  // Action menu (Transfer History rows)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Toast
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function resetModalDropdowns() {
    setFromOpen(false); setFromSearch("");
    setToOpen(false);   setToSearch("");
    setReqOpen(false);  setReqSearch("");
    setAppOpen(false);  setAppSearch("");
    setDrugOpenIdx(null); setDrugSearchText("");
  }
  function openModal()  { setForm(EMPTY_FORM); setLines([{ drug: "", qty: "" }]); resetModalDropdowns(); setShowModal(true); }
  function closeModal() { resetModalDropdowns(); setShowModal(false); }

  function submitTransfer(asDraft: boolean) {
    const filled = lines.filter(l => l.drug && l.qty);
    const newRec: TransferRecord = {
      id: `TR-${Date.now()}`,
      date: form.date || new Date().toISOString().slice(0, 10),
      from: form.from || "Main Store",
      to:   form.to   || "Dispensary Counter",
      items: filled.length || lines.length,
      requestedBy: form.requestedBy || "—",
      approvedBy:  form.approvedBy  || "—",
      status: asDraft ? "Drafted" : "In Transit",
      notes: form.notes || undefined,
    };
    setAllTransfers(prev => [newRec, ...prev]);
    closeModal();
    showToast(asDraft ? "Transfer saved as draft." : "Transfer posted — now In Transit.", "success");
  }

  // Filtered lists
  const histFiltered = allTransfers.filter(t => {
    const q = histSearch.toLowerCase();
    const matchQ = !q || t.id.toLowerCase().includes(q) || t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q) || t.requestedBy.toLowerCase().includes(q);
    const matchS = histStatus === "All" || t.status === histStatus;
    return matchQ && matchS;
  });

  const variances  = TRANSFER_VARIANCE.filter(v => v.status === "Short" || v.status === "Over").length;
  const missingSigs = CUSTODY_TRAIL.filter(c => !c.signature).length;
  const varianceFiltered = TRANSFER_VARIANCE.filter(v => varianceFilter === "All" || v.status === varianceFilter);
  const cocFiltered = CUSTODY_TRAIL.filter(c => {
    if (!cocSearch) return true;
    const q = cocSearch.toLowerCase();
    return c.drug.toLowerCase().includes(q) || c.transferRef.toLowerCase().includes(q) || c.handedBy.toLowerCase().includes(q) || c.receivedBy.toLowerCase().includes(q);
  });

  const { pageRows: histPageRows, footerProps: histFooterProps } = usePagination(histFiltered, 10);
  const { pageRows: varPageRows,  footerProps: varFooterProps  } = usePagination(varianceFiltered, 10);
  const { pageRows: cocPageRows,  footerProps: cocFooterProps  } = usePagination(cocFiltered, 10);

  // KPI values
  const total     = allTransfers.length;
  const inTransit = allTransfers.filter(t => t.status === "In Transit").length;
  const received  = allTransfers.filter(t => t.status === "Received").length;
  const cancelled = allTransfers.filter(t => t.status === "Cancelled").length;
  const drafted   = allTransfers.filter(t => t.status === "Drafted").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Total Transfers",   value: total,     color: "#1B6CA8" },
          { label: "Drafted",           value: drafted,   color: "#6B7280" },
          { label: "In Transit",        value: inTransit, color: "#E65100" },
          { label: "Received",          value: received,  color: "#2E7D32" },
          { label: "Cancelled",         value: cancelled, color: "#C62828" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabbed Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "history"  as const, label: "Transfer History",  badge: inTransit > 0 ? inTransit : null, badgeColor: "#E65100", badgeBg: "#FFF3E0" },
            { key: "variance" as const, label: "Variance",          badge: variances > 0 ? variances : null, badgeColor: "#C62828", badgeBg: "#FFEBEE" },
            { key: "custody"  as const, label: "Chain of Custody",  badge: missingSigs > 0 ? missingSigs : null, badgeColor: "#E65100", badgeBg: "#FFF3E0" },
          ]).map(t => (
            <button key={t.key} onClick={() => setTransferView(t.key)}
              style={{
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontFamily: "Inter",
                fontWeight: transferView === t.key ? 600 : 400,
                color: transferView === t.key ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${transferView === t.key ? "#1B6CA8" : "transparent"}`,
                marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}>
              {t.label}
              {t.badge != null && (
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: t.badgeBg, color: t.badgeColor }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Transfer History tab ── */}
        {transferView === "history" && (
          <>
            {/* Toolbar */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
              <div style={{ ...SK.searchWrapper, flex: "0 0 240px" }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search transfers..." value={histSearch} onChange={e => setHistSearch(e.target.value)} style={SK.searchInput} />
              </div>
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "Drafted", "In Transit", "Received", "Cancelled"] as const).map(s => (
                  <button key={s} onClick={() => setHistStatus(s)}
                    style={{ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: histStatus === s ? 600 : 400, fontFamily: "Inter", border: `1px solid ${histStatus === s ? "#1B6CA8" : "#DDE3EC"}`, background: histStatus === s ? "#EFF6FF" : "#fff", color: histStatus === s ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" as const }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={openModal}
                  style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", minHeight: 40, boxSizing: "border-box" as const }}>
                  + New Transfer
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Transfer #", "Date", "From", "To", "Items", "Requested By", "Approved By", "Status", "Notes", "Actions"].map(h => (
                      <th key={h} style={{ ...SK.th, background: "#FAFBFD" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {histPageRows.map(t => {
                    const ss = STATUS_STYLE[t.status];
                    const menuOpen = actionMenuOpen === t.id;
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{t.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{t.date}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{t.from}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>→</span>{t.to}
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" as const }}>{t.items}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.requestedBy}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.approvedBy}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontSize: 10, padding: "3px 9px", background: ss.bg, color: ss.color, fontWeight: 700, letterSpacing: "0.04em" }}>{t.status}</span>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#9CA3AF", fontStyle: t.notes ? "normal" : "italic" }}>{t.notes ?? "—"}</td>

                        {/* Actions column */}
                        <td style={{ padding: "11px 13px" }}>
                          {(t.status === "Drafted" || t.status === "In Transit") ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              {menuOpen && (
                                <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setActionMenuOpen(null)} />
                              )}
                              <button
                                onClick={() => setActionMenuOpen(open => open === t.id ? null : t.id)}
                                style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: menuOpen ? "#F0F3F7" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                              </button>
                              {menuOpen && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 150 }}>
                                  {t.status === "Drafted" && (
                                    <div
                                      onMouseDown={() => {
                                        setAllTransfers(prev => prev.map(r => r.id === t.id ? { ...r, status: "In Transit" as TransferStatus } : r));
                                        setActionMenuOpen(null);
                                        showToast(`${t.id} approved — now In Transit`, "success");
                                      }}
                                      style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#1B6CA8", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                      Approve
                                    </div>
                                  )}
                                  {t.status === "In Transit" && (
                                    <div
                                      onMouseDown={() => {
                                        setAllTransfers(prev => prev.map(r => r.id === t.id ? { ...r, status: "Received" as TransferStatus } : r));
                                        setActionMenuOpen(null);
                                        showToast(`${t.id} marked as Received`, "success");
                                      }}
                                      style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#2E7D32", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#E8F5E9"; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                      Mark Received
                                    </div>
                                  )}
                                  {t.status === "Drafted" && (
                                    <div
                                      onMouseDown={() => {
                                        setAllTransfers(prev => prev.map(r => r.id === t.id ? { ...r, status: "In Transit" as TransferStatus } : r));
                                        setActionMenuOpen(null);
                                        showToast(`${t.id} submitted for approval`, "success");
                                      }}
                                      style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#E65100", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF3E0"; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      Require Approval
                                    </div>
                                  )}
                                  <div style={{ height: 1, background: "#EEF1F6" }} />
                                  <div
                                    onMouseDown={() => {
                                      setAllTransfers(prev => prev.map(r => r.id === t.id ? { ...r, status: "Cancelled" as TransferStatus } : r));
                                      setActionMenuOpen(null);
                                      showToast(`${t.id} has been cancelled`, "error");
                                    }}
                                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#C62828", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                    Cancel
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {histPageRows.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No transfers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...histFooterProps} />
          </>
        )}

        {/* ── Variance tab ── */}
        {transferView === "variance" && (
          <>
            <div style={{ padding: "10px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Filter:</span>
              {(["All", "Short", "Over", "Matched", "Pending"] as const).map(f => (
                <button key={f} onClick={() => setVarianceFilter(f)} style={SK.filterPill(varianceFilter === f)}>{f}</button>
              ))}
              {variances > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 12, padding: "3px 10px", background: "#FFEBEE", color: "#C62828", fontWeight: 700 }}>
                  {variances} variance{variances !== 1 ? "s" : ""} detected
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Ref", "Transfer #", "Drug", "Sent", "Received", "Variance", "Status", ""].map(h => (
                      <th key={h} style={{ ...SK.th, background: "#FAFBFD", textAlign: (h === "Sent" || h === "Received" || h === "Variance") ? "right" as const : "left" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {varPageRows.map(v => {
                    const varStyle = v.variance < 0 ? { bg: "#FFEBEE", color: "#C62828" } : v.variance > 0 ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#E8F5E9", color: "#2E7D32" };
                    const stStyle  = v.status === "Matched" ? { bg: "#E8F5E9", color: "#2E7D32" } : v.status === "Short" ? { bg: "#FFEBEE", color: "#C62828" } : v.status === "Over" ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#F0F3F7", color: "#6B7280" };
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{v.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{v.transferRef}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{v.drug}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{v.sentQty}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: v.status === "Pending" ? "#9CA3AF" : "#1A2436", textAlign: "right" as const }}>{v.status === "Pending" ? "—" : v.receivedQty}</td>
                        <td style={{ padding: "11px 13px", textAlign: "right" as const }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, padding: "2px 8px", background: varStyle.bg, color: varStyle.color }}>
                            {v.variance === 0 ? "0" : v.variance > 0 ? `+${v.variance}` : v.variance}
                          </span>
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", background: stStyle.bg, color: stStyle.color, fontWeight: 700 }}>{v.status}</span>
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          {v.investigationRef
                            ? <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{v.investigationRef}</span>
                            : (v.status === "Short" || v.status === "Over") && (
                                <button style={{ padding: "4px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Investigate</button>
                              )
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...varFooterProps} />
          </>
        )}

        {/* ── Chain of Custody tab ── */}
        {transferView === "custody" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ ...SK.searchWrapper, flex: "0 0 260px" }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search chain of custody..." value={cocSearch} onChange={e => setCocSearch(e.target.value)} style={SK.searchInput} />
              </div>
              {missingSigs > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 12, padding: "3px 10px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>
                  {missingSigs} missing signature{missingSigs !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Custody ID", "Transfer #", "Drug", "Qty", "Action", "From → To", "Handed By", "Received By", "Date & Time", "Signature"].map(h => (
                      <th key={h} style={{ ...SK.th, background: "#FAFBFD" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cocPageRows.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 13px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.id}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{c.transferRef}</td>
                      <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{c.drug}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{c.qty}</td>
                      <td style={{ padding: "11px 13px" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 700 }}>{c.action}</span>
                      </td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>
                        {c.from} <span style={{ color: "#9CA3AF", margin: "0 4px" }}>→</span> {c.to}
                      </td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{c.handedBy}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: c.receivedBy === "—" ? "#9CA3AF" : "#1A2436", fontStyle: c.receivedBy === "—" ? "italic" : "normal" }}>{c.receivedBy}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.datetime}</td>
                      <td style={{ padding: "11px 13px" }}>
                        {c.signature
                          ? <span style={{ fontSize: 10, padding: "2px 8px", background: "#E8F5E9", color: "#2E7D32", fontWeight: 700 }}>Signed</span>
                          : <span style={{ fontSize: 10, padding: "2px 8px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>Missing</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...cocFooterProps} />
          </>
        )}
      </div>

      {/* ── New Transfer Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 600, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>New Stock Transfer</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Create an inter-branch transfer request</div>
              </div>
              <button onClick={closeModal} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Transfer Details — 3-col grid */}
              <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 2 }}>Transfer Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

                {/* From Location */}
                <div>
                  <FieldLabel>From Location</FieldLabel>
                  <div style={{ position: "relative" }}>
                    {fromOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setFromOpen(false); setFromSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }} onClick={() => { setFromOpen(true); setTimeout(() => fromRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={fromRef} value={fromSearch || form.from} placeholder="Search location..."
                        onChange={e => { setFromSearch(e.target.value); setFromOpen(true); if (!e.target.value) setForm(p => ({ ...p, from: "" })); }}
                        onFocus={() => { setFromOpen(true); setFromSearch(""); }}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${fromOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                      {form.from && !fromSearch && <span style={{ position: "absolute", right: 10, fontSize: 10, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 7px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>✓</span>}
                    </div>
                    {fromOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, overflow: "hidden" }}>
                        {(fromSearch ? LOCATIONS.filter(l => l.toLowerCase().includes(fromSearch.toLowerCase())) : LOCATIONS).map(l => {
                          const active = form.from === l;
                          return <div key={l} onMouseDown={() => { setForm(p => ({ ...p, from: l })); setFromSearch(""); setFromOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>{l}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* To Location */}
                <div>
                  <FieldLabel>To Location</FieldLabel>
                  <div style={{ position: "relative" }}>
                    {toOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setToOpen(false); setToSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }} onClick={() => { setToOpen(true); setTimeout(() => toRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={toRef} value={toSearch || form.to} placeholder="Search location..."
                        onChange={e => { setToSearch(e.target.value); setToOpen(true); if (!e.target.value) setForm(p => ({ ...p, to: "" })); }}
                        onFocus={() => { setToOpen(true); setToSearch(""); }}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${toOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                      {form.to && !toSearch && <span style={{ position: "absolute", right: 10, fontSize: 10, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 7px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>✓</span>}
                    </div>
                    {toOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, overflow: "hidden" }}>
                        {(toSearch ? LOCATIONS.filter(l => l.toLowerCase().includes(toSearch.toLowerCase())) : LOCATIONS).map(l => {
                          const active = form.to === l;
                          return <div key={l} onMouseDown={() => { setForm(p => ({ ...p, to: l })); setToSearch(""); setToOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>{l}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer Date */}
                <div>
                  <FieldLabel>Transfer Date</FieldLabel>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                </div>

                {/* Requested By */}
                <div>
                  <FieldLabel>Requested By</FieldLabel>
                  <div style={{ position: "relative" }}>
                    {reqOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setReqOpen(false); setReqSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }} onClick={() => { setReqOpen(true); setTimeout(() => reqRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={reqRef} value={reqSearch || form.requestedBy} placeholder="Search staff..."
                        onChange={e => { setReqSearch(e.target.value); setReqOpen(true); if (!e.target.value) setForm(p => ({ ...p, requestedBy: "" })); }}
                        onFocus={() => { setReqOpen(true); setReqSearch(""); }}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${reqOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                      {form.requestedBy && !reqSearch && <span style={{ position: "absolute", right: 10, fontSize: 10, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 7px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>✓</span>}
                    </div>
                    {reqOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, overflow: "hidden" }}>
                        {(reqSearch ? STAFF.filter(s => s.toLowerCase().includes(reqSearch.toLowerCase())) : STAFF).map(s => {
                          const active = form.requestedBy === s;
                          return <div key={s} onMouseDown={() => { setForm(p => ({ ...p, requestedBy: s })); setReqSearch(""); setReqOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>{s}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approved By */}
                <div>
                  <FieldLabel>Approved By</FieldLabel>
                  <div style={{ position: "relative" }}>
                    {appOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setAppOpen(false); setAppSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }} onClick={() => { setAppOpen(true); setTimeout(() => appRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={appRef} value={appSearch || form.approvedBy} placeholder="Search staff..."
                        onChange={e => { setAppSearch(e.target.value); setAppOpen(true); if (!e.target.value) setForm(p => ({ ...p, approvedBy: "" })); }}
                        onFocus={() => { setAppOpen(true); setAppSearch(""); }}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${appOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                      {form.approvedBy && !appSearch && <span style={{ position: "absolute", right: 10, fontSize: 10, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 7px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>✓</span>}
                    </div>
                    {appOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, overflow: "hidden" }}>
                        {(appSearch ? STAFF.filter(s => s.toLowerCase().includes(appSearch.toLowerCase())) : STAFF).map(s => {
                          const active = form.approvedBy === s;
                          return <div key={s} onMouseDown={() => { setForm(p => ({ ...p, approvedBy: s })); setAppSearch(""); setAppOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>{s}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <input type="text" placeholder="Reason for transfer" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                </div>
              </div>

              {/* Items section */}
              <div style={{ borderTop: "1px solid #EEF1F6", paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Items to Transfer</div>
                  <button onClick={() => setLines(l => [...l, { drug: "", qty: "" }])}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #1B6CA8", background: "transparent", color: "#1B6CA8", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                    + Add Item
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lines.map((ln, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr auto", gap: 10, alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        {drugOpenIdx === i && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setDrugOpenIdx(null); setDrugSearchText(""); }} />}
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}
                          onClick={() => { setDrugOpenIdx(i); setDrugSearchText(""); setTimeout(() => (document.getElementById(`drug-input-${i}`) as HTMLInputElement | null)?.focus(), 50); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                          <input id={`drug-input-${i}`}
                            value={drugOpenIdx === i ? drugSearchText : ln.drug}
                            onChange={e => { setDrugSearchText(e.target.value); setDrugOpenIdx(i); if (!e.target.value) setLines(l => l.map((r, j) => j === i ? { ...r, drug: "" } : r)); }}
                            onFocus={() => { setDrugOpenIdx(i); setDrugSearchText(""); }}
                            placeholder="Search drug..."
                            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${drugOpenIdx === i ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                          {ln.drug && drugOpenIdx !== i && <span style={{ position: "absolute", right: 10, fontSize: 10, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 7px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>✓</span>}
                        </div>
                        {drugOpenIdx === i && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 180, overflowY: "auto" }}>
                            {(drugSearchText ? drugs.filter(d => d.name.toLowerCase().includes(drugSearchText.toLowerCase()) || d.category.toLowerCase().includes(drugSearchText.toLowerCase())) : drugs).length === 0
                              ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No drugs found</div>
                              : (drugSearchText ? drugs.filter(d => d.name.toLowerCase().includes(drugSearchText.toLowerCase()) || d.category.toLowerCase().includes(drugSearchText.toLowerCase())) : drugs).map(d => {
                                  const active = ln.drug === d.name;
                                  return (
                                    <div key={d.id} onMouseDown={() => { setLines(l => l.map((r, j) => j === i ? { ...r, drug: d.name } : r)); setDrugSearchText(""); setDrugOpenIdx(null); }}
                                      style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: active ? "#EFF6FF" : "#fff" }}
                                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{d.category}</div>
                                      </div>
                                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.unit}</div>
                                    </div>
                                  );
                                })
                            }
                          </div>
                        )}
                      </div>
                      <input type="number" min={1} placeholder="Qty" value={ln.qty}
                        onChange={e => setLines(l => l.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))}
                        style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right" as const }} />
                      {lines.length > 1 && (
                        <button onClick={() => setLines(l => l.filter((_, j) => j !== i))}
                          style={{ border: "none", background: "transparent", color: "#C62828", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
              <button onClick={closeModal}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                Cancel
              </button>
              <button onClick={() => submitTransfer(true)}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 600 }}>
                Save Draft
              </button>
              <button onClick={() => submitTransfer(false)}
                style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Post Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
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
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.msg}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
