import { useState, useRef } from "react";
import { SK } from "../../styles/stock";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { expiryItems } from "./stockData";
import { drugs } from "../../data/mockData";

type QuarantineStatus = "Quarantined" | "Under Review" | "Cleared" | "Disposed";

interface QuarantineRecord {
  id: string;
  drug: string;
  qty: number;
  reason: string;
  startDate: string;
  reviewDate: string;
  status: QuarantineStatus;
  location: string;
  value: number;
  daysInQuarantine: number;
}

const QUARANTINE_DATA: QuarantineRecord[] = [
  { id: "QRN-2025-0012", drug: "Ciprofloxacin 500mg", qty: 12, reason: "Near-expiry (< 30 days)", startDate: "2025-07-18", reviewDate: "2025-07-28", status: "Under Review", location: "Quarantine Bay 1", value: 720, daysInQuarantine: 10 },
  { id: "QRN-2025-0011", drug: "Insulin Glargine", qty: 5, reason: "Cold chain breach suspected", startDate: "2025-07-12", reviewDate: "2025-07-22", status: "Quarantined", location: "Cold Quarantine", value: 4250, daysInQuarantine: 16 },
  { id: "QRN-2025-0010", drug: "Warfarin 5mg", qty: 4, reason: "Damaged packaging", startDate: "2025-07-05", reviewDate: "2025-07-15", status: "Disposed", location: "—", value: 200, daysInQuarantine: 23 },
  { id: "QRN-2025-0009", drug: "Metformin 1000mg", qty: 18, reason: "Moisture damage", startDate: "2025-06-28", reviewDate: "2025-07-08", status: "Cleared", location: "—", value: 1080, daysInQuarantine: 10 },
];

const Q_STATUS_STYLE: Record<QuarantineStatus, { bg: string; color: string }> = {
  "Quarantined":  { bg: "#FFEBEE", color: "#C62828" },
  "Under Review": { bg: "#FFF3E0", color: "#E65100" },
  "Cleared":      { bg: "#E8F5E9", color: "#2E7D32" },
  "Disposed":     { bg: "#F3E5F5", color: "#7B1FA2" },
};

