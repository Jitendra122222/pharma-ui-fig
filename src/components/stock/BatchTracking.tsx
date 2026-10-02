import { useState, useRef } from "react";
import { drugs } from "../../data/mockData";
import { SK } from "../../styles/stock";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { batches, MOVEMENTS, LOCATION_META } from "./stockData";

type BatchRow = typeof batches[0];
type StatusFilter = "all" | "Active" | "Low" | "Expiring Soon";
type ExpiryFilter = "all" | "30" | "90" | "expired";

const EMPTY_ADD_FORM = {
  drug: "",
  supplier: "",
  batchId: "",
  received: "",
  expiry: "",
  qtyReceived: "",
  location: "",
};

function drugCost(drugName: string) {
  return drugs.find(d => d.name === drugName)?.cost ?? 0;
}

function batchValue(b: BatchRow) {
  return drugCost(b.drug) * b.qtyCurrent;
}

function daysToExpiry(expiry: string) {
  return Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
}

export default function BatchTracking() {
  const [batchSearch, setBatchSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [expiryDropdownOpen, setExpiryDropdownOpen] = useState(false);
  const [selBatch, setSelBatch] = useState<BatchRow | null>(null);
  const [bTab, setBTab] = useState<"history" | "genealogy">("history");

  // Add New Batch
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addFormErrors, setAddFormErrors] = useState<Partial<typeof EMPTY_ADD_FORM>>({});
  const [addDrugSearch, setAddDrugSearch] = useState("");
  const [addDrugOpen, setAddDrugOpen] = useState(false);
  const [extraBatches, setExtraBatches] = useState<BatchRow[]>([]);
  const addDrugRef = useRef<HTMLInputElement>(null);

  const allBatches = [...extraBatches, ...batches];

  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(allBatches);

  const filteredBatches = sortedAll.filter(b => {
    const matchSearch = !batchSearch ||
      b.id.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.drug.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.supplier.toLowerCase().includes(batchSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const days = daysToExpiry(b.expiry);
    const matchExpiry =
      expiryFilter === "all" ? true :
      expiryFilter === "expired" ? days <= 0 :
      expiryFilter === "30" ? days > 0 && days <= 30 :
      expiryFilter === "90" ? days > 0 && days <= 90 : true;
    const matchLocation = !locationFilter || b.location === locationFilter;
    return matchSearch && matchStatus && matchExpiry && matchLocation;
  });

  const { pageRows, footerProps } = usePagination(filteredBatches, 10);

  const activeCount      = allBatches.filter(b => b.status === "Active").length;
  const lowCount         = allBatches.filter(b => b.status === "Low").length;
  const expiringSoonCount = allBatches.filter(b => b.status === "Expiring Soon").length;
  const nearExpiry       = allBatches.filter(b => { const d = daysToExpiry(b.expiry); return d > 0 && d < 90; }).length;

  const uniqueLocations = [...new Set(allBatches.map(b => b.location).filter(Boolean))].sort();

  const addSelectedDrug = drugs.find(d => d.name === addForm.drug);
  const addDrugsFiltered = addDrugSearch
    ? drugs.filter(d => d.name.toLowerCase().includes(addDrugSearch.toLowerCase()) || d.category.toLowerCase().includes(addDrugSearch.toLowerCase()))
    : drugs;

  function setAddField<K extends keyof typeof EMPTY_ADD_FORM>(k: K, v: string) {
    setAddForm(prev => ({ ...prev, [k]: v }));
    if (v) setAddFormErrors(prev => ({ ...prev, [k]: "" }));
  }

  function submitAddBatch() {
    const errs: Partial<typeof EMPTY_ADD_FORM> = {};
    if (!addForm.drug)        errs.drug        = "Select a drug";
    if (!addForm.supplier)    errs.supplier    = "Enter supplier";
    if (!addForm.batchId)     errs.batchId     = "Enter batch ID";
    if (!addForm.received)    errs.received    = "Enter date received";
    if (!addForm.expiry)      errs.expiry      = "Enter expiry date";
    if (!addForm.qtyReceived || isNaN(Number(addForm.qtyReceived)) || Number(addForm.qtyReceived) <= 0)
      errs.qtyReceived = "Enter valid quantity";
    if (!addForm.location)    errs.location    = "Select location";
    if (Object.keys(errs).length > 0) { setAddFormErrors(errs); return; }
    const unit = drugs.find(d => d.name === addForm.drug)?.unit ?? "Units";
    const qty  = Number(addForm.qtyReceived);
    const newBatch: BatchRow = {
      id: addForm.batchId,
      drug: addForm.drug,
      supplier: addForm.supplier,
      received: addForm.received,
      expiry: addForm.expiry,
      qtyReceived: qty,
      qtyCurrent: qty,
      unit,
      location: addForm.location,
      status: "Active",
    };
    setExtraBatches(prev => [newBatch, ...prev]);
    setShowAddBatch(false);
    setAddForm(EMPTY_ADD_FORM);
    setAddFormErrors({});
    setAddDrugSearch("");
  }

  const BATCH_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    "Active":        { bg: "#E8F5E9", color: "#2E7D32" },
    "Low":           { bg: "#FFF8E1", color: "#F57F17" },
    "Expiring Soon": { bg: "#FFF3E0", color: "#E65100" },
    "Expired":       { bg: "#FFEBEE", color: "#C62828" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Active Batches",   value: activeCount,       color: "#2E7D32", bg: "#E8F5E9" },
          { label: "Near Expiry",      value: nearExpiry,         color: "#E65100", bg: "#FFF3E0" },
          { label: "Expiring Soon",    value: expiringSoonCount,  color: "#E65100", bg: "#FFF3E0" },
          { label: "Total Batches",    value: allBatches.length,  color: "#1B6CA8", bg: "#EFF6FF" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Toolbar: search + filters + add button (single row) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6", flexWrap: "wrap" as const }}>
          <div style={{ ...SK.searchWrapper, flex: "0 0 240px" }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Search batches..." style={SK.searchInput} />
          </div>

          {/* Location filter — custom dropdown */}
          <div style={{ position: "relative" }}>
            {locationDropdownOpen && (
              <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onMouseDown={() => setLocationDropdownOpen(false)} />
            )}
            <button onClick={() => setLocationDropdownOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: `1px solid ${locationDropdownOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: locationFilter ? 600 : 400, color: locationFilter ? "#0C1B33" : "#6B7280", minWidth: 148, minHeight: 40, boxSizing: "border-box" as const, justifyContent: "space-between" }}>
              <span>{locationFilter || "All Locations"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={locationDropdownOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: locationDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {locationDropdownOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 200, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden" }}>
                {["", ...uniqueLocations].map(l => {
                  const active = locationFilter === l;
                  return (
                    <div key={l || "__all__"}
                      onMouseDown={() => { setLocationFilter(l); setLocationDropdownOpen(false); }}
                      style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                      {l || "All Locations"}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiry filter — custom dropdown */}
          <div style={{ position: "relative" }}>
            {expiryDropdownOpen && (
              <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onMouseDown={() => setExpiryDropdownOpen(false)} />
            )}
            {(() => {
              const EXPIRY_OPTIONS: { key: ExpiryFilter; label: string }[] = [
                { key: "all",     label: "All Expiry" },
                { key: "30",      label: "≤30 days" },
                { key: "90",      label: "≤90 days" },
                { key: "expired", label: "Expired" },
              ];
              const selected = EXPIRY_OPTIONS.find(o => o.key === expiryFilter)!;
              return (
                <>
                  <button onClick={() => setExpiryDropdownOpen(o => !o)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: `1px solid ${expiryDropdownOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: expiryFilter !== "all" ? 600 : 400, color: expiryFilter !== "all" ? "#0C1B33" : "#6B7280", minWidth: 130, minHeight: 40, boxSizing: "border-box" as const, justifyContent: "space-between" }}>
                    <span>{selected.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expiryDropdownOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: expiryDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {expiryDropdownOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 160, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden" }}>
                      {EXPIRY_OPTIONS.map(o => {
                        const active = expiryFilter === o.key;
                        const isExpired = o.key === "expired";
                        return (
                          <div key={o.key}
                            onMouseDown={() => { setExpiryFilter(o.key); setExpiryDropdownOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? (isExpired ? "#C62828" : "#1B6CA8") : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? (isExpired ? "#C62828" : "#1B6CA8") : "#0C1B33", background: active ? (isExpired ? "#FFEBEE" : "#EFF6FF") : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? (isExpired ? "#FFEBEE" : "#EFF6FF") : "#fff"; }}>
                            {o.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div style={{ width: 1, height: 16, background: "#DDE3EC", margin: "0 2px" }} />

          {/* Status pills */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "Active", "Low", "Expiring Soon"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "0 14px", border: `1px solid ${statusFilter === s ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 20, background: statusFilter === s ? "#EFF6FF" : "#fff", fontSize: 11, cursor: "pointer", fontFamily: "Inter", fontWeight: statusFilter === s ? 700 : 400, color: statusFilter === s ? "#1B6CA8" : "#6B7280", minHeight: 40, boxSizing: "border-box" as const }}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => { setShowAddBatch(true); setAddForm(EMPTY_ADD_FORM); setAddFormErrors({}); setAddDrugSearch(""); }}
              style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
              + Add New Batch
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Batch #</Th>
              <Th onSort={() => handleSort("drug")} sortDir={sortCol === "drug" ? sortDir : null}>Drug</Th>
              <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Supplier</Th>
              <Th onSort={() => handleSort("received")} sortDir={sortCol === "received" ? sortDir : null}>Date Received</Th>
              <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
              <Th onSort={() => handleSort("qtyReceived")} sortDir={sortCol === "qtyReceived" ? sortDir : null}>Qty Received</Th>
              <Th onSort={() => handleSort("qtyCurrent")} sortDir={sortCol === "qtyCurrent" ? sortDir : null}>Qty Remaining</Th>
              <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
              <Th>Batch Value</Th>
              <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
            </tr></thead>
            <tbody>
              {pageRows.map(b => {
                const used = b.qtyReceived - b.qtyCurrent;
                const pct  = b.qtyReceived > 0 ? (b.qtyCurrent / b.qtyReceived) * 100 : 0;
                const sp   = BATCH_STATUS_STYLE[b.status] ?? { bg: "#F0F3F7", color: "#6B7280" };
                const days = daysToExpiry(b.expiry);
                const val  = batchValue(b);
                return (
                  <tr key={b.id} onClick={() => { setSelBatch(b); setBTab("history"); }}
                    style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selBatch?.id === b.id ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.drug}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{b.supplier}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: days <= 0 ? "#C62828" : days <= 30 ? "#E65100" : "#6B7280" }}>{b.expiry}</div>
                      {days > 0 && days <= 90 && <div style={{ fontSize: 10, color: days <= 30 ? "#E65100" : "#9CA3AF", marginTop: 1 }}>{days}d left</div>}
                      {days <= 0 && <div style={{ fontSize: 10, color: "#C62828", marginTop: 1 }}>Expired</div>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>{b.qtyReceived}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: "#EEF1F6" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct < 20 ? "#C62828" : pct < 50 ? "#F57F17" : "#2E7D32" }} />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", minWidth: 30 }}>{b.qtyCurrent}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{used} used · {pct.toFixed(0)}% remaining</div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.location}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>
                      {val > 0 ? `₹${val.toFixed(2)}` : <span style={{ color: "#C8CDD8" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}><Pill label={b.status} bg={sp.bg} color={sp.color} /></td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No batches match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>

      {/* ── Batch detail drawer ── */}
      {selBatch && (() => {
        const allMoves    = MOVEMENTS[selBatch.drug] ?? [];
        const batchMoves  = allMoves.filter(m => m.batch === selBatch.id);
        const salesMoves  = batchMoves.filter(m => m.type === "Sale");
        const totalSold   = salesMoves.reduce((acc, m) => acc + Math.abs(m.qty), 0);
        const daysSinceReceived = Math.max(1, Math.round((Date.now() - new Date(selBatch.received).getTime()) / 86400000));
        const ratePerDay  = totalSold / daysSinceReceived;
        const estDaysEmpty = ratePerDay > 0 ? Math.round(selBatch.qtyCurrent / ratePerDay) : null;
        const sp = BATCH_STATUS_STYLE[selBatch.status] ?? { bg: "#F0F3F7", color: "#6B7280" };
        const val = batchValue(selBatch);
        const days = daysToExpiry(selBatch.expiry);

        return (
          <>
            <div onClick={() => setSelBatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 100 }} />
            <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(12,27,51,0.12)" }}>

              {/* Header */}
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 800, color: "#1B6CA8" }}>{selBatch.id}</span>
                    <Pill label={selBatch.status} bg={sp.bg} color={sp.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{selBatch.drug}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{selBatch.supplier} · {selBatch.location}</div>
                </div>
                <button onClick={() => setSelBatch(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 24, lineHeight: 1, padding: 4 }}>&times;</button>
              </div>

              {/* 4 stat tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
                {[
                  { label: "Qty Received",   value: selBatch.qtyReceived,                                    color: "#1B6CA8" },
                  { label: "Qty Remaining",  value: selBatch.qtyCurrent,                                     color: "#2E7D32" },
                  { label: "Qty Used",       value: selBatch.qtyReceived - selBatch.qtyCurrent,              color: "#E65100" },
                  { label: "Days to Expiry", value: Math.max(0, days),                                       color: days < 0 ? "#C62828" : days < 90 ? "#E65100" : "#1A2436" },
                ].map((tile, i) => (
                  <div key={tile.label} style={{ padding: "12px 14px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none", textAlign: "center" as const }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>{tile.label}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 800, color: tile.color }}>{tile.value}</div>
                  </div>
                ))}
              </div>

              {/* Consumption rate bar */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", display: "flex", gap: 20, flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, fontFamily: "Inter" }}>Consumption Rate</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>
                    {ratePerDay > 0 ? `${ratePerDay.toFixed(1)} units/day` : <span style={{ color: "#9CA3AF", fontSize: 12 }}>No sales data</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, fontFamily: "Inter" }}>Est. Stock Duration</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: estDaysEmpty !== null && estDaysEmpty < 30 ? "#C62828" : estDaysEmpty !== null && estDaysEmpty < 90 ? "#E65100" : "#1A2436" }}>
                    {estDaysEmpty !== null ? `~${estDaysEmpty} days` : <span style={{ color: "#9CA3AF", fontSize: 12 }}>—</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, fontFamily: "Inter" }}>Batch Value</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>
                    {val > 0 ? `₹${val.toFixed(2)}` : <span style={{ color: "#9CA3AF", fontSize: 12 }}>—</span>}
                  </div>
                </div>
              </div>

              {/* Inner tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
                {(["history", "genealogy"] as const).map(t => (
                  <button key={t} onClick={() => setBTab(t)} style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: bTab === t ? 700 : 400, color: bTab === t ? "#1B6CA8" : "#6B7280", fontFamily: "Inter", borderBottom: bTab === t ? "2px solid #1B6CA8" : "2px solid transparent", textTransform: "capitalize" as const }}>
                    {t === "genealogy" ? "Lot Genealogy" : "Movement History"}
                  </button>
                ))}
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {bTab === "history" && (() => {
                  const moves = batchMoves;
                  if (moves.length === 0) return <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" as const, paddingTop: 32 }}>No movements recorded for this batch.</div>;
                  const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
                    Sale: { bg: "#FFEBEE", color: "#C62828" }, GRN: { bg: "#E8F5E9", color: "#2E7D32" },
                    Adjustment: { bg: "#FFF3E0", color: "#E65100" }, Return: { bg: "#EFF6FF", color: "#1B6CA8" },
                    "Transfer In": { bg: "#E8F5E9", color: "#2E7D32" }, "Transfer Out": { bg: "#FFEBEE", color: "#C62828" },
                  };
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {moves.map(m => {
                        const ts = TYPE_STYLE[m.type] ?? { bg: "#F0F3F7", color: "#6B7280" };
                        return (
                          <div key={m.id} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flexShrink: 0, marginTop: 2 }}><Pill label={m.type} bg={ts.bg} color={ts.color} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{m.ref}</span>
                                <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{m.date}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#6B7280" }}>{m.user}{m.reason ? ` · ${m.reason}` : ""}</span>
                                <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                              </div>
                              {m.qtyAfter !== undefined && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Balance after: {m.qtyAfter}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {bTab === "genealogy" && (() => {
                  const receipts  = batchMoves.filter(m => m.type === "GRN");
                  const sales     = batchMoves.filter(m => m.type === "Sale");
                  const returns_  = batchMoves.filter(m => m.type === "Return");
                  const transfers = batchMoves.filter(m => m.type === "Transfer In" || m.type === "Transfer Out");

                  const Section = ({ title, moves, emptyMsg }: { title: string; moves: typeof batchMoves; emptyMsg: string }) => (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>{title}</div>
                      {moves.length === 0
                        ? <div style={{ fontSize: 12, color: "#9CA3AF", padding: "8px 12px", background: "#F8FAFC", borderRadius: 4 }}>{emptyMsg}</div>
                        : moves.map(m => (
                          <div key={m.id} style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #EEF1F6", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{m.ref}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{m.date} · {m.user}</div>
                            </div>
                            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                          </div>
                        ))
                      }
                    </div>
                  );

                  if (batchMoves.length === 0) return <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" as const, paddingTop: 32 }}>No traced movements for this batch.</div>;

                  return (
                    <div>
                      <Section title="Received From" moves={receipts} emptyMsg="No GRN records for this batch." />
                      <Section title="Dispensed To (Sales)" moves={sales} emptyMsg="No sales dispensed from this batch." />
                      <Section title="Returns" moves={returns_} emptyMsg="No returns for this batch." />
                      <Section title="Transfers" moves={transfers} emptyMsg="No transfers for this batch." />
                    </div>
                  );
                })()}
              </div>
            </aside>
          </>
        );
      })()}

      {/* ── Add New Batch Modal ── */}
      {showAddBatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 540, borderRadius: 8, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Add New Batch</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Register a manually received batch</div>
              </div>
              <button onClick={() => setShowAddBatch(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>

            {/* Form body */}
            <div style={{ overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Drug search */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                  Drug / Item <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  {addDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setAddDrugOpen(false)} />}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}
                    onClick={() => { setAddDrugOpen(true); setTimeout(() => addDrugRef.current?.focus(), 50); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input ref={addDrugRef}
                      value={addDrugSearch || addForm.drug}
                      onChange={e => { setAddDrugSearch(e.target.value); setAddDrugOpen(true); if (!e.target.value) setAddField("drug", ""); }}
                      onFocus={() => { setAddDrugOpen(true); setAddDrugSearch(""); }}
                      placeholder="Search drug name or category..."
                      style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${addFormErrors.drug ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }}
                    />
                    {addSelectedDrug && !addDrugSearch && (
                      <span style={{ position: "absolute", right: 12, fontSize: 11, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 8px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>
                        {addSelectedDrug.category}
                      </span>
                    )}
                  </div>
                  {addDrugOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 200, overflowY: "auto" }}>
                      {addDrugsFiltered.length === 0
                        ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No drugs found</div>
                        : addDrugsFiltered.map(d => {
                          const sel = addForm.drug === d.name;
                          return (
                            <div key={d.id} onMouseDown={() => { setAddField("drug", d.name); setAddField("supplier", d.supplier); setAddDrugSearch(""); setAddDrugOpen(false); }}
                              style={{ padding: "9px 14px", paddingLeft: sel ? 11 : 14, borderLeft: `3px solid ${sel ? "#1B6CA8" : "transparent"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}
                              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: sel ? 700 : 400, color: sel ? "#1B6CA8" : "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
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
                {addFormErrors.drug && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors.drug}</div>}
              </div>

              {/* Batch ID + Supplier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { key: "batchId" as const, label: "Batch ID", placeholder: "e.g. BT-2026-0120" },
                  { key: "supplier" as const, label: "Supplier", placeholder: "Supplier name" },
                ] as { key: keyof typeof EMPTY_ADD_FORM; label: string; placeholder: string }[]).map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                      {f.label} <span style={{ color: "#C62828" }}>*</span>
                    </label>
                    <input value={addForm[f.key]} onChange={e => setAddField(f.key, e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${addFormErrors[f.key] ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                    {addFormErrors[f.key] && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors[f.key]}</div>}
                  </div>
                ))}
              </div>

              {/* Date Received + Expiry */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { key: "received" as const, label: "Date Received" },
                  { key: "expiry"   as const, label: "Expiry Date"   },
                ] as { key: keyof typeof EMPTY_ADD_FORM; label: string }[]).map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                      {f.label} <span style={{ color: "#C62828" }}>*</span>
                    </label>
                    <input type="date" value={addForm[f.key]} onChange={e => setAddField(f.key, e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${addFormErrors[f.key] ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                    {addFormErrors[f.key] && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors[f.key]}</div>}
                  </div>
                ))}
              </div>

              {/* Qty Received + Location */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                    Qty Received <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input type="number" min={1} value={addForm.qtyReceived} onChange={e => setAddField("qtyReceived", e.target.value)} placeholder="0"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${addFormErrors.qtyReceived ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", fontWeight: 700, boxSizing: "border-box" as const }} />
                  {addFormErrors.qtyReceived && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors.qtyReceived}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                    Location <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <select value={addForm.location} onChange={e => setAddField("location", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${addFormErrors.location ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, color: addForm.location ? "#1A2436" : "#9CA3AF" }}>
                    <option value="">— Select location —</option>
                    {Object.entries(LOCATION_META).map(([key, meta]) => (
                      <option key={key} value={key}>{key} · {meta.label}</option>
                    ))}
                  </select>
                  {addFormErrors.location && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors.location}</div>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
              <button onClick={() => setShowAddBatch(false)}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                Cancel
              </button>
              <button onClick={submitAddBatch}
                style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Add Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
