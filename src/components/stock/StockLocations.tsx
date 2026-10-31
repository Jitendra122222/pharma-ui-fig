import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "../shared/DatePicker";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import type { StorageType } from "./stockData";
import {
  fetchBins, createBin, updateBin, deactivateBin, moveToBin, fetchBinAudits, scheduleBinAudit, completeBinAudit, fetchBinTemperature,
  recordBinTemperature, RACK_TYPES, TEMP_ZONES, AUDIT_TYPES,
} from "../../lib/stockApi";
import type { BinsOverview, BinRow, BinItem, BinAuditRow, TempLog, BinForm } from "../../lib/stockApi";

interface Props { storageType: StorageType }

const STORAGE_LABEL: Record<StorageType, string> = {
  alphabetical: "Alphabetical (A–Z)", company: "By Company", category: "By Category", custom: "Custom / Manual",
};
const EMPTY: BinsOverview = { bins: [], unassigned: [], locations: [], summary: { bins: 0, skusInBins: 0, critical: 0, attention: 0, unassignedUnits: 0 } };
const EMPTY_FORM = { name: "", label: "", zone: "", rackType: "Shelf Rack", tempZone: "Ambient", maxCapacity: "", locationId: "", notes: "" };
const NO_BIN = "__none__";

const errText = (e: unknown, fallback: string) => {
  const raw = e instanceof Error ? e.message : "";
  return /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "")
    ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};
const fillColor = (pct: number) => (pct >= 90 ? "#C62828" : pct >= 70 ? "#E65100" : "#2E7D32");
const when = (iso: string) => {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const pill = (bg: string, color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: bg, color, fontFamily: "Inter", whiteSpace: "nowrap" });
const field: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" };
const btn = (primary = false): React.CSSProperties => ({ padding: "9px 16px", borderRadius: 6, border: primary ? "none" : "1px solid #DDE3EC", background: primary ? "#1B6CA8" : "#fff", color: primary ? "#fff" : "#1A2436", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" });

const StatusPill = ({ status }: { status: BinRow["status"] }) => {
  const m = { critical: ["#FFEBEE", "#C62828", "Critical"], low: ["#FFF3E0", "#E65100", "Attention"], ok: ["#E8F5E9", "#2E7D32", "OK"] }[status];
  return <span style={pill(m[0], m[1])}>{m[2]}</span>;
};
const TempPill = ({ zone }: { zone: string }) => (zone === "Refrigerated" ? <span style={pill("#EFF6FF", "#1B6CA8")}>Refrigerated</span>
  : zone === "Frozen" ? <span style={pill("#F0F4FF", "#5B21B6")}>Frozen</span> : <span style={pill("#F0FDF4", "#2E7D32")}>Ambient</span>);
const ExpiryBadge = ({ date, days }: { date: string; days: number }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{date}</span>
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, alignSelf: "flex-start", fontFamily: "Inter",
      background: days < 30 ? "#FFEBEE" : days < 90 ? "#FFF3E0" : "#F0F3F7", color: days < 30 ? "#C62828" : days < 90 ? "#E65100" : "#9CA3AF" }}>{days < 0 ? "Expired" : `${days}d`}</span>
  </div>
);