export default function StockExpiry() {
  const [expiryView, setExpiryView] = useState<"expiry" | "quarantine">("expiry");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [qFilter, setQFilter] = useState<"All" | QuarantineStatus>("All");
  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>(QUARANTINE_DATA);
  const [showAddQ, setShowAddQ] = useState(false);
  const [qLockedDrug, setQLockedDrug] = useState<string | null>(null);
  const EMPTY_Q_FORM = { drug: "", qty: "", reason: "", location: "", reviewDate: "" };
  const [qForm, setQForm] = useState(EMPTY_Q_FORM);
  const [qDrugOpen, setQDrugOpen] = useState(false);
  const [qDrugSearch, setQDrugSearch] = useState("");
  const qDrugInputRef = useRef<HTMLInputElement>(null);
  const [qReasonOpen, setQReasonOpen] = useState(false);
  const [qLocationOpen, setQLocationOpen] = useState(false);
  const [expirySearch, setExpirySearch] = useState("");
  const [qSearch, setQSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "dispose" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  function showToast(message: string, type: "success" | "error" | "dispose") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  const TOAST_COLOR = { success: "#2E7D32", error: "#C62828", dispose: "#7B1FA2" };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedRows = sortCol
    ? [...expiryItems].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : expiryItems;

  // Expiry Financial View calculations
  const expiredItems = expiryItems.filter(d => d.daysLeft < 0);
  const criticalItems = expiryItems.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30);
  const warningItems = expiryItems.filter(d => d.daysLeft > 30 && d.daysLeft <= 90);
  const expiredValue = expiredItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const criticalValue = criticalItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const warningValue = warningItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const totalAtRisk = expiredValue + criticalValue + warningValue;

  // Quarantine stats
  const activeQ = quarantine.filter(q => q.status === "Quarantined" || q.status === "Under Review");
  const activeQValue = activeQ.reduce((s, q) => s + q.value, 0);
  const overdue = activeQ.filter(q => q.daysInQuarantine > 14);

  const filteredQ = (qFilter === "All" ? quarantine : quarantine.filter(q => q.status === qFilter))
    .filter(q => !qSearch || q.drug.toLowerCase().includes(qSearch.toLowerCase()) || q.id.toLowerCase().includes(qSearch.toLowerCase()));

  const searchedExpiryRows = sortedRows.filter(d =>
    !expirySearch || d.name.toLowerCase().includes(expirySearch.toLowerCase()) || d.category.toLowerCase().includes(expirySearch.toLowerCase())
  );
  const { pageRows: expiryPageRows, footerProps: expiryFooterProps } = usePagination(searchedExpiryRows, 10);
  const { pageRows: qPageRows, footerProps: qFooterProps } = usePagination(filteredQ, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Expired — Write-off Required", value: `₹${expiredValue.toFixed(0)}`, sub: `${expiredItems.length} SKUs`, color: "#C62828" },
          { label: "Critical Risk (≤ 30 days)",    value: `₹${criticalValue.toFixed(0)}`, sub: `${criticalItems.length} SKUs`, color: "#E65100" },
          { label: "Warning Zone (≤ 90 days)",     value: `₹${warningValue.toFixed(0)}`,  sub: `${warningItems.length} SKUs`,  color: "#F57F17" },
          { label: "Total Capital at Risk",         value: `₹${totalAtRisk.toFixed(0)}`,   sub: "Combined exposure",             color: "#1A2436" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabbed Card: Expiry Alerts / Quarantine ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "expiry" as const, label: "Expiry Alerts", count: expiryItems.filter(d => d.daysLeft <= 90).length },
            { key: "quarantine" as const, label: "Quarantine", count: activeQ.length },
          ]).map(t => (
            <button key={t.key} onClick={() => setExpiryView(t.key)}
              style={{
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontFamily: "Inter", fontWeight: expiryView === t.key ? 600 : 400,
                color: expiryView === t.key ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${expiryView === t.key ? "#1B6CA8" : "transparent"}`,
                marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700,
                  background: expiryView === t.key ? "#EFF6FF" : "#F0F3F7",
                  color: expiryView === t.key ? "#1B6CA8" : "#9CA3AF",
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Expiry Alerts tab ── */}
        {expiryView === "expiry" && (
          <>
            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={SK.searchWrapper}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search by drug or category..." value={expirySearch} onChange={e => setExpirySearch(e.target.value)}
                  style={SK.searchInput} />
              </div>
            </div>
            {/* Expiry table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Drug</Th>
                  <Th onSort={() => handleSort("category")} sortDir={sortCol === "category" ? sortDir : null}>Category</Th>
                  <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
                  <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock</Th>
                  <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
                  <Th onSort={() => handleSort("daysLeft")} sortDir={sortCol === "daysLeft" ? sortDir : null}>Days Left</Th>
                  <Th>Action Needed</Th>
                  <Th>Quarantine</Th>
                </tr></thead>
                <tbody>
                  {expiryPageRows.map(d => {
                    const urgent = d.daysLeft < 30;
                    const warning = d.daysLeft >= 30 && d.daysLeft < 90;
                    const expired = d.daysLeft < 0;
                    const rowBg = expired ? "#FFF5F5" : urgent ? "#FFFBEB" : "transparent";
                    const dayColor = expired ? "#C62828" : urgent ? "#E65100" : warning ? "#F57F17" : "#6B7280";
                    const action = expired ? "Dispose immediately" : urgent ? "Initiate return / disposal" : warning ? "Monitor & prioritise sales" : "No action required";
                    const isQuarantined = quarantine.some(q => q.drug === d.name && (q.status === "Quarantined" || q.status === "Under Review"));
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA", background: rowBg }}>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" as const }}>{d.stock}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: dayColor }}>{d.expiry}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: dayColor }}>
                            {expired ? "EXPIRED" : `${d.daysLeft}d`}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: dayColor, fontWeight: urgent || expired ? 600 : 400 }}>{action}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {isQuarantined ? (
                            <span style={{ fontSize: 10, padding: "2px 8px", background: "#FFEBEE", color: "#C62828", fontWeight: 700 }}>In Quarantine</span>
                          ) : (urgent || expired) ? (
                            <button onClick={() => { setQLockedDrug(d.name); setQForm({ ...EMPTY_Q_FORM, drug: d.name }); setShowAddQ(true); }}
                              style={{ padding: "4px 10px", border: "1px solid #C62828", background: "#fff", color: "#C62828", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                              Quarantine
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...expiryFooterProps} />
          </>
        )}

        {/* ── Quarantine tab ── */}
        {expiryView === "quarantine" && (
          <>
            {/* Search + filter pills + action (single row) */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 240px", minHeight: 40, boxSizing: "border-box" as const }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search quarantine..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
              </div>
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "Quarantined", "Under Review", "Cleared", "Disposed"] as const).map(f => (
                  <button key={f} onClick={() => setQFilter(f)}
                    style={{ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: qFilter === f ? 600 : 400, fontFamily: "Inter", border: `1px solid ${qFilter === f ? "#1B6CA8" : "#DDE3EC"}`, background: qFilter === f ? "#EFF6FF" : "#fff", color: qFilter === f ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" as const }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => { setQLockedDrug(null); setQForm(EMPTY_Q_FORM); setShowAddQ(true); }} style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", minHeight: 40, boxSizing: "border-box" as const }}>
                  + Add to Quarantine
                </button>
              </div>
            </div>
            {/* Quarantine table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["QRN #", "Drug", "Qty", "Reason", "Start Date", "Days in Quarantine", "Review Date", "Location", "Value", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qPageRows.map(q => {
                    const ss = Q_STATUS_STYLE[q.status];
                    const ageColor = q.daysInQuarantine > 14 ? "#C62828" : q.daysInQuarantine > 7 ? "#E65100" : "#6B7280";
                    return (
                      <tr key={q.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{q.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{q.drug}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{q.qty}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{q.reason}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.startDate}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ height: 5, width: 60, background: "#F0F3F7", position: "relative" as const, flexShrink: 0 }}>
                              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (q.daysInQuarantine / 21) * 100)}%`, background: ageColor }} />
                            </div>
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: ageColor }}>{q.daysInQuarantine}d</span>
                            {q.daysInQuarantine > 14 && <span style={{ fontSize: 10, background: "#FFEBEE", color: "#C62828", padding: "1px 5px", fontWeight: 700 }}>OVERDUE</span>}
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.reviewDate}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.location}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>₹{q.value.toFixed(0)}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <Pill label={q.status} bg={ss.bg} color={ss.color} />
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          {(q.status === "Quarantined" || q.status === "Under Review") ? (
                            <div style={{ position: "relative" }}>
                              {actionMenuOpen === q.id && (
                                <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setActionMenuOpen(null)} />
                              )}
                              <button
                                onClick={() => setActionMenuOpen(open => open === q.id ? null : q.id)}
                                style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: actionMenuOpen === q.id ? "#F0F3F7" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                              </button>
                              {actionMenuOpen === q.id && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 130 }}>
                                  {q.status === "Under Review" && (
                                    <div onMouseDown={() => {
                                      setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Quarantined" as QuarantineStatus } : r));
                                      setActionMenuOpen(null);
                                      showToast(`${q.drug} moved to Quarantined`, "error");
                                    }}
                                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#C62828", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                      Quarantine
                                    </div>
                                  )}
                                  <div onMouseDown={() => {
                                    setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Cleared" as QuarantineStatus } : r));
                                    setActionMenuOpen(null);
                                    showToast(`${q.drug} cleared from quarantine`, "success");
                                  }}
                                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#2E7D32", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F0FFF4"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                    Clear
                                  </div>
                                  <div onMouseDown={() => {
                                    setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Disposed" as QuarantineStatus } : r));
                                    setActionMenuOpen(null);
                                    showToast(`${q.drug} marked as disposed`, "dispose");
                                  }}
                                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#7B1FA2", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAF0FF"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                    Dispose
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {qPageRows.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No quarantine records for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...qFooterProps} />
          </>
        )}
      </div>

      {/* Add to Quarantine modal */}
      {showAddQ && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 460, borderRadius: 6, border: "1px solid #E8ECF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Add Stock to Quarantine</div>
              <button onClick={() => { setShowAddQ(false); setQForm(EMPTY_Q_FORM); setQLockedDrug(null); setQDrugSearch(""); setQDrugOpen(false); setQReasonOpen(false); setQLocationOpen(false); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Drug */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Drug</label>
                {qLockedDrug ? (
                  <div style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", fontWeight: 600, boxSizing: "border-box" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{qLockedDrug}</span>
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>pre-filled</span>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    {qDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setQDrugOpen(false); setQDrugSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}
                      onClick={() => { setQDrugOpen(true); setTimeout(() => qDrugInputRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={qDrugInputRef}
                        value={qDrugSearch || qForm.drug}
                        onChange={e => { setQDrugSearch(e.target.value); setQDrugOpen(true); if (!e.target.value) setQForm(p => ({ ...p, drug: "" })); }}
                        onFocus={() => { setQDrugOpen(true); setQDrugSearch(""); }}
                        placeholder="Search drug name..."
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${qDrugOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer", minHeight: 40 }}
                      />
                      {qForm.drug && !qDrugSearch && (
                        <span style={{ position: "absolute", right: 12, fontSize: 11, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 8px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>selected</span>
                      )}
                    </div>
                    {qDrugOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 200, overflowY: "auto" }}>
                        {(qDrugSearch
                          ? expiryItems.filter(d => d.name.toLowerCase().includes(qDrugSearch.toLowerCase()))
                          : expiryItems
                        ).length === 0
                          ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No drugs found</div>
                          : (qDrugSearch
                              ? expiryItems.filter(d => d.name.toLowerCase().includes(qDrugSearch.toLowerCase()))
                              : expiryItems
                            ).map(d => {
                              const active = qForm.drug === d.name;
                              return (
                                <div key={d.name}
                                  onMouseDown={() => { setQForm(p => ({ ...p, drug: d.name })); setQDrugSearch(""); setQDrugOpen(false); }}
                                  style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                                  {d.name}
                                </div>
                              );
                            })
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Quantity to Quarantine</label>
                <input type="number" placeholder="Units" value={qForm.qty} onChange={e => setQForm(p => ({ ...p, qty: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, minHeight: 40 }} />
              </div>
              {/* Reason */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Reason</label>
                <div style={{ position: "relative" }}>
                  {qReasonOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setQReasonOpen(false)} />}
                  <button type="button" onClick={() => setQReasonOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", border: `1px solid ${qReasonOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: qForm.reason ? 600 : 400, color: qForm.reason ? "#0C1B33" : "#9CA3AF", boxSizing: "border-box" as const, minHeight: 40 }}>
                    <span>{qForm.reason || "— Select reason —"}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={qReasonOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: qReasonOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {qReasonOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {["Near-expiry (< 30 days)", "Damaged packaging", "Cold chain breach suspected", "Quality hold", "Supplier recall", "Other"].map(o => {
                        const active = qForm.reason === o;
                        return (
                          <div key={o}
                            onMouseDown={() => { setQForm(p => ({ ...p, reason: o })); setQReasonOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Storage Location */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Storage Location</label>
                <div style={{ position: "relative" }}>
                  {qLocationOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setQLocationOpen(false)} />}
                  <button type="button" onClick={() => setQLocationOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", border: `1px solid ${qLocationOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: qForm.location ? 600 : 400, color: qForm.location ? "#0C1B33" : "#9CA3AF", boxSizing: "border-box" as const, minHeight: 40 }}>
                    <span>{qForm.location || "— Select location —"}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={qLocationOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: qLocationOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {qLocationOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {["Quarantine Bay 1", "Quarantine Bay 2", "Cold Quarantine", "Controlled Quarantine"].map(o => {
                        const active = qForm.location === o;
                        return (
                          <div key={o}
                            onMouseDown={() => { setQForm(p => ({ ...p, location: o })); setQLocationOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Review By Date */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Review By Date</label>
                <input type="date" value={qForm.reviewDate} onChange={e => setQForm(p => ({ ...p, reviewDate: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, minHeight: 40 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowAddQ(false); setQForm(EMPTY_Q_FORM); setQLockedDrug(null); setQDrugSearch(""); setQDrugOpen(false); setQReasonOpen(false); setQLocationOpen(false); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!qForm.drug || !qForm.qty || !qForm.reason) return;
                    const drugRecord = drugs.find(d => d.name === qForm.drug);
                    const newRecord: QuarantineRecord = {
                      id: `QRN-${Date.now()}`,
                      drug: qForm.drug,
                      qty: Number(qForm.qty),
                      reason: qForm.reason,
                      startDate: new Date().toISOString().slice(0, 10),
                      reviewDate: qForm.reviewDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                      status: qLockedDrug ? "Under Review" : "Quarantined",
                      location: qForm.location || "Quarantine Bay 1",
                      value: drugRecord ? Math.round(drugRecord.cost * Number(qForm.qty)) : 0,
                      daysInQuarantine: 0,
                    };
                    setQuarantine(prev => [newRecord, ...prev]);
                    setQForm(EMPTY_Q_FORM);
                    setQLockedDrug(null);
                    setQDrugSearch("");
                    setQDrugOpen(false);
                    setQReasonOpen(false);
                    setQLocationOpen(false);
                    setShowAddQ(false);
                    showToast(`${newRecord.drug} added to quarantine`, "success");
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Quarantine Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: TOAST_COLOR[toast.type], boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : toast.type === "dispose" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 7h8M8 7V5h4v2M9 10v4M11 10v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
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
