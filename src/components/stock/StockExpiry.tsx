import { useState, useEffect } from "react";
import { DatePicker } from "../shared/DatePicker";
import { SK } from "../../styles/stock";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import {
  fetchExpiryAlerts, fetchQuarantine, fetchThresholds, saveThresholds, writeOffExpired, fetchExpiryChecks, scheduleExpiryCheck,
  completeExpiryCheck, setBatchStatus,
} from "../../lib/stockApi";
import type { ExpiryAlert, ExpirySummary, HeldBatch, AlertThreshold, ExpiryCheck } from "../../lib/stockApi";
import { createPurchaseReturn, updateReturnStatus } from "../../lib/purchaseApi";

const RETURN_STYLE: Record<string, { bg: string; color: string; border?: string }> = {
  "Eligible":       { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Non-returnable": { bg: "#FFEBEE", color: "#C62828" },
  "Window Closed":  { bg: "#F0F3F7", color: "#6B7280", border: "#DDE3EC" },
  "No distributor": { bg: "#F0F3F7", color: "#6B7280", border: "#DDE3EC" },
};
const HELD_STYLE: Record<string, { bg: string; color: string }> = {
  Quarantine: { bg: "#FFF3E0", color: "#E65100" }, Blocked: { bg: "#FFEBEE", color: "#C62828" }, Damaged: { bg: "#F3E5F5", color: "#7B1FA2" },
};
const CHECK_STYLE: Record<string, { bg: string; color: string; border?: string }> = {
  Completed: { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" }, Overdue: { bg: "#FFEBEE", color: "#C62828" },
  Scheduled: { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" }, "In Progress": { bg: "#FFF3E0", color: "#E65100" },
  Cancelled: { bg: "#F0F3F7", color: "#6B7280" },
};
const DISPOSAL_METHODS = ["Municipal Waste (non-hazardous)", "Incineration (hazardous)", "Drain Disposal (liquids)", "CPCB Authorised Facility"];
const CHECK_TYPES = ["Full Inventory", "Near-Expiry Only", "Expired Only", "Category Spot-check"];
const HOLD_REASONS = ["Near-expiry (< 30 days)", "Damaged packaging", "Cold chain breach suspected", "Quality hold", "Supplier recall", "Other"];

const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};
const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const lbl: React.CSSProperties = { fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Inter" };
const field: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" };
const th: React.CSSProperties = { padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" };

function Modal({ title, subtitle, onClose, children, width = 500 }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-label={title} style={{ background: "#fff", width, maxWidth: "calc(100vw - 32px)", borderRadius: 6, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function Footer({ onCancel, onSave, busy, error, label, color = "#1B6CA8", disabled }: { onCancel: () => void; onSave: () => void; busy: boolean; error: string; label: string; color?: string; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
      {error && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 280 }}>{error}</span>}
      <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
      <button onClick={onSave} disabled={busy || disabled}
        style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: busy || disabled ? "#C8CDD8" : color, fontSize: 13, cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}

const Facts = ({ rows }: { rows: [string, string][] }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
    {rows.map(([k, v]) => (
      <div key={k} style={{ background: "#F8FAFC", borderRadius: 5, padding: "9px 12px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 3, fontFamily: "Inter" }}>{k}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{v}</div>
      </div>
    ))}
  </div>
);

export default function StockExpiry() {
  const [expiryView, setExpiryView] = useState<"expiry" | "quarantine" | "auditlog">("expiry");

  // ── data ──
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [summary, setSummary] = useState<ExpirySummary>({ expiredValue: 0, expiredCount: 0, criticalValue: 0, criticalCount: 0, warningValue: 0, warningCount: 0, atRiskValue: 0 });
  const [held, setHeld] = useState<HeldBatch[]>([]);
  const [checks, setChecks] = useState<ExpiryCheck[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchExpiryAlerts(), fetchQuarantine(), fetchExpiryChecks()])
      .then(([a, q, c]) => { if (live) { setAlerts(a.items); setSummary(a.summary); setHeld(q.items); setChecks(c); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load expiry data")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const done = (msg: string, ok = true) => { setToast({ msg, ok }); setReload(n => n + 1); };

  // ── list state ──
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expirySearch, setExpirySearch] = useState("");
  const [qSearch, setQSearch] = useState("");
  const [qFilter, setQFilter] = useState<"All" | HeldBatch["status"]>("All");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatus, setAuditStatus] = useState<"All" | ExpiryCheck["status"]>("All");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedAlerts = sortCol
    ? [...alerts].sort((a: any, b: any) => {
        let va = a[sortCol], vb = b[sortCol];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : alerts;
  const searchedAlerts = sortedAlerts.filter(d => !expirySearch || d.product.toLowerCase().includes(expirySearch.toLowerCase())
    || d.category.toLowerCase().includes(expirySearch.toLowerCase()) || d.batchNo.toLowerCase().includes(expirySearch.toLowerCase()));
  const filteredHeld = held.filter(q => (qFilter === "All" || q.status === qFilter)
    && (!qSearch || q.product.toLowerCase().includes(qSearch.toLowerCase()) || q.batchNo.toLowerCase().includes(qSearch.toLowerCase())));
  const filteredChecks = checks.filter(a => (auditStatus === "All" || a.status === auditStatus)
    && (!auditSearch || [a.number, a.assignedTo, a.type, a.notes].some(x => x.toLowerCase().includes(auditSearch.toLowerCase()))));
  const { pageRows: alertPage, footerProps: alertFooter } = usePagination(searchedAlerts, 10);
  const { pageRows: heldPage, footerProps: heldFooter } = usePagination(filteredHeld, 10);
  const { pageRows: checkPage, footerProps: checkFooter } = usePagination(filteredChecks, 10);

  const immediate = alerts.filter(d => d.level === "expired");
  const within7 = alerts.filter(d => d.level === "urgent");
  const within30 = alerts.filter(d => d.level === "critical");
  const totalAction = immediate.length + within7.length + within30.length;
  const overdueHeld = held.filter(q => q.overdue);
  const heldValue = held.reduce((s, q) => s + q.value, 0);
  const emptyMsg = (what: string) => (loadState === "loading" ? "Loading…" : loadState === "error" ? `Could not load: ${loadError}` : what);

  // ── supplier return ──
  const [returnFor, setReturnFor] = useState<ExpiryAlert | null>(null);
  const [rQty, setRQty] = useState("");
  const [rPickup, setRPickup] = useState(inDays(7));
  const [rNotes, setRNotes] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rError, setRError] = useState("");
  async function submitReturn() {
    if (!returnFor || !returnFor.distributorId) return;
    const q = Number(rQty);
    if (!Number.isInteger(q) || q < 1 || q > returnFor.quantity) { setRError(`Enter a whole number between 1 and ${returnFor.quantity}`); return; }
    setRBusy(true); setRError("");
    let created: { id: string; return_number: string } | null = null;
    try {
      created = await createPurchaseReturn({
        global_distributor_id: returnFor.distributorId, distributor_name: returnFor.distributor, return_date: today(),
        reason: returnFor.daysLeft < 0 ? "Expired stock" : "Near-expiry stock",
        notes: `Pickup requested for ${rPickup}.${rNotes ? " " + rNotes : ""}`,
        items: [{ global_product_id: returnFor.productId, product_name: returnFor.product, batch_number: returnFor.batchNo, expiry_date: returnFor.expiry,
          quantity: q, purchase_rate: returnFor.unitCost, mrp: returnFor.mrp, disposition: "Credit Note" }],
      });
      await updateReturnStatus(created.id, "submitted");
      setReturnFor(null);
      done(`Return ${created.return_number} submitted to ${returnFor.distributor}. ${q} units left your stock.`);
    } catch (e) {
      setRError(created ? `Return ${created.return_number} was created as a draft but could not be submitted: ${errText(e, "")}` : errText(e, "Could not create the return"));
      if (created) setReload(n => n + 1);
    } finally { setRBusy(false); }
  }

  // ── write-off ──
  const [writeOffFor, setWriteOffFor] = useState<{ batchId: string; product: string; batchNo: string; quantity: number; unitCost: number; expiry: string } | null>(null);
  const [wQty, setWQty] = useState("");
  const [wMethod, setWMethod] = useState(DISPOSAL_METHODS[0]);
  const [wCert, setWCert] = useState("");
  const [wNotes, setWNotes] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const [wError, setWError] = useState("");
  async function submitWriteOff() {
    if (!writeOffFor) return;
    const q = Number(wQty);
    if (!Number.isInteger(q) || q < 1 || q > writeOffFor.quantity) { setWError(`Enter a whole number between 1 and ${writeOffFor.quantity}`); return; }
    setWBusy(true); setWError("");
    try {
      const r = await writeOffExpired({ batchId: writeOffFor.batchId, quantity: q, method: wMethod, certificate: wCert, notes: wNotes });
      setWriteOffFor(null);
      done(`${q} units of ${writeOffFor.product} written off (₹${Number(r.value).toLocaleString("en-IN")}).`);
    } catch (e) { setWError(errText(e, "Could not write the stock off")); } finally { setWBusy(false); }
  }
  const openWriteOff = (b: { batchId: string; product: string; batchNo: string; quantity: number; unitCost: number; expiry: string }, note = "") => {
    setWriteOffFor(b); setWQty(String(b.quantity)); setWMethod(DISPOSAL_METHODS[0]); setWCert(""); setWNotes(note); setWError("");
  };

  // ── hold / release ──
  const [holdFor, setHoldFor] = useState<{ batchId: string; label: string } | null>(null);
  const [holdPick, setHoldPick] = useState("");
  const [holdReason, setHoldReason] = useState(HOLD_REASONS[0]);
  const [holdStatus, setHoldStatus] = useState<"Quarantine" | "Blocked" | "Damaged">("Quarantine");
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdError, setHoldError] = useState("");
  async function submitHold() {
    if (!holdFor?.batchId) { setHoldError("Select a batch"); return; }
    setHoldBusy(true); setHoldError("");
    try {
      await setBatchStatus(holdFor.batchId, holdStatus, holdReason);
      setHoldFor(null);
      done(`${holdFor.label} is now ${holdStatus}.`);
    } catch (e) { setHoldError(errText(e, "Could not change the batch status")); } finally { setHoldBusy(false); }
  }
  async function release(q: HeldBatch) {
    setMenuOpen(null);
    try { await setBatchStatus(q.batchId, "Active", "Released from quarantine"); done(`${q.product} (${q.batchNo}) released for sale.`); }
    catch (e) { setToast({ ok: false, msg: errText(e, "Could not release the batch") }); }
  }

  // ── thresholds ──
  const [showThr, setShowThr] = useState(false);
  const [thrDraft, setThrDraft] = useState<AlertThreshold[]>([]);
  const [thrBusy, setThrBusy] = useState(false);
  const [thrError, setThrError] = useState("");
  async function openThresholds() {
    setShowThr(true); setThrError("");
    try { setThrDraft(await fetchThresholds()); } catch (e) { setThrError(errText(e, "Could not load thresholds")); }
  }
  async function submitThresholds() {
    setThrBusy(true); setThrError("");
    try { await saveThresholds(thrDraft); setShowThr(false); done("Alert thresholds saved."); }
    catch (e) { setThrError(errText(e, "Could not save thresholds")); } finally { setThrBusy(false); }
  }

  // ── expiry checks ──
  const [showSchedule, setShowSchedule] = useState(false);
  const [sch, setSch] = useState({ type: CHECK_TYPES[1], scheduledDate: inDays(7), assignedTo: "", notes: "" });
  const [schBusy, setSchBusy] = useState(false);
  const [schError, setSchError] = useState("");
  async function submitSchedule() {
    setSchBusy(true); setSchError("");
    try { const c = await scheduleExpiryCheck(sch); setShowSchedule(false); done(`${c.number} scheduled for ${c.scheduledDate}.`); }
    catch (e) { setSchError(errText(e, "Could not schedule the check")); } finally { setSchBusy(false); }
  }
  const [completeFor, setCompleteFor] = useState<ExpiryCheck | null>(null);
  const [cDone, setCDone] = useState({ reviewed: "", issues: "", notes: "" });
  const [cBusy, setCBusy] = useState(false);
  const [cError, setCError] = useState("");
  async function submitComplete() {
    if (!completeFor) return;
    setCBusy(true); setCError("");
    try {
      await completeExpiryCheck(completeFor.id, { itemsReviewed: Number(cDone.reviewed || 0), issuesFound: Number(cDone.issues || 0), notes: cDone.notes });
      setCompleteFor(null); done(`${completeFor.number} marked complete.`);
    } catch (e) { setCError(errText(e, "Could not complete the check")); } finally { setCBusy(false); }
  }
  const lastCompleted = [...checks].filter(c => c.status === "Completed").sort((a, b) => b.completedDate.localeCompare(a.completedDate))[0];
  const nextScheduled = [...checks].filter(c => c.status === "Scheduled").sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const overdueChecks = checks.filter(c => c.status === "Overdue");

  const menuItem = (color: string, hover: string, label: string, onClick: () => void) => (
    <div role="button" onMouseDown={onClick}
      style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color, background: "#fff" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>{label}</div>
  );
  const kebab = (id: string) => (
    <>
      {menuOpen === id && <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setMenuOpen(null)} />}
      <button aria-label="Actions" onClick={() => setMenuOpen(open => (open === id ? null : id))}
        style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: menuOpen === id ? "#F0F3F7" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </>
  );
  const dropdown: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 170 };
  const pillBtn = (active: boolean): React.CSSProperties => ({ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: active ? 600 : 400, fontFamily: "Inter", border: `1px solid ${active ? "#1B6CA8" : "#DDE3EC"}`, background: active ? "#EFF6FF" : "#fff", color: active ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" });
  const searchBox = (value: string, set: (v: string) => void, ph: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" }}>
      <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input value={value} onChange={e => set(e.target.value)} placeholder={ph} style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load expiry data: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* ── Action Required Banner ── */}
      {totalAction + overdueHeld.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #FFCDD2", borderLeft: "4px solid #C62828", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", cursor: "pointer" }} onClick={() => setBannerCollapsed(c => !c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 700, color: "#C62828" }}>
                {totalAction} batch{totalAction !== 1 ? "es" : ""} need action{overdueHeld.length > 0 ? ` · ${overdueHeld.length} on hold too long` : ""}
              </span>
              {immediate.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFEBEE", color: "#C62828", fontWeight: 700, borderRadius: 3 }}>{immediate.length} EXPIRED</span>}
              {within7.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFF3E0", color: "#E65100", fontWeight: 700, borderRadius: 3 }}>{within7.length} URGENT</span>}
              {within30.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFFDE7", color: "#F57F17", fontWeight: 700, borderRadius: 3 }}>{within30.length} CRITICAL</span>}
            </div>
            <span style={{ color: "#6B7280", fontSize: 12 }}>{bannerCollapsed ? "Show" : "Hide"}</span>
          </div>
          {!bannerCollapsed && (
            <div style={{ borderTop: "1px solid #FFEBEE", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Dispose immediately", items: immediate, color: "#C62828", bg: "#FFEBEE" },
                { label: "Act within the urgent window", items: within7, color: "#E65100", bg: "#FFF3E0" },
                { label: "Critical: return or sell down", items: within30, color: "#F57F17", bg: "#FFFDE7" },
              ].filter(g => g.items.length > 0).map(g => (
                <div key={g.label} style={{ padding: "8px 12px", background: g.bg, borderRadius: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{g.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {g.items.map(d => <span key={d.batchId} style={{ fontSize: 11, padding: "2px 8px", background: "#fff", border: `1px solid ${g.color}`, color: g.color, fontWeight: 600, borderRadius: 3 }}>{d.product} · {d.batchNo}</span>)}
                  </div>
                </div>
              ))}
              {overdueHeld.length > 0 && (
                <div style={{ padding: "8px 12px", background: "#F3E5F5", borderRadius: 4, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#7B1FA2", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Held for over 14 days: {overdueHeld.map(q => `${q.product} (${q.batchNo})`).join(", ")}
                  </div>
                  <button onClick={() => setExpiryView("quarantine")} style={{ padding: "5px 13px", border: "1px solid #7B1FA2", background: "#fff", color: "#7B1FA2", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 3 }}>Review</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Expired: Write-off Required", value: money(summary.expiredValue), sub: `${summary.expiredCount} batches`, color: "#C62828" },
          { label: "Critical Risk", value: money(summary.criticalValue), sub: `${summary.criticalCount} batches`, color: "#E65100" },
          { label: "Warning Zone", value: money(summary.warningValue), sub: `${summary.warningCount} batches`, color: "#F57F17" },
          { label: "Total Capital at Risk", value: money(summary.atRiskValue), sub: "Combined exposure", color: "#1A2436" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabbed card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "expiry" as const, label: "Expiry Alerts", count: alerts.filter(d => d.level !== "ok").length },
            { key: "quarantine" as const, label: "Quarantine", count: held.length },
            { key: "auditlog" as const, label: "Audit Log", count: overdueChecks.length },
          ]).map(t => (
            <button key={t.key} onClick={() => setExpiryView(t.key)}
              style={{ padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: expiryView === t.key ? 600 : 400, color: expiryView === t.key ? "#1B6CA8" : "#6B7280", borderBottom: `2px solid ${expiryView === t.key ? "#1B6CA8" : "transparent"}`, marginBottom: -2, display: "flex", alignItems: "center", gap: 7 }}>
              {t.label}
              {t.count > 0 && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: expiryView === t.key ? (t.key === "auditlog" ? "#FFEBEE" : "#EFF6FF") : "#F0F3F7", color: expiryView === t.key ? (t.key === "auditlog" ? "#C62828" : "#1B6CA8") : "#9CA3AF" }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Expiry Alerts ── */}
        {expiryView === "expiry" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              {searchBox(expirySearch, setExpirySearch, "Search product, category or batch...")}
              <div style={{ marginLeft: "auto" }}>
                <button onClick={openThresholds}
                  style={{ padding: "7px 13px", border: "1px solid #DDE3EC", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "Inter", color: "#6B7280", fontWeight: 600 }}>
                  Alert Thresholds
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <Th onSort={() => handleSort("product")} sortDir={sortCol === "product" ? sortDir : null}>Product</Th>
                  <Th onSort={() => handleSort("batchNo")} sortDir={sortCol === "batchNo" ? sortDir : null}>Batch</Th>
                  <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
                  <Th onSort={() => handleSort("quantity")} sortDir={sortCol === "quantity" ? sortDir : null}>Stock</Th>
                  <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
                  <Th onSort={() => handleSort("daysLeft")} sortDir={sortCol === "daysLeft" ? sortDir : null}>Days Left</Th>
                  <Th>Action Needed</Th>
                  <Th>Velocity / Forecast</Th>
                  <Th>Distributor</Th>
                  <Th>Return Status</Th>
                  <Th>Actions</Th>
                </tr></thead>
                <tbody>
                  {alertPage.map(d => {
                    const expired = d.level === "expired";
                    const urgent = d.level === "urgent" || d.level === "critical";
                    const warning = d.level === "warning";
                    const dayColor = expired ? "#C62828" : urgent ? "#E65100" : warning ? "#F57F17" : "#6B7280";
                    const action = expired ? "Dispose immediately" : urgent ? "Initiate return / disposal" : warning ? "Monitor & prioritise sales" : "No action required";
                    const rs = RETURN_STYLE[d.returnStatus] ?? RETURN_STYLE["Non-returnable"];
                    const onHold = d.status !== "Active";
                    const canReturn = d.returnStatus === "Eligible" && d.quantity > 0;
                    const hasActions = canReturn || expired || urgent || onHold;
                    return (
                      <tr key={d.batchId} style={{ borderBottom: "1px solid #F4F6FA", background: expired ? "#FFF5F5" : urgent ? "#FFFBEB" : "transparent" }}>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.product}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{d.category}</div>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>
                          {d.batchNo}
                          {onHold && <div><span style={{ fontSize: 10, padding: "1px 6px", background: HELD_STYLE[d.status]?.bg, color: HELD_STYLE[d.status]?.color, fontWeight: 700 }}>{d.status}</span></div>}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location || "—"}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>{d.quantity}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: dayColor }}>{d.expiry}</td>
                        <td style={{ padding: "11px 14px" }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: dayColor }}>{expired ? "EXPIRED" : `${d.daysLeft}d`}</span></td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: dayColor, fontWeight: urgent || expired ? 600 : 400 }}>{action}</td>
                        <td style={{ padding: "11px 14px", minWidth: 148 }}>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>
                            {d.dailySales === 0 ? <span style={{ color: "#9CA3AF" }}>No sales data</span> : <><span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{d.dailySales.toFixed(1)}</span> units/day</>}
                          </div>
                          {d.willExpireUnsold > 0
                            ? <div style={{ fontSize: 10, fontWeight: 700, color: expired || d.willExpireUnsold >= d.quantity / 2 ? "#C62828" : "#E65100" }}>{d.willExpireUnsold} units expire unsold</div>
                            : d.dailySales > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: "#2E7D32" }}>On track to sell out</div>}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.distributor || "—"}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", background: rs.bg, color: rs.color, border: `1px solid ${rs.border ?? rs.color}`, whiteSpace: "nowrap" }}>{d.returnStatus}</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {hasActions && (
                            <div style={{ position: "relative" }}>
                              {kebab(d.batchId)}
                              {menuOpen === d.batchId && (
                                <div style={dropdown}>
                                  {canReturn && menuItem("#2E7D32", "#F0FFF4", "Return to Distributor", () => { setMenuOpen(null); setReturnFor(d); setRQty(String(d.quantity)); setRPickup(inDays(7)); setRNotes(""); setRError(""); })}
                                  {(expired || onHold) && menuItem("#7B1FA2", "#FAF5FF", "Write-off", () => { setMenuOpen(null); openWriteOff({ batchId: d.batchId, product: d.product, batchNo: d.batchNo, quantity: d.quantity, unitCost: d.unitCost, expiry: d.expiry }, expired ? `Batch expired ${d.expiry}` : ""); })}
                                  {!onHold && (urgent || expired) && menuItem("#C62828", "#FFF5F5", "Quarantine", () => { setMenuOpen(null); setHoldFor({ batchId: d.batchId, label: `${d.product} (${d.batchNo})` }); setHoldPick(d.batchId); setHoldStatus("Quarantine"); setHoldReason(expired ? "Other" : HOLD_REASONS[0]); setHoldError(""); })}
                                  {onHold && <div style={{ padding: "9px 14px", fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>{d.status}: see Quarantine tab</div>}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {alertPage.length === 0 && <tr><td colSpan={11} style={{ padding: 32, textAlign: "center", color: loadState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>{emptyMsg(alerts.length === 0 ? "No batches with stock yet." : "No batches match the search.")}</td></tr>}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...alertFooter} />
          </>
        )}

        {/* ── Quarantine ── */}
        {expiryView === "quarantine" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {searchBox(qSearch, setQSearch, "Search quarantine...")}
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "Quarantine", "Blocked", "Damaged"] as const).map(f => <button key={f} onClick={() => setQFilter(f)} style={pillBtn(qFilter === f)}>{f}</button>)}
              </div>
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{held.length} on hold · {money(heldValue)}</span>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => { setHoldFor({ batchId: "", label: "" }); setHoldPick(""); setHoldStatus("Quarantine"); setHoldReason(HOLD_REASONS[0]); setHoldError(""); }}
                  style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 40 }}>
                  + Add to Quarantine
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Product", "Batch", "Qty", "Reason", "On Hold Since", "Days on Hold", "Location", "Value", "Status", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {heldPage.map(q => {
                    const ss = HELD_STYLE[q.status] ?? HELD_STYLE.Quarantine;
                    const ageColor = q.daysOnHold > 14 ? "#C62828" : q.daysOnHold > 7 ? "#E65100" : "#6B7280";
                    return (
                      <tr key={q.batchId} style={{ borderBottom: "1px solid #F4F6FA" }}>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{q.product}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{q.batchNo}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" }}>{q.quantity}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{q.reason || "—"}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.since.slice(0, 10)}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: ageColor }}>{q.daysOnHold}d</span>
                          {q.overdue && <span style={{ marginLeft: 6, fontSize: 10, background: "#FFEBEE", color: "#C62828", padding: "1px 5px", fontWeight: 700 }}>OVERDUE</span>}
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.location || "—"}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" }}>{money(q.value)}</td>
                        <td style={{ padding: "11px 13px" }}><Pill label={q.status} bg={ss.bg} color={ss.color} /></td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ position: "relative" }}>
                            {kebab(`q-${q.batchId}`)}
                            {menuOpen === `q-${q.batchId}` && (
                              <div style={dropdown}>
                                {menuItem("#2E7D32", "#F0FFF4", "Release for sale", () => release(q))}
                                {menuItem("#7B1FA2", "#FAF0FF", "Dispose (write-off)", () => { setMenuOpen(null); openWriteOff({ batchId: q.batchId, product: q.product, batchNo: q.batchNo, quantity: q.quantity, unitCost: q.quantity ? q.value / q.quantity : 0, expiry: q.expiry }, q.reason); })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {heldPage.length === 0 && <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg("Nothing is on hold.")}</td></tr>}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...heldFooter} />
          </>
        )}

        {/* ── Audit Log ── */}
        {expiryView === "auditlog" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #EEF1F6" }}>
              {[
                { label: "Last Check", value: lastCompleted?.completedDate ?? "—", sub: lastCompleted?.type ?? "", color: "#1A2436" },
                { label: "Next Scheduled", value: nextScheduled?.scheduledDate ?? "—", sub: nextScheduled?.type ?? "None scheduled", color: "#1B6CA8" },
                { label: "Overdue Checks", value: String(overdueChecks.length), sub: overdueChecks.length > 0 ? "Attention required" : "All clear", color: overdueChecks.length > 0 ? "#C62828" : "#2E7D32" },
                { label: "Total Checks", value: String(checks.length), sub: `${checks.filter(c => c.status === "Completed").length} completed`, color: "#1A2436" },
              ].map(s => (
                <div key={s.label} style={{ padding: "14px 18px", borderRight: "1px solid #EEF1F6" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "JetBrains Mono" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {searchBox(auditSearch, setAuditSearch, "Search checks...")}
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "Completed", "Overdue", "Scheduled"] as const).map(f => <button key={f} onClick={() => setAuditStatus(f)} style={pillBtn(auditStatus === f)}>{f}</button>)}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => { setSch({ type: CHECK_TYPES[1], scheduledDate: inDays(7), assignedTo: "", notes: "" }); setSchError(""); setShowSchedule(true); }}
                  style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Schedule Check</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Check ID", "Type", "Scheduled", "Completed", "Assigned To", "Items Reviewed", "Issues", "Status", "Notes", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {checkPage.map(a => {
                    const ss = CHECK_STYLE[a.status];
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #F4F6FA", background: a.status === "Overdue" ? "#FFF5F5" : "transparent" }}>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{a.number}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{a.type}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.scheduledDate}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: a.completedDate ? "#2E7D32" : "#9CA3AF" }}>{a.completedDate || "—"}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{a.assignedTo || "—"}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" }}>{a.status === "Completed" ? a.itemsReviewed : "—"}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: a.issuesFound > 0 ? "#C62828" : "#9CA3AF", fontWeight: a.issuesFound > 0 ? 700 : 400 }}>{a.status === "Completed" ? a.issuesFound : "—"}</td>
                        <td style={{ padding: "11px 13px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", background: ss.bg, color: ss.color, border: `1px solid ${ss.border ?? ss.color}` }}>{a.status}</span></td>
                        <td style={{ padding: "11px 13px", fontSize: 11, color: "#6B7280", maxWidth: 200 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notes || "—"}</div></td>
                        <td style={{ padding: "11px 13px" }}>
                          {(a.status === "Scheduled" || a.status === "Overdue" || a.status === "In Progress") && (
                            <button onClick={() => { setCompleteFor(a); setCDone({ reviewed: "", issues: "", notes: a.notes }); setCError(""); }}
                              style={{ padding: "4px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Complete</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {checkPage.length === 0 && <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg(checks.length === 0 ? "No expiry checks yet. Schedule one." : "No checks match the filter.")}</td></tr>}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...checkFooter} />
          </>
        )}
      </div>

      {/* ── Alert thresholds ── */}
      {showThr && (
        <Modal title="Alert Threshold Configuration" subtitle="Days before expiry for each category in your stock" onClose={() => setShowThr(false)} width={560}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "9px 13px", fontSize: 11, color: "#1B6CA8" }}>
            <strong>Warning</strong> is amber, <strong>Critical</strong> is orange and <strong>Urgent</strong> is red. Urgent must be less than critical, which must be less than warning.
          </div>
          {thrDraft.length === 0 && <div style={{ fontSize: 13, color: "#9CA3AF" }}>{thrError ? "" : "No categories in stock yet."}</div>}
          {thrDraft.map((t, i) => (
            <div key={t.category} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1A2436" }}>{t.category}{t.isDefault && <span style={{ marginLeft: 6, fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>default</span>}</div>
              {(["warning", "critical", "urgent"] as const).map(f => (
                <input key={f} aria-label={`${t.category} ${f}`} type="number" min={1} max={365} value={t[f]}
                  onChange={e => setThrDraft(prev => prev.map((r, ri) => (ri === i ? { ...r, [f]: Math.max(1, Math.min(365, Number(e.target.value))) } : r)))}
                  style={{ ...field, padding: "6px 8px", fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "center" }} />
              ))}
            </div>
          ))}
          <Footer onCancel={() => setShowThr(false)} onSave={submitThresholds} busy={thrBusy} error={thrError} label="Save Thresholds" disabled={thrDraft.length === 0} />
        </Modal>
      )}

      {/* ── Schedule check ── */}
      {showSchedule && (
        <Modal title="Schedule Expiry Check" subtitle="Plan a new audit check for this pharmacy" onClose={() => setShowSchedule(false)} width={440}>
          <div><label style={lbl}>Check Type</label>
            <select aria-label="Check type" value={sch.type} onChange={e => setSch(p => ({ ...p, type: e.target.value }))} style={field}>{CHECK_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label style={lbl}>Scheduled Date</label><DatePicker value={sch.scheduledDate} onChange={v => setSch(p => ({ ...p, scheduledDate: v }))} /></div>
          <div><label style={lbl}>Assign To</label><input aria-label="Assign to" value={sch.assignedTo} onChange={e => setSch(p => ({ ...p, assignedTo: e.target.value }))} placeholder="Staff member name" style={field} /></div>
          <div><label style={lbl}>Notes (optional)</label><textarea aria-label="Notes" rows={2} value={sch.notes} onChange={e => setSch(p => ({ ...p, notes: e.target.value }))} style={{ ...field, resize: "vertical" }} /></div>
          <Footer onCancel={() => setShowSchedule(false)} onSave={submitSchedule} busy={schBusy} error={schError} label="Save Schedule" disabled={!sch.scheduledDate} />
        </Modal>
      )}

      {/* ── Complete check ── */}
      {completeFor && (
        <Modal title={`Complete ${completeFor.number}`} subtitle={completeFor.type} onClose={() => setCompleteFor(null)} width={440}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Items Reviewed</label><input aria-label="Items reviewed" type="number" min={0} value={cDone.reviewed} onChange={e => setCDone(p => ({ ...p, reviewed: e.target.value }))} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
            <div><label style={lbl}>Issues Found</label><input aria-label="Issues found" type="number" min={0} value={cDone.issues} onChange={e => setCDone(p => ({ ...p, issues: e.target.value }))} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
          </div>
          <div><label style={lbl}>Notes</label><textarea aria-label="Check notes" rows={2} value={cDone.notes} onChange={e => setCDone(p => ({ ...p, notes: e.target.value }))} style={{ ...field, resize: "vertical" }} /></div>
          <Footer onCancel={() => setCompleteFor(null)} onSave={submitComplete} busy={cBusy} error={cError} label="Mark Complete" disabled={cDone.reviewed === ""} />
        </Modal>
      )}

      {/* ── Write-off ── */}
      {writeOffFor && (
        <Modal title="Write Off Stock" subtitle={`${writeOffFor.product} · batch ${writeOffFor.batchNo} · expiry ${writeOffFor.expiry}`} onClose={() => setWriteOffFor(null)}>
          <div style={{ background: "#FFF3E0", border: "1px solid #E65100", borderRadius: 5, padding: "10px 14px", fontSize: 12, color: "#E65100", lineHeight: 1.5 }}>
            This removes the stock straight away and records it in the stock ledger. Only an admin or manager can do it.
          </div>
          <Facts rows={[["Product", writeOffFor.product], ["Batch", writeOffFor.batchNo], ["Units in batch", String(writeOffFor.quantity)], ["Unit cost", `₹${writeOffFor.unitCost.toFixed(2)}`]]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Qty to Write Off</label><input aria-label="Quantity" type="number" min={1} max={writeOffFor.quantity} value={wQty} onChange={e => setWQty(e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
            <div><label style={lbl}>Write-off Value</label>
              <div style={{ padding: "9px 12px", borderRadius: 5, background: "#FFEBEE", color: "#C62828", fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, border: "1px solid #FFCDD2" }}>{wQty ? `₹${(Number(wQty) * writeOffFor.unitCost).toFixed(2)}` : "₹—"}</div></div>
          </div>
          <div><label style={lbl}>Disposal Method</label>
            <select aria-label="Disposal method" value={wMethod} onChange={e => setWMethod(e.target.value)} style={field}>{DISPOSAL_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label style={lbl}>Disposal Certificate Ref (optional)</label><input aria-label="Certificate" value={wCert} onChange={e => setWCert(e.target.value)} placeholder="e.g. DISP-2026-0042" style={field} /></div>
          <div><label style={lbl}>Notes</label><textarea aria-label="Write-off notes" rows={2} value={wNotes} onChange={e => setWNotes(e.target.value)} style={{ ...field, resize: "vertical" }} /></div>
          <Footer onCancel={() => setWriteOffFor(null)} onSave={submitWriteOff} busy={wBusy} error={wError} label="Write Off Stock" color="#7B1FA2" disabled={!wQty} />
        </Modal>
      )}

      {/* ── Supplier return ── */}
      {returnFor && (
        <Modal title="Return to Distributor" subtitle={`${returnFor.product} · ${returnFor.distributor}`} onClose={() => setReturnFor(null)}>
          <Facts rows={[
            ["Distributor", returnFor.distributor], ["Batch", returnFor.batchNo], ["Expiry Date", returnFor.expiry],
            ["Units in batch", String(returnFor.quantity)], ["Unit cost", `₹${returnFor.unitCost.toFixed(2)}`], ["Days left", returnFor.daysLeft < 0 ? "Expired" : `${returnFor.daysLeft}`],
          ]} />
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
            This creates a purchase return and submits it, which removes the units from your stock. You can follow it, approve it and record the credit note under Purchases &gt; Returns.
          </div>
          <div>
            <label style={lbl}>Quantity to Return</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input aria-label="Quantity" type="number" min={1} max={returnFor.quantity} value={rQty} onChange={e => setRQty(e.target.value)} style={{ ...field, width: 140, fontFamily: "JetBrains Mono" }} />
              {rQty && <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>₹{(Number(rQty) * returnFor.unitCost).toFixed(2)} credit expected</div>}
            </div>
          </div>
          <div><label style={lbl}>Preferred Pickup Date</label><DatePicker value={rPickup} onChange={setRPickup} /></div>
          <div><label style={lbl}>Notes to Distributor (optional)</label><textarea aria-label="Return notes" rows={2} value={rNotes} onChange={e => setRNotes(e.target.value)} style={{ ...field, resize: "vertical" }} /></div>
          <Footer onCancel={() => setReturnFor(null)} onSave={submitReturn} busy={rBusy} error={rError} label="Confirm & Submit Return" color="#2E7D32" disabled={!rQty} />
        </Modal>
      )}

      {/* ── Add to quarantine ── */}
      {holdFor && (
        <Modal title={holdFor.batchId ? "Hold Batch" : "Add Stock to Quarantine"} subtitle={holdFor.label || "Choose a batch to take off sale"} onClose={() => setHoldFor(null)} width={460}>
          {!holdFor.label && (
            <div><label style={lbl}>Batch</label>
              <select aria-label="Batch" value={holdPick} onChange={e => { setHoldPick(e.target.value); const b = alerts.find(x => x.batchId === e.target.value); setHoldFor({ batchId: e.target.value, label: b ? `${b.product} (${b.batchNo})` : "" }); }} style={field}>
                <option value="">— Select batch —</option>
                {alerts.filter(a => a.status === "Active").map(a => <option key={a.batchId} value={a.batchId}>{a.product} · {a.batchNo} · {a.quantity} units · exp {a.expiry}</option>)}
              </select></div>
          )}
          <div><label style={lbl}>Hold As</label>
            <select aria-label="Hold as" value={holdStatus} onChange={e => setHoldStatus(e.target.value as typeof holdStatus)} style={field}>
              <option value="Quarantine">Quarantine (under review)</option><option value="Blocked">Blocked</option><option value="Damaged">Damaged</option></select></div>
          <div><label style={lbl}>Reason</label>
            <select aria-label="Reason" value={holdReason} onChange={e => setHoldReason(e.target.value)} style={field}>{HOLD_REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
          <div style={{ fontSize: 12, color: "#E65100" }}>The whole batch comes off sale and FEFO until it is released.</div>
          <Footer onCancel={() => setHoldFor(null)} onSave={submitHold} busy={holdBusy} error={holdError} label="Hold Stock" color="#C62828" disabled={!holdFor.batchId} />
        </Modal>
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
