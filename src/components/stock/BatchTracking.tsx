import { useState, useRef, useEffect } from "react";
import { DatePicker } from "../shared/DatePicker";
import { SK } from "../../styles/stock";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { fetchAllBatches, fetchStockOverview, fetchMovements, createBatch, setBatchStatus } from "../../lib/stockApi";
import type { TrackedBatch, StockOverviewRow, Movement } from "../../lib/stockApi";
import { fetchMyDistributors } from "../../lib/supplierApi";
import { useMasters } from "../../lib/mastersApi";
type StatusFilter = "all" | "Active" | "Low" | "Expiring Soon" | "Quarantine" | "Blocked" | "Damaged";
type ExpiryFilter = "all" | "30" | "90" | "expired";

const EMPTY_ADD_FORM = { productId: "", batchId: "", expiry: "", qtyReceived: "", locationId: "", distributorId: "", mrp: "", saleRate: "", purchaseRate: "" };

const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};

function daysToExpiry(expiry: string) {
  return Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
}

// What the table shows as a batch's state: its own status first (quarantine, blocked, damaged), then how close it is to expiry
function displayStatus(b: TrackedBatch): string {
  if (b.status !== "Active") return b.status;
  const d = daysToExpiry(b.expiry);
  if (d <= 0) return "Expired";
  if (d <= 90) return "Expiring Soon";
  if (b.qtyReceived > 0 && b.qtyCurrent / b.qtyReceived < 0.2) return "Low";
  return "Active";
}

const when = (iso: string) => {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};

