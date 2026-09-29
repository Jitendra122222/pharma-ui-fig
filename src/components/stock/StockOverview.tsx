import { useState } from "react";
import { drugs } from "../../data/mockData";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { adjustments, batches, MOVEMENTS } from "./stockData";
import type { StockMovement } from "./stockData";

interface StockOverviewProps { onNavigate?: (m: string) => void; }

export default function StockOverview({ onNavigate }: StockOverviewProps = {}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sel, setSel] = useState<typeof drugs[0] | null>(null);
  const [dTab, setDTab] = useState<"overview" | "clinical" | "movements" | "history">("overview");
  const [showAdjust, setShowAdjust] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [showCycleCount, setShowCycleCount] = useState(false);
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [fCategories, setFCategories] = useState<string[]>([]);
  const [fSuppliers, setFSuppliers] = useState<string[]>([]);
  const [fLocations, setFLocations] = useState<string[]>([]);
  const [fStockRange, setFStockRange] = useState<[number, number]>([0, 1500]);
  const [fSchedule, setFSchedule] = useState<string[]>([]);
  const [fExpiry, setFExpiry] = useState("all");

  // Confidence score per drug: 100 = perfect, decremented by risk factors
  function confidenceScore(d: typeof drugs[0]): number {
    let score = 100;
    const moves = MOVEMENTS[d.name] ?? [];
    const lastCount = moves.find(m => m.type === "Adjustment" && m.reason?.toLowerCase().includes("count"));
    if (!lastCount) score -= 20;
    if (d.stock < d.minStock) score -= 15;
    const daysNoActivity = moves.length > 0
      ? Math.round((new Date("2025-07-29").getTime() - new Date(moves[0].date).getTime()) / 86400000)
      : 60;
    if (daysNoActivity > 30) score -= 10;
    if (d.status === "Out of Stock") score -= 20;
    return Math.max(0, score);
  }

  // Velocity: avg units dispensed per week (from Sale movements)
  function weeklyVelocity(d: typeof drugs[0]): number {
    const sales = (MOVEMENTS[d.name] ?? []).filter(m => m.type === "Sale");
    const totalOut = sales.reduce((s, m) => s + Math.abs(m.qty), 0);
    const weeks = sales.length > 0 ? 4 : 0;
    return weeks > 0 ? Math.round(totalOut / weeks) : 0;
  }
  const SCHEDULE: Record<string, string> = {
    Antibiotics: "Schedule H", Antidiabetics: "Schedule H", Antihypertensives: "Schedule H",
    Statins: "Schedule H", Antacids: "OTC", Bronchodilators: "Schedule H",
    Analgesics: "OTC", Hormones: "Schedule H1", Anticoagulants: "Schedule H1", Antidepressants: "Schedule H",
  };

  const activeFilterCount = fCategories.length + fSuppliers.length + fLocations.length + fSchedule.length +
    (fExpiry !== "all" ? 1 : 0) + (fStockRange[0] > 0 || fStockRange[1] < 1500 ? 1 : 0);

  const filtered = drugs.filter(d => {
    const q = search.toLowerCase();
    const m = d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.location.toLowerCase().includes(q);
    if (!m) return false;
    if (filter === "Low Stock" && d.status !== "Low Stock") return false;
    if (filter === "Out of Stock" && d.status !== "Out of Stock") return false;
    if (fCategories.length && !fCategories.includes(d.category)) return false;
    if (fSuppliers.length && !fSuppliers.includes(d.supplier)) return false;
    if (fLocations.length && !fLocations.includes(d.location)) return false;
    if (d.stock < fStockRange[0] || d.stock > fStockRange[1]) return false;
    if (fSchedule.length && !fSchedule.includes(SCHEDULE[d.category] ?? "OTC")) return false;
    if (fExpiry === "30d") {
      const days = Math.round((new Date(d.expiry).getTime() - new Date("2026-09-27").getTime()) / 86400000);
      if (days > 30) return false;
    } else if (fExpiry === "90d") {
      const days = Math.round((new Date(d.expiry).getTime() - new Date("2026-09-27").getTime()) / 86400000);
      if (days > 90) return false;
    } else if (fExpiry === "expired") {
      const days = Math.round((new Date(d.expiry).getTime() - new Date("2026-09-27").getTime()) / 86400000);
      if (days >= 0) return false;
    }
    return true;
  });
  const { sortCol, sortDir, handleSort, sorted: sortedFiltered } = useTableSort(filtered);
  const { pageRows: invPageRows, footerProps: invFooterProps } = usePagination(sortedFiltered, 10);

  const totalValue = drugs.reduce((s, d) => s + d.stock * d.cost, 0);

  const CAT_COLOR: Record<string, string> = {
    Antibiotics: "#00ACC1", Antidiabetics: "#7C3AED", Antihypertensives: "#1B6CA8",
    Statins: "#2E7D32", Antacids: "#E65100", Bronchodilators: "#0891B2",
    Analgesics: "#DC2626", Hormones: "#9333EA", Anticoagulants: "#C62828", Antidepressants: "#7B61FF",
  };
  const dosageForm = (unit: string) => unit === "Capsules" ? "Capsule" : unit === "Tablets" ? "Tablet" : unit;
  const genericName = (name: string) => name.replace(/\s+\d.*$/, "").trim();

  const lowStockCount = drugs.filter(d => d.status === "Low Stock").length;
  const outOfStockCount = drugs.filter(d => d.status === "Out of Stock").length;
  const reorderDrugs = drugs.filter(d => d.stock <= d.minStock && d.stock > 0);

  // ABC classification by cost × velocity score
  const abcScores = drugs.map(d => ({ name: d.name, score: d.cost * weeklyVelocity(d) }))
    .sort((a, b) => b.score - a.score);
  const topCutoff = Math.ceil(drugs.length * 0.2);
  const midCutoff = Math.ceil(drugs.length * 0.5);
  function abcClass(name: string): "A" | "B" | "C" {
    const rank = abcScores.findIndex(s => s.name === name);
    return rank < topCutoff ? "A" : rank < midCutoff ? "B" : "C";
  }
  const ABC_STYLE = {
    A: { bg: "#FFEBEE", color: "#C62828" },
    B: { bg: "#FFF3E0", color: "#E65100" },
    C: { bg: "#F0F3F7", color: "#6B7280" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total SKUs",       value: drugs.length,                         color: "#1B6CA8", bg: "#EFF6FF",  fmt: (v: number) => v.toString() },
          { label: "Total Stock Value", value: totalValue,                           color: "#2E7D32", bg: "#E8F5E9",  fmt: (v: number) => `₹${v.toFixed(0)}` },
          { label: "Low Stock",         value: lowStockCount,                        color: "#E65100", bg: "#FFF3E0",  fmt: (v: number) => v.toString() },
          { label: "Out of Stock",      value: outOfStockCount,                      color: "#C62828", bg: "#FFEBEE",  fmt: (v: number) => v.toString() },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 26, fontWeight: 800, color: k.color }}>{k.fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* ── Auto-reorder banner ── */}
      {reorderDrugs.length > 0 && !showReorder && (
        <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 6, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#E65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E65100" }}>{reorderDrugs.length} item{reorderDrugs.length !== 1 ? "s" : ""} at or below reorder level</span>
            <span style={{ fontSize: 12, color: "#92400E" }}>{reorderDrugs.map(d => d.name).join(" · ")}</span>
          </div>
          <button onClick={() => setShowReorder(true)}
            style={{ padding: "6px 16px", border: "none", borderRadius: 6, background: "#E65100", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>
            Review &amp; Generate POs
          </button>
        </div>
      )}

      {/* ── Reorder review panel ── */}
      {showReorder && (
        <div style={{ background: "#fff", border: "1px solid #FFCC80", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", background: "#FFFBF0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>Reorder Review — Draft POs</span>
            <button onClick={() => setShowReorder(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20 }}>&times;</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFD" }}>
                {["Drug", "Current Stock", "Reorder Level", "Suggested Order Qty", "Supplier"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reorderDrugs.map(d => {
                const suggestedQty = Math.max(1, d.minStock * 2 - d.stock);
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{d.category}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#C62828" }}>{d.stock} {d.unit}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF" }}>{d.minStock}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>{suggestedQty}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{d.supplier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowReorder(false)} style={{ padding: "7px 16px", border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter" }}>Dismiss</button>
            <button onClick={() => { setShowReorder(false); onNavigate?.("purchases"); }}
              style={{ padding: "7px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Create Draft POs in Purchases
            </button>
          </div>
        </div>
      )}

      {/* ── Main data card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 0 280px" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Medicine / Barcode / Batch..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", paddingTop: 9, paddingBottom: 9, paddingLeft: 36, paddingRight: 12, borderRadius: 8, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", outline: "none", boxSizing: "border-box" as const }}
            />
          </div>
          {["All", "Low Stock", "Out of Stock"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontSize: 12, fontFamily: "Inter", fontWeight: filter === f ? 600 : 400, padding: "0 14px", borderRadius: 999, border: filter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: filter === f ? "#EFF6FF" : "#fff", color: filter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, minHeight: 40, boxSizing: "border-box" as const, flexShrink: 0 }}>
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setFilterDrawer(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "0 16px", minHeight: 40,
              borderRadius: 8, border: activeFilterCount > 0 ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC",
              background: activeFilterCount > 0 ? "#EFF6FF" : "#fff",
              color: activeFilterCount > 0 ? "#1B6CA8" : "#1A2436",
              fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: "#1B6CA8", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div>
          <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Product Name</Th>
                  <Th>ABC</Th>
                  <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
                  <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock Qty</Th>
                  <Th onSort={() => handleSort("minStock")} sortDir={sortCol === "minStock" ? sortDir : null}>Min Stock</Th>
                  <Th>Reorder Point</Th>
                  <Th onSort={() => handleSort("cost")} sortDir={sortCol === "cost" ? sortDir : null}>Cost/Unit</Th>
                  <Th onSort={() => handleSort("price")} sortDir={sortCol === "price" ? sortDir : null}>Price/Unit</Th>
                  <Th>Margin</Th>
                  <Th>Stock Value</Th>
                  <Th>Confidence</Th>
                  <Th>Velocity/wk</Th>
                  <Th>Days Left</Th>
                  <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                </tr></thead>
                <tbody>
                  {invPageRows.map(d => {
                    const margin = ((d.price - d.cost) / d.price * 100).toFixed(0);
                    const value = d.stock * d.cost;
                    const statusStyle = d.status === "In Stock" ? { bg: "#E8F5E9", color: "#2E7D32" } : d.status === "Low Stock" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                    const isSelected = sel?.id === d.id;
                    return (
                      <tr key={d.id} onClick={() => { setSel(d); setDTab("overview"); }}
                        style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: isSelected ? "#EFF6FF" : "transparent" }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F8FAFC"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#1B6CA8" : "#1A2436" }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>{d.category}</div>
                        </td>
                        {(() => {
                          const cls = abcClass(d.name);
                          const as_ = ABC_STYLE[cls];
                          return <td style={{ padding: "11px 14px", textAlign: "center" as const }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: as_.bg, color: as_.color }}>{cls}</span></td>;
                        })()}
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.stock === 0 ? "#C62828" : d.stock < d.minStock ? "#F57F17" : "#1A2436", textAlign: "right" as const }}>{d.stock.toLocaleString()}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF", textAlign: "right" as const }}>{d.minStock}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ height: 6, background: "#EEF1F6", position: "relative" }}>
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (d.stock / (d.minStock * 3)) * 100)}%`, background: d.stock < d.minStock ? "#C62828" : "#2E7D32" }} />
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>₹{d.cost.toFixed(2)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>₹{d.price.toFixed(2)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", textAlign: "right" as const }}>{margin}%</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>₹{value.toFixed(2)}</td>
                        {(() => {
                          const cs = confidenceScore(d);
                          const csBg = cs >= 80 ? "#E8F5E9" : cs >= 60 ? "#FFF3E0" : "#FFEBEE";
                          const csColor = cs >= 80 ? "#2E7D32" : cs >= 60 ? "#E65100" : "#C62828";
                          return <td style={{ padding: "11px 14px", textAlign: "center" as const }}><span style={{ display: "inline-block", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: csColor, background: csBg, padding: "2px 8px" }}>{cs}%</span></td>;
                        })()}
                        {(() => {
                          const vel = weeklyVelocity(d);
                          return (
                            <td style={{ padding: "11px 14px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: vel > 0 ? "#1B6CA8" : "#9CA3AF" }}>{vel > 0 ? vel : "—"}</span>
                              {d.stock * d.cost > 5000 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: "#E65100", background: "#FFF3E0", padding: "1px 5px" }}>HV</span>}
                            </td>
                          );
                        })()}
                        {(() => {
                          const vel = weeklyVelocity(d);
                          const days = vel > 0 ? Math.round(d.stock / (vel / 7)) : null;
                          if (days === null) return <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>—</td>;
                          const col = days < 7 ? "#C62828" : days < 14 ? "#E65100" : "#2E7D32";
                          const bg  = days < 7 ? "#FFEBEE" : days < 14 ? "#FFF3E0" : "#E8F5E9";
                          return <td style={{ padding: "11px 14px", textAlign: "center" as const }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: bg, color: col }}>{days}d</span></td>;
                        })()}
                        <td style={{ padding: "11px 14px" }}><Pill label={d.status} bg={statusStyle.bg} color={statusStyle.color} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...invFooterProps} />
          </div>


      </div>

      {/* ── Cycle Count Schedule card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: showCycleCount ? "1px solid #EEF1F6" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Cycle Count Schedule</span>
          <button onClick={() => setShowCycleCount(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            {showCycleCount ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>
        {showCycleCount && (
          <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFBFD" }}>
                  {["Drug", "ABC Class", "Frequency", "Last Count (Proxy)", "Next Due", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drugs.map(d => {
                  const cls = abcClass(d.name);
                  const freq = cls === "A" ? 30 : cls === "B" ? 90 : 180;
                  const lastMs = new Date(d.lastMove).getTime();
                  const nextMs = lastMs + freq * 86400000;
                  const today = Date.now();
                  const daysUntil = Math.round((nextMs - today) / 86400000);
                  const overdue = daysUntil < 0;
                  const dueSoon = !overdue && daysUntil < 7;
                  const statusLabel = overdue ? "Overdue" : dueSoon ? "Due Soon" : "On Track";
                  const statusBg = overdue ? "#FFEBEE" : dueSoon ? "#FFF3E0" : "#E8F5E9";
                  const statusColor = overdue ? "#C62828" : dueSoon ? "#E65100" : "#2E7D32";
                  const as_ = ABC_STYLE[cls];
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "9px 14px", fontSize: 13, fontWeight: 500, color: "#1A2436" }}>{d.name}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center" as const }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: as_.bg, color: as_.color }}>{cls}</span></td>
                      <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>Every {freq}d</td>
                      <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{d.lastMove}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: overdue ? "#C62828" : "#1A2436" }}>{new Date(nextMs).toISOString().slice(0, 10)}</td>
                      <td style={{ padding: "9px 14px" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: statusBg, color: statusColor }}>{statusLabel}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {showCycleCount && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => alert("Open the Investigation tab to start a new cycle count.")}
              style={{ padding: "7px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Start Count
            </button>
          </div>
        )}
      </div>

      {/* ── Filter Drawer ── */}
      {filterDrawer && (
        <>
          <div onClick={() => setFilterDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 200 }} />
          <aside style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
            background: "#fff", zIndex: 201, display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 32px rgba(12,27,51,0.12)",
          }}>
            {/* Header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Filters</div>
                {activeFilterCount > 0 && (
                  <div style={{ fontSize: 12, color: "#1B6CA8", marginTop: 2, fontFamily: "Inter" }}>{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active · {filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setFCategories([]); setFSuppliers([]); setFLocations([]); setFStockRange([0, 1500]); setFSchedule([]); setFExpiry("all"); }}
                    style={{ fontSize: 12, color: "#C62828", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                    Clear all
                  </button>
                )}
                <button onClick={() => setFilterDrawer(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>

              {/* Stock Status */}
              <div style={{ paddingTop: 20, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Stock Status</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {["All", "Low Stock", "Out of Stock"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: "Inter", fontWeight: filter === f ? 600 : 400, cursor: "pointer", border: filter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: filter === f ? "#EFF6FF" : "#fff", color: filter === f ? "#1B6CA8" : "#6B7280" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Category</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {[...new Set(drugs.map(d => d.category))].sort().map(cat => {
                    const on = fCategories.includes(cat);
                    const count = drugs.filter(d => d.category === cat).length;
                    return (
                      <label key={cat} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={() => setFCategories(prev => on ? prev.filter(c => c !== cat) : [...prev, cat])}
                          style={{ width: 15, height: 15, accentColor: "#1B6CA8", cursor: "pointer" }} />
                        <span style={{ flex: 1, fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{cat}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Supplier */}
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Supplier</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {[...new Set(drugs.map(d => d.supplier))].sort().map(sup => {
                    const on = fSuppliers.includes(sup);
                    const count = drugs.filter(d => d.supplier === sup).length;
                    return (
                      <label key={sup} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={() => setFSuppliers(prev => on ? prev.filter(s => s !== sup) : [...prev, sup])}
                          style={{ width: 15, height: 15, accentColor: "#1B6CA8", cursor: "pointer" }} />
                        <span style={{ flex: 1, fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{sup}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Location</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {[...new Set(drugs.map(d => d.location))].sort().map(loc => {
                    const on = fLocations.includes(loc);
                    return (
                      <button key={loc} onClick={() => setFLocations(prev => on ? prev.filter(l => l !== loc) : [...prev, loc])}
                        style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontFamily: "JetBrains Mono", cursor: "pointer", border: on ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: on ? "#EFF6FF" : "#F8FAFC", color: on ? "#1B6CA8" : "#6B7280", fontWeight: on ? 600 : 400 }}>
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Drug Schedule</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {["OTC", "Schedule H", "Schedule H1"].map(sch => {
                    const on = fSchedule.includes(sch);
                    return (
                      <button key={sch} onClick={() => setFSchedule(prev => on ? prev.filter(s => s !== sch) : [...prev, sch])}
                        style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: "Inter", cursor: "pointer", border: on ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: on ? "#EFF6FF" : "#fff", color: on ? "#1B6CA8" : "#6B7280", fontWeight: on ? 600 : 400 }}>
                        {sch}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expiry */}
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Expiry Window</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {([["all", "All dates"], ["30d", "Expiring within 30 days"], ["90d", "Expiring within 90 days"], ["expired", "Already expired"]] as const).map(([val, label]) => (
                    <label key={val} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="radio" name="fExpiry" checked={fExpiry === val} onChange={() => setFExpiry(val)}
                        style={{ width: 15, height: 15, accentColor: "#1B6CA8", cursor: "pointer" }} />
                      <span style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stock Quantity Range */}
              <div style={{ paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Stock Quantity Range</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontFamily: "Inter" }}>Min</div>
                    <input type="number" value={fStockRange[0]} min={0} max={fStockRange[1]}
                      onChange={e => setFStockRange([Number(e.target.value), fStockRange[1]])}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ color: "#9CA3AF", marginTop: 16, fontFamily: "Inter" }}>—</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontFamily: "Inter" }}>Max</div>
                    <input type="number" value={fStockRange[1]} min={fStockRange[0]} max={1500}
                      onChange={e => setFStockRange([fStockRange[0], Number(e.target.value)])}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setFCategories([]); setFSuppliers([]); setFLocations([]); setFStockRange([0, 1500]); setFSchedule([]); setFExpiry("all"); setFilter("All"); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", fontWeight: 600 }}>
                Reset
              </button>
              <button onClick={() => setFilterDrawer(false)}
                style={{ flex: 2, padding: "10px 0", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Apply · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Drug detail drawer */}
      {sel && (
        <>
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 100, backdropFilter: "blur(2px)" }} />
          <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.08)" }}>

            {/* Header */}
            <div style={{ flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
              {/* Title row */}
              <div style={{ padding: "20px 24px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginBottom: 3 }}>{sel.name}</div>
                  <div style={{ fontSize: 13, color: "#6B7280" }}>
                    {genericName(sel.name)} &middot; {dosageForm(sel.unit)} &middot; {sel.name.match(/\d+\s*mg/i)?.[0] || sel.unit}
                  </div>
                </div>
                <button onClick={() => setSel(null)} style={{ border: "none", background: "transparent", color: "#9CA3AF", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 2px", flexShrink: 0, marginLeft: 12 }}>&times;</button>
              </div>
              {/* Badges */}
              <div style={{ padding: "0 24px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLOR[sel.category] || "#00ACC1", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F0F9FF", padding: "3px 10px" }}>{sel.category}</span>
                <span style={{ fontSize: 11, padding: "3px 10px", background: "#F0F3F7", color: "#6B7280", fontFamily: "Inter" }}>{SCHEDULE[sel.category] || "Schedule H"}</span>
                <span style={{ fontSize: 11, padding: "3px 10px", fontWeight: 700,
                  background: sel.status === "In Stock" ? "#E8F5E9" : sel.status === "Low Stock" ? "#FFF3E0" : "#FFEBEE",
                  color: sel.status === "In Stock" ? "#2E7D32" : sel.status === "Low Stock" ? "#E65100" : "#C62828" }}>{sel.status}</span>
              </div>
              {/* KPI strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #EEF1F6" }}>
                {[
                  { label: "STOCK QTY", value: sel.stock.toString(), color: "#00ACC1" },
                  { label: "COST/UNIT", value: `₹${sel.cost.toFixed(2)}`, color: "#1A2436" },
                  { label: "PRICE/UNIT", value: `₹${sel.price.toFixed(2)}`, color: "#1A2436" },
                  { label: "MARGIN", value: `${((sel.price - sel.cost) / sel.price * 100).toFixed(1)}%`, color: "#2E7D32" },
                ].map((k, i) => (
                  <div key={k.label} style={{ padding: "12px 14px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none" }}>
                    <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              {/* Sub-tabs */}
              <div style={{ display: "flex", paddingLeft: 24, borderTop: "1px solid #EEF1F6" }}>
                {(["Overview", "Clinical Info", "Stock Movements", "History"] as const).map((t, i) => {
                  const key = (["overview", "clinical", "movements", "history"] as const)[i];
                  return (
                    <button key={t} onClick={() => setDTab(key)}
                      style={{ padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: dTab === key ? 600 : 400, color: dTab === key ? "#1B6CA8" : "#6B7280", borderBottom: dTab === key ? "2px solid #1B6CA8" : "2px solid transparent" }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", background: "#F0F3F7", padding: 20 }}>

              {dTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* 1. Stock Level */}
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 38, fontWeight: 700, color: "#0C1B33", lineHeight: 1 }}>{sel.stock}</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 5 }}>{sel.unit} in stock</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>Min Stock:&nbsp;<span style={{ fontFamily: "JetBrains Mono", color: "#6B7280", fontWeight: 600 }}>{sel.minStock}</span></div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>Location:&nbsp;<span style={{ fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{sel.location}</span></div>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#F0F3F7", margin: "12px 0 8px" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (sel.stock / (sel.minStock * 3)) * 100)}%`, background: sel.stock === 0 ? "#C62828" : sel.stock < sel.minStock ? "#F57F17" : "#2E7D32" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                        Reorder at&nbsp;<span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#6B7280" }}>{sel.minStock}</span>
                        &nbsp;&middot;&nbsp;Target max&nbsp;<span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#6B7280" }}>{sel.minStock * 3}</span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sel.stock === 0 ? "#C62828" : sel.stock < sel.minStock ? "#E65100" : "#2E7D32" }}>
                        {sel.stock === 0 ? "Out of stock" : sel.stock < sel.minStock ? "Below minimum" : "Healthy"}
                      </span>
                    </div>
                  </div>

                  {/* 2. Pricing Overview */}
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Pricing Overview</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #EEF1F6" }}>
                      {[
                        { label: "Cost / Unit", value: `₹${sel.cost.toFixed(2)}`, color: "#1A2436" },
                        { label: "Selling Price", value: `₹${sel.price.toFixed(2)}`, color: "#1A2436" },
                        { label: "Gross Profit", value: `₹${(sel.price - sel.cost).toFixed(2)}`, color: "#2E7D32" },
                      ].map((k, i) => (
                        <div key={k.label} style={{ padding: "14px 16px", borderRight: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                      {[
                        { label: "Stock Value", value: `₹${(sel.stock * sel.cost).toFixed(2)}`, color: "#0C1B33" },
                        { label: "Retail Value", value: `₹${(sel.stock * sel.price).toFixed(2)}`, color: "#2E7D32" },
                        { label: "Potential Profit", value: `₹${(sel.stock * (sel.price - sel.cost)).toFixed(2)}`, color: "#1B6CA8" },
                      ].map((k, i) => (
                        <div key={k.label} style={{ padding: "14px 16px", borderRight: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Active Batches */}
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Active Batches</span>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>
                        {batches.filter(b => b.drug === sel.name).length} record{batches.filter(b => b.drug === sel.name).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {batches.filter(b => b.drug === sel.name).length > 0 ? (
                      batches.filter(b => b.drug === sel.name).map((b, i, arr) => {
                        const bStatus = b.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : b.status === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                        const nearExpiry = new Date(b.expiry) < new Date("2025-12-31");
                        return (
                          <div key={b.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{b.id}</span>
                              <Pill label={b.status} bg={bStatus.bg} color={bStatus.color} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                              {[
                                { label: "Received", value: b.received, warn: false },
                                { label: "Expiry", value: b.expiry, warn: nearExpiry },
                                { label: "Remaining", value: `${b.qtyCurrent} ${b.unit}`, warn: false },
                              ].map(c => (
                                <div key={c.label}>
                                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3 }}>{c.label}</div>
                                  <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: c.warn ? "#E65100" : "#6B7280", fontWeight: c.label === "Remaining" ? 600 : 400 }}>{c.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: 16, fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>No batch records for this item.</div>
                    )}
                  </div>

                  {/* 4. Supply Chain Provenance */}
                  {(() => {
                    const drugMoves = MOVEMENTS[sel.name] ?? [];
                    const grnMoves = drugMoves.filter(m => m.type === "GRN").sort((a, b) => b.date.localeCompare(a.date));
                    const latestGRN = grnMoves[0] ?? null;
                    const drugBatch = batches.find(b => b.drug === sel.name);
                    const poRef = latestGRN ? `PO-${latestGRN.ref.replace("GRN-", "")}` : "—";
                    const provenanceSteps = [
                      {
                        icon: "PO",
                        label: "Purchase Order",
                        ref: poRef,
                        meta: latestGRN ? `Supplier: ${sel.supplier}` : "No PO on record",
                        color: "#7C3AED",
                        bg: "#F5F3FF",
                        done: !!latestGRN,
                      },
                      {
                        icon: "PUR",
                        label: "Purchase",
                        ref: latestGRN?.ref ?? "—",
                        meta: latestGRN ? `${latestGRN.date} · ${latestGRN.qty} ${sel.unit} · by ${latestGRN.user}` : "No purchase on record",
                        color: "#1B6CA8",
                        bg: "#EFF6FF",
                        done: !!latestGRN,
                      },
                      {
                        icon: "BATCH",
                        label: "Batch Assigned",
                        ref: latestGRN?.batch ?? drugBatch?.id ?? "—",
                        meta: latestGRN?.toLocation ? `Location: ${latestGRN.toLocation}` : drugBatch ? `Expiry: ${drugBatch.expiry}` : "No batch record",
                        color: "#2E7D32",
                        bg: "#E8F5E9",
                        done: !!(latestGRN?.batch ?? drugBatch),
                      },
                      {
                        icon: "STOCK",
                        label: "Available in Stock",
                        ref: `${sel.stock} ${sel.unit}`,
                        meta: `Bin: ${sel.location} · Value: ₹${(sel.stock * sel.cost).toFixed(2)}`,
                        color: sel.stock === 0 ? "#C62828" : sel.stock < sel.minStock ? "#E65100" : "#00ACC1",
                        bg: sel.stock === 0 ? "#FFEBEE" : sel.stock < sel.minStock ? "#FFF3E0" : "#E0F7FA",
                        done: sel.stock > 0,
                      },
                    ];
                    return (
                      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                          Supply Chain Provenance
                        </div>
                        <div style={{ padding: "16px 16px 10px" }}>
                          {provenanceSteps.map((step, i) => (
                            <div key={step.label} style={{ display: "flex", gap: 12, marginBottom: i < provenanceSteps.length - 1 ? 0 : 0 }}>
                              {/* Left: connector */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
                                <div style={{ width: 36, height: 36, background: step.done ? step.bg : "#F0F3F7", border: `2px solid ${step.done ? step.color : "#DDE3EC"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: step.done ? step.color : "#9CA3AF", letterSpacing: "0.04em", flexShrink: 0, borderRadius: 4 }}>
                                  {step.icon}
                                </div>
                                {i < provenanceSteps.length - 1 && (
                                  <div style={{ width: 2, flex: 1, minHeight: 20, background: step.done ? "#DDE3EC" : "#EEF1F6", margin: "3px 0" }} />
                                )}
                              </div>
                              {/* Right: content */}
                              <div style={{ flex: 1, paddingBottom: i < provenanceSteps.length - 1 ? 14 : 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: step.done ? "#1A2436" : "#9CA3AF" }}>{step.label}</span>
                                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: step.done ? step.color : "#9CA3AF", fontWeight: 600 }}>{step.ref}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5 }}>{step.meta}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Supplier footer */}
                        <div style={{ padding: "10px 16px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>Primary Supplier</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{sel.supplier}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. Product Details */}
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Product Details</div>
                    {[
                      { label: "Generic Name", value: genericName(sel.name), mono: false },
                      { label: "Brand Name", value: sel.name, mono: false },
                      { label: "Dosage Form", value: dosageForm(sel.unit), mono: false },
                      { label: "Unit of Measure", value: sel.unit, mono: false },
                      { label: "Category", value: sel.category, mono: false },
                      { label: "Schedule", value: SCHEDULE[sel.category] || "Schedule H", mono: false },
                      { label: "Expiry Date", value: sel.expiry, mono: true },
                      { label: "Manufacturer", value: sel.supplier, mono: false },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{row.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: row.mono ? "JetBrains Mono" : "Inter" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {dTab === "clinical" && (
                <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Clinical Information</div>
                  <div style={{ padding: 20 }}>
                    {[
                      { label: "Therapeutic Category", value: sel.category },
                      { label: "Schedule", value: SCHEDULE[sel.category] || "Schedule H" },
                      { label: "Dosage Form", value: dosageForm(sel.unit) },
                      { label: "Unit of Measure", value: sel.unit },
                      { label: "Expiry", value: sel.expiry },
                    ].map((r, i, arr) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 16, padding: "12px 14px", background: "#F0F6FF", border: "1px solid #C7DDFF", fontSize: 12, color: "#1B6CA8" }}>
                      Full clinical notes can be added through the Inventory module.
                    </div>
                  </div>
                </div>
              )}

              {dTab === "movements" && (() => {
                const allMoves: StockMovement[] = (
                  MOVEMENTS[sel.name]
                    ? [...MOVEMENTS[sel.name]]
                    : adjustments.filter(a => a.drug === sel.name).map(a => ({
                        id: a.id, date: a.date, type: "Adjustment" as const,
                        ref: a.ref, qty: a.qty, user: a.by, reason: a.reason,
                        qtyBefore: a.qtyBefore, qtyAfter: a.qtyAfter,
                      }))
                ).sort((a, b) => b.date.localeCompare(a.date));

                const stockIn  = allMoves.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
                const stockOut = allMoves.filter(m => m.qty < 0).reduce((s, m) => s + m.qty, 0);
                const netChange = stockIn + stockOut;

                const TYPE_LABEL: Record<string, string> = { "GRN": "Purchase" };
                const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
                  "GRN":          { bg: "#E8F5E9", color: "#2E7D32" },
                  "Sale":         { bg: "#FFEBEE", color: "#C62828" },
                  "Adjustment":   { bg: "#E3F2FD", color: "#1B6CA8" },
                  "Transfer In":  { bg: "#EFF6FF", color: "#1565C0" },
                  "Transfer Out": { bg: "#FFF3E0", color: "#E65100" },
                  "Return":       { bg: "#F3E5F5", color: "#7B1FA2" },
                };

                const typeDesc: Record<string, string> = {
                  "GRN":          "Purchase received into stock",
                  "Sale":         "Dispensed to patient",
                  "Transfer In":  "Received via transfer",
                  "Transfer Out": "Sent via transfer",
                  "Return":       "Stock returned",
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                    {/* Summary strip */}
                    <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                      {[
                        { label: "Events", value: allMoves.length.toString(), color: "#1A2436" },
                        { label: "Stock In", value: stockIn > 0 ? `+${stockIn}` : "0", color: "#2E7D32" },
                        { label: "Stock Out", value: stockOut.toString(), color: "#C62828" },
                        { label: "Net Change", value: netChange > 0 ? `+${netChange}` : netChange.toString(), color: netChange > 0 ? "#2E7D32" : netChange < 0 ? "#C62828" : "#6B7280" },
                      ].map((k, i) => (
                        <div key={k.label} style={{ padding: "12px 14px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none" }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>{k.label}</div>
                          <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Type legend */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {Object.entries(TYPE_STYLE).map(([t, s]) => (
                        <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: s.bg, color: s.color, fontWeight: 700, letterSpacing: "0.03em" }}>{TYPE_LABEL[t] ?? t}</span>
                      ))}
                    </div>

                    {/* Full event feed */}
                    <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                        All Stock Events — Newest First
                      </div>
                      {allMoves.length > 0 ? allMoves.map((m, i, arr) => {
                        const ts = TYPE_STYLE[m.type] ?? { bg: "#F0F3F7", color: "#6B7280" };
                        const isAdj = m.type === "Adjustment";
                        const isTransfer = m.type === "Transfer In" || m.type === "Transfer Out";
                        return (
                          <div key={m.id} style={{ padding: "13px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                            {/* Row 1: type badge + ref + date + qty */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 10, padding: "2px 8px", background: ts.bg, color: ts.color, fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0 }}>{TYPE_LABEL[m.type] ?? m.type}</span>
                                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{m.ref}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{m.date}</span>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 800, color: m.qty > 0 ? "#2E7D32" : "#C62828", minWidth: 44, textAlign: "right" as const }}>
                                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                                </span>
                              </div>
                            </div>
                            {/* Row 2: description line */}
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: isAdj && m.qtyBefore != null ? 8 : 6, lineHeight: 1.4 }}>
                              {m.reason ?? (isTransfer && m.fromLocation && m.toLocation
                                ? `${m.fromLocation} → ${m.toLocation}`
                                : typeDesc[m.type] ?? "")}
                            </div>
                            {/* Row 3: before → after flow (adjustments only) */}
                            {isAdj && m.qtyBefore != null && m.qtyAfter != null && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 10px", background: "#F8FAFC", borderRadius: 4, border: "1px solid #EEF1F6" }}>
                                <div style={{ textAlign: "center" as const }}>
                                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>Before</div>
                                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#6B7280" }}>{m.qtyBefore}</div>
                                </div>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                                  <div style={{ flex: 1, height: 1, background: "#DDE3EC" }} />
                                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>→</span>
                                  <div style={{ flex: 1, height: 1, background: "#DDE3EC" }} />
                                </div>
                                <div style={{ textAlign: "center" as const }}>
                                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>After</div>
                                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{m.qtyAfter}</div>
                                </div>
                              </div>
                            )}
                            {/* Row 4: batch + location (GRN) */}
                            {m.batch && (
                              <div style={{ display: "flex", gap: 14, marginBottom: 5 }}>
                                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>
                                  Batch:&nbsp;<span style={{ color: "#1B6CA8" }}>{m.batch}</span>
                                </span>
                                {m.toLocation && (
                                  <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>
                                    Location:&nbsp;<span style={{ color: "#6B7280" }}>{m.toLocation}</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Row 5: user */}
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                              by <span style={{ fontWeight: 600, color: "#6B7280" }}>{m.user}</span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div style={{ padding: 24, fontSize: 13, color: "#9CA3AF", textAlign: "center" as const }}>No movements recorded for this item.</div>
                      )}
                    </div>

                  </div>
                );
              })()}

              {/* #23 Historical Stock View — cumulative stock level over time */}
              {dTab === "history" && (() => {
                const moves = [...(MOVEMENTS[sel.name] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
                if (moves.length === 0) return (
                  <div style={{ padding: 32, textAlign: "center" as const, fontSize: 13, color: "#9CA3AF" }}>No movement history available for this item.</div>
                );
                let runningQty = sel.stock;
                const timeline = [...moves].reverse().map(m => {
                  const snapQty = runningQty;
                  runningQty = runningQty - m.qty;
                  return { ...m, snapQty };
                }).reverse();
                const maxQty = Math.max(...timeline.map(t => t.snapQty), sel.stock);
                const TYPE_COLOR: Record<string, string> = {
                  "GRN": "#2E7D32", "Sale": "#C62828", "Adjustment": "#1B6CA8",
                  "Transfer In": "#1565C0", "Transfer Out": "#E65100", "Return": "#7B1FA2",
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                    <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Stock Level Over Time</div>
                      <div style={{ position: "relative", height: 80, display: "flex", alignItems: "flex-end", gap: 3 }}>
                        {timeline.map((t, i) => {
                          const h = Math.max(4, (t.snapQty / Math.max(maxQty, 1)) * 72);
                          const c = TYPE_COLOR[t.type] ?? "#9CA3AF";
                          return (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                              title={`${t.date}: ${t.type === "GRN" ? "Purchase" : t.type} (${t.qty > 0 ? "+" : ""}${t.qty}) → ${t.snapQty} units`}>
                              <div style={{ height: h, minHeight: 4, background: c, width: "100%", opacity: 0.85 }} />
                            </div>
                          );
                        })}
                        <div style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px dashed #EEF1F6", fontSize: 9, color: "#9CA3AF", paddingLeft: 2 }}>{maxQty}</div>
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderBottom: "1px solid #EEF1F6" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{timeline[0]?.date}</span>
                        <span style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{timeline[timeline.length - 1]?.date}</span>
                      </div>
                    </div>

                    <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                        Stock Snapshot Timeline
                      </div>
                      {timeline.map((m, i, arr) => {
                        const c = TYPE_COLOR[m.type] ?? "#9CA3AF";
                        return (
                          <div key={m.id} style={{ display: "flex", gap: 12, padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0, paddingTop: 2 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} />
                              {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 16, background: "#EEF1F6", marginTop: 3 }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 10, padding: "1px 6px", background: c + "22", color: c, fontWeight: 700 }}>{m.type === "GRN" ? "Purchase" : m.type}</span>
                                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{m.date}</span>
                                </div>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>
                                  {m.qty > 0 ? "+" : ""}{m.qty}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 11, color: "#6B7280" }}>{m.reason ?? m.ref}</span>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#0C1B33", fontWeight: 600 }}>{m.snapQty} units</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #E8ECF4", background: "#fff", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setShowAdjust(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>Adjust Stock</button>
              <button onClick={() => setShowPO(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>Create PO</button>
              <button onClick={() => { setSel(null); onNavigate?.("inventory"); }} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>View in Inventory</button>
            </div>

          </aside>
        </>
      )}

      {/* Adjust Stock modal */}
      {showAdjust && sel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 480, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>New Stock Adjustment</div>
              <button onClick={() => setShowAdjust(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>&times;</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Drug / Item", el: <input type="text" defaultValue={sel.name} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Adjustment Type", el: <select style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}><option>Write-off</option><option>Stock Count</option><option>Damage</option><option>Donation</option><option>Other</option></select> },
                { label: "Quantity Change", el: <input type="number" placeholder="Use negative for reduction (e.g. -10)" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Reason", el: <input type="text" placeholder="Describe the reason for adjustment" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} /> },
                { label: "Reference #", el: <input type="text" placeholder="e.g. COUNT-AUG29" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAdjust(false)} style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={() => setShowAdjust(false)} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PO modal */}
      {showPO && sel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 480, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Create Purchase Order</div>
              <button onClick={() => setShowPO(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>&times;</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Medicine", el: <input type="text" defaultValue={sel.name} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Supplier", el: <input type="text" defaultValue={sel.supplier} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Order Quantity", el: <input type="number" placeholder={`Current stock: ${sel.stock} ${sel.unit}`} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Expected Delivery Date", el: <input type="date" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Notes", el: <input type="text" placeholder="Reason for order or special instructions" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} /> },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowPO(false)} style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={() => { setShowPO(false); setSel(null); onNavigate?.("purchases"); }} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Create PO</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
