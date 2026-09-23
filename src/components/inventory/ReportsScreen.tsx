import { useState } from "react";
import { drugs } from "../../data/mockData";

// ─── Mock data ──────────────────────────────────────────────────────────────────

const REF_DATE = new Date("2025-07-28");

function daysToExpiry(expiryDate: string): number {
  return Math.floor((new Date(expiryDate).getTime() - REF_DATE.getTime()) / 86400000);
}

const MOVEMENT_DATA = [
  { date: "28 Jul 2025", type: "Purchase", medicine: "Amoxicillin 500mg",   batch: "A9080",       qtyChange: +240, user: "System" },
  { date: "28 Jul 2025", type: "Sale",     medicine: "Paracetamol 500mg",   batch: "P-1200",      qtyChange: -30,  user: "Counter" },
  { date: "27 Jul 2025", type: "Return",   medicine: "Atorvastatin 20mg",   batch: "AT-2025-112", qtyChange: +5,   user: "Priya K." },
  { date: "27 Jul 2025", type: "Transfer", medicine: "Insulin Glargine",    batch: "IG-2025-001", qtyChange: 0,    user: "Ramesh S." },
  { date: "26 Jul 2025", type: "Damage",   medicine: "Ciprofloxacin 500mg", batch: "C-2025-007",  qtyChange: -6,   user: "Suresh M." },
  { date: "26 Jul 2025", type: "Adjustment",medicine: "Amlodipine 5mg",    batch: "AM-2025-088", qtyChange: +5,   user: "Admin" },
  { date: "25 Jul 2025", type: "Sale",     medicine: "Metformin 1000mg",    batch: "MF-2025-033", qtyChange: -28,  user: "Counter" },
  { date: "25 Jul 2025", type: "Purchase", medicine: "Warfarin 5mg",        batch: "W-445",       qtyChange: +50,  user: "System" },
];

const SHORT_REPORT_DATA = [
  { id: "SB-2025-0042", medicine: "Insulin Glargine",    type: "Purchase", shortQty: 16, claimValue: 256.0,  status: "Open",          resolvedDate: "" },
  { id: "SB-2025-0041", medicine: "Amoxicillin 500mg",   type: "Physical", shortQty: 24, claimValue: 10.08,  status: "Investigating", resolvedDate: "" },
  { id: "SB-2025-0038", medicine: "Paracetamol 500mg",   type: "Damage",   shortQty: 18, claimValue: 0.72,   status: "Resolved",      resolvedDate: "22 Jul 2025" },
  { id: "SB-2025-0037", medicine: "Ciprofloxacin 500mg", type: "Expiry",   shortQty: 12, claimValue: 14.40,  status: "Recovery",      resolvedDate: "" },
  { id: "SB-2025-0036", medicine: "Amlodipine 5mg",      type: "Purchase", shortQty: 5,  claimValue: 2.25,   status: "Resolved",      resolvedDate: "20 Jul 2025" },
];

const SHRINKAGE_DATA = [
  { medicine: "Amoxicillin 500mg",   category: "Antibiotics",     shrinkQty: 24, shrinkValue: 10.08, cause: "Physical Count" },
  { medicine: "Ciprofloxacin 500mg", category: "Antibiotics",     shrinkQty: 18, shrinkValue: 21.60, cause: "Damage" },
  { medicine: "Insulin Glargine",    category: "Antidiabetics",   shrinkQty: 16, shrinkValue: 256.0, cause: "Purchase Short" },
  { medicine: "Paracetamol 500mg",   category: "Analgesics",      shrinkQty: 18, shrinkValue: 0.72,  cause: "Damage" },
  { medicine: "Warfarin 5mg",        category: "Anticoagulants",  shrinkQty: 3,  shrinkValue: 2.85,  cause: "Transfer" },
];