export default function BatchTracking() {
  const { masters } = useMasters();
  const [batchSearch, setBatchSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [expiryDropdownOpen, setExpiryDropdownOpen] = useState(false);
  const [selBatch, setSelBatch] = useState<(TrackedBatch & { drug: string; supplier: string; status2: string }) | null>(null);
  const [bTab, setBTab] = useState<"history" | "genealogy">("history");

  // ── data ──
  const [rows, setRows] = useState<TrackedBatch[]>([]);
  const [products, setProducts] = useState<StockOverviewRow[]>([]);
  const [distNames, setDistNames] = useState<Record<string, string>>({});
  const [distList, setDistList] = useState<{ id: string; name: string }[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchAllBatches(), fetchStockOverview({ pageSize: 500 }), fetchMyDistributors(1, 100)])
      .then(([b, o, d]) => {
        if (!live) return;
        setRows(b); setProducts(o.items);
        const list = d.items.map(x => ({ id: x.distributor.id, name: x.distributor.name }));
        setDistList(list); setDistNames(Object.fromEntries(list.map(x => [x.id, x.name])));
        setLoadState("ready");
      })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load batches")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // movement history of the opened batch
  const [moves, setMoves] = useState<Movement[]>([]);
  const [movesState, setMovesState] = useState<"idle" | "loading" | "error">("idle");
  const selId = selBatch?.id;
  const selProduct = selBatch?.productId;
  useEffect(() => {
    if (!selId || !selProduct) { setMoves([]); setMovesState("idle"); return; }
    let live = true;
    setMovesState("loading");
    fetchMovements(selProduct, { page: 1, pageSize: 100, batchId: selId })
      .then(m => { if (live) { setMoves(m.items); setMovesState("idle"); } })
      .catch(() => { if (live) setMovesState("error"); });
    return () => { live = false; };
  }, [selId, selProduct, reload]);

  // Add New Batch
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addFormErrors, setAddFormErrors] = useState<Partial<typeof EMPTY_ADD_FORM>>({});
  const [addDrugSearch, setAddDrugSearch] = useState("");
  const [addDrugOpen, setAddDrugOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const addDrugRef = useRef<HTMLInputElement>(null);

  // Quarantine / release
  const [statusTarget, setStatusTarget] = useState<TrackedBatch | null>(null);
  const [newStatus, setNewStatus] = useState<TrackedBatch["status"]>("Quarantine");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  const productCost = Object.fromEntries(products.map(p => [p.id, p.cost]));
  const locationName = (id: string | null, fallback: string) => masters.storage_locations.find(l => l.id === id)?.name ?? fallback;
  const allBatches = rows.map(b => ({
    ...b, location: locationName(b.locationId, b.location), drug: b.product, supplier: b.distributorId ? (distNames[b.distributorId] ?? "") : "", status2: displayStatus(b),
  }));

  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(allBatches as any[]) as { sortCol: string; sortDir: any; handleSort: (c: string) => void; sorted: typeof allBatches };

  const filteredBatches = sortedAll.filter(b => {
    const matchSearch = !batchSearch ||
      b.batchNo.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.drug.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.supplier.toLowerCase().includes(batchSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status2 === statusFilter || (statusFilter === "Active" && b.status2 === "Active");
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

  const activeCount       = allBatches.filter(b => b.status2 === "Active").length;
  const heldCount         = allBatches.filter(b => b.status !== "Active").length;
  const expiringSoonCount = allBatches.filter(b => b.status2 === "Expiring Soon").length;
  const nearExpiry        = allBatches.filter(b => b.qtyCurrent > 0 && daysToExpiry(b.expiry) <= 0).length;

  const uniqueLocations = [...new Set([...masters.storage_locations.map(l => l.name), ...allBatches.map(b => b.location)].filter(Boolean))].sort();

  const addSelectedProduct = products.find(d => d.id === addForm.productId);
  const addProductsFiltered = addDrugSearch
    ? products.filter(d => d.name.toLowerCase().includes(addDrugSearch.toLowerCase()) || d.category.toLowerCase().includes(addDrugSearch.toLowerCase()))
    : products;

  function setAddField<K extends keyof typeof EMPTY_ADD_FORM>(k: K, v: string) {
    setAddForm(prev => ({ ...prev, [k]: v }));
    if (v) setAddFormErrors(prev => ({ ...prev, [k]: "" }));
  }

  async function submitAddBatch() {
    const errs: Partial<typeof EMPTY_ADD_FORM> = {};
    const qty = Number(addForm.qtyReceived);
    if (!addForm.productId)  errs.productId = "Select a product";
    if (!addForm.batchId.trim()) errs.batchId = "Enter batch number";
    if (!addForm.expiry)     errs.expiry = "Enter expiry date";
    else if (addForm.expiry <= new Date().toISOString().slice(0, 10)) errs.expiry = "Expiry must be in the future";
    if (!addForm.qtyReceived || !Number.isInteger(qty) || qty <= 0) errs.qtyReceived = "Enter a whole number above zero";
    if (!addForm.locationId) errs.locationId = "Select location";
    const mrp = Number(addForm.mrp || 0), sale = Number(addForm.saleRate || 0);
    if (mrp > 0 && sale > mrp) errs.saleRate = "Sale rate cannot exceed MRP";
    if (Object.keys(errs).length > 0) { setAddFormErrors(errs); return; }
    setAddBusy(true); setAddError("");
    try {
      const b = await createBatch({
        productId: addForm.productId, productName: addSelectedProduct?.name ?? "", batchNo: addForm.batchId.trim(), expiry: addForm.expiry,
        quantity: qty, mrp, saleRate: sale, purchaseRate: Number(addForm.purchaseRate || 0), locationId: addForm.locationId,
        distributorId: addForm.distributorId || undefined,
      });
      setShowAddBatch(false); setAddForm(EMPTY_ADD_FORM); setAddFormErrors({}); setAddDrugSearch("");
      setToast({ ok: true, msg: `Batch ${b.batch_number} added with ${qty} units.` });
      setReload(n => n + 1);
    } catch (e) { setAddError(errText(e, "Could not add the batch")); } finally { setAddBusy(false); }
  }

  async function submitStatus() {
    if (!statusTarget || statusBusy) return;
    setStatusBusy(true); setStatusError("");
    try {
      await setBatchStatus(statusTarget.id, newStatus);
      setToast({ ok: true, msg: `Batch ${statusTarget.batchNo} is now ${newStatus}.` });
      setStatusTarget(null); setSelBatch(null);
      setReload(n => n + 1);
    } catch (e) { setStatusError(errText(e, "Could not change the status")); } finally { setStatusBusy(false); }
  }

  const BATCH_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    "Active":        { bg: "#E8F5E9", color: "#2E7D32" },
    "Low":           { bg: "#FFF8E1", color: "#F57F17" },
    "Expiring Soon": { bg: "#FFF3E0", color: "#E65100" },
    "Expired":       { bg: "#FFEBEE", color: "#C62828" },
    "Quarantine":    { bg: "#FFF8E1", color: "#F57F17" },
    "Blocked":       { bg: "#FFEBEE", color: "#C62828" },
    "Damaged":       { bg: "#FFEBEE", color: "#C62828" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Active Batches",   value: activeCount,       color: "#2E7D32", bg: "#E8F5E9" },
          { label: "Expiring Soon",    value: expiringSoonCount,  color: "#E65100", bg: "#FFF3E0" },
          { label: "Held / Expired",   value: heldCount + nearExpiry, color: "#C62828", bg: "#FFEBEE" },
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
            {(["all", "Active", "Low", "Expiring Soon", "Quarantine", "Blocked", "Damaged"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "0 14px", border: `1px solid ${statusFilter === s ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 20, background: statusFilter === s ? "#EFF6FF" : "#fff", fontSize: 11, cursor: "pointer", fontFamily: "Inter", fontWeight: statusFilter === s ? 700 : 400, color: statusFilter === s ? "#1B6CA8" : "#6B7280", minHeight: 40, boxSizing: "border-box" as const }}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => { setShowAddBatch(true); setAddForm(EMPTY_ADD_FORM); setAddFormErrors({}); setAddError(""); setAddDrugSearch(""); }}
              style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
              + Add New Batch
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th onSort={() => handleSort("batchNo")} sortDir={sortCol === "batchNo" ? sortDir : null}>Batch #</Th>
              <Th onSort={() => handleSort("drug")} sortDir={sortCol === "drug" ? sortDir : null}>Product</Th>
              <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Supplier</Th>
              <Th onSort={() => handleSort("received")} sortDir={sortCol === "received" ? sortDir : null}>Date Received</Th>
              <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
              <Th onSort={() => handleSort("qtyReceived")} sortDir={sortCol === "qtyReceived" ? sortDir : null}>Qty Received</Th>
              <Th onSort={() => handleSort("qtyCurrent")} sortDir={sortCol === "qtyCurrent" ? sortDir : null}>Qty Remaining</Th>
              <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
              <Th>Batch Value</Th>
              <Th onSort={() => handleSort("status2")} sortDir={sortCol === "status2" ? sortDir : null}>Status</Th>
            </tr></thead>
            <tbody>
              {pageRows.map(b => {
                const used = b.qtyReceived - b.qtyCurrent;
                const pct  = b.qtyReceived > 0 ? (b.qtyCurrent / b.qtyReceived) * 100 : 0;
                const sp   = BATCH_STATUS_STYLE[b.status2] ?? { bg: "#F0F3F7", color: "#6B7280" };
                const days = daysToExpiry(b.expiry);
                const val  = (b.unitCost > 0 ? b.unitCost : (productCost[b.productId] ?? 0)) * b.qtyCurrent;
                return (
                  <tr key={b.id} onClick={() => { setSelBatch(b); setBTab("history"); }}
                    style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selBatch?.id === b.id ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.batchNo}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.drug}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{b.supplier || "—"}</td>
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
                    <td style={{ padding: "11px 14px" }}><Pill label={b.status2} bg={sp.bg} color={sp.color} /></td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: "32px 14px", textAlign: "center" as const, color: loadState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>
                  {loadState === "loading" ? "Loading batches…" : loadState === "error" ? <>Could not load batches: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button></> : allBatches.length === 0 ? "No batches yet. Receive stock or add a batch." : "No batches match the current filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>

      {/* ── Batch detail drawer ── */}
      {selBatch && (() => {
        // Movement type names used by the drawer's styling
        const typeOf = (m: Movement) => ({ Purchase: "GRN", "Sale Return": "Return", "Return to Distributor": "Return", "Return Cancelled": "Return" } as Record<string, string>)[m.event] ?? m.event;
        const batchMoves  = moves.map(m => ({ id: m.id, date: when(m.date), type: typeOf(m), ref: m.ref, qty: m.qty, user: m.user, reason: m.note, qtyAfter: m.balance }));
        const salesMoves  = batchMoves.filter(m => m.type === "Sale");
        const totalSold   = salesMoves.reduce((acc, m) => acc + Math.abs(m.qty), 0);
        const daysSinceReceived = Math.max(1, Math.round((Date.now() - new Date(selBatch.received).getTime()) / 86400000));
        const ratePerDay  = totalSold / daysSinceReceived;
        const estDaysEmpty = ratePerDay > 0 ? Math.round(selBatch.qtyCurrent / ratePerDay) : null;
        const sp = BATCH_STATUS_STYLE[selBatch.status2] ?? { bg: "#F0F3F7", color: "#6B7280" };
        const val = (selBatch.unitCost > 0 ? selBatch.unitCost : (productCost[selBatch.productId] ?? 0)) * selBatch.qtyCurrent;
        const days = daysToExpiry(selBatch.expiry);

        return (
          <>
            <div onClick={() => setSelBatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 100 }} />
            <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(12,27,51,0.12)" }}>

              {/* Header */}
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 800, color: "#1B6CA8" }}>{selBatch.batchNo}</span>
                    <Pill label={selBatch.status2} bg={sp.bg} color={sp.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{selBatch.drug}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{selBatch.supplier || "No distributor"} · {selBatch.location || "No location"}</div>
                  <button onClick={() => { setStatusTarget(selBatch); setNewStatus(selBatch.status === "Active" ? "Quarantine" : "Active"); setStatusError(""); }}
                    style={{ marginTop: 8, padding: "4px 12px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                    Quarantine / release
                  </button>
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
                  if (moves.length === 0) return <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" as const, paddingTop: 32 }}>{movesState === "loading" ? "Loading…" : movesState === "error" ? "Could not load movements." : "No movements recorded for this batch."}</div>;
                  const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
                    Sale: { bg: "#FFEBEE", color: "#C62828" }, GRN: { bg: "#E8F5E9", color: "#2E7D32" },
                    Adjustment: { bg: "#FFF3E0", color: "#E65100" }, Return: { bg: "#EFF6FF", color: "#1B6CA8" }, Opening: { bg: "#F5F3FF", color: "#6B21A8" },
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
          <div role="dialog" aria-label="Add new batch" style={{ background: "#fff", width: 540, borderRadius: 8, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Add New Batch</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Register a manually received batch. It is recorded as an opening balance in the stock ledger.</div>
              </div>
              <button onClick={() => setShowAddBatch(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>

            {/* Form body */}
            <div style={{ overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Drug search */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                  Product / Item <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  {addDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setAddDrugOpen(false)} />}
                  <input ref={addDrugRef} aria-label="Product"
                    value={addDrugSearch || addSelectedProduct?.name || ""}
                    onChange={e => { setAddDrugSearch(e.target.value); setAddDrugOpen(true); if (!e.target.value) setAddField("productId", ""); }}
                    onFocus={() => { setAddDrugOpen(true); setAddDrugSearch(""); }}
                    placeholder="Search product name or category..."
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${addFormErrors.productId ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }} />
                  {addDrugOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 200, overflowY: "auto" }}>
                      {addProductsFiltered.length === 0
                        ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>{loadState === "loading" ? "Loading…" : "No products found"}</div>
                        : addProductsFiltered.map(d => (
                          <div key={d.id} onMouseDown={() => { setAddField("productId", d.id); if (d.price > 0) { setAddField("saleRate", String(d.price)); } setAddDrugSearch(""); setAddDrugOpen(false); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                            <div>
                              <div style={{ fontSize: 13, color: "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{d.category}</div>
                            </div>
                            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.unit}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {addFormErrors.productId && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{addFormErrors.productId}</div>}
              </div>

              {([
                [{ key: "batchId", label: "Batch number", type: "text", req: true, ph: "e.g. BT-2026-0120" }, { key: "expiry", label: "Expiry date", type: "date", req: true, ph: "" }],
                [{ key: "qtyReceived", label: "Quantity received", type: "number", req: true, ph: "0" }, { key: "locationId", label: "Location", type: "location", req: true, ph: "" }],
                [{ key: "distributorId", label: "Distributor", type: "distributor", req: false, ph: "" }, { key: "purchaseRate", label: "Purchase rate (₹)", type: "number", req: false, ph: "0.00" }],
                [{ key: "mrp", label: "MRP (₹)", type: "number", req: false, ph: "0.00" }, { key: "saleRate", label: "Sale rate (₹)", type: "number", req: false, ph: "0.00" }],
              ] as { key: keyof typeof EMPTY_ADD_FORM; label: string; type: string; req: boolean; ph: string }[][]).map((pair, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {pair.map(f => {
                    const err = addFormErrors[f.key];
                    const base = { width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${err ? "#C62828" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const };
                    return (
                      <div key={f.key}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
                          {f.label} {f.req && <span style={{ color: "#C62828" }}>*</span>}
                        </label>
                        {f.type === "location" ? (
                          <select aria-label={f.label} value={addForm.locationId} onChange={e => setAddField("locationId", e.target.value)} style={base}>
                            <option value="">— Select location —</option>
                            {masters.storage_locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        ) : f.type === "distributor" ? (
                          <select aria-label={f.label} value={addForm.distributorId} onChange={e => setAddField("distributorId", e.target.value)} style={base}>
                            <option value="">— None —</option>
                            {distList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        ) : f.type === "date" ? (
                          <DatePicker value={addForm.expiry} onChange={v => setAddField("expiry", v)} inputStyle={{ border: `1px solid ${err ? "#C62828" : "#E8ECF4"}` }} />
                        ) : (
                          <input aria-label={f.label} type={f.type} min={f.type === "number" ? 0 : undefined} step={f.type === "number" && f.key !== "qtyReceived" ? "0.01" : undefined}
                            value={addForm[f.key]} onChange={e => setAddField(f.key, e.target.value)} placeholder={f.ph}
                            style={{ ...base, fontFamily: f.type === "number" ? "JetBrains Mono" : "Inter" }} />
                        )}
                        {err && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{err}</div>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
              <button onClick={() => setShowAddBatch(false)}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                Cancel
              </button>
              {addError && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 300 }}>{addError}</span>}
              <button onClick={submitAddBatch} disabled={addBusy}
                style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: addBusy ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: addBusy ? "wait" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                {addBusy ? "Adding…" : "Add Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
      {statusTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div role="dialog" aria-label="Batch status" style={{ background: "#fff", width: 420, borderRadius: 6, border: "1px solid #E8ECF4", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Batch status · {statusTarget.batchNo}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{statusTarget.product} · currently {statusTarget.status}</div>
            <select aria-label="New status" value={newStatus} onChange={e => setNewStatus(e.target.value as TrackedBatch["status"])}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 13 }}>
              {(["Active", "Quarantine", "Blocked", "Damaged"] as const).map(x => <option key={x} value={x}>{x === "Active" ? "Active (release for sale)" : x}</option>)}
            </select>
            {newStatus !== "Active" && <div style={{ fontSize: 12, color: "#E65100" }}>This batch will not be sold or picked by FEFO until it is released.</div>}
            {statusError && <div role="alert" style={{ color: "#B91C1C", fontSize: 12 }}>{statusError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setStatusTarget(null)} style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitStatus} disabled={statusBusy || newStatus === statusTarget.status}
                style={{ padding: "9px 20px", border: "none", borderRadius: 6, background: statusBusy || newStatus === statusTarget.status ? "#C8CDD8" : "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: statusBusy ? "wait" : "pointer" }}>
                {statusBusy ? "Saving…" : "Update status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", minWidth: 320, maxWidth: 560, background: toast.ok ? "#2E7D32" : "#C62828", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.22)" }}>
            <span style={{ flex: 1 }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
