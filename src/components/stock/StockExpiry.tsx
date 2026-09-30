import { useState } from "react";
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
  const EMPTY_Q_FORM = { drug: "", qty: "", reason: "", location: "", reviewDate: "" };
  const [qForm, setQForm] = useState(EMPTY_Q_FORM);
  const [expirySearch, setExpirySearch] = useState("");
  const [qSearch, setQSearch] = useState("");

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
          {/* Right action */}
          {expiryView === "quarantine" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 12 }}>
              <button onClick={() => setShowAddQ(true)} style={SK.btnPrimary}>
                + Add to Quarantine
              </button>
            </div>
          )}
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
                            <button onClick={() => setShowAddQ(true)}
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
            {/* Quarantine KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #EEF1F6" }}>
              {[
                { label: "Active Quarantine", value: activeQ.length.toString(), color: "#C62828" },
                { label: "Under Review", value: quarantine.filter(q => q.status === "Under Review").length.toString(), color: "#E65100" },
                { label: "Capital Locked", value: `₹${activeQValue.toFixed(0)}`, color: "#1B6CA8" },
                { label: "Overdue Review (>14d)", value: overdue.length.toString(), color: overdue.length > 0 ? "#C62828" : "#9CA3AF" },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none" }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            {/* Filter pills */}
            <div style={{ padding: "10px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 4 }}>
              {(["All", "Quarantined", "Under Review", "Cleared", "Disposed"] as const).map(f => (
                <button key={f} onClick={() => setQFilter(f)}
                  style={{ padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: qFilter === f ? 600 : 400, fontFamily: "Inter", border: `1px solid ${qFilter === f ? "#1B6CA8" : "#DDE3EC"}`, background: "#fff", color: qFilter === f ? "#1B6CA8" : "#6B7280", borderRadius: 20 }}>
                  {f}
                </button>
              ))}
            </div>
            {/* Search bar */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search quarantine..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
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
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Cleared" as QuarantineStatus } : r))}
                                style={{ padding: "4px 9px", border: "none", background: "#E8F5E9", color: "#2E7D32", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>Clear</button>
                              <button onClick={() => setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Disposed" as QuarantineStatus } : r))}
                                style={{ padding: "4px 9px", border: "none", background: "#F3E5F5", color: "#7B1FA2", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>Dispose</button>
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
              <button onClick={() => setShowAddQ(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Drug */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>Drug</label>
                <select value={qForm.drug} onChange={e => setQForm(p => ({ ...p, drug: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 4, border: `1px solid ${!qForm.drug ? "#E8ECF4" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  <option value="">— Select drug —</option>
                  {expiryItems.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>Quantity to Quarantine</label>
                <input type="number" placeholder="Units" value={qForm.qty} onChange={e => setQForm(p => ({ ...p, qty: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 4, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>
              {/* Reason */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>Reason</label>
                <select value={qForm.reason} onChange={e => setQForm(p => ({ ...p, reason: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 4, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  <option value="">— Select reason —</option>
                  {["Near-expiry (< 30 days)", "Damaged packaging", "Cold chain breach suspected", "Quality hold", "Supplier recall", "Other"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {/* Storage Location */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>Storage Location</label>
                <select value={qForm.location} onChange={e => setQForm(p => ({ ...p, location: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 4, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  <option value="">— Select location —</option>
                  {["Quarantine Bay 1", "Quarantine Bay 2", "Cold Quarantine", "Controlled Quarantine"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {/* Review By Date */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>Review By Date</label>
                <input type="date" value={qForm.reviewDate} onChange={e => setQForm(p => ({ ...p, reviewDate: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 4, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowAddQ(false); setQForm(EMPTY_Q_FORM); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
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
                      status: "Quarantined",
                      location: qForm.location || "Quarantine Bay 1",
                      value: drugRecord ? Math.round(drugRecord.cost * Number(qForm.qty)) : 0,
                      daysInQuarantine: 0,
                    };
                    setQuarantine(prev => [newRecord, ...prev]);
                    setQForm(EMPTY_Q_FORM);
                    setShowAddQ(false);
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Quarantine Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
