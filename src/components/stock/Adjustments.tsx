import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import {
  fetchStockOverview, fetchAllAdjustments, reviewAdjustment, requestAdjustment, fetchProductBatches, fetchBatches,
} from "../../lib/stockApi";
import type { StockOverviewRow, Adjustment, AdjustmentCounts, ProductBatch } from "../../lib/stockApi";
import { useMasters } from "../../lib/mastersApi";
import MultiStepper from "../shared/MultiStepper";
import { SK } from "../../styles/stock";

type ApprovalStatus = "Pending" | "Approved" | "Rejected";
type CountItem = { id: string; productId: string; name: string; category: string; batchNo: string; location: string; stock: number };
type CompletedSession = { id: string; startedAt: string; completedAt: string; scope: string; assignedTo: string; itemsCounted: number; variancesFound: number; adjustmentsCreated: number };

const ADJ_TYPES = ["Stock Count", "Write-off"] as const;
const todayStr = () => new Date().toISOString().slice(0, 10);
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};

const EMPTY_ADJ_FORM = { drugId: "", batchId: "", adjType: "", adjQty: "", reason: "", notes: "" };

export default function Adjustments() {
  const { masters } = useMasters();

  // ── data from the backend ──
  const [ovRows, setOvRows] = useState<StockOverviewRow[]>([]);
  const [adjs, setAdjs] = useState<Adjustment[]>([]);
  const [adjCounts, setAdjCounts] = useState<AdjustmentCounts>({ pending: 0, approved: 0, rejected: 0, today: 0 });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchStockOverview({ pageSize: 500 }), fetchAllAdjustments()])
      .then(([o, a]) => { if (live) { setOvRows(o.items); setAdjs(a.items); setAdjCounts(a.counts); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load stock adjustments")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const [adjView, setAdjView] = useState<"workqueue" | "log">("workqueue");
  const [newAdjPage, setNewAdjPage] = useState(false);
  const [adjForm, setAdjForm] = useState(EMPTY_ADJ_FORM);
  const [adjFormErrors, setAdjFormErrors] = useState<Partial<typeof EMPTY_ADJ_FORM>>({});
  const [adjDrugSearch, setAdjDrugSearch] = useState("");
  const [adjDrugOpen, setAdjDrugOpen] = useState(false);
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState("");
  const [formBatches, setFormBatches] = useState<ProductBatch[]>([]);
  const [formBatchState, setFormBatchState] = useState<"idle" | "loading" | "error">("idle");
  const drugSearchRef = useRef<HTMLInputElement>(null);

  const selectedDrug = ovRows.find(d => d.id === adjForm.drugId);
  const selectedBatch = formBatches.find(b => b.id === adjForm.batchId);
  const adjQtyNum = parseInt(adjForm.adjQty, 10);
  const isWriteOff = adjForm.adjType === "Write-off";
  const batchStock = selectedBatch?.qtyCurrent ?? 0;
  const adjustedStock = !isNaN(adjQtyNum) && selectedBatch ? (isWriteOff ? batchStock - adjQtyNum : adjQtyNum) : null;

  useEffect(() => {
    const id = adjForm.drugId;
    if (!id) { setFormBatches([]); setFormBatchState("idle"); return; }
    let live = true;
    setFormBatchState("loading");
    fetchProductBatches(id)
      .then(b => { if (live) { setFormBatches(b.filter(x => x.qtyCurrent > 0)); setFormBatchState("idle"); } })
      .catch(() => { if (live) setFormBatchState("error"); });
    return () => { live = false; };
  }, [adjForm.drugId]);

  function setAdjField<K extends keyof typeof EMPTY_ADJ_FORM>(key: K, value: typeof EMPTY_ADJ_FORM[K]) {
    setAdjForm(prev => ({ ...prev, [key]: value }));
    if (value) setAdjFormErrors(prev => ({ ...prev, [key]: "" }));
  }

  function openNewAdj(prefill?: Partial<typeof EMPTY_ADJ_FORM>) {
    setAdjForm({ ...EMPTY_ADJ_FORM, ...prefill });
    setAdjFormErrors({});
    setAdjError("");
    setAdjDrugSearch("");
    setNewAdjPage(true);
  }

  async function submitAdjForm() {
    const errs: Partial<typeof EMPTY_ADJ_FORM> = {};
    if (!adjForm.drugId)  errs.drugId  = "Select a product";
    if (!adjForm.batchId) errs.batchId = "Select the batch";
    if (!adjForm.adjType) errs.adjType = "Select adjustment type";
    if (!adjForm.adjQty || isNaN(adjQtyNum) || adjQtyNum < (isWriteOff ? 1 : 0)) errs.adjQty = "Enter a valid quantity";
    else if (isWriteOff && selectedBatch && adjQtyNum > batchStock) errs.adjQty = `Only ${batchStock} in this batch`;
    else if (!isWriteOff && selectedBatch && adjQtyNum === batchStock) errs.adjQty = "Counted quantity matches the system";
    if (!adjForm.reason)  errs.reason  = "Select a reason";
    if (Object.keys(errs).length > 0) { setAdjFormErrors(errs); return; }
    setAdjBusy(true); setAdjError("");
    try {
      const r = await requestAdjustment(isWriteOff
        ? { batchId: adjForm.batchId, type: "WRITE_OFF", writeOffQty: adjQtyNum, reason: adjForm.reason, notes: adjForm.notes }
        : { batchId: adjForm.batchId, type: "COUNT", countedQty: adjQtyNum, reason: adjForm.reason, notes: adjForm.notes });
      setAdjForm(EMPTY_ADJ_FORM); setAdjFormErrors({}); setNewAdjPage(false);
      setToast({ ok: true, msg: `${r.number} sent for approval. Stock changes once another admin or manager approves it.` });
      setReload(n => n + 1);
      setAdjView("log");
    } catch (e) { setAdjError(errText(e, "Could not submit the adjustment")); } finally { setAdjBusy(false); }
  }

  // ── approvals ──
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approveAction, setApproveAction] = useState<"approve" | "reject">("approve");
  const [approverNote, setApproverNote] = useState("");
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveError, setApproveError] = useState("");

  // Blind Physical Count state
  const [showBlind, setShowBlind] = useState(false);
  const [blindDrugId, setBlindDrugId] = useState("");
  const [blindDrugLocked, setBlindDrugLocked] = useState(false);
  const [blindDrugSearch, setBlindDrugSearch] = useState("");
  const [blindDrugOpen, setBlindDrugOpen] = useState(false);
  const [blindQty, setBlindQty] = useState("");
  const [blindSubmitted, setBlindSubmitted] = useState(false);

  const [adjSearch, setAdjSearch] = useState("");
  const [verSearch, setVerSearch] = useState("");

  // ── Stock Count Session state ──
  const [countScope, setCountScope] = useState<"full" | "location" | "supplier" | "selected">("full");
  const [countScopeFilter, setCountScopeFilter] = useState("");
  const [countBlind, setCountBlind] = useState(false);
  const [countAssignTo, setCountAssignTo] = useState("");
  const [countMode, setCountMode] = useState<"manual" | "scan">("manual");
  const [countSession, setCountSession] = useState<{ id: string; startedAt: string; scope: string; assignedTo: string } | null>(null);
  const [countEntries, setCountEntries] = useState<Record<string, string>>({});
  const [scanInput, setScanInput] = useState("");
  const [countSearch, setCountSearch] = useState("");
  const [countReview, setCountReview] = useState(false);
  const [countToast, setCountToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [skippedCountIds, setSkippedCountIds] = useState<Set<string>>(new Set());
  const [countBatches, setCountBatches] = useState<CountItem[]>([]);
  const [countLoad, setCountLoad] = useState<"idle" | "loading" | "error">("idle");
  const [countSubmitting, setCountSubmitting] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const blindQtyRef = useRef<HTMLInputElement>(null);
  const blindDrugSearchRef = useRef<HTMLInputElement>(null);

  const [logFilter, setLogFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const [countOverlayOpen, setCountOverlayOpen] = useState(false);
  const [selectedVerIds, setSelectedVerIds] = useState<Set<string>>(new Set());
  const [countPreselectedIds, setCountPreselectedIds] = useState<string[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);

  useEffect(() => {
    if (!showBlind || blindSubmitted) return;
    if (blindDrugLocked) {
      setTimeout(() => blindQtyRef.current?.focus(), 50);
    } else {
      setTimeout(() => blindDrugSearchRef.current?.focus(), 50);
    }
  }, [showBlind, blindSubmitted, blindDrugLocked]);

  const uniqueLocations = masters.storage_locations.map(l => l.name).sort();
  const uniqueCategories = [...new Set(ovRows.map(d => d.category).filter(Boolean))].sort();

  // Smart Verification Queue: products that most need a physical check
  const verificationQueue = ovRows
    .filter(d => d.stock > 0)
    .map(d => {
      const daysLastCount = d.lastCounted ? Math.round((Date.now() - new Date(d.lastCounted).getTime()) / 86400000) : 999;
      const nearExpiry = d.daysToExpiry !== null && d.daysToExpiry < 90;
      const lowStock = d.stock < d.minStock;
      const highValue = d.stockValue > 5000;
      const controlled = d.rx === "Schedule H1" || d.rx === "Schedule X";
      const score = (lowStock ? 3 : 0) + (nearExpiry ? 2 : 0) + (highValue ? 2 : 0) + (controlled ? 2 : 0) + (daysLastCount > 30 ? 1 : 0);
      const reasons: string[] = [];
      if (lowStock) reasons.push("Low stock");
      if (nearExpiry) reasons.push("Near expiry");
      if (highValue) reasons.push("High value");
      if (controlled) reasons.push("Controlled substance");
      if (daysLastCount > 30) reasons.push(`${daysLastCount === 999 ? "Never counted" : `${daysLastCount}d since last count`}`);
      return { ...d, score, lastCountDate: d.lastCounted ? d.lastCounted.slice(0, 10) : "Never", reasons };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score);

  const pendingApprovals = adjCounts.pending;

  const rowsWithApproval = adjs.map(a => ({
    id: a.number, dbId: a.id, date: a.createdAt.slice(0, 10), drug: a.productName,
    type: a.type === "WRITE_OFF" ? "Write-off" : "Stock Count",
    qtyBefore: a.systemQty, qty: a.variance, qtyAfter: a.countedQty, reason: a.reason, ref: a.batchNumber, by: a.requestedBy,
    approval: cap(a.status) as ApprovalStatus, approvedBy: a.reviewedBy,
    approvedAt: a.reviewedAt ? a.reviewedAt.slice(0, 16).replace("T", " ") : "",
  }));
  const adjFiltered = rowsWithApproval.filter(a => {
    const q = adjSearch.toLowerCase();
    const matchSearch = !q || a.drug.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q);
    const matchFilter = logFilter === "all" || a.approval === logFilter;
    return matchSearch && matchFilter;
  });
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(adjFiltered);
  const { pageRows: adjPageRows, footerProps: adjFooterProps } = usePagination(sortedRows, 10);

  const verFiltered = verificationQueue.filter(d =>
    !verSearch || d.name.toLowerCase().includes(verSearch.toLowerCase())
  );
  const { pageRows: verPageRows, footerProps: verFooterProps } = usePagination(verFiltered, 10);

  const blindDrugObj = ovRows.find(d => d.id === blindDrugId);
  const blindQtyNum = parseInt(blindQty, 10);
  const blindVariance = blindSubmitted && !isNaN(blindQtyNum) ? blindQtyNum - (blindDrugObj?.stock ?? 0) : null;

  // Count sheets work per batch, because that is where stock is held and adjusted
  const categoryOf = Object.fromEntries(ovRows.map(d => [d.id, d.category]));
  const inScope = (d: CountItem) => {
    if (!countSession) return false;
    if (countSession.scope === "By Location") return d.location === countScopeFilter;
    if (countSession.scope === "By Company") return d.category === countScopeFilter;
    if (countSession.scope === "Selected Items") return countPreselectedIds.includes(d.productId);
    return true;
  };
  const allCountItems = countBatches.filter(inScope);
  const countItems = allCountItems.filter(d => !countSearch || d.name.toLowerCase().includes(countSearch.toLowerCase()) || d.batchNo.toLowerCase().includes(countSearch.toLowerCase()));
  const countedCount = allCountItems.filter(d => countEntries[d.id] !== undefined && countEntries[d.id] !== "").length;
  const progressPct = allCountItems.length > 0 ? Math.round((countedCount / allCountItems.length) * 100) : 0;
  const countVarianceItems = allCountItems.filter(d => {
    const e = countEntries[d.id];
    return e !== undefined && e !== "" && parseInt(e, 10) !== d.stock;
  });

  async function loadCountBatches() {
    setCountLoad("loading");
    try {
      const out: CountItem[] = [];
      for (let page = 1; page <= 20; page++) {
        const r = await fetchBatches(page, 100, true);
        out.push(...r.items.map(b => ({
          id: b.dbId, productId: b.productId, name: b.drug, category: categoryOf[b.productId] ?? "", batchNo: b.id,
          location: b.location, stock: b.qtyCurrent,
        })));
        if (page * 100 >= r.total) break;
      }
      setCountBatches(out);
      setCountLoad("idle");
    } catch { setCountLoad("error"); }
  }

  function startCountSession() {
    if (countScope === "location" && !countScopeFilter) return;
    if (countScope === "supplier" && !countScopeFilter) return;
    if (countScope === "selected" && countPreselectedIds.length === 0) return;
    const scope = countScope === "full" ? "Full Stock"
      : countScope === "location" ? "By Location"
      : countScope === "supplier" ? "By Company"
      : "Selected Items";
    setCountSession({ id: `CS-${Math.floor(Math.random() * 900) + 100}`, startedAt: todayStr() + " " + new Date().toTimeString().slice(0, 5), scope, assignedTo: countAssignTo || "Unassigned" });
    setCountEntries({});
    setCountSearch("");
    setCountReview(false);
  }

  async function submitCountSession() {
    if (countSubmitting || !countSession) return;
    const toCreate = countVarianceItems.filter(d => !skippedCountIds.has(d.id));
    const reasonName = (masters.adjustment_reasons.find(r => /count/i.test(r.name)) ?? masters.adjustment_reasons[0])?.name;
    if (toCreate.length > 0 && !reasonName) {
      setCountToast({ msg: "Add an adjustment reason under Masters first.", type: "error" });
      setTimeout(() => setCountToast(null), 4000);
      return;
    }
    setCountSubmitting(true);
    let created = 0;
    const failed: string[] = [];
    for (const d of toCreate) {
      try {
        await requestAdjustment({
          batchId: d.id, type: "COUNT", countedQty: parseInt(countEntries[d.id] ?? "0", 10), reason: reasonName!,
          notes: `Count session ${countSession.id}${countSession.assignedTo !== "Unassigned" ? ` · ${countSession.assignedTo}` : ""}`,
        });
        created++;
      } catch { failed.push(`${d.name} (${d.batchNo})`); }
    }
    setCountSubmitting(false);
    setCompletedSessions(prev => [{
      id: countSession.id, startedAt: countSession.startedAt, completedAt: todayStr() + " " + new Date().toTimeString().slice(0, 5),
      scope: countSession.scope, assignedTo: countSession.assignedTo, itemsCounted: countedCount,
      variancesFound: countVarianceItems.length, adjustmentsCreated: created,
    }, ...prev]);
    setToast(failed.length
      ? { ok: false, msg: `${created} adjustment${created !== 1 ? "s" : ""} created. Could not create: ${failed.join(", ")}` }
      : toCreate.length > 0
        ? { ok: true, msg: `${created} adjustment${created !== 1 ? "s" : ""} created and sent for approval.` }
        : { ok: true, msg: "Count complete. No adjustments needed." });
    setCountSession(null);
    setCountEntries({});
    setCountReview(false);
    setCountScope("full");
    setCountScopeFilter("");
    setSkippedCountIds(new Set());
    setCountOverlayOpen(false);
    setAdjView("log");
    setLogFilter("Pending");
    setSelectedVerIds(new Set());
    setCountPreselectedIds([]);
    setReload(n => n + 1);
  }

  function openCountOverlay(preselected?: string[]) {
    setCountPreselectedIds(preselected ?? []);
    setCountScope(preselected && preselected.length > 0 ? "selected" : "full");
    setCountScopeFilter("");
    setCountBlind(false);
    setCountAssignTo("");
    setCountSession(null);
    setCountEntries({});
    setCountReview(false);
    setSkippedCountIds(new Set());
    setCountOverlayOpen(true);
    void loadCountBatches();
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const query = scanInput.trim().toLowerCase();
    if (!query) return;
    const match = allCountItems.find(d => d.name.toLowerCase().includes(query) || d.batchNo.toLowerCase() === query);
    if (match) {
      const el = document.getElementById(`count-input-${match.id}`);
      if (el) { el.focus(); (el as HTMLInputElement).select(); }
    }
    setScanInput("");
  }

  async function doApprove() {
    if (!approveTarget || approveBusy) return;
    setApproveBusy(true); setApproveError("");
    try {
      const r = await reviewAdjustment(approveTarget, approveAction, approverNote);
      setApproveTarget(null);
      setApproverNote("");
      setToast({ ok: true, msg: approveAction === "approve" ? `${r.number} approved. Stock has been updated.` : `${r.number} rejected. Stock is unchanged.` });
      setReload(n => n + 1);
    } catch (e) { setApproveError(errText(e, "Could not save the decision")); } finally { setApproveBusy(false); }
  }

  const PILL_APPROVAL: Record<ApprovalStatus, { bg: string; color: string }> = {
    "Pending": { bg: "#FFF3E0", color: "#E65100" },
    "Approved": { bg: "#E8F5E9", color: "#2E7D32" },
    "Rejected": { bg: "#FFEBEE", color: "#C62828" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>


      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load stock data: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* ── KPI Tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Pending Approvals", val: pendingApprovals, color: pendingApprovals > 0 ? "#E65100" : "#1A2436" },
          { label: "High Risk Items",   val: verificationQueue.length, color: "#C62828" },
          { label: "Active Session",    val: countOverlayOpen && countSession ? 1 : 0, color: "#1B6CA8" },
          { label: "Adjustments Today", val: adjCounts.today, color: "#2E7D32" },
        ].map(t => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontFamily: "Inter" }}>{t.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 26, fontWeight: 800, color: t.color }}>{t.val}</div>
          </div>
        ))}
      </div>

      {/* ── 2-Tab Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Tab bar — 2 tabs */}
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "workqueue" as const, label: "Work Queue",     badge: verificationQueue.length, bc: "#C62828", bb: "#FFEBEE" },
            { key: "log" as const,       label: "Adjustment Log", badge: pendingApprovals,         bc: "#E65100", bb: "#FFF3E0" },
          ]).map(t => (
            <button key={t.key} onClick={() => setAdjView(t.key)} style={{
              padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 13, fontFamily: "Inter", fontWeight: adjView === t.key ? 600 : 400,
              color: adjView === t.key ? "#1B6CA8" : "#6B7280",
              borderBottom: `2px solid ${adjView === t.key ? "#1B6CA8" : "transparent"}`,
              marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
            }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: adjView === t.key ? t.bb : "#F0F3F7", color: adjView === t.key ? t.bc : "#9CA3AF" }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Work Queue tab ── */}
        {adjView === "workqueue" && (
          <>
            {/* Section A: Verification Queue */}
            <div style={{ padding: "12px 16px 0", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ ...SK.searchWrapper, flex: "0 0 300px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" placeholder="Search products..." value={verSearch} onChange={e => setVerSearch(e.target.value)}
                    style={{ ...SK.searchInput }} />
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  {selectedVerIds.size > 0 && (
                    <button onClick={() => openCountOverlay([...selectedVerIds])}
                      style={{ padding: "6px 14px", border: "none", borderRadius: 5, background: "#1B6CA8", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                      Start Count Session for {selectedVerIds.size} item{selectedVerIds.size !== 1 ? "s" : ""}
                    </button>
                  )}
                  <button onClick={() => openCountOverlay()}
                    style={{ padding: "9px 16px", minHeight: 40, border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600, boxSizing: "border-box" }}>
                    + New Count Session
                  </button>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                {verFiltered.length === 0 ? (
                  <div style={{ padding: "36px 24px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>{loadState === "loading" ? "Loading…" : "No items currently require physical verification."}</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>
                        <input type="checkbox"
                          checked={verPageRows.length > 0 && verPageRows.every(d => selectedVerIds.has(d.id))}
                          onChange={e => setSelectedVerIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) verPageRows.forEach(d => next.add(d.id));
                            else verPageRows.forEach(d => next.delete(d.id));
                            return next;
                          })}
                          style={{ cursor: "pointer" }} />
                      </th>
                      {(["Priority", "Product", "Current Stock", "Min Stock", "Last Count", "Risk Factors", "Actions"] as string[]).map((h, i) => (
                        <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: i >= 2 && i <= 3 ? "right" as const : "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {verPageRows.map((d, i) => {
                        const priorityColor = i === 0 ? "#C62828" : i < 3 ? "#E65100" : "#F57F17";
                        return (
                          <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "10px 13px" }}>
                              <input type="checkbox"
                                checked={selectedVerIds.has(d.id)}
                                onChange={e => setSelectedVerIds(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(d.id); else next.delete(d.id);
                                  return next;
                                })}
                                style={{ cursor: "pointer" }} />
                            </td>
                            <td style={{ padding: "10px 13px" }}>
                              <div style={{ width: 28, height: 28, background: priorityColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                            </td>
                            <td style={{ padding: "10px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</td>
                            <td style={{ padding: "10px 13px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: d.stock < d.minStock ? "#C62828" : "#1A2436", textAlign: "right" as const }}>{d.stock}</td>
                            <td style={{ padding: "10px 13px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF", textAlign: "right" as const }}>{d.minStock}</td>
                            <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.lastCountDate}</td>
                            <td style={{ padding: "10px 13px" }}>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                                {d.reasons.map(r => <span key={r} style={{ fontSize: 10, padding: "2px 7px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>{r}</span>)}
                              </div>
                            </td>
                            <td style={{ padding: "10px 13px" }}>
                              <button onClick={() => { setBlindDrugId(d.id); setBlindDrugLocked(true); setBlindSubmitted(false); setBlindQty(""); setShowBlind(true); }}
                                style={{ padding: "4px 10px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                                Quick Count
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <PaginationFooter {...verFooterProps} />
            </div>

            {/* Section B: Count Sessions */}
            <div style={{ padding: "12px 16px" }}>
              {countOverlayOpen && countSession && (
                <div style={{ marginBottom: 10, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BBDEFB", borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{countSession.id}</span>
                  <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{countSession.scope} · {countSession.assignedTo}</span>
                  <span style={{ fontSize: 11, color: "#1B6CA8", fontFamily: "Inter" }}>{progressPct}% complete</span>
                  <button onClick={() => setCountOverlayOpen(true)}
                    style={{ marginLeft: "auto", padding: "4px 14px", border: "1px solid #1B6CA8", borderRadius: 4, background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                    Resume
                  </button>
                </div>
              )}
              {completedSessions.length === 0 ? (
                <div style={{ padding: "28px 24px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>
                  No completed sessions yet. Start a new count session to track physical inventory counts.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      {(["Session ID", "Started", "Completed", "Scope", "Assigned To", "Items", "Variances", "Adjustments"] as string[]).map(h => (
                        <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {completedSessions.map(s => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 700 }}>{s.id}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.startedAt}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.completedAt}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, color: "#1A2436", fontFamily: "Inter" }}>{s.scope}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{s.assignedTo}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{s.itemsCounted}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: s.variancesFound > 0 ? "#C62828" : "#2E7D32", textAlign: "right" as const }}>{s.variancesFound}</td>
                          <td style={{ padding: "10px 13px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: s.adjustmentsCreated > 0 ? "#1B6CA8" : "#9CA3AF", textAlign: "right" as const }}>{s.adjustmentsCreated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Adjustment Log tab ── */}
        {adjView === "log" && (
          <>
            {pendingApprovals > 0 && (
              <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFE0B2", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 12, color: "#E65100", fontFamily: "Inter", fontWeight: 600 }}>{pendingApprovals} adjustment{pendingApprovals !== 1 ? "s" : ""} pending manager approval</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "7px 12px", flex: "0 0 220px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search adjustments..." value={adjSearch} onChange={e => setAdjSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["all", "Pending", "Approved", "Rejected"] as const).map(f => (
                  <button key={f} onClick={() => setLogFilter(f)}
                    style={{ padding: "5px 12px", border: `1px solid ${logFilter === f ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 20, background: logFilter === f ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: logFilter === f ? 700 : 400, color: logFilter === f ? "#1B6CA8" : "#6B7280" }}>
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => openNewAdj()}
                  style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  + New Adjustment
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Adj #</Th>
                  <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                  <Th onSort={() => handleSort("drug")} sortDir={sortCol === "drug" ? sortDir : null}>Product</Th>
                  <Th onSort={() => handleSort("type")} sortDir={sortCol === "type" ? sortDir : null}>Type</Th>
                  <Th right onSort={() => handleSort("qtyBefore")} sortDir={sortCol === "qtyBefore" ? sortDir : null}>Before</Th>
                  <Th right onSort={() => handleSort("qty")} sortDir={sortCol === "qty" ? sortDir : null}>Change</Th>
                  <Th right onSort={() => handleSort("qtyAfter")} sortDir={sortCol === "qtyAfter" ? sortDir : null}>After</Th>
                  <Th onSort={() => handleSort("reason")} sortDir={sortCol === "reason" ? sortDir : null}>Reason</Th>
                  <Th onSort={() => handleSort("by")} sortDir={sortCol === "by" ? sortDir : null}>By</Th>
                  <Th onSort={() => handleSort("approval")} sortDir={sortCol === "approval" ? sortDir : null}>Approval</Th>
                  <Th>Actions</Th>
                </tr></thead>
                <tbody>
                  {adjPageRows.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: 32, textAlign: "center" as const, fontSize: 13, color: "#9CA3AF" }}>
                      {loadState === "loading" ? "Loading…" : adjs.length === 0 ? "No stock adjustments yet." : "No adjustments match the filter."}
                    </td></tr>
                  )}
                  {adjPageRows.map(a => {
                    const typeStyle = a.type === "Write-off"
                      ? { bg: "#FFEBEE", color: "#C62828" }
                      : a.type === "Damage"
                      ? { bg: "#FFF3E0", color: "#E65100" }
                      : { bg: "#E3F2FD", color: "#1B6CA8" };
                    const ap = PILL_APPROVAL[a.approval];
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{a.id}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.date}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>
                          {a.drug}
                          {a.ref && <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#9CA3AF", fontWeight: 400, marginTop: 1 }}>Batch {a.ref}</div>}
                        </td>
                        <td style={{ padding: "11px 14px" }}><Pill label={a.type} bg={typeStyle.bg} color={typeStyle.color} /></td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>{a.qtyBefore}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: a.qty > 0 ? "#2E7D32" : "#C62828", textAlign: "right" as const }}>
                          {a.qty > 0 ? `+${a.qty}` : a.qty}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" as const }}>{a.qtyAfter}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{a.reason}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{a.by}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Pill label={a.approval} bg={ap.bg} color={ap.color} />
                            {a.approvedBy && <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>{a.approvedBy}</span>}
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {a.approval === "Pending" ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => { setApproveTarget(a.dbId); setApproveAction("approve"); setApproveError(""); }}
                                style={{ padding: "4px 10px", border: "none", background: "#E8F5E9", color: "#2E7D32", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                                Approve
                              </button>
                              <button onClick={() => { setApproveTarget(a.dbId); setApproveAction("reject"); setApproveError(""); }}
                                style={{ padding: "4px 10px", border: "none", background: "#FFEBEE", color: "#C62828", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{a.approvedAt || "—"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...adjFooterProps} />
          </>
        )}
      </div>

      {/* ── Count Session Full-Screen Overlay ── */}
      {countOverlayOpen && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w,228px)", right: 0, bottom: 0, zIndex: 50, background: "#F0F3F7", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header bar */}
          <div style={{ background: "#fff", borderBottom: "1px solid #DDE3EC", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <button onClick={() => setCountOverlayOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 13, fontFamily: "Inter", padding: "4px 8px", borderRadius: 4 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back
            </button>
            <div style={{ width: 1, height: 16, background: "#DDE3EC" }} />
            <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>
              Adjustments <span style={{ color: "#DDE3EC", margin: "0 4px" }}>›</span>
              <span style={{ color: "#0C1B33", fontWeight: 600 }}>Count Session {countSession?.id ?? ""}</span>
            </div>
            {countSession && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => { setCountSession(null); setCountEntries({}); setCountOverlayOpen(false); }}
                  style={{ padding: "6px 14px", border: "1px solid #DDE3EC", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>
                  Abandon
                </button>
                <button onClick={() => setCountReview(true)}
                  style={{ padding: "6px 16px", border: "none", borderRadius: 5, background: progressPct === 100 ? "#2E7D32" : "#1B6CA8", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                  {progressPct === 100 ? "Review & Submit" : `Submit (${countedCount}/${allCountItems.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>

              {/* Toast */}
              {countToast && (
                <div style={{ position: "fixed", top: 70, right: 24, zIndex: 999, background: countToast.type === "success" ? "#1B6CA8" : "#C62828", color: "#fff", borderRadius: 6, padding: "12px 20px", fontSize: 13, fontFamily: "Inter", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, minWidth: 280 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {countToast.msg}
                </div>
              )}

              {/* Stepper */}
              <MultiStepper
                steps={[
                  { label: "Configure",       subtitle: "Scope, method & staff" },
                  { label: "Count Sheet",     subtitle: "Enter physical counts"  },
                  { label: "Review & Submit", subtitle: "Verify variances"       },
                ]}
                current={!countSession ? 1 : !countReview ? 2 : 3}
                doneStyle="filled"
              />

              {/* Step 1: Configure */}
              {!countSession && (
                <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", padding: 24, marginTop: 16 }}>
                  <div style={{ maxWidth: 540 }}>
                    <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>New Count Session</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", marginBottom: 20 }}>Choose scope, method and staff before starting</div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "Inter" }}>Count Scope</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {([
                          { key: "full" as const,     label: "Full Stock",     icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                          { key: "location" as const, label: "By Location",    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
                          { key: "supplier" as const, label: "By Company",     icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" },
                          { key: "selected" as const, label: "Selected Items", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
                        ]).map(s => (
                          <button key={s.key}
                            onClick={() => { setCountScope(s.key); setCountScopeFilter(""); }}
                            disabled={s.key === "selected" && countPreselectedIds.length === 0}
                            style={{ flex: 1, padding: "12px 10px", border: `2px solid ${countScope === s.key ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: countScope === s.key ? "#EFF6FF" : "#fff", cursor: s.key === "selected" && countPreselectedIds.length === 0 ? "not-allowed" : "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, opacity: s.key === "selected" && countPreselectedIds.length === 0 ? 0.5 : 1 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={countScope === s.key ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
                            <span style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: countScope === s.key ? "#1B6CA8" : "#6B7280" }}>{s.label}</span>
                            {s.key === "selected" && countPreselectedIds.length > 0 && (
                              <span style={{ fontSize: 10, color: "#1B6CA8", fontFamily: "JetBrains Mono", fontWeight: 700 }}>{countPreselectedIds.length} items</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {countScope === "location" && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "Inter" }}>Select Location</div>
                        <select value={countScopeFilter} onChange={e => setCountScopeFilter(e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${!countScopeFilter ? "#E65100" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", outline: "none", background: "#fff", color: "#1A2436" }}>
                          <option value="">— Select a location —</option>
                          {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    )}
                    {countScope === "supplier" && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "Inter" }}>Select Company / Category</div>
                        <select value={countScopeFilter} onChange={e => setCountScopeFilter(e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${!countScopeFilter ? "#E65100" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", outline: "none", background: "#fff", color: "#1A2436" }}>
                          <option value="">— Select a company —</option>
                          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "Inter" }}>Assign To</div>
                        <input value={countAssignTo} onChange={e => setCountAssignTo(e.target.value)} placeholder="Name (optional)"
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", background: "#fff", color: "#1A2436", boxSizing: "border-box" as const }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "Inter" }}>Count Method</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {([{ v: false, label: "Show Qty" }, { v: true, label: "Blind Count" }] as { v: boolean; label: string }[]).map(m => (
                            <button key={String(m.v)} onClick={() => setCountBlind(m.v)}
                              style={{ flex: 1, padding: "9px 8px", border: `1.5px solid ${countBlind === m.v ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: countBlind === m.v ? "#EFF6FF" : "#fff", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: countBlind === m.v ? "#1B6CA8" : "#6B7280" }}>
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={startCountSession}
                      disabled={(countScope === "location" || countScope === "supplier") && !countScopeFilter || countScope === "selected" && countPreselectedIds.length === 0}
                      style={{ padding: "10px 24px", border: "none", borderRadius: 6, background: ((countScope === "location" || countScope === "supplier") && !countScopeFilter) || (countScope === "selected" && countPreselectedIds.length === 0) ? "#C7D3E3" : "#1B6CA8", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: ((countScope === "location" || countScope === "supplier") && !countScopeFilter) || (countScope === "selected" && countPreselectedIds.length === 0) ? "not-allowed" : "pointer" }}>
                      Start Count Session
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Active Count Sheet */}
              {countSession && !countReview && (
                <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", marginTop: 16, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 1, minWidth: 140 }}>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{countSession.id}</span>
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>{countSession.scope}{countScopeFilter ? ` · ${countScopeFilter}` : ""}</span>
                    </div>
                    <div style={{ flex: "0 0 200px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>Progress</span>
                        <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{countedCount} / {allCountItems.length}</span>
                      </div>
                      <div style={{ height: 5, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: progressPct === 100 ? "#2E7D32" : "#1B6CA8", borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", border: "1px solid #DDE3EC", borderRadius: 5, overflow: "hidden" }}>
                      {(["manual", "scan"] as const).map(m => (
                        <button key={m} onClick={() => { setCountMode(m); if (m === "scan") setTimeout(() => scanInputRef.current?.focus(), 50); }}
                          style={{ padding: "5px 14px", border: "none", background: countMode === m ? "#1B6CA8" : "#fff", color: countMode === m ? "#fff" : "#6B7280", fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" as const }}>
                          {m === "scan" ? "Scan Mode" : "Manual"}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{countSession.assignedTo}</span>
                    </div>
                  </div>
                  {countMode === "scan" && (
                    <div style={{ padding: "10px 16px", background: "#EFF6FF", borderBottom: "1px solid #BBDEFB", display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8v8M12 8v8M17 8v8M5 8v8M9 8v8M15 8v8M19 8v8"/></svg>
                      <input ref={scanInputRef} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={handleScan}
                        placeholder="Scan barcode or type product name and press Enter..."
                        style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, fontFamily: "Inter", color: "#1A2436" }} />
                      <span style={{ fontSize: 11, color: "#1B6CA8", fontFamily: "Inter" }}>Press Enter to locate</span>
                    </div>
                  )}
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "7px 12px", flex: "0 0 240px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input type="text" placeholder="Filter products..." value={countSearch} onChange={e => setCountSearch(e.target.value)}
                        style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                      {countVarianceItems.length > 0 && (
                        <span style={{ fontSize: 11, padding: "3px 10px", background: "#FFEBEE", color: "#C62828", fontWeight: 700, fontFamily: "Inter" }}>
                          {countVarianceItems.length} variance{countVarianceItems.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {!countBlind && <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", alignSelf: "center" }}>System qty visible</span>}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>Product</th>
                        <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>Batch</th>
                        <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>Location</th>
                        {!countBlind && <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "right" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>System Qty</th>}
                        <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "right" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>Counted</th>
                        <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "right" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>Variance</th>
                      </tr></thead>
                      <tbody>
                        {countItems.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: 28, textAlign: "center" as const, fontSize: 13, color: countLoad === "error" ? "#B91C1C" : "#9CA3AF" }}>
                            {countLoad === "loading" ? "Loading batches…" : countLoad === "error" ? "Could not load batches." : "No batches with stock in this scope."}
                          </td></tr>
                        )}
                        {countItems.map((d, idx) => {
                          const enteredStr = countEntries[d.id] ?? "";
                          const entered = enteredStr !== "" ? parseInt(enteredStr, 10) : null;
                          const variance = entered !== null ? entered - d.stock : null;
                          const rowBg = entered === null ? "transparent" : variance === 0 ? "#F1FFF3" : "#FFF8F8";
                          return (
                            <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA", background: rowBg }}
                              onMouseEnter={e => { if (rowBg === "transparent") e.currentTarget.style.background = "#F7F9FC"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>
                              <td style={{ padding: "9px 14px" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
                                <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 1 }}>{d.category}</div>
                              </td>
                              <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.batchNo || "—"}</td>
                              <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location || "—"}</td>
                              {!countBlind && <td style={{ padding: "9px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{d.stock}</td>}
                              <td style={{ padding: "9px 14px", textAlign: "right" as const }}>
                                <input id={`count-input-${d.id}`} type="number" min={0} value={enteredStr}
                                  onChange={e => setCountEntries(prev => ({ ...prev, [d.id]: e.target.value }))}
                                  tabIndex={idx + 1} placeholder="—"
                                  style={{ width: 80, padding: "5px 8px", border: `1.5px solid ${entered === null ? "#DDE3EC" : variance === 0 ? "#A5D6A7" : "#FFCDD2"}`, borderRadius: 4, fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, outline: "none", background: "#fff", color: "#1A2436" }} />
                              </td>
                              <td style={{ padding: "9px 14px", textAlign: "right" as const }}>
                                {variance === null
                                  ? <span style={{ fontSize: 12, color: "#C8CDD8", fontFamily: "JetBrains Mono" }}>—</span>
                                  : variance === 0
                                    ? <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#2E7D32" }}>0 ✓</span>
                                    : <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: variance < 0 ? "#C62828" : "#E65100" }}>{variance > 0 ? `+${variance}` : variance}</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {countSession && countReview && (() => {
                const toCreateCount = countVarianceItems.filter(d => !skippedCountIds.has(d.id)).length;
                const skippedCount = skippedCountIds.size;
                return (
                  <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", marginTop: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setCountReview(false)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", padding: 0, width: 28, height: 28, flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Review Variances</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", marginTop: 1 }}>
                          Session {countSession.id} · {countSession.scope}{countScopeFilter ? ` · ${countScopeFilter}` : ""} · {countSession.assignedTo}
                        </div>
                      </div>
                      <button onClick={submitCountSession}
                        disabled={countSubmitting || (countVarianceItems.length > 0 && toCreateCount === 0)}
                        style={{ padding: "8px 20px", border: "none", borderRadius: 6, background: (countVarianceItems.length > 0 && toCreateCount === 0) ? "#C7D3E3" : "#1B6CA8", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: (countVarianceItems.length > 0 && toCreateCount === 0) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        {countVarianceItems.length === 0 ? "Complete Count" : toCreateCount === 0 ? "All Skipped" : `Create ${toCreateCount} Adjustment${toCreateCount !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                    <div style={{ padding: "10px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#F8FAFC", borderRadius: 20, border: "1px solid #E8ECF4" }}>
                        <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{countedCount}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>items counted</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: countVarianceItems.length > 0 ? "#FFEBEE" : "#E8F5E9", borderRadius: 20, border: `1px solid ${countVarianceItems.length > 0 ? "#FFCDD2" : "#A5D6A7"}` }}>
                        <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: countVarianceItems.length > 0 ? "#C62828" : "#2E7D32" }}>{countVarianceItems.length}</span>
                        <span style={{ fontSize: 11, color: countVarianceItems.length > 0 ? "#C62828" : "#2E7D32", fontFamily: "Inter" }}>{countVarianceItems.length === 1 ? "variance" : "variances"}</span>
                      </div>
                      {toCreateCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#EFF6FF", borderRadius: 20, border: "1px solid #BBDEFB" }}>
                          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{toCreateCount}</span>
                          <span style={{ fontSize: 11, color: "#1B6CA8", fontFamily: "Inter" }}>will create adjustment{toCreateCount !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {skippedCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#F0F3F7", borderRadius: 20, border: "1px solid #DDE3EC" }}>
                          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#6B7280" }}>{skippedCount}</span>
                          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>skipped</span>
                        </div>
                      )}
                    </div>
                    {countVarianceItems.length === 0 ? (
                      <div style={{ padding: "36px 24px", textAlign: "center" as const }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32", fontFamily: "Outfit", marginBottom: 4 }}>All counts match system quantities</div>
                        <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>No adjustments will be created. Click Complete Count to finish.</div>
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr>
                            {([
                              { label: "Product",    align: "left"  },
                              { label: "Batch",      align: "left"  },
                              { label: "Location",   align: "left"  },
                              { label: "System Qty", align: "right" },
                              { label: "Counted",    align: "right" },
                              { label: "Variance",   align: "right" },
                              { label: "",           align: "left"  },
                            ] as { label: string; align: "left"|"right" }[]).map((h, i) => (
                              <th key={i} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: h.align, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h.label}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {countVarianceItems.map(d => {
                              const entered = parseInt(countEntries[d.id] ?? "0", 10);
                              const variance = entered - d.stock;
                              const skipped = skippedCountIds.has(d.id);
                              return (
                                <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA", background: skipped ? "#FAFBFD" : "#FFFDE7", opacity: skipped ? 0.55 : 1, transition: "opacity 0.15s" }}>
                                  <td style={{ padding: "11px 14px" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", textDecoration: skipped ? "line-through" : "none" }}>{d.name}</div>
                                    <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 1 }}>{d.category}</div>
                                  </td>
                                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.batchNo || "—"}</td>
                                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location || "—"}</td>
                                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{d.stock}</td>
                                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{entered}</td>
                                  <td style={{ padding: "11px 14px", textAlign: "right" as const }}>
                                    <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: variance < 0 ? "#C62828" : "#E65100", background: variance < 0 ? "#FFEBEE" : "#FFF3E0", padding: "2px 8px", borderRadius: 4 }}>
                                      {variance > 0 ? `+${variance}` : variance}
                                    </span>
                                  </td>
                                  <td style={{ padding: "11px 14px" }}>
                                    <button
                                      onClick={() => setSkippedCountIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                                        return next;
                                      })}
                                      style={{ padding: "4px 12px", border: `1px solid ${skipped ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 4, background: skipped ? "#EFF6FF" : "#fff", fontSize: 11, cursor: "pointer", fontFamily: "Inter", fontWeight: 600, color: skipped ? "#1B6CA8" : "#6B7280", whiteSpace: "nowrap" as const }}>
                                      {skipped ? "Include" : "Skip"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {toCreateCount > 0 && (
                      <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BBDEFB", borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div style={{ fontSize: 12, color: "#1B6CA8", fontFamily: "Inter", lineHeight: 1.5 }}>
                          {toCreateCount} adjustment record{toCreateCount !== 1 ? "s" : ""} will be created with status <strong>Pending Approval</strong> and will appear in the Adjustment Log tab for manager review.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* ── New Adjustment ── */}
      {newAdjPage && (() => {
        const typeColors: Record<string, { bg: string; color: string }> = {
          "Write-off":   { bg: "#FFEBEE", color: "#C62828" },
          "Stock Count": { bg: "#E3F2FD", color: "#1B6CA8" },
        };
        const LabelRow = ({ text, required }: { text: string; required?: boolean }) => (
          <label style={{ display: "block", fontFamily: "Inter", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
            {text}{required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
          </label>
        );
        const inputBase = (hasErr: boolean, hasVal: boolean): CSSProperties => ({
          width: "100%", padding: "9px 12px", boxSizing: "border-box" as const,
          borderRadius: 6, fontSize: 13, fontFamily: "Inter", outline: "none", color: "#0C1B33",
          borderTop: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
          borderRight: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
          borderBottom: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
          borderLeft: hasVal ? `3px solid ${hasErr ? "#C62828" : "#DDE3EC"}` : `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
          background: "#fff",
        });
        const ErrMsg = ({ msg }: { msg?: string }) => msg ? <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{msg}</div> : null;
        const filteredDrugsSearch = adjDrugSearch
          ? ovRows.filter(d => d.name.toLowerCase().includes(adjDrugSearch.toLowerCase()) || d.category.toLowerCase().includes(adjDrugSearch.toLowerCase()))
          : ovRows;
        const reasonNames = masters.adjustment_reasons.map(r => r.name);

        return (
          <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200 }} onClick={() => setNewAdjPage(false)} />
          <div role="dialog" aria-label="New stock adjustment" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", width: 620, maxWidth: "calc(100vw - 32px)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>New Stock Adjustment</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", marginTop: 1 }}>Correct a count or write stock off. Another admin or manager approves it before stock changes.</div>
              </div>
              <button onClick={() => setNewAdjPage(false)} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Product */}
              <div style={{ gridColumn: "1 / -1" }}>
                <LabelRow text="Product / Item" required />
                <div style={{ position: "relative" }}>
                  {adjDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 309 }} onMouseDown={() => setAdjDrugOpen(false)} />}
                  <input
                    ref={drugSearchRef} aria-label="Product"
                    value={adjDrugSearch || (selectedDrug ? selectedDrug.name : "")}
                    onChange={e => { setAdjDrugSearch(e.target.value); setAdjDrugOpen(true); if (!e.target.value) { setAdjField("drugId", ""); setAdjField("batchId", ""); } }}
                    onFocus={() => { setAdjDrugOpen(true); setAdjDrugSearch(""); }}
                    placeholder="Search product name or category..."
                    style={{ ...inputBase(!!adjFormErrors.drugId, !!adjForm.drugId), cursor: "pointer" }}
                  />
                  {adjDrugOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 310, maxHeight: 240, overflowY: "auto" }}>
                      {filteredDrugsSearch.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>{loadState === "loading" ? "Loading…" : "No products found"}</div>
                      ) : filteredDrugsSearch.map(d => (
                        <div key={d.id}
                          onMouseDown={() => { setAdjField("drugId", d.id); setAdjField("batchId", ""); setAdjDrugSearch(""); setAdjDrugOpen(false); }}
                          style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{d.category} · {d.manufacturer}</div>
                          </div>
                          <div style={{ textAlign: "right" as const }}>
                            <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: d.stock < d.minStock ? "#C62828" : "#1A2436" }}>{d.stock}</div>
                            <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>in stock</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <ErrMsg msg={adjFormErrors.drugId} />
              </div>

              {/* Batch */}
              <div style={{ gridColumn: "1 / -1" }}>
                <LabelRow text="Batch" required />
                <select aria-label="Batch" value={adjForm.batchId} onChange={e => setAdjField("batchId", e.target.value)}
                  disabled={!selectedDrug} style={{ ...inputBase(!!adjFormErrors.batchId, !!adjForm.batchId), appearance: "none" as const }}>
                  <option value="">{!selectedDrug ? "Select a product first" : formBatchState === "loading" ? "Loading batches…" : formBatches.length === 0 ? "No batches with stock" : "— Select batch —"}</option>
                  {formBatches.map(b => <option key={b.id} value={b.id}>{b.batchNo} · Exp {b.expiry} · Qty {b.qtyCurrent}</option>)}
                </select>
                <ErrMsg msg={adjFormErrors.batchId} />
              </div>

              {selectedDrug && (
                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { label: "Batch Stock", val: selectedBatch ? String(batchStock) : "—", color: "#0C1B33" },
                    { label: "Product Stock", val: String(selectedDrug.stock), color: selectedDrug.stock < selectedDrug.minStock ? "#C62828" : "#0C1B33" },
                    { label: "Min Stock", val: String(selectedDrug.minStock), color: "#6B7280" },
                    { label: "Status", val: selectedDrug.status, color: selectedDrug.status === "In Stock" ? "#2E7D32" : "#C62828" },
                  ].map(k => (
                    <div key={k.label} style={{ padding: "10px 14px", background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4, fontFamily: "Inter" }}>{k.label}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Type */}
              <div>
                <LabelRow text="Adjustment Type" required />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {ADJ_TYPES.map(t => {
                    const sel = adjForm.adjType === t;
                    const tc = typeColors[t];
                    return (
                      <button key={t} type="button" onClick={() => { setAdjField("adjType", t); setAdjField("adjQty", ""); }}
                        style={{ padding: "7px 14px", border: `1.5px solid ${sel ? tc.color : "#DDE3EC"}`, borderRadius: 20, background: sel ? tc.bg : "#fff", fontSize: 12, fontFamily: "Inter", fontWeight: sel ? 700 : 400, color: sel ? tc.color : "#6B7280", cursor: "pointer" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                <ErrMsg msg={adjFormErrors.adjType} />
              </div>

              {/* Reason */}
              <div>
                <LabelRow text="Reason" required />
                <select aria-label="Reason" value={adjForm.reason} onChange={e => setAdjField("reason", e.target.value)}
                  style={{ ...inputBase(!!adjFormErrors.reason, !!adjForm.reason), appearance: "none" as const, color: adjForm.reason ? "#0C1B33" : "#9CA3AF" }}>
                  <option value="">{reasonNames.length === 0 ? "No reasons set up. Add some under Masters." : "— Select reason —"}</option>
                  {reasonNames.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ErrMsg msg={adjFormErrors.reason} />
              </div>

              {/* Quantity */}
              <div>
                <LabelRow text={isWriteOff ? "Quantity to write off" : "Counted quantity on the shelf"} required />
                <input aria-label="Quantity" type="number" min={isWriteOff ? 1 : 0} value={adjForm.adjQty} onChange={e => setAdjField("adjQty", e.target.value)}
                  placeholder="0" style={{ ...inputBase(!!adjFormErrors.adjQty, !!adjForm.adjQty), fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 600 }} />
                <ErrMsg msg={adjFormErrors.adjQty} />
              </div>

              {/* Preview */}
              <div>
                <LabelRow text="Batch Stock After Approval" />
                <div style={{ padding: "9px 14px", background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, height: 40, boxSizing: "border-box" as const }}>
                  {adjustedStock !== null && adjustedStock >= 0 ? (
                    <>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: "#2E7D32" }}>{adjustedStock}</span>
                      <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>({adjustedStock - batchStock > 0 ? "+" : ""}{adjustedStock - batchStock})</span>
                    </>
                  ) : adjustedStock !== null ? (
                    <span style={{ fontSize: 12, color: "#C62828", fontFamily: "Inter" }}>Cannot go below zero</span>
                  ) : (
                    <span style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>Pick a batch and enter a quantity</span>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <LabelRow text="Notes" />
                <textarea aria-label="Notes" value={adjForm.notes} onChange={e => setAdjField("notes", e.target.value)} rows={3}
                  placeholder="Any additional context or supporting observations..."
                  style={{ ...inputBase(false, !!adjForm.notes), resize: "vertical" as const }} />
              </div>

              <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 6, fontSize: 12, color: "#F57F17", fontFamily: "Inter" }}>
                <strong>Approval required:</strong> a different admin or manager must approve this before the stock level changes.
              </div>
            </div>

            <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {adjError && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 320 }}>{adjError}</span>}
              <button onClick={() => setNewAdjPage(false)}
                style={{ padding: "8px 18px", border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", fontFamily: "Inter", fontSize: 13, fontWeight: 500, color: "#1A2436", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submitAdjForm} disabled={adjBusy}
                style={{ padding: "8px 20px", border: "none", borderRadius: 6, background: adjBusy ? "#C8CDD8" : "#1B6CA8", fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#fff", cursor: adjBusy ? "wait" : "pointer" }}>
                {adjBusy ? "Submitting…" : "Submit for Approval"}
              </button>
            </div>
          </div>
          </>
        );
      })()}

      {/* ── Approval Modal ── */}
      {approveTarget && (() => {
        const adj = adjs.find(a => a.id === approveTarget);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div role="dialog" aria-label={approveAction === "approve" ? "Approve adjustment" : "Reject adjustment"} style={{ background: "#fff", width: 440, borderRadius: 6, border: "1px solid #E8ECF4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
                  {approveAction === "approve" ? "Approve Adjustment" : "Reject Adjustment"}
                </div>
                <button onClick={() => setApproveTarget(null)} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {adj && (
                  <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 4 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        ["Adjustment #", adj.number], ["Product", `${adj.productName} · ${adj.batchNumber}`],
                        ["Change", `${adj.variance > 0 ? "+" : ""}${adj.variance} (${adj.systemQty} → ${adj.countedQty})`],
                        ["Reason", adj.reason], ["Requested by", adj.requestedBy],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k}</div>
                          <div style={{ fontSize: 12, color: "#1A2436", fontFamily: k === "Adjustment #" || k === "Change" ? "JetBrains Mono" : "Inter", fontWeight: k === "Change" ? 700 : 400 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Notes</label>
                  <textarea aria-label="Review notes" value={approverNote} onChange={e => setApproverNote(e.target.value)}
                    placeholder="Optional comments..." rows={3}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, resize: "vertical" as const }} />
                </div>
                {approveError && <div role="alert" style={{ color: "#B91C1C", fontSize: 12 }}>{approveError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={() => setApproveTarget(null)} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                  <button onClick={doApprove} disabled={approveBusy}
                    style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: approveBusy ? "#C8CDD8" : approveAction === "approve" ? "#2E7D32" : "#C62828", fontSize: 13, cursor: approveBusy ? "wait" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                    {approveBusy ? "Saving…" : approveAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Blind Physical Count Modal (Gap #7) ── */}
      {showBlind && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 480, borderRadius: 6, border: "1px solid #E8ECF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>
                  {blindDrugLocked ? `Quick Count — ${blindDrugObj?.name ?? ""}` : "Blind Physical Count"}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>System quantity is hidden — count independently</div>
              </div>
              <button onClick={() => { setShowBlind(false); setBlindSubmitted(false); setBlindQty(""); setBlindDrugLocked(false); setBlindDrugSearch(""); setBlindDrugOpen(false); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                  {blindDrugLocked ? "Product" : "Select Product to Count"}
                </label>
                {blindDrugLocked ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{blindDrugObj?.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>
                        {blindDrugObj?.category}
                        {blindDrugObj?.location ? <span style={{ marginLeft: 8, color: "#1B6CA8" }}>{blindDrugObj.location}</span> : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    {blindDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setBlindDrugOpen(false)} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}
                      onClick={() => { if (!blindSubmitted) { setBlindDrugOpen(true); setTimeout(() => blindDrugSearchRef.current?.focus(), 50); } }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input
                        ref={blindDrugSearchRef}
                        value={blindDrugSearch || (blindDrugObj ? blindDrugObj.name : "")}
                        onChange={e => { setBlindDrugSearch(e.target.value); setBlindDrugOpen(true); if (!e.target.value) setBlindDrugId(""); }}
                        onFocus={() => { setBlindDrugOpen(true); setBlindDrugSearch(""); }}
                        placeholder="Search product name or category..."
                        disabled={blindSubmitted}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: blindSubmitted ? "#F8FAFC" : "#fff", boxSizing: "border-box" as const, cursor: blindSubmitted ? "default" : "pointer" }}
                      />
                      {blindDrugObj && blindDrugId !== "" && !blindDrugSearch && (
                        <span style={{ position: "absolute", right: 12, fontSize: 11, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 8px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>
                          {blindDrugObj.category}
                        </span>
                      )}
                    </div>
                    {blindDrugOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 220, overflowY: "auto" }}>
                        {(() => {
                          const filtered = blindDrugSearch
                            ? ovRows.filter(d => d.name.toLowerCase().includes(blindDrugSearch.toLowerCase()) || d.category.toLowerCase().includes(blindDrugSearch.toLowerCase()))
                            : ovRows;
                          return filtered.length === 0 ? (
                            <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No products found</div>
                          ) : filtered.map(d => {
                            const sel = blindDrugId === d.id;
                            return (
                              <div key={d.id}
                                onMouseDown={() => { setBlindDrugId(d.id); setBlindDrugSearch(""); setBlindDrugOpen(false); setBlindSubmitted(false); setBlindQty(""); setTimeout(() => blindQtyRef.current?.focus(), 50); }}
                                style={{ padding: "10px 14px", paddingLeft: sel ? 11 : 14, borderLeft: `3px solid ${sel ? "#1B6CA8" : "transparent"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}
                                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: sel ? 700 : 400, color: sel ? "#1B6CA8" : "#0C1B33", fontFamily: "Inter" }}>{d.name}</div>
                                  <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{d.category}</div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: d.stock < d.minStock ? "#C62828" : "#1A2436" }}>{d.stock}</div>
                                  <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>in stock</div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!blindSubmitted ? (
                <>
                  <div style={{ padding: "12px 16px", background: "#FFFDE7", border: "1px solid #FDD835", borderRadius: 4, fontSize: 12, color: "#F57F17" }}>
                    Do NOT check the system before counting. Count the physical units and enter the result below.
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                      Physical Count — {blindDrugObj?.unit ?? "Units"}
                    </label>
                    <input ref={blindQtyRef} type="number" min={0} value={blindQty} onChange={e => setBlindQty(e.target.value)}
                      placeholder="Enter your physical count..."
                      style={{ width: "100%", padding: "14px 16px", borderRadius: 6, border: "2px solid #1B6CA8", fontSize: 22, outline: "none", fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "center" as const, boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => { setShowBlind(false); setBlindQty(""); setBlindDrugLocked(false); setBlindDrugSearch(""); setBlindDrugOpen(false); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                    <button onClick={() => { if (blindQty !== "") setBlindSubmitted(true); }}
                      disabled={blindQty === ""}
                      style={{ padding: "9px 22px", border: "none", borderRadius: 4, background: blindQty === "" ? "#C7D3E3" : "#1B6CA8", fontSize: 13, cursor: blindQty === "" ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                      Submit Count
                    </button>
                  </div>
                </>
              ) : (
                /* Results reveal */
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Your Count", value: blindQtyNum.toString(), color: "#1A2436" },
                      { label: "System Qty", value: (blindDrugObj?.stock ?? 0).toString(), color: "#1B6CA8" },
                      { label: "Variance", value: blindVariance !== null ? (blindVariance > 0 ? `+${blindVariance}` : blindVariance.toString()) : "—", color: blindVariance === 0 ? "#2E7D32" : blindVariance !== null && blindVariance < 0 ? "#C62828" : "#E65100" },
                    ].map(k => (
                      <div key={k.label} style={{ padding: "14px", background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 4, textAlign: "center" as const }}>
                        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  {blindVariance !== null && blindVariance !== 0 ? (
                    <div style={{ padding: "12px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 4, fontSize: 13, color: "#C62828" }}>
                      Variance detected: {Math.abs(blindVariance)} {blindDrugObj?.unit ?? "units"} {blindVariance < 0 ? "short" : "over"}. Create an adjustment for the batch that is out, to correct the system.
                    </div>
                  ) : blindVariance === 0 ? (
                    <div style={{ padding: "12px 14px", background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 4, fontSize: 13, color: "#2E7D32" }}>
                      Count matches system quantity. No adjustment needed.
                    </div>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => { setBlindSubmitted(false); setBlindQty(""); setTimeout(() => blindQtyRef.current?.focus(), 50); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Count Again</button>
                    {blindVariance !== null && blindVariance !== 0 && (
                      <button onClick={() => {
                          setShowBlind(false); setBlindSubmitted(false); setBlindQty(""); setBlindDrugLocked(false); setBlindDrugSearch(""); setBlindDrugOpen(false);
                          openNewAdj({
                            drugId: blindDrugObj?.id ?? "",
                            adjType: "Stock Count",
                            notes: `Blind count of the whole product: physical ${blindQtyNum}, system ${blindDrugObj?.stock ?? 0}, variance ${blindVariance && blindVariance > 0 ? "+" : ""}${blindVariance}. Pick the batch to correct.`,
                          });
                        }}
                        style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                        Create Adjustment
                      </button>
                    )}
                    <button onClick={() => { setShowBlind(false); setBlindSubmitted(false); setBlindQty(""); setBlindDrugLocked(false); setBlindDrugSearch(""); setBlindDrugOpen(false); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Close</button>
                  </div>
                </div>
              )}
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