function Modal({ title, subtitle, onClose, children, width = 480 }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
      <div role="dialog" aria-label={title} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto", zIndex: 201, boxShadow: "0 8px 40px rgba(12,27,51,0.2)" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #DDE3EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
      </div>
    </>
  );
}
const Actions = ({ onCancel, onSave, busy, error, label, disabled }: { onCancel: () => void; onSave: () => void; busy: boolean; error: string; label: string; disabled?: boolean }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
    {error && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 260 }}>{error}</span>}
    <button onClick={onCancel} style={btn()}>Cancel</button>
    <button onClick={onSave} disabled={busy || disabled} style={{ ...btn(true), background: busy || disabled ? "#C8CDD8" : "#1B6CA8", cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer" }}>{busy ? "Saving…" : label}</button>
  </div>
);

export default function StockLocations({ storageType }: Props) {
  const [data, setData] = useState<BinsOverview>(EMPTY);
  const [audits, setAudits] = useState<BinAuditRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadState("loading");
    Promise.all([fetchBins(), fetchBinAudits()])
      .then(([d, a]) => { if (live) { setData(d); setAudits(a); setLoadState("ready"); } })
      .catch((e: unknown) => { if (live) { setLoadError(errText(e, "Could not load locations")); setLoadState("error"); } });
    return () => { live = false; };
  }, [reload]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const done = (msg: string, ok = true) => { setToast({ msg, ok }); setReload(n => n + 1); };

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Low Stock" | "Near Expiry">("All");
  const [zoneFilter, setZoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BinRow["status"]>("");
  const [detailMode, setDetailMode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);

  const zones = [...new Set(data.bins.map(b => b.zone))].sort();
  const q = search.trim().toLowerCase();
  const itemOk = (i: BinItem) => (filter === "All" || (filter === "Low Stock" ? i.low : i.daysToExpiry < 90));
  const binMatches = (b: BinRow) => (!zoneFilter || b.zone === zoneFilter) && (!statusFilter || b.status === statusFilter);
  const textMatches = (b: BinRow | null, i: BinItem) => !q || [i.product, i.category, i.manufacturer, i.batchNo, b?.name ?? "", b?.zone ?? "", b?.label ?? ""].some(x => x.toLowerCase().includes(q));

  const flatRows = useMemo(() => {
    const rows: { bin: BinRow | null; item: BinItem }[] = [];
    for (const b of data.bins) if (binMatches(b)) for (const i of b.items) if (itemOk(i) && textMatches(b, i)) rows.push({ bin: b, item: i });
    if (!zoneFilter && !statusFilter) for (const i of data.unassigned) if (itemOk(i) && textMatches(null, i)) rows.push({ bin: null, item: i });
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, filter, zoneFilter, statusFilter]);
  const binRows = useMemo(() => data.bins.filter(b => binMatches(b) && (!q || b.name.toLowerCase().includes(q) || b.zone.toLowerCase().includes(q) || b.label.toLowerCase().includes(q)
    || b.items.some(i => textMatches(b, i))) && (filter === "All" || b.items.some(itemOk))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data, q, filter, zoneFilter, statusFilter]);
  const { pageRows: flatPage, footerProps: flatFooter } = usePagination(flatRows, 10);
  const { pageRows: binPage, footerProps: binFooter } = usePagination(binRows, 10);

  const toggleSel = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleExpand = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const problems = data.summary.critical + data.summary.attention;

  // ── create / edit bin ──
  const [binModal, setBinModal] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setF = (k: keyof typeof EMPTY_FORM, v: string) => { setForm(p => ({ ...p, [k]: v })); setFormErr(p => ({ ...p, [k]: "" })); };
  function openCreate() { setForm({ ...EMPTY_FORM, locationId: data.locations[0]?.id ?? "" }); setFormErr({}); setError(""); setBinModal({ id: null }); }
  function openEdit(b: BinRow) {
    setForm({ name: b.name, label: b.label, zone: b.zone, rackType: b.rackType, tempZone: b.tempZone, maxCapacity: String(b.maxCapacity), locationId: b.locationId, notes: b.notes });
    setFormErr({}); setError(""); setBinModal({ id: b.id });
  }
  async function submitBin() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Bin ID is required";
    if (!form.zone.trim()) errs.zone = "Zone is required";
    const cap = Number(form.maxCapacity);
    if (!Number.isInteger(cap) || cap <= 0) errs.maxCapacity = "Enter a whole number above zero";
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    setBusy(true); setError("");
    const body: BinForm = { name: form.name.trim(), label: form.label.trim(), zone: form.zone.trim(), rackType: form.rackType, tempZone: form.tempZone, maxCapacity: cap, locationId: form.locationId, notes: form.notes };
    try {
      if (binModal?.id) await updateBin(binModal.id, body); else await createBin(body);
      setBinModal(null); done(binModal?.id ? `Bin ${form.name} updated.` : `Bin ${form.name} created.`);
    } catch (e) { setError(errText(e, "Could not save the bin")); } finally { setBusy(false); }
  }
  async function removeBin(b: BinRow) {
    setMenu(null);
    try { await deactivateBin(b.id); done(`Bin ${b.name} taken out of use.`); } catch (e) { setToast({ ok: false, msg: errText(e, "Could not deactivate the bin") }); }
  }

  // ── move stock ──
  const [moveItems, setMoveItems] = useState<BinItem[] | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveErr, setMoveErr] = useState("");
  const [moveBusy, setMoveBusy] = useState(false);
  function openMove(items: BinItem[]) { setMoveItems(items); setMoveTo(""); setMoveQty(items.length === 1 ? String(items[0].quantity) : ""); setMoveReason(""); setMoveErr(""); }
  const moveLocation = moveItems?.[0]?.locationId;
  const sameLoc = moveItems ? moveItems.every(i => i.locationId === moveLocation) : true;
  const targets = moveItems && sameLoc ? data.bins.filter(b => b.locationId === moveLocation) : [];
  function suggestions(): string[] {
    if (!moveItems || moveItems.length !== 1) return [];
    const it = moveItems[0];
    const cands = targets.filter(b => !b.items.some(x => x.batchId === it.batchId));
    const score = (b: BinRow) => storageType === "company" ? b.items.filter(x => x.manufacturer === it.manufacturer).length
      : storageType === "category" ? b.items.filter(x => x.category === it.category).length
      : storageType === "alphabetical" ? (b.items.some(x => x.product[0]?.toUpperCase() === it.product[0]?.toUpperCase()) ? 1 : 0)
      : b.maxCapacity - b.used;
    return cands.filter(b => b.maxCapacity - b.used >= it.quantity).sort((a, b) => score(b) - score(a)).slice(0, 3).map(b => b.id);
  }
  async function submitMove() {
    if (!moveItems) return;
    setMoveBusy(true); setMoveErr("");
    const dest = moveTo === NO_BIN ? null : moveTo;
    let moved = 0; const failed: string[] = [];
    for (const it of moveItems) {
      try {
        await moveToBin({ batchId: it.batchId, toBinId: dest, quantity: moveItems.length === 1 ? Number(moveQty) : undefined, reason: moveReason });
        moved++;
      } catch (e) { failed.push(`${it.product} (${it.batchNo}): ${errText(e, "failed")}`); }
    }
    setMoveBusy(false);
    if (failed.length === moveItems.length) { setMoveErr(failed[0]); return; }
    setMoveItems(null); setSelected(new Set());
    const name = dest ? data.bins.find(b => b.id === dest)?.name : "no bin";
    done(failed.length ? `${moved} moved to ${name}. Could not move: ${failed.join("; ")}` : `${moved} batch${moved !== 1 ? "es" : ""} moved to ${name}.`, failed.length === 0);
  }

  // ── audits ──
  const [auditFor, setAuditFor] = useState<BinRow | null>(null);
  const [aForm, setAForm] = useState({ type: AUDIT_TYPES[0], priority: "Medium", date: inDays(3), assignedTo: "", notes: "" });
  const [aErr, setAErr] = useState("");
  const [aBusy, setABusy] = useState(false);
  async function submitAudit() {
    if (!auditFor) return;
    if (!aForm.assignedTo.trim()) { setAErr("Assign the audit to someone"); return; }
    setABusy(true); setAErr("");
    try { await scheduleBinAudit(auditFor.id, { type: aForm.type, priority: aForm.priority, scheduledDate: aForm.date, assignedTo: aForm.assignedTo, notes: aForm.notes }); setAuditFor(null); done(`Bin ${auditFor.name} scheduled for audit on ${aForm.date}.`); }
    catch (e) { setAErr(errText(e, "Could not schedule the audit")); } finally { setABusy(false); }
  }
  const [finishFor, setFinishFor] = useState<BinAuditRow | null>(null);
  const [variances, setVariances] = useState("0");
  async function submitFinish() {
    if (!finishFor) return;
    setABusy(true); setAErr("");
    try { await completeBinAudit(finishFor.id, Number(variances || 0)); setFinishFor(null); done(`Audit of ${finishFor.bin} recorded.`); }
    catch (e) { setAErr(errText(e, "Could not save the result")); } finally { setABusy(false); }
  }

  // ── temperature log ──
  const [tempBin, setTempBin] = useState<BinRow | null>(null);
  const [tempLog, setTempLog] = useState<TempLog | null>(null);
  const [tempVal, setTempVal] = useState("");
  const [tempErr, setTempErr] = useState("");
  useEffect(() => {
    if (!tempBin) { setTempLog(null); return; }
    let live = true;
    fetchBinTemperature(tempBin.id).then(l => { if (live) setTempLog(l); }).catch(() => { if (live) setTempErr("Could not load the log"); });
    return () => { live = false; };
  }, [tempBin, reload]);
  async function submitTemp() {
    if (!tempBin) return;
    const v = Number(tempVal);
    if (tempVal === "" || Number.isNaN(v)) { setTempErr("Enter a temperature"); return; }
    setBusy(true); setTempErr("");
    try { const l = await recordBinTemperature(tempBin.id, v); setTempVal(""); if (l.warning) setToast({ ok: false, msg: l.warning }); setReload(n => n + 1); }
    catch (e) { setTempErr(errText(e, "Could not record the reading")); } finally { setBusy(false); }
  }

  const th = (t: string, left = true) => <th key={t} style={{ padding: "9px 12px", textAlign: left ? "left" : "right", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t}</th>;
  const kebab = (key: string, items: [string, string, () => void][]) => (
    <div style={{ position: "relative" }}>
      <button aria-label="Actions" onClick={() => setMenu(menu === key ? null : key)} style={{ fontSize: 16, padding: "2px 8px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#6B7280", cursor: "pointer" }}>&#x22EE;</button>
      {menu === key && (
        <>
          <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 300, minWidth: 170, overflow: "hidden" }}>
            {items.map(([label, color, fn]) => (
              <button key={label} onClick={() => { setMenu(null); fn(); }} style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", fontSize: 13, fontFamily: "Inter", color, background: "none", border: "none", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  const emptyMsg = loadState === "loading" ? "Loading…" : loadState === "error" ? `Could not load: ${loadError}` : null;
  const pending = audits.filter(a => a.status === "Scheduled" || a.status === "Overdue");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {loadState === "error" && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#B91C1C", fontSize: 13, borderRadius: 6 }}>
          Could not load locations: {loadError} <button onClick={() => setReload(n => n + 1)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Storage Locations</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Bin assignments &mdash; {data.summary.bins} bin{data.summary.bins !== 1 ? "s" : ""} · {data.summary.skusInBins} products shelved{data.summary.unassignedUnits > 0 ? ` · ${data.summary.unassignedUnits} units not in a bin yet` : ""}</div>
        </div>
        <button onClick={openCreate} style={btn(true)}>+ Create Location</button>
      </div>

      {problems > 0 && (
        <div style={{ background: data.summary.critical > 0 ? "#FFEBEE" : "#FFF3E0", border: `1px solid ${data.summary.critical > 0 ? "#FFCDD2" : "#FFCC80"}`, borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: data.summary.critical > 0 ? "#C62828" : "#E65100" }}>
            {data.summary.critical > 0 ? `${data.summary.critical} bin${data.summary.critical > 1 ? "s" : ""} at critical capacity` : ""}
            {data.summary.critical > 0 && data.summary.attention > 0 ? " · " : ""}
            {data.summary.attention > 0 ? `${data.summary.attention} bin${data.summary.attention > 1 ? "s" : ""} hold low stock` : ""}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>Storage type: {STORAGE_LABEL[storageType]}</span>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input aria-label="Search" type="text" placeholder="Product / Bin / Batch..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...field, width: 260, borderRadius: 8 }} />
          {(["All", "Low Stock", "Near Expiry"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, fontWeight: filter === f ? 600 : 400, padding: "0 14px", borderRadius: 999, border: filter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: filter === f ? "#EFF6FF" : "#fff", color: filter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", minHeight: 40 }}>{f}</button>
          ))}
          <select aria-label="Zone" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={{ ...field, width: 150 }}>
            <option value="">All zones</option>{zones.map(z => <option key={z}>{z}</option>)}
          </select>
          <select aria-label="Fill status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} style={{ ...field, width: 150 }}>
            <option value="">Any status</option><option value="ok">OK</option><option value="low">Attention</option><option value="critical">Critical</option>
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setDetailMode(v => !v); setSelected(new Set()); }} style={{ fontSize: 12, fontWeight: detailMode ? 600 : 400, padding: "0 14px", borderRadius: 999, border: detailMode ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: detailMode ? "#EFF6FF" : "#fff", color: detailMode ? "#1B6CA8" : "#6B7280", cursor: "pointer", minHeight: 40 }}>Group Detail</button>
        </div>

        {selected.size > 0 && (
          <div style={{ padding: "8px 14px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{selected.size} selected</span>
            <button onClick={() => openMove([...data.bins.flatMap(b => b.items), ...data.unassigned].filter(i => selected.has(i.batchId)))} style={{ ...btn(), padding: "5px 14px", fontSize: 12, color: "#1B6CA8", borderColor: "#1B6CA8" }}>Move to Bin</button>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", fontSize: 12, border: "none", background: "none", color: "#6B7280", cursor: "pointer" }}>&times; Clear</button>
          </div>
        )}

        {!detailMode && (
          <div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                  <th style={{ width: 40 }} />{th("Bin")}{th("Product")}{th("Batch")}{th("Expiry")}{th("Temp Req.")}{th("Stock")}{th("Bin Capacity")}{th("Fill")}{th("Status")}{th("Actions")}
                </tr></thead>
                <tbody>
                  {flatPage.map(({ bin, item }) => (
                    <tr key={item.batchId} style={{ borderBottom: "1px solid #EEF1F6", background: selected.has(item.batchId) ? "#EFF6FF" : "#fff" }}>
                      <td style={{ padding: "10px 0 10px 14px" }}><input type="checkbox" aria-label={`Select ${item.product} ${item.batchNo}`} checked={selected.has(item.batchId)} onChange={() => toggleSel(item.batchId)} style={{ width: 14, height: 14, cursor: "pointer" }} /></td>
                      <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: bin ? "#0C1B33" : "#9CA3AF" }}>{bin?.name ?? "Not in a bin"}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{bin?.zone ?? item.location}</div>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{item.product}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.category} · {item.manufacturer}</div>
                      </td>
                      <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{item.batchNo}</td>
                      <td style={{ padding: "11px 12px" }}><ExpiryBadge date={item.expiry} days={item.daysToExpiry} /></td>
                      <td style={{ padding: "11px 12px" }}><TempPill zone={bin?.tempZone ?? "Ambient"} /></td>
                      <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 13, color: item.low ? "#E65100" : "#1A2436", fontWeight: 600, whiteSpace: "nowrap" }}>{item.quantity.toLocaleString()}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280" }}>{bin ? bin.maxCapacity.toLocaleString() : "—"}</td>
                      <td style={{ padding: "11px 12px", minWidth: 120 }}>
                        {bin ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${bin.fillPct}%`, background: fillColor(bin.fillPct) }} /></div>
                            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: fillColor(bin.fillPct), fontWeight: 600, minWidth: 32 }}>{bin.fillPct}%</span>
                          </div>
                        ) : <span style={{ color: "#9CA3AF" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 12px" }}>{item.low ? <span style={pill("#FFF3E0", "#E65100")}>Low Stock</span> : <span style={pill("#E8F5E9", "#2E7D32")}>In Stock</span>}</td>
                      <td style={{ padding: "11px 12px" }}>
                        {kebab(`i-${item.batchId}`, [
                          ["Move", "#1B6CA8", () => openMove([item])],
                          ...(bin ? [["Edit Bin", "#1A2436", () => openEdit(bin)], ["Mark Bin for Audit", "#1A2436", () => { setAForm({ type: AUDIT_TYPES[0], priority: "Medium", date: inDays(3), assignedTo: "", notes: "" }); setAErr(""); setAuditFor(bin); }]] as [string, string, () => void][] : []),
                        ])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {flatRows.length === 0
              ? <div style={{ padding: "48px 0", textAlign: "center", color: loadState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>{emptyMsg ?? (data.bins.length === 0 && data.unassigned.length === 0 ? "No stock yet. Receive a purchase or add a batch." : "No products match your search.")}</div>
              : <PaginationFooter {...flatFooter} />}
          </div>
        )}

        {detailMode && (
          <div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                  <th style={{ width: 32 }} />{th("Bin")}{th("Zone / Label")}{th("Rack Type")}{th("Temp Zone")}{th("SKUs")}{th("Capacity")}{th("Last Audit")}{th("Status")}{th("Actions")}
                </tr></thead>
                <tbody>
                  {binPage.map((b, idx) => {
                    const open = expanded.has(b.id);
                    return (
                      <>
                        <tr key={b.id} style={{ borderBottom: open ? "none" : "1px solid #EEF1F6", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                          <td style={{ padding: "10px 0 10px 12px" }}><button aria-label={open ? "Collapse" : "Expand"} onClick={() => toggleExpand(b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}>{open ? "▾" : "▸"}</button></td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{b.name}</td>
                          <td style={{ padding: "10px 12px" }}><div style={{ fontSize: 13, color: "#1A2436" }}>{b.label}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{b.zone} · {b.location}</div></td>
                          <td style={{ padding: "10px 12px", fontSize: 12, whiteSpace: "nowrap" }}>{b.rackType}</td>
                          <td style={{ padding: "10px 12px" }}><TempPill zone={b.tempZone} /></td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 13 }}>{b.skuCount}</td>
                          <td style={{ padding: "10px 12px", minWidth: 150 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${b.fillPct}%`, background: fillColor(b.fillPct) }} /></div>
                              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: fillColor(b.fillPct), fontWeight: 600, minWidth: 32 }}>{b.fillPct}%</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono", marginTop: 2 }}>{b.used} / {b.maxCapacity}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{b.lastAudit || "Never"}{b.nextAudit && <div style={{ fontSize: 10, color: "#1B6CA8" }}>next {b.nextAudit}</div>}</td>
                          <td style={{ padding: "10px 12px" }}><StatusPill status={b.status} /></td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button onClick={() => { setAForm({ type: AUDIT_TYPES[0], priority: "Medium", date: inDays(3), assignedTo: "", notes: "" }); setAErr(""); setAuditFor(b); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontWeight: 600, cursor: "pointer" }}>Audit</button>
                              {kebab(`b-${b.id}`, [
                                ["Edit Bin", "#1A2436", () => openEdit(b)],
                                ...(b.tempZone !== "Ambient" ? [["Temperature Log", "#1A2436", () => { setTempErr(""); setTempVal(""); setTempBin(b); }]] as [string, string, () => void][] : []),
                                ["Deactivate Bin", "#C62828", () => removeBin(b)],
                              ])}
                            </div>
                          </td>
                        </tr>
                        {open && (b.items.length === 0
                          ? <tr key={`${b.id}-e`} style={{ background: "#F8FAFC" }}><td /><td colSpan={9} style={{ padding: "10px 12px 14px 20px", fontSize: 12, color: "#9CA3AF" }}>This bin is empty.</td></tr>
                          : b.items.map(i => (
                            <tr key={`${b.id}-${i.batchId}`} style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>
                              <td />
                              <td colSpan={2} style={{ padding: "8px 12px 8px 20px" }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input type="checkbox" checked={selected.has(i.batchId)} onChange={() => toggleSel(i.batchId)} aria-label={`Select ${i.product} ${i.batchNo}`} />
                                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{i.product}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{i.category} · {i.manufacturer}</div></div>
                                </div>
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{i.batchNo}</td>
                              <td style={{ padding: "8px 12px" }}><ExpiryBadge date={i.expiry} days={i.daysToExpiry} /></td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: i.low ? "#E65100" : "#1A2436" }}>{i.quantity.toLocaleString()}</td>
                              <td colSpan={3} style={{ padding: "8px 12px" }}>{i.low ? <span style={pill("#FFF3E0", "#E65100")}>Low Stock</span> : <span style={pill("#E8F5E9", "#2E7D32")}>In Stock</span>}</td>
                              <td style={{ padding: "8px 12px" }}><button onClick={() => openMove([i])} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontWeight: 600, cursor: "pointer" }}>Move</button></td>
                            </tr>
                          )))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {binRows.length === 0
              ? <div style={{ padding: "48px 0", textAlign: "center", color: loadState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>{emptyMsg ?? (data.bins.length === 0 ? "No bins yet. Create one to start shelving stock." : "No bins match your search.")}</div>
              : <PaginationFooter {...binFooter} />}
          </div>
        )}
      </div>

      {/* Bin audits */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Bin Audits</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>{pending.length} waiting · {audits.length} total</span>
        </div>
        {audits.length === 0
          ? <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{emptyMsg ?? "No audits yet. Use Audit on a bin to schedule one."}</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#F8FAFC" }}>{["Bin", "Type", "Priority", "Scheduled", "Assigned To", "Status", "Variances", ""].map(h => th(h))}</tr></thead>
              <tbody>
                {audits.slice(0, 8).map(a => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #EEF1F6", background: a.status === "Overdue" ? "#FFF5F5" : "#fff" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600 }}>{a.bin}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{a.type}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{a.priority}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{a.scheduledDate}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{a.assignedTo}</td>
                    <td style={{ padding: "10px 12px" }}><span style={a.status === "Completed" ? pill("#E8F5E9", "#2E7D32") : a.status === "Overdue" ? pill("#FFEBEE", "#C62828") : pill("#EFF6FF", "#1B6CA8")}>{a.status}</span></td>
                    <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12 }}>{a.status === "Completed" ? a.variancesFound : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{(a.status === "Scheduled" || a.status === "Overdue") && <button onClick={() => { setFinishFor(a); setVariances("0"); setAErr(""); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 600, cursor: "pointer" }}>Complete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Create / edit bin */}
      {binModal && (
        <Modal title={binModal.id ? "Edit Bin" : "Create Location"} subtitle={binModal.id ? `Bin ${form.name}` : "Add a rack, shelf or bin to a storage location"} onClose={() => setBinModal(null)} width={520}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={lbl}>Bin ID</label><input aria-label="Bin ID" value={form.name} readOnly={!!binModal.id} onChange={e => setF("name", e.target.value)} placeholder="e.g. A1-02" style={{ ...field, background: binModal.id ? "#F8FAFC" : "#fff", borderColor: formErr.name ? "#C62828" : "#DDE3EC" }} />{formErr.name && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErr.name}</div>}</div>
            <div><label style={lbl}>Storage location</label>
              <select aria-label="Storage location" value={form.locationId} disabled={!!binModal.id} onChange={e => setF("locationId", e.target.value)} style={field}>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Label</label><input aria-label="Label" value={form.label} onChange={e => setF("label", e.target.value)} placeholder="e.g. Rack A · Shelf 1 · Bin 2" style={field} /></div>
            <div><label style={lbl}>Zone</label><input aria-label="Zone" value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Rack A" style={{ ...field, borderColor: formErr.zone ? "#C62828" : "#DDE3EC" }} />{formErr.zone && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErr.zone}</div>}</div>
            <div><label style={lbl}>Max capacity (units)</label><input aria-label="Max capacity" type="number" min={1} value={form.maxCapacity} onChange={e => setF("maxCapacity", e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono", borderColor: formErr.maxCapacity ? "#C62828" : "#DDE3EC" }} />{formErr.maxCapacity && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>{formErr.maxCapacity}</div>}</div>
            <div><label style={lbl}>Rack type</label><select aria-label="Rack type" value={form.rackType} onChange={e => setF("rackType", e.target.value)} style={field}>{RACK_TYPES.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label style={lbl}>Temperature zone</label><select aria-label="Temperature zone" value={form.tempZone} onChange={e => setF("tempZone", e.target.value)} style={field}>{TEMP_ZONES.map(r => <option key={r}>{r}</option>)}</select></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><textarea aria-label="Notes" rows={2} value={form.notes} onChange={e => setF("notes", e.target.value)} style={{ ...field, resize: "vertical" }} /></div>
          </div>
          <Actions onCancel={() => setBinModal(null)} onSave={submitBin} busy={busy} error={error} label={binModal.id ? "Save Changes" : "Create Bin"} />
        </Modal>
      )}

      {/* Move */}
      {moveItems && (
        <Modal title="Move Stock" subtitle={moveItems.length === 1 ? `${moveItems[0].product} · batch ${moveItems[0].batchNo}` : `${moveItems.length} batches`} onClose={() => setMoveItems(null)}>
          {!sameLoc ? (
            <div style={{ fontSize: 13, color: "#B91C1C" }}>These batches are in different storage locations. Select batches from one location at a time, or use a stock transfer to move between locations.</div>
          ) : (
            <>
              <div><label style={lbl}>Move to</label>
                <select aria-label="Destination bin" value={moveTo} onChange={e => setMoveTo(e.target.value)} style={field}>
                  <option value="">— Choose a bin —</option>
                  {targets.map(b => <option key={b.id} value={b.id}>{b.name} · {b.zone} · {b.maxCapacity - b.used} free</option>)}
                  <option value={NO_BIN}>No bin (take out of its bin)</option>
                </select></div>
              {suggestions().length > 0 && (
                <div style={{ fontSize: 12, color: "#6B7280" }}>Suggested ({STORAGE_LABEL[storageType]}):{" "}
                  {suggestions().map(id => <button key={id} onClick={() => setMoveTo(id)} style={{ marginRight: 6, padding: "2px 8px", borderRadius: 4, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 11, cursor: "pointer" }}>{data.bins.find(b => b.id === id)?.name}</button>)}
                </div>
              )}
              {moveItems.length === 1 && <div><label style={lbl}>Quantity (max {moveItems[0].quantity})</label><input aria-label="Quantity" type="number" min={1} max={moveItems[0].quantity} value={moveQty} onChange={e => setMoveQty(e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>}
              {moveItems.length > 1 && <div style={{ fontSize: 12, color: "#6B7280" }}>Each selected batch moves in full.</div>}
              <div><label style={lbl}>Reason</label><input aria-label="Reason" value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="e.g. Reorganising rack" style={field} /></div>
              <Actions onCancel={() => setMoveItems(null)} onSave={submitMove} busy={moveBusy} error={moveErr} label="Confirm Move" disabled={!moveTo} />
            </>
          )}
        </Modal>
      )}

      {/* Schedule audit */}
      {auditFor && (
        <Modal title="Mark Bin for Audit" subtitle={`Bin ${auditFor.name} · ${auditFor.label}`} onClose={() => setAuditFor(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={lbl}>Audit type</label><select aria-label="Audit type" value={aForm.type} onChange={e => setAForm(p => ({ ...p, type: e.target.value }))} style={field}>{AUDIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label style={lbl}>Priority</label><select aria-label="Priority" value={aForm.priority} onChange={e => setAForm(p => ({ ...p, priority: e.target.value }))} style={field}><option>High</option><option>Medium</option><option>Low</option></select></div>
            <div><label style={lbl}>Scheduled date</label><DatePicker value={aForm.date} onChange={v => setAForm(p => ({ ...p, date: v }))} /></div>
            <div><label style={lbl}>Assign to</label><input aria-label="Assign to" value={aForm.assignedTo} onChange={e => setAForm(p => ({ ...p, assignedTo: e.target.value }))} placeholder="Staff member" style={field} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><textarea aria-label="Audit notes" rows={2} value={aForm.notes} onChange={e => setAForm(p => ({ ...p, notes: e.target.value }))} style={{ ...field, resize: "vertical" }} /></div>
          </div>
          <Actions onCancel={() => setAuditFor(null)} onSave={submitAudit} busy={aBusy} error={aErr} label="Schedule Audit" />
        </Modal>
      )}
      {finishFor && (
        <Modal title="Complete Audit" subtitle={`${finishFor.bin} · ${finishFor.type}`} onClose={() => setFinishFor(null)} width={400}>
          <div><label style={lbl}>Variances found</label><input aria-label="Variances found" type="number" min={0} value={variances} onChange={e => setVariances(e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>If the count was different from the system, raise a stock adjustment or an investigation for the difference.</div>
          <Actions onCancel={() => setFinishFor(null)} onSave={submitFinish} busy={aBusy} error={aErr} label="Save Result" />
        </Modal>
      )}

      {/* Temperature log */}
      {tempBin && (
        <Modal title={`Temperature Log · ${tempBin.name}`} subtitle={tempLog?.range ? `Safe range ${tempLog.range[0]} to ${tempLog.range[1]} °C` : tempBin.tempZone} onClose={() => setTempBin(null)} width={560}>
          {tempLog && tempLog.excursions.length > 0 && <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "8px 12px", fontSize: 12, color: "#C62828", fontWeight: 600 }}>{tempLog.excursions.length} reading{tempLog.excursions.length > 1 ? "s" : ""} outside the safe range</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}><label style={lbl}>New reading (°C)</label><input aria-label="Temperature" type="number" step="0.1" value={tempVal} onChange={e => setTempVal(e.target.value)} style={{ ...field, fontFamily: "JetBrains Mono" }} /></div>
            <button onClick={submitTemp} disabled={busy} style={btn(true)}>Record</button>
          </div>
          {tempErr && <div role="alert" style={{ color: "#B91C1C", fontSize: 12 }}>{tempErr}</div>}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["When", "Temp", "By", "Status"].map(h => th(h))}</tr></thead>
            <tbody>
              {(tempLog?.items ?? []).slice().reverse().slice(0, 12).map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{when(r.at)}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: r.inRange === false ? "#C62828" : "#2E7D32" }}>{r.tempC}°C</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{r.by}</td>
                  <td style={{ padding: "8px 12px" }}><span style={r.inRange === false ? pill("#FFEBEE", "#C62828") : pill("#E8F5E9", "#2E7D32")}>{r.inRange === false ? "Excursion" : "In range"}</span></td>
                </tr>
              ))}
              {tempLog && tempLog.items.length === 0 && <tr><td colSpan={4} style={{ padding: 18, textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>No readings recorded yet.</td></tr>}
            </tbody>
          </table>
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
