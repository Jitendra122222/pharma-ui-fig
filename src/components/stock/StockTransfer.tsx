import { useState, useEffect } from "react";
import { SK } from "../../styles/stock";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import {
  fetchStockOverview, fetchAllTransfers, fetchProductBatches, requestTransfer, completeTransfer, cancelTransfer,
} from "../../lib/stockApi";
import type { StockOverviewRow, Transfer, TransferCounts, ProductBatch } from "../../lib/stockApi";
import { useMasters } from "../../lib/mastersApi";

type TransferStatus = "pending" | "completed" | "cancelled";

const STATUS_LABEL: Record<TransferStatus, string> = { pending: "Pending", completed: "Completed", cancelled: "Cancelled" };
const STATUS_STYLE: Record<TransferStatus, { bg: string; color: string }> = {
  pending:   { bg: "#FFF3E0", color: "#E65100" },
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};

const EMPTY_FORM = { drugId: "", batchId: "", toLocationId: "", qty: "", reason: "", notes: "" };

const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};
const when = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none",
  fontFamily: "Inter", background: "#fff", boxSizing: "border-box",
};

export default function StockTransfer() {
  const { masters } = useMasters();
  const [transferView, setTransferView] = useState<"history" | "custody">("history");

  // ── data ──
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [counts, setCounts] = useState<TransferCounts>({ pending: 0, completed: 0, cancelled: 0 });
  const [products, setProducts] = useState<StockOverviewRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchAllTransfers(), fetchStockOverview({ pageSize: 500 })])
      .then(([t, o]) => { if (live) { setTransfers(t.items); setCounts(t.counts); setProducts(o.items); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load transfers")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [histSearch, setHistSearch] = useState("");
  const [histStatus, setHistStatus] = useState<"All" | TransferStatus>("All");
  const [cocSearch, setCocSearch] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── new transfer ──
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [drugSearch, setDrugSearch] = useState("");
  const [drugOpen, setDrugOpen] = useState(false);
  const [formBatches, setFormBatches] = useState<ProductBatch[]>([]);
  const [formBatchState, setFormBatchState] = useState<"idle" | "loading" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const locName = (id: string | null) => masters.storage_locations.find(l => l.id === id)?.name ?? "";
  const selectedDrug = products.find(p => p.id === form.drugId);
  const selectedBatch = formBatches.find(b => b.id === form.batchId);
  const targets = masters.storage_locations.filter(l => l.id !== selectedBatch?.locationId);
  const qtyNum = parseInt(form.qty, 10);

  useEffect(() => {
    if (!form.drugId) { setFormBatches([]); setFormBatchState("idle"); return; }
    let live = true;
    setFormBatchState("loading");
    fetchProductBatches(form.drugId)
      .then(b => { if (live) { setFormBatches(b.filter(x => x.qtyCurrent > 0)); setFormBatchState("idle"); } })
      .catch(() => { if (live) setFormBatchState("error"); });
    return () => { live = false; };
  }, [form.drugId]);

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }));
    if (value) setFormErrors(p => ({ ...p, [key]: "" }));
  }
  function openModal() {
    setForm({ ...EMPTY_FORM, reason: masters.transfer_reasons[0]?.name ?? "" });
    setFormErrors({}); setSaveError(""); setDrugSearch(""); setDrugOpen(false);
    setShowModal(true);
  }

  async function submitTransfer() {
    const errs: Partial<typeof EMPTY_FORM> = {};
    if (!form.drugId) errs.drugId = "Select a product";
    if (!form.batchId) errs.batchId = "Select the batch to move";
    if (!form.toLocationId) errs.toLocationId = "Select where it is going";
    if (!form.qty || isNaN(qtyNum) || qtyNum < 1) errs.qty = "Enter a valid quantity";
    else if (selectedBatch && qtyNum > selectedBatch.qtyCurrent) errs.qty = `Only ${selectedBatch.qtyCurrent} in this batch`;
    if (!form.reason) errs.reason = "Select a reason";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true); setSaveError("");
    try {
      const t = await requestTransfer({ batchId: form.batchId, toLocationId: form.toLocationId, quantity: qtyNum, reason: form.reason, notes: form.notes });
      setShowModal(false);
      setToast({ ok: true, msg: `${t.number} requested. Stock moves when an admin or manager completes it.` });
      setReload(n => n + 1);
    } catch (e) { setSaveError(errText(e, "Could not request the transfer")); } finally { setSaving(false); }
  }

  async function act(t: Transfer, what: "complete" | "cancel") {
    setActionMenuOpen(null); setBusyId(t.id);
    try {
      if (what === "complete") await completeTransfer(t.id); else await cancelTransfer(t.id);
      setToast({ ok: what === "complete", msg: what === "complete" ? `${t.number} completed. Stock has moved to ${t.toLocation}.` : `${t.number} cancelled. Stock is unchanged.` });
      setReload(n => n + 1);
    } catch (e) { setToast({ ok: false, msg: errText(e, `Could not ${what} ${t.number}`) }); } finally { setBusyId(null); }
  }

  // ── lists ──
  const histFiltered = transfers.filter(t => {
    const q = histSearch.toLowerCase();
    const matchQ = !q || t.number.toLowerCase().includes(q) || t.productName.toLowerCase().includes(q) || t.batchNumber.toLowerCase().includes(q)
      || t.fromLocation.toLowerCase().includes(q) || t.toLocation.toLowerCase().includes(q) || t.requestedBy.toLowerCase().includes(q);
    return matchQ && (histStatus === "All" || t.status === histStatus);
  });
  // Chain of custody: who handed stock over, who received it, and when, for every transfer that has moved
  const custody = transfers.filter(t => t.status === "completed");
  const cocFiltered = custody.filter(c => {
    if (!cocSearch) return true;
    const q = cocSearch.toLowerCase();
    return c.productName.toLowerCase().includes(q) || c.number.toLowerCase().includes(q) || c.requestedBy.toLowerCase().includes(q) || c.completedBy.toLowerCase().includes(q);
  });
  const { pageRows: histPageRows, footerProps: histFooterProps } = usePagination(histFiltered, 10);
  const { pageRows: cocPageRows, footerProps: cocFooterProps } = usePagination(cocFiltered, 10);

  const filteredDrugs = drugSearch
    ? products.filter(d => d.name.toLowerCase().includes(drugSearch.toLowerCase()) || d.category.toLowerCase().includes(drugSearch.toLowerCase()))
    : products;
  const emptyMsg = (what: string) => (loadState === "loading" ? "Loading…" : loadState === "error" ? `Could not load: ${loadError}` : what);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Transfers", value: counts.pending + counts.completed + counts.cancelled, color: "#1B6CA8" },
          { label: "Pending",         value: counts.pending,   color: "#E65100" },
          { label: "Completed",       value: counts.completed, color: "#2E7D32" },
          { label: "Cancelled",       value: counts.cancelled, color: "#C62828" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load transfers: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* ── Tabbed Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "history" as const, label: "Transfer History", badge: counts.pending > 0 ? counts.pending : null },
            { key: "custody" as const, label: "Chain of Custody", badge: null },
          ]).map(t => (
            <button key={t.key} onClick={() => setTransferView(t.key)}
              style={{
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter",
                fontWeight: transferView === t.key ? 600 : 400, color: transferView === t.key ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${transferView === t.key ? "#1B6CA8" : "transparent"}`, marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}>
              {t.label}
              {t.badge != null && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: "#FFF3E0", color: "#E65100" }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Transfer History ── */}
        {transferView === "history" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
              <div style={{ ...SK.searchWrapper, flex: "0 0 260px" }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search transfers..." value={histSearch} onChange={e => setHistSearch(e.target.value)} style={SK.searchInput} />
              </div>
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "pending", "completed", "cancelled"] as const).map(s => (
                  <button key={s} onClick={() => setHistStatus(s)}
                    style={{ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: histStatus === s ? 600 : 400, fontFamily: "Inter", border: `1px solid ${histStatus === s ? "#1B6CA8" : "#DDE3EC"}`, background: histStatus === s ? "#EFF6FF" : "#fff", color: histStatus === s ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" as const }}>
                    {s === "All" ? "All" : STATUS_LABEL[s]}
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

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Transfer #", "Date", "Product", "Batch", "From", "To", "Qty", "Requested By", "Status", "Reason", "Actions"].map(h => (
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
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{t.number}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{t.createdAt.slice(0, 10)}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{t.productName}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{t.batchNumber}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{t.fromLocation}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}><span style={{ fontSize: 11, color: "#9CA3AF", marginRight: 5 }}>→</span>{t.toLocation}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{t.quantity}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.requestedBy}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontSize: 10, padding: "3px 9px", background: ss.bg, color: ss.color, fontWeight: 700, letterSpacing: "0.04em" }}>{STATUS_LABEL[t.status]}</span>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.reason}</td>
                        <td style={{ padding: "11px 13px" }}>
                          {t.status === "pending" ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              {menuOpen && <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setActionMenuOpen(null)} />}
                              <button aria-label={`Actions for ${t.number}`} disabled={busyId === t.id}
                                onClick={() => setActionMenuOpen(open => open === t.id ? null : t.id)}
                                style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: menuOpen ? "#F0F3F7" : "#fff", cursor: busyId === t.id ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                              </button>
                              {menuOpen && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 160 }}>
                                  <div role="button" onMouseDown={() => act(t, "complete")}
                                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#2E7D32", background: "#fff" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#E8F5E9"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    Complete transfer
                                  </div>
                                  <div style={{ height: 1, background: "#EEF1F6" }} />
                                  <div role="button" onMouseDown={() => act(t, "cancel")}
                                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#C62828", background: "#fff" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    Cancel
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {histPageRows.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: "32px 14px", textAlign: "center" as const, color: loadState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>
                      {emptyMsg(transfers.length === 0 ? "No transfers yet." : "No transfers match the filter.")}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...histFooterProps} />
          </>
        )}

        {/* ── Chain of Custody ── */}
        {transferView === "custody" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ ...SK.searchWrapper, flex: "0 0 260px" }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search chain of custody..." value={cocSearch} onChange={e => setCocSearch(e.target.value)} style={SK.searchInput} />
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Every completed transfer: who requested it, who completed it and when</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Transfer #", "Product", "Batch", "Qty", "From → To", "Requested By", "Completed By", "Requested", "Completed"].map(h => (
                      <th key={h} style={{ ...SK.th, background: "#FAFBFD" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cocPageRows.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{c.number}</td>
                      <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{c.productName}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.batchNumber}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{c.quantity}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{c.fromLocation} <span style={{ color: "#9CA3AF", margin: "0 4px" }}>→</span> {c.toLocation}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{c.requestedBy}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{c.completedBy || "—"}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{when(c.createdAt)}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{when(c.completedAt)}</td>
                    </tr>
                  ))}
                  {cocPageRows.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>
                      {emptyMsg(custody.length === 0 ? "No completed transfers yet." : "Nothing matches the search.")}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...cocFooterProps} />
          </>
        )}
      </div>

      {/* ── New Transfer ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div role="dialog" aria-label="New stock transfer" style={{ background: "#fff", width: 600, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>New Stock Transfer</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Move part of a batch to another storage location. An admin or manager completes it.</div>
              </div>
              <button onClick={() => setShowModal(false)} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ overflowY: "auto", padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Product</FieldLabel>
                <div style={{ position: "relative" }}>
                  {drugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setDrugOpen(false)} />}
                  <input aria-label="Product" value={drugSearch || selectedDrug?.name || ""} placeholder="Search product..."
                    onChange={e => { setDrugSearch(e.target.value); setDrugOpen(true); if (!e.target.value) { setField("drugId", ""); setField("batchId", ""); } }}
                    onFocus={() => { setDrugOpen(true); setDrugSearch(""); }}
                    style={{ ...inputStyle, border: `1px solid ${formErrors.drugId ? "#C62828" : drugOpen ? "#1B6CA8" : "#DDE3EC"}`, cursor: "pointer" }} />
                  {drugOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 200, overflowY: "auto" }}>
                      {filteredDrugs.length === 0
                        ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>{loadState === "loading" ? "Loading…" : "No products found"}</div>
                        : filteredDrugs.map(d => (
                          <div key={d.id} onMouseDown={() => { setField("drugId", d.id); setField("batchId", ""); setField("toLocationId", ""); setDrugSearch(""); setDrugOpen(false); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                            <div>
                              <div style={{ fontSize: 13, color: "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{d.category}</div>
                            </div>
                            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.stock} in stock</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {formErrors.drugId && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErrors.drugId}</div>}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Batch to move</FieldLabel>
                <select aria-label="Batch" value={form.batchId} onChange={e => { setField("batchId", e.target.value); setField("toLocationId", ""); }} disabled={!selectedDrug}
                  style={{ ...inputStyle, border: `1px solid ${formErrors.batchId ? "#C62828" : "#DDE3EC"}` }}>
                  <option value="">{!selectedDrug ? "Select a product first" : formBatchState === "loading" ? "Loading batches…" : formBatches.length === 0 ? "No batches with stock" : "— Select batch —"}</option>
                  {formBatches.map(b => <option key={b.id} value={b.id}>{b.batchNo} · {locName(b.locationId) || "No location"} · Qty {b.qtyCurrent}</option>)}
                </select>
                {formErrors.batchId && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErrors.batchId}</div>}
              </div>

              <div>
                <FieldLabel>From</FieldLabel>
                <input readOnly value={selectedBatch ? (locName(selectedBatch.locationId) || "No location") : ""} placeholder="Set by the batch"
                  style={{ ...inputStyle, background: "#F8FAFC" }} />
              </div>
              <div>
                <FieldLabel>To location</FieldLabel>
                <select aria-label="To location" value={form.toLocationId} onChange={e => setField("toLocationId", e.target.value)} disabled={!selectedBatch}
                  style={{ ...inputStyle, border: `1px solid ${formErrors.toLocationId ? "#C62828" : "#DDE3EC"}` }}>
                  <option value="">{!selectedBatch ? "Select a batch first" : targets.length === 0 ? "Add another storage location first" : "— Select location —"}</option>
                  {targets.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {formErrors.toLocationId && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErrors.toLocationId}</div>}
              </div>

              <div>
                <FieldLabel>Quantity{selectedBatch ? ` (max ${selectedBatch.qtyCurrent})` : ""}</FieldLabel>
                <input aria-label="Quantity" type="number" min={1} max={selectedBatch?.qtyCurrent} value={form.qty} onChange={e => setField("qty", e.target.value)}
                  style={{ ...inputStyle, fontFamily: "JetBrains Mono", border: `1px solid ${formErrors.qty ? "#C62828" : "#DDE3EC"}` }} />
                {formErrors.qty && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErrors.qty}</div>}
              </div>
              <div>
                <FieldLabel>Reason</FieldLabel>
                <select aria-label="Reason" value={form.reason} onChange={e => setField("reason", e.target.value)}
                  style={{ ...inputStyle, border: `1px solid ${formErrors.reason ? "#C62828" : "#DDE3EC"}` }}>
                  <option value="">{masters.transfer_reasons.length === 0 ? "No reasons set up. Add some under Masters." : "— Select reason —"}</option>
                  {masters.transfer_reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                {formErrors.reason && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErrors.reason}</div>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel>Notes</FieldLabel>
                <input aria-label="Notes" type="text" placeholder="Optional" value={form.notes} onChange={e => setField("notes", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
              {saveError && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 320 }}>{saveError}</span>}
              <button onClick={() => setShowModal(false)}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                Cancel
              </button>
              <button onClick={submitTransfer} disabled={saving}
                style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: saving ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saving ? "wait" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                {saving ? "Requesting…" : "Request Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
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
