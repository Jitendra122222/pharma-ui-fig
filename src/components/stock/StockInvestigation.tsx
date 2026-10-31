import { useState, useEffect } from "react";
import { DatePicker } from "../shared/DatePicker";
import { SK } from "../../styles/stock";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import {
  fetchInvestigations, fetchInvestigation, fetchInvestigationContext, openInvestigation, saveInvestigation, addInvestigationEvidence,
  submitInvestigation, decideInvestigation, postInvestigation, fetchInvestigationEvents, fetchStockOverview, EVENT_LABEL,
  INVESTIGATION_STEPS as STEPS, ROOT_CAUSES, EVIDENCE_TYPES,
} from "../../lib/stockApi";
import type { InvCase, InvDetail, InvSummary, InvContext, InvEvent, InvPriority, StockOverviewRow } from "../../lib/stockApi";

const STATUS_FILTERS = ["All", "In Progress", "Pending Approval", "Approved", "Rejected", "Adjusted"];
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "In Progress": { bg: "#FFF3E0", color: "#E65100" }, "Pending Approval": { bg: "#FFF8E1", color: "#F57F17" },
  Approved: { bg: "#E8F5E9", color: "#2E7D32" }, Rejected: { bg: "#FFEBEE", color: "#C62828" }, Adjusted: { bg: "#F3E5F5", color: "#6A1B9A" },
};
const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  High: { bg: "#FFEBEE", color: "#C62828" }, Medium: { bg: "#FFF3E0", color: "#E65100" }, Low: { bg: "#E8F5E9", color: "#2E7D32" },
};
const EVENT_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  opened: { bg: "#EFF6FF", color: "#1B6CA8", icon: "+" }, progressed: { bg: "#E8F5E9", color: "#2E7D32", icon: "→" },
  decision: { bg: "#FFF3E0", color: "#E65100", icon: "!" }, evidence: { bg: "#F3E5F5", color: "#7B1FA2", icon: "#" },
  adjusted: { bg: "#E8F5E9", color: "#1B6CA8", icon: "✓" },
};
const FL: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 5, display: "block" };
const inputSty: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" };
const th: React.CSSProperties = { padding: "7px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" };
const info: React.CSSProperties = { padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" };

const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};
const when = (iso: string) => {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const today = () => new Date().toISOString().slice(0, 10);
const TX_COLOR = (e: string) => (e === "SALE" ? { bg: "#FFEBEE", color: "#C62828" } : e === "PURCHASE" ? { bg: "#E8F5E9", color: "#2E7D32" }
  : e.startsWith("TRANSFER") ? { bg: "#EFF6FF", color: "#1B6CA8" } : { bg: "#FFF3E0", color: "#E65100" });

function VarBadge({ v }: { v: number | null }) {
  if (v === null) return <span style={{ color: "#9CA3AF", fontSize: 13 }}>—</span>;
  const s = v < 0 ? { bg: "#FFEBEE", c: "#C62828" } : v > 0 ? { bg: "#E8F5E9", c: "#2E7D32" } : { bg: "#F5F5F5", c: "#6B7280" };
  return <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, background: s.bg, color: s.c, padding: "2px 7px", borderRadius: 2 }}>{signed(v)}</span>;
}