const RECOVERY_DATA = [
  { id: "RCV-2025-008", medicine: "Amlodipine 5mg",      type: "Supplier Credit", qty: 5, value: 2.25,  status: "Recovered", date: "20 Jul 2025" },
  { id: "RCV-2025-007", medicine: "Paracetamol 500mg",   type: "Write Off",       qty: 18, value: 0.72, status: "Written Off", date: "24 Jul 2025" },
  { id: "RCV-2025-006", medicine: "Ciprofloxacin 500mg", type: "Return to Supplier", qty: 12, value: 14.40, status: "Pending", date: "" },
];

// ─── Value computations ────────────────────────────────────────────────────────

const totalPurchaseValue = drugs.reduce((s, d) => s + d.stock * d.cost, 0);
const totalMRPValue      = drugs.reduce((s, d) => s + d.stock * d.price, 0);
const sellableValue      = drugs.filter(d => d.status === "In Stock").reduce((s, d) => s + d.stock * d.price, 0);
const atRiskValue        = drugs.filter(d => { const dl = daysToExpiry(d.expiry); return dl >= 0 && dl <= 90; }).reduce((s, d) => s + d.stock * d.cost, 0);
const expiredValue       = drugs.filter(d => daysToExpiry(d.expiry) < 0).reduce((s, d) => s + d.stock * d.cost, 0);
const damagedValue       = 390.42;

// ─── Shared filter bar ─────────────────────────────────────────────────────────

