import { useEffect, useState } from "react";
import { SK } from "../../styles/stock";
import { Pill } from "../shared/Pill";
import { DatePicker } from "../shared/DatePicker";
import { fetchRecalls, searchRecall, openRecall, updateRecall, EVENT_LABEL } from "../../lib/stockApi";
import type { RecallCase, RecallSummary, RecallBatch, RecallPatient, RecallMovement } from "../../lib/stockApi";

const CLASS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  I:   { bg: "#FFEBEE", color: "#C62828", label: "Class I" },
  II:  { bg: "#FFF3E0", color: "#E65100", label: "Class II" },
  III: { bg: "#EFF6FF", color: "#1B6CA8", label: "Class III" },
};
const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#E8F5E9", color: "#2E7D32" }, Quarantine: { bg: "#F3E5F5", color: "#6A1B9A" }, Blocked: { bg: "#FFEBEE", color: "#C62828" },
  Damaged: { bg: "#FFEBEE", color: "#C62828" }, Open: { bg: "#FFEBEE", color: "#C62828" }, Resolved: { bg: "#E8F5E9", color: "#2E7D32" },
  Closed: { bg: "#F0F3F7", color: "#6B7280" },
};
const SOURCES = ["CDSCO", "Manufacturer", "Distributor", "State drug controller", "Own investigation", "Other"];
const TH_STYLE: React.CSSProperties = {
  padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase",
  borderBottom: "1px solid #EEF1F6", textAlign: "left",
};
const field: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5, fontFamily: "Inter" };

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
const today = () => new Date().toISOString().slice(0, 10);

