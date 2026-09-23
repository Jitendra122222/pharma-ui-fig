import { useState } from "react";
import { drugs } from "../../data/mockData";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { Pill } from "../shared/Pill";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const REF_DATE = new Date("2025-07-28");

function daysToExpiry(expiryDate: string): number {
  return Math.floor((new Date(expiryDate).getTime() - REF_DATE.getTime()) / 86400000);
}

function expiryBand(days: number): { label: string; bg: string; color: string } {
  if (days < 0)   return { label: "Expired",     bg: "#F3F4F6", color: "#9CA3AF" };
  if (days <= 30)  return { label: "0–30 days",   bg: "#FFEBEE", color: "#C62828" };
  if (days <= 60)  return { label: "31–60 days",  bg: "#FFF3E0", color: "#E65100" };
  if (days <= 90)  return { label: "61–90 days",  bg: "#FFF8E1", color: "#F57F17" };
  return              { label: "90+ days",    bg: "#E8F5E9", color: "#2E7D32" };
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const STOCK_RISK_DATA = drugs.map(d => {
  const avgPerDay = Math.round(d.stock / (Math.random() * 40 + 20));
  const coverDays = avgPerDay > 0 ? Math.floor(d.stock / avgPerDay) : 999;
  const risk = coverDays < 7 ? "Critical" : coverDays < 14 ? "High" : coverDays < 30 ? "Medium" : "Low";
  return { ...d, avgPerDay, coverDays, incoming: Math.random() > 0.5 ? Math.round(avgPerDay * 14) : 0, risk };
});

const RISK_STYLE: Record<string, { bg: string; color: string }> = {
  Critical: { bg: "#FFEBEE", color: "#C62828" },
  High:     { bg: "#FFF3E0", color: "#E65100" },
  Medium:   { bg: "#FFF8E1", color: "#F57F17" },
  Low:      { bg: "#E8F5E9", color: "#2E7D32" },
};

const DEAD_STOCK = [
  { name: "Sertraline 50mg",     qty: 32,  lastSale: "2025-04-15", daysIdle: 104, stockValue: 1280, location: "B3-06" },
  { name: "Ranitidine 150mg",    qty: 144, lastSale: "2025-05-01", daysIdle: 88,  stockValue: 864,  location: "A2-04" },
  { name: "Amoxicillin 500mg",   qty: 0,   lastSale: "2025-07-14", daysIdle: 14,  stockValue: 0,    location: "A1-02" },
  { name: "Salbutamol Inhaler",  qty: 5,   lastSale: "2025-06-10", daysIdle: 48,  stockValue: 350,  location: "C1-07" },
  { name: "Omeprazole 20mg",     qty: 18,  lastSale: "2025-06-20", daysIdle: 38,  stockValue: 396,  location: "B1-03" },
];

const OVERSTOCK = [
  { name: "Paracetamol 500mg", current: 1200, ideal: 600,  excess: 600,  excessValue: 24.0,  reason: "Over-ordered" },
  { name: "Amlodipine 5mg",    current: 380,  ideal: 200,  excess: 180,  excessValue: 81.0,  reason: "Low Sales" },
  { name: "Atorvastatin 20mg", current: 312,  ideal: 150,  excess: 162,  excessValue: 126.36, reason: "Demand Forecast Error" },
  { name: "Metformin 1000mg",  current: 200,  ideal: 100,  excess: 100,  excessValue: 16.0,  reason: "Over-ordered" },
];

// ─── Expiry Detail Page ────────────────────────────────────────────────────────

function ExpiryDetailPage({ drug, onBack }: { drug: typeof drugs[0]; onBack: () => void }) {
  const days = daysToExpiry(drug.expiry);
  const band = expiryBand(days);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory / Expiry & Risk</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{drug.name}</span>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 2, background: band.bg, color: band.color, fontSize: 11, fontWeight: 700 }}>{band.label}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignContent: "start" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "18px 20px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>{drug.name}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>{drug.category}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ label: "Expiry Date", value: drug.expiry }, { label: "Days Left", value: days < 0 ? `${Math.abs(days)}d overdue` : `+${days} days` }, { label: "Stock Qty", value: String(drug.stock) }, { label: "Location", value: drug.location }, { label: "Supplier", value: drug.supplier }, { label: "Status", value: drug.status }].map(r => (
              <div key={r.label}><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div><div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{r.value}</div></div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Resolution Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ label: "Mark for Return", color: "#1B6CA8", bg: "#EFF6FF" }, { label: "Transfer to Another Location", color: "#6B21A8", bg: "#F5F3FF" }, { label: "Apply Discount", color: "#E65100", bg: "#FFF3E0" }, { label: "Quarantine", color: "#C62828", bg: "#FFEBEE" }, { label: "Write Off", color: "#9CA3AF", bg: "#F3F4F6" }].map(a => (
              <button key={a.label} style={{ padding: "9px 14px", border: `1px solid ${a.color}20`, background: a.bg, fontSize: 12, cursor: "pointer", color: a.color, fontFamily: "Inter", fontWeight: 600, textAlign: "left" as const }}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const SUB_TABS = ["Expiry", "Stock Risk", "Dead Stock", "Overstock"] as const;
type RiskTab = typeof SUB_TABS[number];

export default function ExpiryRiskScreen() {
  const [tab, setTab] = useState<RiskTab>("Expiry");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [detailDrug, setDetailDrug] = useState<typeof drugs[0] | null>(null);

  // ── Expiry tab data ──
  const expiryDrugs = drugs
    .map(d => ({ ...d, daysLeft: daysToExpiry(d.expiry) }))
    .filter(d => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "All" || (filter === "Expired" && d.daysLeft < 0) || (filter === "0–30" && d.daysLeft >= 0 && d.daysLeft <= 30) || (filter === "31–60" && d.daysLeft > 30 && d.daysLeft <= 60) || (filter === "61–90" && d.daysLeft > 60 && d.daysLeft <= 90);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expiredCount = expiryDrugs.filter(d => d.daysLeft < 0).length;
  const under30      = expiryDrugs.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30).length;
  const under60      = expiryDrugs.filter(d => d.daysLeft > 30 && d.daysLeft <= 60).length;
  const under90      = expiryDrugs.filter(d => d.daysLeft > 60 && d.daysLeft <= 90).length;

  const { pageRows: expiryRows, footerProps: expiryFooter } = usePagination(expiryDrugs, 10);
  const { pageRows: riskRows, footerProps: riskFooter } = usePagination(STOCK_RISK_DATA, 10);
  const { pageRows: deadRows, footerProps: deadFooter } = usePagination(DEAD_STOCK, 10);
  const { pageRows: overRows, footerProps: overFooter } = usePagination(OVERSTOCK, 10);

  if (detailDrug) return <ExpiryDetailPage drug={detailDrug} onBack={() => setDetailDrug(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Expiry & Risk</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Expiry management, stock risk, dead stock, and overstock analysis</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export Report</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {SUB_TABS.map(t => {
          const badge = t === "Expiry" ? expiredCount + under30 : t === "Stock Risk" ? STOCK_RISK_DATA.filter(r => r.risk === "Critical" || r.risk === "High").length : 0;
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1B6CA8" : "#6B7280", borderBottom: tab === t ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 }}>
              {t}
              {badge > 0 && <span style={{ background: "#C62828", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Expiry tab ── */}
      {tab === "Expiry" && (
        <>
          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[{ label: "Expired", count: expiredCount, bg: "#F3F4F6", color: "#9CA3AF" }, { label: "Expiring in 0–30d", count: under30, bg: "#FFEBEE", color: "#C62828" }, { label: "Expiring in 31–60d", count: under60, bg: "#FFF3E0", color: "#E65100" }, { label: "Expiring in 61–90d", count: under90, bg: "#FFF8E1", color: "#F57F17" }].map(t => (
              <div key={t.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t.label}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: t.color }}>{t.count}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ position: "relative", flex: "0 0 240px" }}>
                <input type="text" placeholder="Search medicine..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px 7px 28px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
                <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              {["All", "Expired", "0–30", "31–60", "61–90"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "6px 12px", border: `1px solid ${filter === f ? "#1B6CA8" : "#DDE3EC"}`, background: filter === f ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", color: filter === f ? "#1B6CA8" : "#6B7280", fontFamily: "Inter", fontWeight: filter === f ? 600 : 400, borderRadius: 20 }}>
                  {f}
                </button>
              ))}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Medicine", "Category", "Location", "Expiry Date", "Days Left", "Stock Qty", "Stock Value", "Risk Band", "Status", "Action"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiryRows.map((d, i, arr) => {
                  const band = expiryBand(d.daysLeft);
                  const stockVal = d.stock * d.cost;
                  return (
                    <tr key={d.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => setDetailDrug(d)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8", textDecoration: "underline", textDecorationColor: "transparent" }}
                            onMouseEnter={e => (e.currentTarget.style.textDecorationColor = "#1B6CA8")} onMouseLeave={e => (e.currentTarget.style.textDecorationColor = "transparent")}>
                            {d.name}
                          </div>
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.location}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.expiry}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.daysLeft < 0 ? "#C62828" : d.daysLeft <= 30 ? "#C62828" : d.daysLeft <= 60 ? "#E65100" : "#1A2436" }}>
                        {d.daysLeft < 0 ? `−${Math.abs(d.daysLeft)}d` : `+${d.daysLeft}d`}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.stock}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{stockVal.toFixed(0)}</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: band.bg, color: band.color }}>{band.label}</span></td>
                      <td style={{ padding: "10px 12px" }}><Pill status={d.status} /></td>
                      <td style={{ padding: "10px 12px" }}>
                        <select style={{ padding: "5px 8px", border: "1px solid #DDE3EC", fontSize: 11, cursor: "pointer", outline: "none", background: "#fff", fontFamily: "Inter" }}>
                          <option>Action</option>
                          <option>Return to Supplier</option>
                          <option>Transfer</option>
                          <option>Discount</option>
                          <option>Write Off</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {expiryDrugs.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No medicines match the selected filter.</div>}
            <PaginationFooter {...expiryFooter} />
          </div>
        </>
      )}

      {/* ── Stock Risk tab ── */}
      {tab === "Stock Risk" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Medicine", "Current Qty", "Avg/Day", "Cover Days", "Incoming", "Risk Level"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: i >= 1 && i <= 4 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskRows.map((d, i, arr) => {
                const rs = RISK_STYLE[d.risk] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                return (
                  <tr key={d.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{d.category}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: d.stock < d.minStock ? "#C62828" : "#1A2436" }}>{d.stock}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#6B7280" }}>{d.avgPerDay}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: d.coverDays < 7 ? "#C62828" : d.coverDays < 14 ? "#E65100" : "#2E7D32" }}>{d.coverDays === 999 ? "—" : `${d.coverDays}d`}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: d.incoming > 0 ? "#2E7D32" : "#9CA3AF" }}>{d.incoming > 0 ? `+${d.incoming}` : "—"}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 2, background: rs.bg, color: rs.color }}>{d.risk}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationFooter {...riskFooter} />
        </div>
      )}

      {/* ── Dead Stock tab ── */}
      {tab === "Dead Stock" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Medicine", "Location", "Qty", "Last Sale", "Days Idle", "Stock Value", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: i >= 2 && i <= 5 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deadRows.map((d, i, arr) => (
                <tr key={d.name} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{d.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436", fontWeight: 700 }}>{d.qty}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#9CA3AF" }}>{d.lastSale}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: d.daysIdle >= 90 ? "#C62828" : d.daysIdle >= 30 ? "#E65100" : "#9CA3AF" }}>{d.daysIdle}d</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>₹{d.stockValue.toFixed(0)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ padding: "4px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Review</button>
                      <button style={{ padding: "4px 10px", border: "1px solid #E65100", background: "#FFF3E0", fontSize: 11, cursor: "pointer", color: "#E65100", fontFamily: "Inter", fontWeight: 600 }}>Recover</button>
                      <button style={{ padding: "4px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Write Off</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter {...deadFooter} />
        </div>
      )}

      {/* ── Overstock tab ── */}
      {tab === "Overstock" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Medicine", "Current", "Ideal Level", "Excess", "Excess Value", "Reason", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: i >= 1 && i <= 4 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overRows.map((d, i, arr) => (
                <tr key={d.name} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{d.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#C62828", fontWeight: 700 }}>{d.current}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#2E7D32" }}>{d.ideal}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: "#E65100" }}>+{d.excess}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>₹{d.excessValue.toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{d.reason}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ padding: "4px 10px", border: "1px solid #6B21A8", background: "#F5F3FF", fontSize: 11, cursor: "pointer", color: "#6B21A8", fontFamily: "Inter", fontWeight: 600 }}>Transfer</button>
                      <button style={{ padding: "4px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter {...overFooter} />
        </div>
      )}
    </div>
  );
}