function FilterBar() {
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [location, setLocation] = useState("All Locations");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #DDE3EC", marginBottom: 0 }}>
      <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
        {["Last 7 Days", "Last 30 Days", "Last 90 Days", "Last 12 Months", "Custom Range"].map(o => <option key={o}>{o}</option>)}
      </select>
      <select value={location} onChange={e => setLocation(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
        {["All Locations", "Section A", "Section B", "Section C", "Cold Storage"].map(o => <option key={o}>{o}</option>)}
      </select>
      <div style={{ marginLeft: "auto" }}>
        <button style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export
        </button>
      </div>
    </div>
  );
}

// ─── Reusable Table ────────────────────────────────────────────────────────────

function RptTable({ headers, rows, rightCols }: { headers: string[]; rows: React.ReactNode[][]; rightCols?: number[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={h} style={{ padding: "8px 14px", textAlign: rightCols?.includes(i) ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid #F0F3F7" : "none" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "10px 14px", textAlign: rightCols?.includes(ci) ? "right" as const : "left" as const }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────────

const SUB_TABS = ["Valuation", "Aging", "Movement", "Short", "Expiry", "Risk", "Shrinkage", "Recovery"] as const;
type RptTab = typeof SUB_TABS[number];

// ─── Valuation tab ─────────────────────────────────────────────────────────────

function ValuationTab() {
  const cards = [
    { label: "Purchase Value",  value: totalPurchaseValue, color: "#1B6CA8", bg: "#EFF6FF" },
    { label: "MRP Value",       value: totalMRPValue,      color: "#2E7D32", bg: "#E8F5E9" },
    { label: "Sellable Value",  value: sellableValue,      color: "#2E7D32", bg: "#E8F5E9" },
    { label: "At-Risk Value",   value: atRiskValue,        color: "#E65100", bg: "#FFF3E0" },
    { label: "Expired Value",   value: expiredValue,       color: "#9CA3AF", bg: "#F3F4F6" },
    { label: "Damaged Value",   value: damagedValue,       color: "#C62828", bg: "#FFEBEE" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: c.color }}>₹{c.value.toFixed(0)}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <RptTable
          headers={["Medicine", "Category", "Qty", "Unit Cost", "MRP", "Sellable Value", "At Risk"]}
          rightCols={[2, 3, 4, 5, 6]}
          rows={drugs.map(d => {
            const dl = daysToExpiry(d.expiry);
            const atRisk = dl >= 0 && dl <= 90;
            return [
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</span>,
              <span style={{ fontSize: 12, color: "#6B7280" }}>{d.category}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{d.stock}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>₹{d.cost.toFixed(2)}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{d.price.toFixed(2)}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#2E7D32" }}>₹{(d.stock * d.price).toFixed(0)}</span>,
              atRisk ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: "#FFF3E0", color: "#E65100" }}>₹{(d.stock * d.cost).toFixed(0)}</span> : <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>,
            ];
          })}
        />
      </div>
    </>
  );
}

// ─── Aging tab ─────────────────────────────────────────────────────────────────

function AgingTab() {
  const bands = [
    { label: "0–30 days",  count: drugs.filter(d => { const dl = daysToExpiry(d.expiry); return dl >= 0 && dl <= 30; }).length,  color: "#C62828", bg: "#FFEBEE" },
    { label: "31–60 days", count: drugs.filter(d => { const dl = daysToExpiry(d.expiry); return dl > 30 && dl <= 60; }).length, color: "#E65100", bg: "#FFF3E0" },
    { label: "61–90 days", count: drugs.filter(d => { const dl = daysToExpiry(d.expiry); return dl > 60 && dl <= 90; }).length, color: "#F57F17", bg: "#FFF8E1" },
    { label: "90+ days",   count: drugs.filter(d => daysToExpiry(d.expiry) > 90).length,                                        color: "#2E7D32", bg: "#E8F5E9" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {bands.map(b => (
          <div key={b.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{b.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: b.color }}>{b.count}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>products</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <RptTable
          headers={["Medicine", "Batch", "Expiry Date", "Days Left", "Age Band", "Qty", "Value"]}
          rightCols={[3, 5, 6]}
          rows={drugs.map(d => {
            const dl = daysToExpiry(d.expiry);
            const band = dl < 0 ? "Expired" : dl <= 30 ? "0–30 days" : dl <= 60 ? "31–60 days" : dl <= 90 ? "61–90 days" : "90+ days";
            const bandColor = dl < 0 ? "#9CA3AF" : dl <= 30 ? "#C62828" : dl <= 60 ? "#E65100" : dl <= 90 ? "#F57F17" : "#2E7D32";
            const bandBg = dl < 0 ? "#F3F4F6" : dl <= 30 ? "#FFEBEE" : dl <= 60 ? "#FFF3E0" : dl <= 90 ? "#FFF8E1" : "#E8F5E9";
            return [
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</span>,
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>—</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.expiry}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: bandColor }}>{dl < 0 ? `−${Math.abs(dl)}d` : `+${dl}d`}</span>,
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: bandBg, color: bandColor }}>{band}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.stock}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{(d.stock * d.cost).toFixed(0)}</span>,
            ];
          })}
        />
      </div>
    </>
  );
}

// ─── Movement tab ──────────────────────────────────────────────────────────────

function MovementTab() {
  const typeStyle: Record<string, { bg: string; color: string }> = {
    Purchase:   { bg: "#E8F5E9", color: "#2E7D32" },
    Sale:       { bg: "#EFF6FF", color: "#1B6CA8" },
    Return:     { bg: "#FFF3E0", color: "#E65100" },
    Transfer:   { bg: "#F5F3FF", color: "#6B21A8" },
    Damage:     { bg: "#FFEBEE", color: "#C62828" },
    Adjustment: { bg: "#F3F4F6", color: "#6B7280" },
  };
  return (
    <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
      <RptTable
        headers={["Date", "Type", "Medicine", "Batch", "Qty Change", "User"]}
        rightCols={[4]}
        rows={MOVEMENT_DATA.map(r => {
          const ts = typeStyle[r.type] ?? { bg: "#F3F4F6", color: "#6B7280" };
          return [
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date}</span>,
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: ts.bg, color: ts.color }}>{r.type}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.medicine}</span>,
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</span>,
            <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: r.qtyChange > 0 ? "#2E7D32" : r.qtyChange < 0 ? "#C62828" : "#9CA3AF" }}>{r.qtyChange > 0 ? `+${r.qtyChange}` : r.qtyChange || "—"}</span>,
            <span style={{ fontSize: 12, color: "#6B7280" }}>{r.user}</span>,
          ];
        })}
      />
    </div>
  );
}

// ─── Short tab ─────────────────────────────────────────────────────────────────