export default function StockInvestigation() {
  // ── list ──
  const [cases, setCases] = useState<InvCase[]>([]);
  const [summary, setSummary] = useState<InvSummary>({ total: 0, resolved: 0, rejected: 0, pending: 0, inProgress: 0, qtyAdjusted: 0, resolutionRate: 0, rootCauses: [] });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [products, setProducts] = useState<StockOverviewRow[]>([]);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchInvestigations(), fetchStockOverview({ pageSize: 500 })])
      .then(([i, o]) => { if (live) { setCases(i.items); setSummary(i.summary); setProducts(o.items); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load investigations")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [invSearch, setInvSearch] = useState("");
  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(cases);
  const displayRows = (statusFilter === "All" ? sortedAll : sortedAll.filter(c => c.status === statusFilter))
    .filter(c => !invSearch || [c.number, c.product, c.assignedTo].some(x => x.toLowerCase().includes(invSearch.toLowerCase())));
  const { pageRows, footerProps } = usePagination(displayRows, 10);

  // ── the open case ──
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<InvDetail | null>(null);
  const [ctx, setCtx] = useState<InvContext | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // step 1 form (new case)
  const [prodId, setProdId] = useState("");
  const [physQty, setPhysQty] = useState("");
  const [countDate, setCountDate] = useState(today());
  const [reportedBy, setReportedBy] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<InvPriority>("Medium");
  // per-step working state
  const [txSel, setTxSel] = useState<string[]>([]);
  const [txNotes, setTxNotes] = useState("");
  const [batchQty, setBatchQty] = useState<Record<string, string>>({});
  const [batchNotes, setBatchNotes] = useState("");
  const [locQty, setLocQty] = useState<Record<string, string>>({});
  const [locNotes, setLocNotes] = useState("");
  const [suspects, setSuspects] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [evType, setEvType] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evFile, setEvFile] = useState("");

  const product = products.find(p => p.id === (active?.productId ?? prodId));
  const sysQty = active?.systemQty ?? product?.stock ?? 0;
  const parsedPhys = physQty === "" ? null : parseInt(physQty, 10);
  const liveVariance = parsedPhys !== null && !Number.isNaN(parsedPhys) ? parsedPhys - sysQty : null;
  const readOnly = !!active && active.status !== "In Progress";

  function loadWorking(d: InvDetail) {
    setTxSel(d.findings.filter(f => f.kind === "transaction").map(f => f.refId));
    setSuspects(d.findings.filter(f => f.kind === "suspect").map(f => f.refId));
    setBatchQty(Object.fromEntries(d.findings.filter(f => f.kind === "batch").map(f => [f.refId, String(f.countedQty ?? "")])));
    setLocQty(Object.fromEntries(d.findings.filter(f => f.kind === "location").map(f => [f.refId, String(f.countedQty ?? "")])));
    setTxNotes(d.notes.transaction); setBatchNotes(d.notes.batch); setLocNotes(d.notes.location); setUserNotes(d.notes.suspect);
    setReason(d.reason); setReasonNotes(d.reasonNotes); setEvidenceType(d.evidenceType);
  }
  function openNew() {
    setActive(null); setCtx(null); setStep(1); setError(""); setProdId(products[0]?.id ?? ""); setPhysQty(""); setCountDate(today()); setReportedBy("");
    setAssignedTo(""); setPriority("Medium"); setTxSel([]); setSuspects([]); setBatchQty({}); setLocQty({}); setTxNotes(""); setBatchNotes(""); setLocNotes("");
    setUserNotes(""); setReason(""); setReasonNotes(""); setEvidenceType(""); setApprovalNotes(""); setOpen(true);
  }
  async function openCase(c: InvCase) {
    setError(""); setOpen(true); setActive(null); setCtx(null); setStep(Math.min(c.currentStep, 8));
    try {
      const [d, x] = await Promise.all([fetchInvestigation(c.id), fetchInvestigationContext(c.id)]);
      setActive(d); setCtx(x); loadWorking(d); setPhysQty(String(d.physicalQty)); setCountDate(d.countDate); setReportedBy(d.reportedBy);
      setAssignedTo(d.assignedTo === "Unassigned" ? "" : d.assignedTo); setPriority(d.priority); setApprovalNotes("");
    } catch (e) { setError(errText(e, "Could not open the case")); }
  }
  function closeDrawer() { setOpen(false); setActive(null); setCtx(null); }
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  // what to save for the step being left
  function payloadFor(s: number) {
    if (s === 2) return { notes: { transaction: txNotes }, findings: { transaction: txSel.map(refId => ({ refId })) } };
    if (s === 3) return { notes: { batch: batchNotes }, findings: { batch: Object.entries(batchQty).filter(([, v]) => v !== "").map(([refId, v]) => ({ refId, countedQty: parseInt(v, 10) })) } };
    if (s === 4) return { notes: { location: locNotes }, findings: { location: Object.entries(locQty).filter(([, v]) => v !== "").map(([refId, v]) => ({ refId, countedQty: parseInt(v, 10) })) } };
    if (s === 5) return { notes: { suspect: userNotes }, findings: { suspect: suspects.map(refId => ({ refId })) } };
    if (s === 6) return { reason, reasonNotes, evidenceType };
    return {};
  }
  async function saveStep(toStep?: number): Promise<InvDetail | null> {
    if (!active) return null;
    const d = await saveInvestigation(active.id, { ...payloadFor(step), priority, assignedTo, currentStep: toStep ?? undefined });
    setActive(d);
    return d;
  }
  async function guarded(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(errText(e, "That did not work")); } finally { setBusy(false); }
  }
  const next = () => guarded(async () => {
    if (step === 1 && !active) {
      if (!prodId) throw new Error('"detail":"Choose a product"');
      if (parsedPhys === null || Number.isNaN(parsedPhys) || parsedPhys < 0) throw new Error('"detail":"Enter the counted quantity"');
      const d = await openInvestigation({ productId: prodId, physicalQty: parsedPhys, countDate, priority, assignedTo, reportedBy });
      setActive(d); setCtx(await fetchInvestigationContext(d.id)); setStep(2); setReload(n => n + 1);
      return;
    }
    if (readOnly) { setStep(s => Math.min(s + 1, 8)); return; }
    if (step === 1) { await saveStep(2); setStep(2); return; }
    if (step === 6) { await saveStep(); setStep(7); return; }   // step 7 needs submitting first
    await saveStep(step + 1);
    setStep(s => s + 1);
  });
  const sendForApproval = () => guarded(async () => {
    await saveStep();
    const d = await submitInvestigation(active!.id);
    setActive(d); setStep(7); setReload(n => n + 1);
    setToast({ ok: true, msg: `${d.number} sent for approval.` });
  });
  const decide = (action: "approve" | "reject") => guarded(async () => {
    const d = await decideInvestigation(active!.id, action, approvalNotes);
    setActive(d); setReload(n => n + 1);
    setToast({ ok: true, msg: `${d.number} ${action === "approve" ? "approved" : "rejected"}.` });
    if (action === "approve") setStep(8); else closeDrawer();
  });
  const postAdj = () => guarded(async () => {
    const d = await postInvestigation(active!.id);
    setReload(n => n + 1); closeDrawer();
    setToast({ ok: true, msg: `${d.number} posted: ${signed(d.variance)} units corrected in the stock ledger.` });
  });
  const saveDraft = () => guarded(async () => { if (active && !readOnly) await saveStep(); setReload(n => n + 1); closeDrawer(); });
  const addEvidence = () => guarded(async () => {
    if (!active) return;
    setActive(await addInvestigationEvidence(active.id, { type: evType, description: evDesc, reference: evFile }));
    setEvType(""); setEvDesc(""); setEvFile("");
  });

  // ── audit trail ──
  const [showTrail, setShowTrail] = useState(false);
  const [events, setEvents] = useState<InvEvent[]>([]);
  const [trailState, setTrailState] = useState<"loading" | "ready" | "error">("loading");
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);
  async function openTrail() {
    setShowTrail(true); setTrailState("loading"); setReplayRunning(false);
    try { const e = await fetchInvestigationEvents(); setEvents(e); setReplayIdx(Math.max(0, e.length - 1)); setTrailState("ready"); }
    catch { setTrailState("error"); }
  }
  useEffect(() => {
    if (!replayRunning) return;
    if (replayIdx >= events.length - 1) { setReplayRunning(false); return; }
    const t = setTimeout(() => setReplayIdx(i => i + 1), 800);
    return () => clearTimeout(t);
  }, [replayRunning, replayIdx, events.length]);

  const batchVar = (expected: number, id: string) => (batchQty[id] === undefined || batchQty[id] === "" ? null : parseInt(batchQty[id], 10) - expected);
  const locVar = (expected: number, id: string) => (locQty[id] === undefined || locQty[id] === "" ? null : parseInt(locQty[id], 10) - expected);
  const batchTotal = ctx ? ctx.batches.reduce((s, b) => s + (batchQty[b.id] === undefined || batchQty[b.id] === "" ? b.expectedQty : parseInt(batchQty[b.id], 10)), 0) : 0;
  const emptyMsg = (what: string) => (loadState === "loading" ? "Loading…" : loadState === "error" ? `Could not load: ${loadError}` : what);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load investigations: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* Variance Resolution Center */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Variance Resolution Center</div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>{summary.resolved} of {summary.total} cases resolved</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #EEF1F6" }}>
          {[
            { label: "Resolution Rate", value: `${summary.resolutionRate}%`, color: summary.resolutionRate >= 60 ? "#2E7D32" : "#E65100", mono: true },
            { label: "Total Qty Adjusted", value: String(summary.qtyAdjusted), color: "#1B6CA8", mono: true },
            { label: "Top Root Cause", value: summary.rootCauses[0]?.cause ?? "—", color: "#1A2436", mono: false },
            { label: "Rejected", value: String(summary.rejected), color: summary.rejected > 0 ? "#C62828" : "#9CA3AF", mono: true },
          ].map((k, i) => (
            <div key={k.label} style={{ padding: "16px 20px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: k.mono ? 26 : 14, fontFamily: k.mono ? "JetBrains Mono" : "Inter", fontWeight: 700, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
            </div>
          ))}
        </div>
        {summary.rootCauses.length > 0 && (
          <div style={{ padding: "16px 20px 18px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Root Cause Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {summary.rootCauses.map(rc => (
                <div key={rc.cause} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: "0 0 200px", fontSize: 12, color: "#6B7280" }}>{rc.cause}</div>
                  <div style={{ flex: 1, height: 6, background: "#F0F3F7", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((rc.count / summary.rootCauses[0].count) * 100)}%`, height: "100%", background: "#1B6CA8" }} />
                  </div>
                  <div style={{ flex: "0 0 24px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8", textAlign: "right" }}>{rc.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cases */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={SK.searchWrapper}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search cases..." style={SK.searchInput} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUS_FILTERS.map(f => <button key={f} onClick={() => setStatusFilter(f)} style={SK.filterPill(statusFilter === f)}>{f}</button>)}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={openTrail} style={SK.btnSecondary}>Audit Trail</button>
            <button onClick={openNew} style={SK.btnPrimary}>+ New Investigation</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th onSort={() => handleSort("number")} sortDir={sortCol === "number" ? sortDir : null}>Case #</Th>
              <Th onSort={() => handleSort("product")} sortDir={sortCol === "product" ? sortDir : null}>Product</Th>
              <Th onSort={() => handleSort("countDate")} sortDir={sortCol === "countDate" ? sortDir : null}>Counted</Th>
              <Th onSort={() => handleSort("variance")} sortDir={sortCol === "variance" ? sortDir : null}>Variance</Th>
              <Th onSort={() => handleSort("priority")} sortDir={sortCol === "priority" ? sortDir : null}>Priority</Th>
              <Th onSort={() => handleSort("currentStep")} sortDir={sortCol === "currentStep" ? sortDir : null}>Stage</Th>
              <Th onSort={() => handleSort("assignedTo")} sortDir={sortCol === "assignedTo" ? sortDir : null}>Assigned To</Th>
              <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              <Th>Actions</Th>
            </tr></thead>
            <tbody>
              {pageRows.map(c => {
                const sc = STATUS_STYLE[c.status]; const pc = PRIORITY_STYLE[c.priority];
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{c.number}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{c.product}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.countDate}</td>
                    <td style={{ padding: "11px 14px" }}><VarBadge v={c.variance} /></td>
                    <td style={{ padding: "11px 14px" }}><Pill label={c.priority} bg={pc.bg} color={pc.color} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{c.stepName}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#1A2436" }}>{c.assignedTo}</td>
                    <td style={{ padding: "11px 14px" }}><Pill label={c.status} bg={sc.bg} color={sc.color} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      <button onClick={() => openCase(c)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontWeight: 600 }}>
                        {c.status === "In Progress" ? "Investigate" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && <tr><td colSpan={9} style={{ padding: "36px 14px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg(cases.length === 0 ? "No investigations yet. Open one when a count disagrees with the system." : "No investigations match the filter.")}</td></tr>}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>

      {/* ── Drawer ── */}
      {open && (
        <>
          <div onClick={closeDrawer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }} />
          <aside role="dialog" aria-label="Investigation" style={{ position: "fixed", right: 0, top: 50, bottom: 0, width: 600, maxWidth: "100vw", background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", borderLeft: "1px solid #DDE3EC", boxShadow: "-4px 0 24px rgba(0,0,0,0.14)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>{active?.number ?? "New Investigation"}</div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{active?.product ?? product?.name ?? "Select Product"}</div>
                {active && (
                  <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                    <Pill label={active.status} {...STATUS_STYLE[active.status]} />
                    <Pill label={active.priority} {...PRIORITY_STYLE[active.priority]} />
                  </div>
                )}
              </div>
              <button onClick={closeDrawer} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 24, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ padding: "12px 22px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Step {step} of 8</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>{STEPS[step - 1]}</div>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {STEPS.map((s, i) => <div key={s} title={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i + 1 <= step ? "#1B6CA8" : "#E8ECF4" }} />)}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
              {open && !active && step > 1 && !error && <div style={{ color: "#9CA3AF", fontSize: 13 }}>Loading case…</div>}

              {/* 1: difference */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={FL}>Product / Item</label>
                    <select aria-label="Product" value={active?.productId ?? prodId} disabled={!!active} onChange={e => { setProdId(e.target.value); setPhysQty(""); }} style={{ ...inputSty, cursor: "pointer" }}>
                      {products.length === 0 && <option value="">No products with stock</option>}
                      {products.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={FL}>System Quantity</label><input aria-label="System quantity" value={sysQty} readOnly style={{ ...inputSty, background: "#F8FAFC", color: "#6B7280", cursor: "not-allowed" }} /></div>
                    <div><label style={FL}>Physical Quantity</label><input aria-label="Physical quantity" type="number" min={0} value={physQty} readOnly={!!active} onChange={e => setPhysQty(e.target.value)} placeholder="Enter counted qty" style={inputSty} /></div>
                  </div>
                  {liveVariance !== null && (
                    <div style={{ padding: "14px 18px", border: `1px solid ${liveVariance < 0 ? "#FFCDD2" : liveVariance > 0 ? "#A5D6A7" : "#DDE3EC"}`, background: liveVariance < 0 ? "#FFEBEE" : liveVariance > 0 ? "#E8F5E9" : "#F5F5F5" }}>
                      <label style={FL}>Variance</label>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: liveVariance < 0 ? "#C62828" : liveVariance > 0 ? "#2E7D32" : "#6B7280", marginBottom: 4 }}>{signed(liveVariance)}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        {liveVariance < 0 ? `${Math.abs(liveVariance)} unit${Math.abs(liveVariance) !== 1 ? "s" : ""} missing from physical count`
                          : liveVariance > 0 ? `${liveVariance} surplus unit${liveVariance !== 1 ? "s" : ""} found in physical count` : "No variance. The counts match."}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={FL}>Date of Count</label><DatePicker value={countDate} onChange={setCountDate} disabled={!!active} /></div>
                    <div><label style={FL}>Reported By</label><input aria-label="Reported by" value={reportedBy} readOnly={!!active} onChange={e => setReportedBy(e.target.value)} placeholder="Defaults to you" style={inputSty} /></div>
                  </div>
                  <div><label style={FL}>Assign To</label><input aria-label="Assign to" value={assignedTo} readOnly={readOnly} onChange={e => setAssignedTo(e.target.value)} placeholder="Staff member name" style={inputSty} /></div>
                  <div>
                    <label style={FL}>Priority</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["High", "Medium", "Low"] as InvPriority[]).map(p => {
                        const pc = PRIORITY_STYLE[p]; const on = priority === p;
                        return <button key={p} disabled={readOnly} onClick={() => setPriority(p)} style={{ padding: "7px 20px", border: `2px solid ${on ? pc.color : "#DDE3EC"}`, background: on ? pc.bg : "#fff", color: on ? pc.color : "#6B7280", fontSize: 13, cursor: readOnly ? "default" : "pointer", fontWeight: 700 }}>{p}</button>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 2: transactions */}
              {step === 2 && ctx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={info}>Review the last 60 days of movements for <strong>{active?.product}</strong>. Tick any that may have caused the difference.</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["", "Date", "Type", "Reference", "Batch", "Qty", "User"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ctx.transactions.length === 0 && <tr><td colSpan={7} style={{ padding: 18, textAlign: "center", color: "#9CA3AF" }}>No movements in the last 60 days.</td></tr>}
                      {ctx.transactions.map(tx => {
                        const on = txSel.includes(tx.id); const tc = TX_COLOR(tx.event);
                        return (
                          <tr key={tx.id} onClick={() => !readOnly && setTxSel(s => on ? s.filter(x => x !== tx.id) : [...s, tx.id])}
                            style={{ borderBottom: "1px solid #F4F6FA", cursor: readOnly ? "default" : "pointer", background: on ? "#F0F6FF" : "transparent" }}>
                            <td style={{ padding: "9px 10px" }}><input type="checkbox" aria-label={`Flag ${tx.ref}`} checked={on} readOnly onChange={() => {}} /></td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{when(tx.at)}</td>
                            <td style={{ padding: "9px 10px" }}><span style={{ padding: "2px 8px", background: tc.bg, color: tc.color, fontSize: 11, fontWeight: 700 }}>{EVENT_LABEL[tx.event] ?? tx.event}</span></td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#1B6CA8", fontSize: 11 }}>{tx.ref}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280", fontSize: 11 }}>{tx.batch}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontWeight: 700, color: tx.quantity < 0 ? "#C62828" : "#2E7D32" }}>{signed(tx.quantity)}</td>
                            <td style={{ padding: "9px 10px", color: "#1A2436" }}>{tx.user}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {txSel.length > 0 && <div style={{ padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFCC80", fontSize: 12, color: "#E65100" }}>{txSel.length} transaction{txSel.length !== 1 ? "s" : ""} flagged as potentially related</div>}
                  <div><label style={FL}>Investigation Notes</label><textarea aria-label="Transaction notes" value={txNotes} readOnly={readOnly} onChange={e => setTxNotes(e.target.value)} rows={3} placeholder="Record observations from transaction review..." style={{ ...inputSty, resize: "vertical" }} /></div>
                </div>
              )}

              {/* 3: batches */}
              {step === 3 && ctx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={info}>Count each batch and enter what is really there. Leave a batch blank to treat it as correct. The batch differences must add up to the case difference of <strong>{signed(active?.variance ?? 0)}</strong> before it can be sent for approval.</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["Batch #", "Received", "Expiry", "Location", "System Qty", "Physical Qty", "Variance"].map(h => <th key={h} style={{ ...th, textAlign: h === "System Qty" || h === "Variance" ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ctx.batches.map(b => (
                        <tr key={b.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                          <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{b.batchNumber}</td>
                          <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                          <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                          <td style={{ padding: "9px 10px", color: "#1A2436" }}>{b.location || "—"}</td>
                          <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 700 }}>{b.expectedQty}</td>
                          <td style={{ padding: "9px 10px" }}>
                            <input aria-label={`Counted ${b.batchNumber}`} type="number" min={0} value={batchQty[b.id] ?? ""} readOnly={readOnly}
                              onChange={e => setBatchQty(q => ({ ...q, [b.id]: e.target.value }))} placeholder="—"
                              style={{ width: 80, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                          </td>
                          <td style={{ padding: "9px 10px", textAlign: "right" }}><VarBadge v={batchVar(b.expectedQty, b.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, color: batchTotal - sysQty === (active?.variance ?? 0) ? "#2E7D32" : "#E65100" }}>
                    Batch counts add up to {signed(batchTotal - sysQty)} against the case difference of {signed(active?.variance ?? 0)}.
                  </div>
                  <div><label style={FL}>Batch Investigation Notes</label><textarea aria-label="Batch notes" value={batchNotes} readOnly={readOnly} onChange={e => setBatchNotes(e.target.value)} rows={3} placeholder="Observations from batch-level count..." style={{ ...inputSty, resize: "vertical" }} /></div>
                </div>
              )}

              {/* 4: locations */}
              {step === 4 && ctx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={info}>Count the stock at each storage location. Misplaced stock is a common cause of discrepancies.</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["Location", "Expected Qty", "Physical Qty", "Difference"].map(h => <th key={h} style={{ ...th, textAlign: h === "Expected Qty" || h === "Difference" ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ctx.locations.map(l => (
                        <tr key={l.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 700, color: "#1A2436" }}>{l.name}</td>
                          <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 700 }}>{l.expectedQty}</td>
                          <td style={{ padding: "9px 10px" }}>
                            <input aria-label={`Counted at ${l.name}`} type="number" min={0} value={locQty[l.id] ?? ""} readOnly={readOnly}
                              onChange={e => setLocQty(q => ({ ...q, [l.id]: e.target.value }))} placeholder="—"
                              style={{ width: 80, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                          </td>
                          <td style={{ padding: "9px 10px", textAlign: "right" }}><VarBadge v={locVar(l.expectedQty, l.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div><label style={FL}>Location Investigation Notes</label><textarea aria-label="Location notes" value={locNotes} readOnly={readOnly} onChange={e => setLocNotes(e.target.value)} rows={3} placeholder="Note any misplaced stock or location anomalies..." style={{ ...inputSty, resize: "vertical" }} /></div>
                </div>
              )}

              {/* 5: user actions */}
              {step === 5 && ctx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={info}>Review who did what to this product. Mark any entries that look suspect.</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["", "Date & Time", "User", "Action", "Reference", "Qty"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ctx.transactions.length === 0 && <tr><td colSpan={6} style={{ padding: 18, textAlign: "center", color: "#9CA3AF" }}>No movements in the last 60 days.</td></tr>}
                      {ctx.transactions.map(ua => {
                        const on = suspects.includes(ua.id);
                        return (
                          <tr key={ua.id} onClick={() => !readOnly && setSuspects(s => on ? s.filter(x => x !== ua.id) : [...s, ua.id])}
                            style={{ borderBottom: "1px solid #F4F6FA", cursor: readOnly ? "default" : "pointer", background: on ? "#FFF3E0" : "transparent" }}>
                            <td style={{ padding: "9px 10px" }}><input type="checkbox" aria-label={`Suspect ${ua.ref}`} checked={on} readOnly onChange={() => {}} /></td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280", fontSize: 11 }}>{when(ua.at)}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 600, color: "#1A2436" }}>{ua.user}</td>
                            <td style={{ padding: "9px 10px", color: "#6B7280" }}>{EVENT_LABEL[ua.event] ?? ua.event}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{ua.ref}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontWeight: 700, color: ua.quantity < 0 ? "#C62828" : "#2E7D32" }}>{signed(ua.quantity)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {suspects.length > 0 && <div style={{ padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFCC80", fontSize: 12, color: "#E65100" }}>{suspects.length} action{suspects.length !== 1 ? "s" : ""} flagged as suspect</div>}
                  <div><label style={FL}>User Investigation Notes</label><textarea aria-label="User notes" value={userNotes} readOnly={readOnly} onChange={e => setUserNotes(e.target.value)} rows={3} placeholder="Record findings from user action review..." style={{ ...inputSty, resize: "vertical" }} /></div>
                </div>
              )}

              {/* 6: reason */}
              {step === 6 && active && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={FL}>Root Cause</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 6, border: "1px solid #DDE3EC" }}>
                      {ROOT_CAUSES.map(rc => (
                        <div key={rc} role="radio" aria-checked={reason === rc} aria-label={rc} onClick={() => !readOnly && setReason(rc)}
                          style={{ padding: "11px 14px", cursor: readOnly ? "default" : "pointer", background: reason === rc ? "#EFF6FF" : "#fff", borderLeft: `3px solid ${reason === rc ? "#1B6CA8" : "transparent"}`, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${reason === rc ? "#1B6CA8" : "#DDE3EC"}`, background: reason === rc ? "#1B6CA8" : "#fff", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: reason === rc ? "#1B6CA8" : "#1A2436", fontWeight: reason === rc ? 600 : 400 }}>{rc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={FL}>Main Evidence Type</label>
                    <select aria-label="Evidence type" value={evidenceType} disabled={readOnly} onChange={e => setEvidenceType(e.target.value)} style={{ ...inputSty, cursor: "pointer" }}>
                      <option value="">— Select evidence type —</option>{EVIDENCE_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                  <div><label style={FL}>Detailed Notes</label><textarea aria-label="Reason notes" value={reasonNotes} readOnly={readOnly} onChange={e => setReasonNotes(e.target.value)} rows={4} placeholder="Describe the root cause in detail..." style={{ ...inputSty, resize: "vertical" }} /></div>

                  <div style={{ borderRadius: 6, border: "1px solid #E8ECF4", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", background: "#FAFBFD" }}>
                      <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Evidence Viewer</span>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{active.evidence.length} record{active.evidence.length !== 1 ? "s" : ""}</span>
                    </div>
                    {!readOnly && (
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid #EEF1F6" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                          <div><label style={{ ...FL, marginBottom: 4 }}>Type</label>
                            <select aria-label="New evidence type" value={evType} onChange={e => setEvType(e.target.value)} style={{ ...inputSty, fontSize: 12 }}><option value="">— Select type —</option>{EVIDENCE_TYPES.map(et => <option key={et}>{et}</option>)}</select></div>
                          <div><label style={{ ...FL, marginBottom: 4 }}>File name / reference</label>
                            <input aria-label="Evidence reference" value={evFile} onChange={e => setEvFile(e.target.value)} placeholder="e.g. photo.jpg or log.csv" style={{ ...inputSty, fontSize: 12 }} /></div>
                        </div>
                        <div style={{ marginBottom: 8 }}><label style={{ ...FL, marginBottom: 4 }}>Description</label>
                          <input aria-label="Evidence description" value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Brief description of the evidence..." style={{ ...inputSty, fontSize: 12 }} /></div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8 }}>Files are not uploaded here. Record the file name or where it is kept.</div>
                        <button onClick={addEvidence} disabled={busy || !evType} style={{ padding: "7px 16px", border: "none", borderRadius: 4, background: busy || !evType ? "#C8CDD8" : "#1B6CA8", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Add Evidence</button>
                      </div>
                    )}
                    {active.evidence.length === 0
                      ? <div style={{ padding: "16px 14px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>No evidence records added yet.</div>
                      : active.evidence.map((ev, i, arr) => (
                        <div key={ev.id} style={{ padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: 10, padding: "1px 7px", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 700 }}>{ev.type}</span>
                            <div style={{ fontSize: 12, color: "#1A2436", margin: "4px 0 3px" }}>{ev.description || "No description"}</div>
                            {ev.reference && <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{ev.reference}</div>}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{when(ev.at)}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>by {ev.addedBy}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 7: approval */}
              {step === 7 && active && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ borderRadius: 6, border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Investigation Summary</div>
                    <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[["Case", active.number], ["Product", active.product], ["System Qty", String(active.systemQty)], ["Physical Qty", String(active.physicalQty)],
                        ["Variance", signed(active.variance)], ["Priority", active.priority], ["Reported By", active.reportedBy], ["Assigned To", active.assignedTo],
                        ["Root Cause", active.reason || "—"], ["Evidence", active.evidenceType || "—"],
                        ...active.findings.filter(f => f.kind === "batch").map(f => [`Batch ${f.refNo}`, `${f.expectedQty} → ${f.countedQty}`]),
                      ].map(([k, v]) => (
                        <div key={k}><div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, color: "#1A2436", fontFamily: ["Variance", "System Qty", "Physical Qty"].includes(k) || k.startsWith("Batch") ? "JetBrains Mono" : "Inter" }}>{v}</div></div>
                      ))}
                    </div>
                    {active.reasonNotes && <div style={{ padding: "0 14px 14px", fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>{active.reasonNotes}</div>}
                  </div>
                  {active.status === "In Progress" && (
                    <div style={{ padding: "12px 16px", background: "#FFFDE7", border: "1px solid #FFF176", fontSize: 13, color: "#F57F17" }}>
                      Send this case for approval. Another admin or manager has to approve it before any stock changes.
                    </div>
                  )}
                  {active.status === "Pending Approval" && (
                    <>
                      <div><label style={FL}>Approval Notes</label><textarea aria-label="Approval notes" value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} rows={3} placeholder="Comments for the decision..." style={{ ...inputSty, resize: "vertical" }} /></div>
                      <div style={{ padding: "12px 16px", background: "#FFFDE7", border: "1px solid #FFF176", fontSize: 13, color: "#F57F17" }}>
                        You cannot approve a case you opened. Use Approve or Reject below.
                      </div>
                    </>
                  )}
                  {(active.status === "Approved" || active.status === "Adjusted" || active.status === "Rejected") && (
                    <div style={{ padding: "12px 16px", background: active.status === "Rejected" ? "#FFEBEE" : "#E8F5E9", border: `1px solid ${active.status === "Rejected" ? "#FFCDD2" : "#A5D6A7"}`, fontSize: 13, color: active.status === "Rejected" ? "#C62828" : "#2E7D32" }}>
                      {active.status} by {active.approvedBy || "—"}{active.decidedAt ? ` on ${when(active.decidedAt)}` : ""}.{active.approvalNotes ? ` "${active.approvalNotes}"` : ""}
                    </div>
                  )}
                </div>
              )}

              {/* 8: adjustment */}
              {step === 8 && active && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {active.status === "Adjusted" ? (
                    <div style={{ padding: "16px 18px", background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>✓ Adjustment posted</div>
                      <div style={{ fontSize: 12, color: "#388E3C", marginTop: 2 }}>Ledger reference: <span style={{ fontFamily: "JetBrains Mono" }}>{active.adjustmentRef}</span></div>
                    </div>
                  ) : active.status === "Rejected" ? (
                    <div style={{ padding: "16px 18px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#C62828", fontSize: 13 }}>This investigation was rejected. No adjustment will be posted.</div>
                  ) : active.status === "Approved" ? (
                    <div style={info}>Approved. Posting writes {signed(active.variance)} units to the stock ledger, batch by batch, as below.</div>
                  ) : (
                    <div style={info}>This case has not been approved yet.</div>
                  )}
                  {[["Product", active.product], ["Adjustment Type", "Stock Count"], ["Qty Change", signed(active.variance)], ["Reason", active.reason || "—"],
                    ...active.findings.filter(f => f.kind === "batch").map(f => [`Batch ${f.refNo}`, `${f.expectedQty} → ${f.countedQty} (${signed((f.countedQty ?? 0) - (f.expectedQty ?? 0))})`]),
                  ].map(([k, v]) => (
                    <div key={k}><label style={FL}>{k}</label><input value={v} readOnly style={{ ...inputSty, background: "#F8FAFC", color: "#6B7280", cursor: "not-allowed" }} /></div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 8 }}>
              <button onClick={() => setStep(s => Math.max(s - 1, 1))} disabled={step === 1 || busy}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: step === 1 ? "#F9FAFB" : "#fff", fontSize: 13, cursor: step === 1 ? "default" : "pointer", color: step === 1 ? "#D1D5DB" : "#1A2436" }}>← Back</button>
              {error && <span role="alert" style={{ flex: 1, color: "#B91C1C", fontSize: 12, textAlign: "center" }}>{error}</span>}
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button onClick={saveDraft} disabled={busy} style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280" }}>{readOnly || !active ? "Close" : "Save & Close"}</button>
                {step < 7 && !(step === 6 && !readOnly) && <button onClick={next} disabled={busy} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: busy ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: busy ? "wait" : "pointer", color: "#fff", fontWeight: 600 }}>{step === 1 && !active ? "Open Case →" : "Next →"}</button>}
                {step === 6 && !readOnly && (
                  <button onClick={sendForApproval} disabled={busy} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: busy ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: busy ? "wait" : "pointer", color: "#fff", fontWeight: 600 }}>Send for Approval →</button>
                )}
                {step === 7 && active?.status === "Pending Approval" && (
                  <>
                    <button onClick={() => decide("reject")} disabled={busy} style={{ padding: "9px 18px", border: "1px solid #FFCDD2", background: "#FFEBEE", fontSize: 13, cursor: "pointer", color: "#C62828", fontWeight: 600 }}>Reject</button>
                    <button onClick={() => decide("approve")} disabled={busy} style={{ padding: "9px 22px", border: "none", background: "#2E7D32", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Approve</button>
                  </>
                )}
                {step === 7 && active && active.status !== "Pending Approval" && active.status !== "In Progress" && (
                  <button onClick={() => setStep(8)} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Next →</button>
                )}
                {step === 8 && active?.status === "Approved" && (
                  <button onClick={postAdj} disabled={busy} style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: busy ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: busy ? "wait" : "pointer", color: "#fff", fontWeight: 600 }}>Post Adjustment</button>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Audit trail */}
      {showTrail && (
        <>
          <div onClick={() => { setShowTrail(false); setReplayRunning(false); }} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200 }} />
          <div role="dialog" aria-label="Stock audit replay" style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: "min(900px, 92vw)", maxHeight: "88vh", background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", zIndex: 201, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Stock Audit Replay</span>
                <span style={{ fontSize: 11, padding: "1px 7px", background: "#EFF6FF", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontWeight: 700 }}>{events.length} events</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setReplayIdx(0); setReplayRunning(false); }} style={{ padding: "5px 10px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#F8FAFC", fontSize: 11, cursor: "pointer", color: "#6B7280" }}>Reset</button>
                <button onClick={() => { if (replayIdx >= events.length - 1) setReplayIdx(0); setReplayRunning(v => !v); }} disabled={events.length === 0}
                  style={{ padding: "5px 14px", border: "none", borderRadius: 4, background: replayRunning ? "#E65100" : "#1B6CA8", fontSize: 11, cursor: "pointer", color: "#fff", fontWeight: 700, minWidth: 60 }}>{replayRunning ? "Pause" : "Replay"}</button>
                <button onClick={() => { setShowTrail(false); setReplayRunning(false); }} aria-label="Close" style={{ padding: "5px 9px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#F8FAFC", fontSize: 16, cursor: "pointer", color: "#6B7280", lineHeight: 1 }}>×</button>
              </div>
            </div>
            {events.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{trailState === "loading" ? "Loading…" : trailState === "error" ? "Could not load the audit trail." : "No investigation activity yet."}</div>
            ) : (() => {
              const visible = events.slice(0, replayIdx + 1);
              const byCase: Record<string, InvEvent[]> = {};
              visible.forEach(e => { (byCase[e.case] ??= []).push(e); });
              return (
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Event {replayIdx + 1} of {events.length}</div>
                    {visible.slice().reverse().map((ev, i, arr) => {
                      const es = EVENT_STYLE[ev.type] ?? EVENT_STYLE.opened;
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 10, padding: "9px 10px", background: i === 0 ? "#F0F9FF" : "transparent", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: es.bg, color: es.color, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{es.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{ev.action}</span>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#9CA3AF" }}>{when(ev.at)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7280" }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#1B6CA8" }}>{ev.case}</span> {ev.product}</div>
                            {ev.detail && <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>{ev.detail}</div>}
                            {ev.fromStep && ev.toStep && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{ev.fromStep} → {ev.toStep}</div>}
                            <div style={{ fontSize: 10, color: "#9CA3AF" }}>by {ev.actor}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Case Activity Summary</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(byCase).map(([num, evs]) => {
                        const last = evs[evs.length - 1];
                        return (
                          <div key={num} style={{ padding: "11px 14px", border: "1px solid #E8ECF4", borderRadius: 5, background: "#FAFBFD" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 700, color: "#1B6CA8" }}>{num}</span>
                              <span style={{ fontSize: 10, padding: "2px 7px", background: "#EFF6FF", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontWeight: 700 }}>{evs.length} events</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{last.product}</div>
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>Last: <span style={{ color: "#1A2436", fontWeight: 600 }}>{last.action}</span> by {last.actor}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", minWidth: 320, maxWidth: 560, background: toast.ok ? "#2E7D32" : "#C62828", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.22)" }}>
            <span style={{ flex: 1 }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
