import { useState } from "react";
import { drugs } from "../../data/mockData";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import { adjustments, batches } from "./stockData";

export default function StockOverview() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sel, setSel] = useState<typeof drugs[0] | null>(null);
  const [dTab, setDTab] = useState<"overview" | "clinical" | "movements">("overview");
  const [showAdjust, setShowAdjust] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const filtered = drugs.filter(d => {
    const m = d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase());
    if (filter === "All") return m;
    if (filter === "Low Stock") return m && d.status === "Low Stock";
    if (filter === "Out of Stock") return m && d.status === "Out of Stock";
    return m;
  });
  const { sortCol, sortDir, handleSort, sorted: sortedFiltered } = useTableSort(filtered);

  const totalValue = drugs.reduce((s, d) => s + d.stock * d.cost, 0);
  const totalRetail = drugs.reduce((s, d) => s + d.stock * d.price, 0);

  const CAT_COLOR: Record<string, string> = {
    Antibiotics: "#00ACC1", Antidiabetics: "#7C3AED", Antihypertensives: "#1B6CA8",
    Statins: "#2E7D32", Antacids: "#E65100", Bronchodilators: "#0891B2",
    Analgesics: "#DC2626", Hormones: "#9333EA", Anticoagulants: "#C62828", Antidepressants: "#7B61FF",
  };
  const SCHEDULE: Record<string, string> = {
    Antibiotics: "Schedule H", Antidiabetics: "Schedule H", Antihypertensives: "Schedule H",
    Statins: "Schedule H", Antacids: "OTC", Bronchodilators: "Schedule H",
    Analgesics: "OTC", Hormones: "Schedule H1", Anticoagulants: "Schedule H1", Antidepressants: "Schedule H",
  };
  const dosageForm = (unit: string) => unit === "Capsules" ? "Capsule" : unit === "Tablets" ? "Tablet" : unit;
  const genericName = (name: string) => name.replace(/\s+\d.*$/, "").trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Total SKUs", value: drugs.length.toString(), sub: "Active products", color: "#1B6CA8" },
          { label: "Stock Value (Cost)", value: `₹${totalValue.toFixed(0)}`, sub: "Current inventory cost", color: "#0C1B33" },
          { label: "Retail Value", value: `₹${totalRetail.toFixed(0)}`, sub: `₹${(totalRetail - totalValue).toFixed(0)} potential profit`, color: "#2E7D32" },
          { label: "Alerts", value: `${drugs.filter(d => d.status !== "In Stock").length}`, sub: "Low stock or out of stock", color: "#C62828" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder sub={k.sub} />
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, alignItems: "center" }}>
          <input type="text" placeholder="Search drug or category..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter" }} />
          {["All", "Low Stock", "Out of Stock"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "7px 14px", fontSize: 12, cursor: "pointer", border: "1px solid", borderColor: filter === f ? "#1B6CA8" : "#E8ECF4", background: filter === f ? "#1B6CA8" : "#fff", color: filter === f ? "#fff" : "#6B7280" }}>
              {f}
            </button>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Drug Name</Th>
            <Th onSort={() => handleSort("category")} sortDir={sortCol === "category" ? sortDir : null}>Category</Th>
            <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
            <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock Qty</Th>
            <Th onSort={() => handleSort("minStock")} sortDir={sortCol === "minStock" ? sortDir : null}>Min Stock</Th>
            <Th>Reorder Point</Th>
            <Th onSort={() => handleSort("unit")} sortDir={sortCol === "unit" ? sortDir : null}>Unit</Th>
            <Th onSort={() => handleSort("cost")} sortDir={sortCol === "cost" ? sortDir : null}>Cost/Unit</Th>
            <Th onSort={() => handleSort("price")} sortDir={sortCol === "price" ? sortDir : null}>Price/Unit</Th>
            <Th>Margin</Th>
            <Th>Stock Value</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
          </tr></thead>
          <tbody>
            {sortedFiltered.map(d => {
              const margin = ((d.price - d.cost) / d.price * 100).toFixed(0);
              const value = d.stock * d.cost;
              const statusStyle = d.status === "In Stock" ? { bg: "#E8F5E9", color: "#2E7D32" } : d.status === "Low Stock" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
              const isSelected = sel?.id === d.id;
              return (
                <tr key={d.id}
                  onClick={() => { setSel(d); setDTab("overview"); }}
                  style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer", background: isSelected ? "#EFF6FF" : "transparent" }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F7F9FC"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: isSelected ? "#1B6CA8" : "#1A2436" }}>{d.name}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.stock === 0 ? "#C62828" : d.stock < d.minStock ? "#F57F17" : "#1A2436", textAlign: "right" }}>
                    {d.stock.toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF", textAlign: "right" }}>{d.minStock}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ height: 6, background: "#EEF1F6", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (d.stock / (d.minStock * 3)) * 100)}%`, background: d.stock < d.minStock ? "#C62828" : "#2E7D32" }} />
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.unit}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{d.cost.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{d.price.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", textAlign: "right" }}>{margin}%</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>₹{value.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={d.status} bg={statusStyle.bg} color={statusStyle.color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                <button onClick={() => setSel(null)} style={{ border: "none", background: "transparent", color: "#9CA3AF", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 2px", flexShrink: 0, marginLeft: 12 }}>×</button>
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
                {(["Overview", "Clinical Info", "Stock Movements"] as const).map((t, i) => {
                  const key = (["overview", "clinical", "movements"] as const)[i];
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
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "18px 20px" }}>
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
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
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
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
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

                  {/* 4. Supplier & Sourcing */}
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Supplier & Sourcing</div>
                    {([
                      { label: "Supplier", value: sel.supplier, mono: false, highlight: "" },
                      { label: "Last Received", value: batches.find(b => b.drug === sel.name)?.received || "—", mono: true, highlight: "" },
                      { label: "Bin Location", value: sel.location, mono: true, highlight: "" },
                      { label: "Reorder Status", value: sel.stock < sel.minStock ? "Reorder required" : "Stock adequate", mono: false, highlight: sel.stock < sel.minStock ? "#C62828" : "#2E7D32" },
                    ] as { label: string; value: string; mono: boolean; highlight: string }[]).map((row, i, arr) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{row.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: row.highlight || "#1A2436", fontFamily: row.mono ? "JetBrains Mono" : "Inter" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 5. Product Details */}
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
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
                <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
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
                const moves = adjustments.filter(a => a.drug === sel.name);
                const netChange = moves.reduce((s, a) => s + a.qty, 0);
                const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
                  "Write-off": { bg: "#FFEBEE", color: "#C62828" },
                  "Damage":    { bg: "#FFF3E0", color: "#E65100" },
                  "Stock Count": { bg: "#E3F2FD", color: "#1B6CA8" },
                  "Donation":  { bg: "#F3E5F5", color: "#7B1FA2" },
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Summary bar */}
                    {moves.length > 0 && (
                      <div style={{ background: "#fff", border: "1px solid #E8ECF4", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                        {[
                          { label: "Total Movements", value: moves.length.toString(), color: "#1A2436" },
                          { label: "Net Qty Change", value: netChange > 0 ? `+${netChange}` : netChange.toString(), color: netChange > 0 ? "#2E7D32" : "#C62828" },
                          { label: "Last Movement", value: moves[0].date, color: "#6B7280" },
                        ].map((k, i) => (
                          <div key={k.label} style={{ padding: "14px 16px", borderRight: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                            <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                            <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Movement entries */}
                    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                        Recent Movements
                      </div>
                      {moves.length > 0 ? moves.map((a, i, arr) => {
                        const ts = TYPE_STYLE[a.type] || { bg: "#F0F3F7", color: "#6B7280" };
                        return (
                          <div key={a.id} style={{ padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                            {/* Row 1: ID + type chip + date + qty */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{a.id}</span>
                                <span style={{ fontSize: 10, padding: "2px 8px", background: ts.bg, color: ts.color, fontWeight: 700 }}>{a.type}</span>
                              </div>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 800, color: a.qty > 0 ? "#2E7D32" : "#C62828" }}>
                                {a.qty > 0 ? `+${a.qty}` : a.qty}
                              </span>
                            </div>
                            {/* Row 2: reason */}
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10, lineHeight: 1.4 }}>{a.reason}</div>
                            {/* Row 3: before → after qty flow */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>Before</div>
                                <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#6B7280" }}>{a.qtyBefore}</div>
                              </div>
                              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ flex: 1, height: 1, background: "#E8ECF4" }} />
                                <span style={{ fontSize: 10, color: "#9CA3AF" }}>{"→"}</span>
                                <div style={{ flex: 1, height: 1, background: "#E8ECF4" }} />
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>After</div>
                                <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{a.qtyAfter}</div>
                              </div>
                            </div>
                            {/* Row 4: ref + by + date */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>Ref: {a.ref}</span>
                              <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                                <span style={{ fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.date}</span>
                                &nbsp;&middot;&nbsp;by&nbsp;<span style={{ fontWeight: 600, color: "#6B7280" }}>{a.by}</span>
                              </span>
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
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #E8ECF4", background: "#fff", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setShowAdjust(true)} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>Adjust Stock</button>
              <button onClick={() => setShowPO(true)} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>Create PO</button>
              <button onClick={() => setSel(null)} style={{ flex: 1, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>View in Inventory</button>
            </div>

          </aside>
        </>
      )}

      {/* Adjust Stock modal */}
      {showAdjust && sel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 480, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>New Stock Adjustment</div>
              <button onClick={() => setShowAdjust(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Drug / Item", el: <input type="text" defaultValue={sel.name} readOnly style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Adjustment Type", el: <select style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}><option>Write-off</option><option>Stock Count</option><option>Damage</option><option>Donation</option><option>Other</option></select> },
                { label: "Quantity Change", el: <input type="number" placeholder="Use negative for reduction (e.g. -10)" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Reason", el: <input type="text" placeholder="Describe the reason for adjustment" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} /> },
                { label: "Reference #", el: <input type="text" placeholder="e.g. COUNT-AUG29" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAdjust(false)} style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={() => setShowAdjust(false)} style={{ padding: "9px 22px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PO modal */}
      {showPO && sel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 480, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Create Purchase Order</div>
              <button onClick={() => setShowPO(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Medicine", el: <input type="text" defaultValue={sel.name} readOnly style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Supplier", el: <input type="text" defaultValue={sel.supplier} readOnly style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#F8FAFC", boxSizing: "border-box" as const }} /> },
                { label: "Order Quantity", el: <input type="number" placeholder={`Current stock: ${sel.stock} ${sel.unit}`} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Expected Delivery Date", el: <input type="date" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /> },
                { label: "Notes", el: <input type="text" placeholder="Reason for order or special instructions" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} /> },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowPO(false)} style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={() => setShowPO(false)} style={{ padding: "9px 22px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Create PO</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