function ShortTab() {
  const statusStyle: Record<string, { bg: string; color: string }> = {
    Open:        { bg: "#FFEBEE", color: "#C62828" },
    Investigating:{ bg: "#FFF3E0", color: "#E65100" },
    Resolved:    { bg: "#E8F5E9", color: "#2E7D32" },
    Recovery:    { bg: "#F5F3FF", color: "#6B21A8" },
  };
  const totalShortValue = SHORT_REPORT_DATA.reduce((s, r) => s + r.claimValue, 0);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Open Cases",    value: SHORT_REPORT_DATA.filter(r => r.status === "Open").length, mono: false, suffix: "" },
          { label: "Total Shortage",value: SHORT_REPORT_DATA.reduce((s, r) => s + r.shortQty, 0), mono: true, suffix: " units" },
          { label: "Claim Value",   value: totalShortValue, mono: true, suffix: "", prefix: "₹" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: "#C62828" }}>{c.prefix || ""}{typeof c.value === "number" ? c.value.toFixed(c.prefix ? 2 : 0) : c.value}{c.suffix}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <RptTable
          headers={["Short Book ID", "Medicine", "Type", "Short Qty", "Claim Value", "Status", "Resolved"]}
          rightCols={[3, 4]}
          rows={SHORT_REPORT_DATA.map(r => {
            const ss = statusStyle[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
            return [
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{r.id}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.medicine}</span>,
              <span style={{ fontSize: 12, color: "#6B7280" }}>{r.type}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>{r.shortQty}</span>,
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{r.claimValue.toFixed(2)}</span>,
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: ss.bg, color: ss.color }}>{r.status}</span>,
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.resolvedDate || "—"}</span>,
            ];
          })}
        />
      </div>
    </>
  );
}

// ─── Expiry report tab ─────────────────────────────────────────────────────────

function ExpiryReportTab() {
  const expiry = drugs.map(d => ({ ...d, daysLeft: daysToExpiry(d.expiry) })).sort((a, b) => a.daysLeft - b.daysLeft);
  return (
    <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
      <RptTable
        headers={["Medicine", "Category", "Expiry Date", "Days Left", "Qty", "At Risk Value", "Action Required"]}
        rightCols={[3, 4, 5]}
        rows={expiry.map(d => {
          const riskColor = d.daysLeft < 0 ? "#9CA3AF" : d.daysLeft <= 30 ? "#C62828" : d.daysLeft <= 60 ? "#E65100" : "#2E7D32";
          const action = d.daysLeft < 0 ? "Write Off" : d.daysLeft <= 30 ? "Urgent Return" : d.daysLeft <= 60 ? "Plan Return" : "Monitor";
          return [
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</span>,
            <span style={{ fontSize: 12, color: "#6B7280" }}>{d.category}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.expiry}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: riskColor }}>{d.daysLeft < 0 ? `−${Math.abs(d.daysLeft)}d` : `+${d.daysLeft}d`}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.stock}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: riskColor }}>₹{(d.stock * d.cost).toFixed(0)}</span>,
            <span style={{ fontSize: 11, fontWeight: 600, color: riskColor }}>{action}</span>,
          ];
        })}
      />
    </div>
  );
}

// ─── Risk tab ──────────────────────────────────────────────────────────────────

