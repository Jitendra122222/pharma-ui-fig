import { drugs } from "../../data/mockData";

type InvSection = "dashboard" | "stock" | "shortbook" | "verification" | "expiry" | "movement" | "reports";

// ─── Mock data ──────────────────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  { time: "10:42 AM", medicine: "Dolo 650 mg", batch: "D1234", action: "Purchase Received", user: "Priya K.", status: "Completed" },
  { time: "09:15 AM", medicine: "Azithromycin 500mg", batch: "A908", action: "Sale", user: "System", status: "Completed" },
  { time: "Yesterday", medicine: "Pantoprazole 40mg", batch: "P2001", action: "Location Transfer", user: "Ramesh S.", status: "Completed" },
  { time: "Yesterday", medicine: "Metformin 1000mg", batch: "BT-117", action: "Physical Count", user: "Priya K.", status: "Mismatch" },
  { time: "22 Sep", medicine: "Insulin Glargine", batch: "IG001", action: "Expiry Alert", user: "System", status: "Pending" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Completed:  { bg: "#E8F5E9", color: "#2E7D32" },
  Mismatch:   { bg: "#FFEBEE", color: "#C62828" },
  Pending:    { bg: "#FFF3E0", color: "#E65100" },
};

const QUICK_ACTIONS = [
  { label: "Scan Stock",   color: "#1B6CA8", bg: "#EFF6FF", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg> },
  { label: "Count Stock",  color: "#2E7D32", bg: "#E8F5E9", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { label: "Short Book",   color: "#E65100", bg: "#FFF3E0", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg> },
  { label: "Transfer",     color: "#6B21A8", bg: "#F5F3FF", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> },
  { label: "Add Medicine", color: "#0C6E6E", bg: "#ECFDF5", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
];

function getExpiryInfo(expiry: string) {
  const ref = new Date("2025-07-28");
  const d = Math.floor((new Date(expiry).getTime() - ref.getTime()) / 86400000);
  return d;
}

export default function InventoryDashboard({ onNavigate }: { onNavigate: (s: InvSection) => void }) {
  const totalStockValue = drugs.reduce((s, d) => s + d.stock * d.cost, 0);
  const sellableUnits   = drugs.filter(d => d.status === "In Stock").reduce((s, d) => s + d.stock, 0);
  const atRiskValue     = drugs.filter(d => { const dl = getExpiryInfo(d.expiry); return dl >= 0 && dl <= 90; }).reduce((s, d) => s + d.stock * d.cost, 0);
  const outOfStock      = drugs.filter(d => d.status === "Out of Stock").length;
  const lowStock        = drugs.filter(d => d.status === "Low Stock").length;
  const nearExpiry      = drugs.filter(d => { const dl = getExpiryInfo(d.expiry); return dl >= 0 && dl <= 60; }).length;

  const KPI_TILES = [
    { label: "Total Stock Value", value: `₹${(totalStockValue / 100000).toFixed(1)} L`, sub: "At purchase cost", color: "#1B6CA8", bg: "#EFF6FF" },
    { label: "Sellable Units",    value: sellableUnits.toLocaleString(),                sub: "Across all products", color: "#2E7D32", bg: "#E8F5E9" },
    { label: "At Risk Value",     value: `₹${(atRiskValue / 100000).toFixed(1)} L`,    sub: "Expiring within 90d", color: "#E65100", bg: "#FFF3E0" },
    { label: "Open Short Book",   value: "8",                                           sub: "Cases pending",       color: "#C62828", bg: "#FFEBEE" },
  ];

  const ACTION_ITEMS = [
    { dot: "#C62828", label: "Stock-out Risk",  sub: "Medicines likely to run out soon",       count: outOfStock, nav: "stock" as InvSection },
    { dot: "#E65100", label: "Short Book",       sub: "Cases requiring investigation",          count: 8,          nav: "shortbook" as InvSection },
    { dot: "#F57F17", label: "Expiry Risk",      sub: "Stock approaching expiry",               count: nearExpiry, nav: "expiry" as InvSection },
    { dot: "#7C3AED", label: "Stock Mismatch",   sub: "Physical stock differs from system",     count: 5,          nav: "verification" as InvSection },
    { dot: "#E65100", label: "Low Stock",        sub: "Below reorder level — order soon",       count: lowStock,   nav: "stock" as InvSection },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Inventory Dashboard</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{drugs.length} products &middot; Action center</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
            Scan
          </button>
          <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            + Actions
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {KPI_TILES.map(t => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>{t.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: t.color }}>{t.value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Action Required + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>

        {/* Action Required */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #EEF1F6" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0C1B33", letterSpacing: "0.06em", textTransform: "uppercase" }}>Action Required</div>
          </div>
          <div>
            {ACTION_ITEMS.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < ACTION_ITEMS.length - 1 ? "1px solid #F4F6FA" : "none", borderLeft: `3px solid ${a.dot}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{a.sub}</div>
                </div>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: a.dot, minWidth: 32, textAlign: "right" as const }}>{a.count}</span>
                <button onClick={() => onNavigate(a.nav)}
                  style={{ padding: "4px 12px", border: `1px solid ${a.dot}`, background: "#fff", fontSize: 11, cursor: "pointer", color: a.dot, fontFamily: "Inter", fontWeight: 600, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "16px 20px", minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0C1B33", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {QUICK_ACTIONS.map(a => (
              <button key={a.label}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid #EEF1F6", background: "#FAFBFD", cursor: "pointer", fontFamily: "Inter", width: "100%", textAlign: "left" as const }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F0F6FF"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#BFDBFE"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FAFBFD"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#EEF1F6"; }}>
                <div style={{ width: 30, height: 30, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>{a.icon}</div>
                <span style={{ fontSize: 12, color: "#4A5875", fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Inventory Activity */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0C1B33", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent Inventory Activity</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time", "Medicine", "Batch", "Action", "User", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "8px 14px", textAlign: i > 3 ? "center" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_ACTIVITY.map((r, i) => {
              const st = STATUS_STYLE[r.status] ?? { bg: "#F5F5F5", color: "#9CA3AF" };
              return (
                <tr key={i} style={{ borderBottom: "1px solid #F4F6FA" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.time}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#0C1B33" }}>{r.medicine}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{r.batch}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#4A5875" }}>{r.action}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{r.user}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" as const }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", background: st.bg, color: st.color, borderRadius: 2 }}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