function Modal({ title, subtitle, onClose, children, width = 520 }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-label={title} style={{ background: "#fff", width, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto", borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function DrugRecall() {
  // ── recall cases ──
  const [recalls, setRecalls] = useState<RecallCase[]>([]);
  const [summary, setSummary] = useState<RecallSummary>({ open: 0, batchesHeld: 0, patientsNotified: 0, resolvedThisMonth: 0 });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    fetchRecalls()
      .then(r => { if (live) { setRecalls(r.items); setSummary(r.summary); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load recalls")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── search ──
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [sState, setSState] = useState<"idle" | "loading" | "error">("idle");
  const [sError, setSError] = useState("");
  const [batches, setBatches] = useState<RecallBatch[]>([]);
  const [patients, setPatients] = useState<RecallPatient[]>([]);
  const [movements, setMovements] = useState<RecallMovement[]>([]);
  const [showNotify, setShowNotify] = useState(false);

  async function runSearch(q: string) {
    const term = q.trim();
    if (term.length < 2) { setSError("Type at least 2 characters"); setSState("error"); return; }
    setSState("loading"); setSError("");
    try {
      const r = await searchRecall(term);
      setBatches(r.batches); setPatients(r.patients); setMovements(r.movements); setSearched(term); setSState("idle");
    } catch (e) { setSError(errText(e, "Search failed")); setSState("error"); }
  }
  function clearSearch() { setSearched(""); setBatches([]); setPatients([]); setMovements([]); setQuery(""); setSState("idle"); setSError(""); }

  // ── open a case ──
  const [openFor, setOpenFor] = useState<{ productId: string; product: string; batchNumbers: string[] } | null>(null);
  const [oForm, setOForm] = useState({ recallClass: "II" as "I" | "II" | "III", source: SOURCES[0], reason: "", noticeDate: today(), hold: true });
  const [oBusy, setOBusy] = useState(false);
  const [oError, setOError] = useState("");
  const productsInResults = [...new Map(batches.map(b => [b.productId, b.product])).entries()];
  const [pickProduct, setPickProduct] = useState("");
  function startOpen() {
    const pid = productsInResults.length === 1 ? productsInResults[0][0] : "";
    setPickProduct(pid);
    const mine = batches.filter(b => b.productId === pid);
    setOpenFor({ productId: pid, product: productsInResults.find(([id]) => id === pid)?.[1] ?? "", batchNumbers: mine.map(b => b.batchNo) });
    setOForm({ recallClass: "II", source: SOURCES[0], reason: "", noticeDate: today(), hold: true }); setOError("");
  }
  function chooseProduct(pid: string) {
    setPickProduct(pid);
    setOpenFor({ productId: pid, product: productsInResults.find(([id]) => id === pid)?.[1] ?? "", batchNumbers: batches.filter(b => b.productId === pid).map(b => b.batchNo) });
  }
  async function submitOpen() {
    if (!openFor?.productId) { setOError("Choose the product being recalled"); return; }
    if (openFor.batchNumbers.length === 0) { setOError("Choose at least one batch"); return; }
    setOBusy(true); setOError("");
    try {
      const r = await openRecall({ productId: openFor.productId, batchNumbers: openFor.batchNumbers, recallClass: oForm.recallClass, source: oForm.source,
        reason: oForm.reason, noticeDate: oForm.noticeDate, holdStock: oForm.hold });
      setOpenFor(null);
      setToast({ ok: true, msg: `${r.number} opened. ${r.quarantined} batch${r.quarantined !== 1 ? "es" : ""} put in quarantine.` });
      setReload(n => n + 1);
      if (searched) void runSearch(searched);
    } catch (e) { setOError(errText(e, "Could not open the recall")); } finally { setOBusy(false); }
  }

  // ── follow up ──
  const [followFor, setFollowFor] = useState<RecallCase | null>(null);
  const [fNotified, setFNotified] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fBusy, setFBusy] = useState(false);
  const [fError, setFError] = useState("");
  async function submitFollow(status?: "resolved" | "closed") {
    if (!followFor) return;
    const n = fNotified === "" ? undefined : Number(fNotified);
    if (n !== undefined && (!Number.isInteger(n) || n < 0)) { setFError("Patients notified must be a whole number"); return; }
    setFBusy(true); setFError("");
    try {
      await updateRecall(followFor.id, { patientsNotified: n, outcomeNotes: fNotes, status });
      setFollowFor(null);
      setToast({ ok: true, msg: status ? `${followFor.number} ${status}.` : `${followFor.number} updated.` });
      setReload(n2 => n2 + 1);
    } catch (e) { setFError(errText(e, "Could not update the recall")); } finally { setFBusy(false); }
  }

  const activeAlerts = recalls.filter(r => r.status === "Open");
  const history = recalls.filter(r => r.status !== "Open");
  const heldCount = batches.filter(b => b.status !== "Active").length;
  const emptyMsg = (what: string) => (loadState === "loading" ? "Loading…" : loadState === "error" ? `Could not load: ${loadError}` : what);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load recalls: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* Search bar */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Batch ID, Drug Name or Manufacturer</label>
          <div style={{ ...SK.searchWrapper, flex: 1 }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input aria-label="Search recall" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch(query)}
              placeholder="e.g. BT-2026-0118 or Amoxicillin" style={SK.searchInput} />
          </div>
          {sState === "error" && <div role="alert" style={{ fontSize: 11, color: "#B91C1C", marginTop: 4 }}>{sError}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {searched && <button onClick={clearSearch} style={SK.btnSecondary}>Clear</button>}
          <button onClick={() => runSearch(query)} disabled={sState === "loading"} style={SK.btnPrimary}>{sState === "loading" ? "Searching…" : "Search"}</button>
        </div>
      </div>

      {/* ── DEFAULT VIEW ── */}
      {!searched && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Open Recalls", value: summary.open, color: "#C62828" },
              { label: "Batches Held", value: summary.batchesHeld, color: "#6A1B9A" },
              { label: "Patients Notified", value: summary.patientsNotified, color: "#1B6CA8" },
              { label: "Resolved This Month", value: summary.resolvedThisMonth, color: "#2E7D32" },
            ].map(k => (
              <div key={k.label} style={{ ...SK.kpiTile, background: "#fff" }}>
                <div style={SK.kpiLabel}>{k.label}</div>
                <div style={SK.kpiValue(k.color)}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={SK.cardHeaderTitle}>Open Recall Cases</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#FFEBEE", color: "#C62828" }}>{activeAlerts.length} Open</span>
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Search for the recalled batch to open a case</span>
            </div>
            {activeAlerts.length === 0
              ? <div style={{ padding: 28, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg("No open recalls. Search for a batch or drug to start one.")}</div>
              : activeAlerts.map((alert, idx) => {
                const cls = CLASS_STYLE[alert.recallClass];
                return (
                  <div key={alert.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: idx < activeAlerts.length - 1 ? "1px solid #F0F3F7" : "none", borderLeft: `3px solid ${cls.color}` }}>
                    <div style={{ flex: "0 0 72px" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: cls.bg, color: cls.color, letterSpacing: "0.05em" }}>{cls.label}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 3 }}>{alert.product} <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8", fontWeight: 500 }}>{alert.number}</span></div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{alert.reason || "No reason recorded"}</div>
                    </div>
                    <div style={{ flex: "0 0 200px" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Batches</div>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{alert.batchNumbers.join(", ")}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{alert.batchesInStock} of {alert.batchNumbers.length} in your stock</div>
                    </div>
                    <div style={{ flex: "0 0 120px" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Source</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{alert.source || "—"}</div>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", marginTop: 1 }}>{alert.noticeDate}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setQuery(alert.batchNumbers[0]); void runSearch(alert.batchNumbers[0]); }} style={SK.btnSecondary}>Investigate</button>
                      <button onClick={() => { setFollowFor(alert); setFNotified(String(alert.patientsNotified)); setFNotes(alert.outcomeNotes); setFError(""); }} style={SK.btnPrimary}>Follow up</button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={{ ...SK.cardHeader, borderBottom: "1px solid #EEF1F6" }}>
              <span style={SK.cardHeaderTitle}>Recall History</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{history.length} past recall{history.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#FAFBFD" }}>
                  {["Recall ID", "Drug", "Class", "Batches", "Patients Notified", "Opened By", "Notice Date", "Status"].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {history.map(r => {
                    const sp = STATUS_PILL[r.status];
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = "#F8FAFC")} onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{r.number}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.product}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: CLASS_STYLE[r.recallClass].color, fontWeight: 700 }}>{CLASS_STYLE[r.recallClass].label}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{r.batchNumbers.length}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1B6CA8", textAlign: "center" }}>{r.patientsNotified}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{r.createdBy || "—"}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.noticeDate}</td>
                        <td style={{ padding: "11px 14px" }}><Pill label={r.status} bg={sp.bg} color={sp.color} /></td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && <tr><td colSpan={8} style={{ padding: 28, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg("No resolved recalls yet.")}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SEARCH RESULTS ── */}
      {searched && batches.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>No batches in your pharmacy match "{searched}".</div>
        </div>
      )}

      {searched && batches.length > 0 && (
        <>
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div>
                <span style={SK.cardHeaderTitle}>Affected Stock</span>
                <span style={SK.cardHeaderSub}>{batches.length} batch{batches.length !== 1 ? "es" : ""} found{heldCount > 0 ? ` · ${heldCount} already on hold` : ""}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={startOpen} style={SK.btnDanger}>Open Recall Case</button>
                <button onClick={() => setShowNotify(true)} style={SK.btnSecondary}>Patient Notification List ({patients.length})</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#FAFBFD" }}>
                  {["Batch #", "Drug", "Manufacturer", "Location", "Qty On Hand", "Received", "Expiry", "Status"].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {batches.map(b => {
                    const sp = STATUS_PILL[b.status] ?? { bg: "#F0F3F7", color: "#6B7280" };
                    return (
                      <tr key={b.batchId} style={{ borderBottom: "1px solid #F0F3F7", background: b.status !== "Active" ? "#FAF5FF" : "transparent" }}>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.batchNo}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.product}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{b.manufacturer || "—"}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.location || "—"}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: b.quantity === 0 ? "#C62828" : "#1A2436" }}>{b.quantity}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                        <td style={{ padding: "11px 14px" }}><Pill label={b.status} bg={sp.bg} color={sp.color} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div>
                <span style={SK.cardHeaderTitle}>Affected Patients</span>
                <span style={SK.cardHeaderSub}>{patients.length} invoice{patients.length !== 1 ? "s" : ""} dispensed from these batches</span>
              </div>
            </div>
            {patients.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#FAFBFD" }}>{["Invoice", "Patient", "Phone", "Date", "Dispensed", "Qty"].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}</tr></thead>
                  <tbody>
                    {patients.map(p => (
                      <tr key={p.invoiceId} style={{ borderBottom: "1px solid #F0F3F7" }}>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{p.invoice}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.patient}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.phone || "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.date}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{p.items.join(", ")}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No patient dispensing records found for these batches.</div>}
          </div>

          {movements.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
              <div style={SK.cardHeader}>
                <div><span style={SK.cardHeaderTitle}>Stock Movement History</span><span style={SK.cardHeaderSub}>Latest movements for the batches above</span></div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#FAFBFD" }}>{["Date", "Event", "Ref", "Batch", "Qty", "Balance", "User"].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}</tr></thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                        <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{when(m.at)}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: "#1A2436" }}>{EVENT_LABEL[m.event] ?? m.event}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{m.ref}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{m.batchNo}</td>
                        <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: m.quantity > 0 ? "#2E7D32" : "#C62828" }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                        <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{m.balance}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: "#6B7280" }}>{m.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Patient notification list */}
      {showNotify && (
        <Modal title="Patient Notification List" subtitle="Patients who were dispensed stock from the batches searched" onClose={() => setShowNotify(false)}>
          {patients.length > 0 ? patients.map(p => (
            <div key={p.invoiceId} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{p.patient}{p.phone && <span style={{ fontWeight: 400, fontFamily: "JetBrains Mono", fontSize: 11, color: "#6B7280", marginLeft: 8 }}>{p.phone}</span>}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{p.items.join(", ")} · Invoice {p.invoice}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{p.date}</div>
            </div>
          )) : <div style={{ color: "#9CA3AF", fontSize: 13 }}>No patient records to notify.</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowNotify(false)} style={SK.btnSecondary}>Close</button>
            <button onClick={() => { window.print(); setShowNotify(false); }} style={SK.btnPrimary}>Print List</button>
          </div>
        </Modal>
      )}

      {/* Open a recall case */}
      {openFor && (
        <Modal title="Open Recall Case" subtitle="Records the recall and, if you choose, takes the batches off sale" onClose={() => setOpenFor(null)}>
          <div>
            <label style={lbl}>Product</label>
            <select aria-label="Recalled product" value={pickProduct} onChange={e => chooseProduct(e.target.value)} style={field}>
              <option value="">— Choose the recalled product —</option>
              {productsInResults.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          {openFor.productId && (
            <div>
              <label style={lbl}>Recalled batches</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {batches.filter(b => b.productId === openFor.productId).map(b => {
                  const on = openFor.batchNumbers.includes(b.batchNo);
                  return (
                    <label key={b.batchId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: `1px solid ${on ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 5, background: on ? "#EFF6FF" : "#fff", fontSize: 12, fontFamily: "JetBrains Mono", cursor: "pointer" }}>
                      <input type="checkbox" checked={on} onChange={e => setOpenFor(o => o && ({ ...o, batchNumbers: e.target.checked ? [...o.batchNumbers, b.batchNo] : o.batchNumbers.filter(x => x !== b.batchNo) }))} />
                      {b.batchNo} <span style={{ color: "#9CA3AF" }}>({b.quantity})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Recall Class</label>
              <select aria-label="Recall class" value={oForm.recallClass} onChange={e => setOForm(p => ({ ...p, recallClass: e.target.value as "I" | "II" | "III" }))} style={field}>
                <option value="I">Class I: serious risk</option><option value="II">Class II: temporary or reversible harm</option><option value="III">Class III: unlikely to cause harm</option></select></div>
            <div><label style={lbl}>Source</label>
              <select aria-label="Source" value={oForm.source} onChange={e => setOForm(p => ({ ...p, source: e.target.value }))} style={field}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label style={lbl}>Notice Date</label><DatePicker value={oForm.noticeDate} onChange={v => setOForm(p => ({ ...p, noticeDate: v }))} /></div>
          <div><label style={lbl}>Reason</label><textarea aria-label="Reason" rows={2} value={oForm.reason} onChange={e => setOForm(p => ({ ...p, reason: e.target.value }))} placeholder="What the notice says is wrong with the batch" style={{ ...field, resize: "vertical" }} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1A2436", cursor: "pointer" }}>
            <input type="checkbox" checked={oForm.hold} onChange={e => setOForm(p => ({ ...p, hold: e.target.checked }))} />
            Put the batches I hold in quarantine now (they cannot be sold)
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            {oError && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 260 }}>{oError}</span>}
            <button onClick={() => setOpenFor(null)} style={SK.btnSecondary}>Cancel</button>
            <button onClick={submitOpen} disabled={oBusy} style={{ ...SK.btnDanger, opacity: oBusy ? 0.6 : 1 }}>{oBusy ? "Opening…" : "Open Recall"}</button>
          </div>
        </Modal>
      )}

      {/* Follow up */}
      {followFor && (
        <Modal title={`Follow up ${followFor.number}`} subtitle={`${followFor.product} · ${CLASS_STYLE[followFor.recallClass].label}`} onClose={() => setFollowFor(null)} width={460}>
          <div><label style={lbl}>Patients Notified</label><input aria-label="Patients notified" type="number" min={0} value={fNotified} onChange={e => setFNotified(e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
          <div><label style={lbl}>Outcome / Notes</label><textarea aria-label="Outcome notes" rows={3} value={fNotes} onChange={e => setFNotes(e.target.value)} style={{ ...field, resize: "vertical" }} /></div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            {fError && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 200 }}>{fError}</span>}
            <button onClick={() => setFollowFor(null)} style={SK.btnSecondary}>Cancel</button>
            <button onClick={() => submitFollow()} disabled={fBusy} style={SK.btnSecondary}>Save</button>
            <button onClick={() => submitFollow("resolved")} disabled={fBusy} style={SK.btnPrimary}>{fBusy ? "Saving…" : "Mark Resolved"}</button>
          </div>
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