function RiskReportTab() {
  return (
    <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>Risk Analysis</div>
      </div>
      <RptTable
        headers={["Medicine", "Category", "Stock", "Reorder Level", "Risk Type", "Cover Days", "Action"]}
        rightCols={[2, 3, 5]}
        rows={drugs.map(d => {
          const coverDays = d.stock > 0 ? Math.floor(d.stock / Math.max(d.minStock / 7, 1)) : 0;
          const riskType = d.stock === 0 ? "Out of Stock" : d.stock < d.minStock ? "Below Reorder" : coverDays < 14 ? "Low Cover" : "Normal";
          const riskStyle = riskType === "Out of Stock" ? "#C62828" : riskType === "Below Reorder" ? "#E65100" : riskType === "Low Cover" ? "#F57F17" : "#2E7D32";
          return [
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</span>,
            <span style={{ fontSize: 12, color: "#6B7280" }}>{d.category}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.stock < d.minStock ? "#C62828" : "#1A2436" }}>{d.stock}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.minStock}</span>,
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: `${riskStyle}15`, color: riskStyle }}>{riskType}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: riskStyle }}>{coverDays > 999 ? "—" : `${coverDays}d`}</span>,
            <span style={{ fontSize: 11, fontWeight: 600, color: riskStyle === "#2E7D32" ? "#9CA3AF" : riskStyle }}>{riskType === "Out of Stock" ? "Reorder Now" : riskType === "Below Reorder" ? "Place Order" : riskType === "Low Cover" ? "Plan Order" : "—"}</span>,
          ];
        })}
      />
    </div>
  );
}

// ─── Shrinkage tab ────────────────────────────────────────────────────────────

function ShrinkageTab() {
  const total = SHRINKAGE_DATA.reduce((s, r) => s + r.shrinkValue, 0);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[{ label: "Total Shrinkage Units", value: SHRINKAGE_DATA.reduce((s, r) => s + r.shrinkQty, 0), prefix: "" }, { label: "Total Shrinkage Value", value: total.toFixed(2), prefix: "₹" }, { label: "Shrinkage %", value: ((total / totalPurchaseValue) * 100).toFixed(2), prefix: "" }].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: "#C62828" }}>{c.prefix}{c.value}{c.label.includes("%") ? "%" : ""}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <RptTable
          headers={["Medicine", "Category", "Shrink Qty", "Shrink Value", "Cause"]}
          rightCols={[2, 3]}
          rows={SHRINKAGE_DATA.map(r => [
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.medicine}</span>,
            <span style={{ fontSize: 12, color: "#6B7280" }}>{r.category}</span>,
            <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>{r.shrinkQty}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#C62828" }}>₹{r.shrinkValue.toFixed(2)}</span>,
            <span style={{ fontSize: 12, color: "#4A5875" }}>{r.cause}</span>,
          ])}
        />
      </div>
    </>
  );
}

// ─── Recovery tab ─────────────────────────────────────────────────────────────

function RecoveryTab() {
  const statusStyle: Record<string, { bg: string; color: string }> = {
    Recovered:    { bg: "#E8F5E9", color: "#2E7D32" },
    "Written Off":{ bg: "#F3F4F6", color: "#9CA3AF" },
    Pending:      { bg: "#FFF3E0", color: "#E65100" },
  };
  return (
    <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
      <RptTable
        headers={["Recovery ID", "Medicine", "Recovery Type", "Qty", "Value", "Status", "Date"]}
        rightCols={[3, 4]}
        rows={RECOVERY_DATA.map(r => {
          const ss = statusStyle[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
          return [
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 600 }}>{r.id}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.medicine}</span>,
            <span style={{ fontSize: 12, color: "#4A5875" }}>{r.type}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#2E7D32" }}>{r.qty}</span>,
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{r.value.toFixed(2)}</span>,
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: ss.bg, color: ss.color }}>{r.status}</span>,
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date || "—"}</span>,
          ];
        })}
      />
    </div>
  );
}

// ─── Main Reports Screen ──────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [tab, setTab] = useState<RptTab>("Valuation");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Reports</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Inventory analytics — valuation, aging, movement, shrinkage, and recovery</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6", overflowX: "auto" }}>
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1B6CA8" : "#6B7280", borderBottom: tab === t ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap" as const }}>
            {t}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Tab content */}
      {tab === "Valuation"  && <ValuationTab />}
      {tab === "Aging"      && <AgingTab />}
      {tab === "Movement"   && <MovementTab />}
      {tab === "Short"      && <ShortTab />}
      {tab === "Expiry"     && <ExpiryReportTab />}
      {tab === "Risk"       && <RiskReportTab />}
      {tab === "Shrinkage"  && <ShrinkageTab />}
      {tab === "Recovery"   && <RecoveryTab />}
    </div>
  );
}
