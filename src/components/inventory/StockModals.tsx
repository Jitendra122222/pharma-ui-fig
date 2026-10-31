/**
 * Stock action dialogs for the product detail page. Each one calls the real stock endpoints and reports the
 * server's answer (or its error) back to the caller; none of them keep state of their own beyond the form.
 */
import { useState } from "react";
import { requestAdjustment, requestTransfer, setBatchStatus } from "../../lib/stockApi";
import type { ProductBatch } from "../../lib/stockApi";
import type { MasterItem } from "../../lib/mastersApi";

export interface BatchView {
  id: string; dbId: string; expiry: string; qtyCurrent: number; location: string; locationId: string | null;
  status: ProductBatch["status"];
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 13, fontFamily: "Inter",
  outline: "none", boxSizing: "border-box", background: "#fff", color: "#0C1B33", minHeight: 40,
};

const message = (e: unknown, fallback: string): string => {
  const raw = e instanceof Error ? e.message : "";
  const d = /"detail"\s*:\s*"([^"]+)"/.exec(raw)?.[1];
  const m = /"msg"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.replace(/^Value error, /, "");
  return d ?? m ?? (raw.replace(/^API \d+:\s*/, "") || fallback);
};

function Shell({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-label={title} style={{ background: "#fff", width: 480, maxHeight: "90vh", overflowY: "auto", borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, border: "1px solid #E8ECF4", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#6B7280" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>{footer}</div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: "block" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
    {children}
  </label>
);

function Actions({ onClose, onSave, busy, error, label, disabled }: {
  onClose: () => void; onSave: () => void; busy: boolean; error: string; label: string; disabled?: boolean;
}) {
  return (
    <>
      {error && <span role="alert" style={{ marginRight: "auto", color: "#B91C1C", fontSize: 12, maxWidth: 260 }}>{error}</span>}
      <button onClick={onClose} style={{ padding: "9px 18px", border: "1px solid #DDE3EC", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      <button onClick={onSave} disabled={busy || disabled}
        style={{ padding: "9px 20px", border: "none", borderRadius: 6, background: busy || disabled ? "#C8CDD8" : "#1B6CA8", color: "#fff", cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
        {busy ? "Saving…" : label}
      </button>
    </>
  );
}

const Facts = ({ rows }: { rows: [string, string][] }) => (
  <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 6, padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
    {rows.map(([k, v]) => (
      <div key={k}>
        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{k}</div>
        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33" }}>{v}</div>
      </div>
    ))}
  </div>
);

// ── Adjust stock / write off (needs a second person to approve) ──────────────

export function AdjustStockDialog({ batch, productName, reasons, writeOff, onClose, onDone }: {
  batch: BatchView; productName: string; reasons: MasterItem[]; writeOff: boolean; onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState(reasons[0]?.name ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = parseInt(qty, 10);
  const valid = Number.isInteger(n) && n >= (writeOff ? 1 : 0) && (!writeOff || n <= batch.qtyCurrent) && !!reason && (writeOff || n !== batch.qtyCurrent);

  async function save() {
    setBusy(true); setError("");
    try {
      const a = await requestAdjustment(writeOff
        ? { batchId: batch.dbId, type: "WRITE_OFF", writeOffQty: n, reason, notes }
        : { batchId: batch.dbId, type: "COUNT", countedQty: n, reason, notes });
      onDone(`${a.number} sent for approval. Stock changes once another admin or manager approves it.`);
    } catch (e) { setError(message(e, "Could not submit the adjustment")); } finally { setBusy(false); }
  }

  return (
    <Shell title={writeOff ? "Write off stock" : "Adjust stock (count)"} subtitle={`${productName} · batch ${batch.id}`} onClose={onClose}
      footer={<Actions onClose={onClose} onSave={save} busy={busy} error={error} label="Submit for approval" disabled={!valid} />}>
      <Facts rows={[["In system", String(batch.qtyCurrent)], ["Location", batch.location || "—"]]} />
      <Field label={writeOff ? "Quantity to write off" : "Counted quantity on the shelf"}>
        <input aria-label="Quantity" style={input} type="number" min={writeOff ? 1 : 0} value={qty} onChange={e => setQty(e.target.value)} placeholder={writeOff ? "e.g. 5" : String(batch.qtyCurrent)} />
      </Field>
      {!writeOff && qty !== "" && valid && (
        <div style={{ fontSize: 12, color: n < batch.qtyCurrent ? "#C62828" : "#2E7D32" }}>
          Variance {n - batch.qtyCurrent > 0 ? "+" : ""}{n - batch.qtyCurrent} units
        </div>
      )}
      <Field label="Reason">
        <select aria-label="Reason" style={input} value={reason} onChange={e => setReason(e.target.value)}>
          {reasons.length === 0 && <option value="">No reasons set up. Add some under Masters.</option>}
          {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </Field>
      <Field label="Notes (optional)"><textarea aria-label="Notes" style={{ ...input, minHeight: 64 }} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    </Shell>
  );
}

// ── Transfer between this pharmacy's locations ───────────────────────────────

export function TransferStockDialog({ batch, productName, locations, reasons, onClose, onDone }: {
  batch: BatchView; productName: string; locations: MasterItem[]; reasons: MasterItem[]; onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const targets = locations.filter(l => l.id !== batch.locationId);
  const [to, setTo] = useState(targets[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState(reasons[0]?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = parseInt(qty, 10);
  const valid = !!to && !!reason && Number.isInteger(n) && n >= 1 && n <= batch.qtyCurrent;

  async function save() {
    setBusy(true); setError("");
    try {
      const t = await requestTransfer({ batchId: batch.dbId, toLocationId: to, quantity: n, reason });
      onDone(`${t.number} requested. Stock moves when an admin or manager completes it.`);
    } catch (e) { setError(message(e, "Could not request the transfer")); } finally { setBusy(false); }
  }

  return (
    <Shell title="Transfer stock" subtitle={`${productName} · batch ${batch.id}`} onClose={onClose}
      footer={<Actions onClose={onClose} onSave={save} busy={busy} error={error} label="Request transfer" disabled={!valid} />}>
      <Facts rows={[["Available", String(batch.qtyCurrent)], ["From", batch.location || "—"]]} />
      <Field label="To location">
        <select aria-label="To location" style={input} value={to} onChange={e => setTo(e.target.value)}>
          {targets.length === 0 && <option value="">Add another storage location first</option>}
          {targets.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="Quantity"><input aria-label="Quantity" style={input} type="number" min={1} max={batch.qtyCurrent} value={qty} onChange={e => setQty(e.target.value)} /></Field>
      <Field label="Reason">
        <select aria-label="Reason" style={input} value={reason} onChange={e => setReason(e.target.value)}>
          {reasons.length === 0 && <option value="">No reasons set up. Add some under Masters.</option>}
          {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </Field>
    </Shell>
  );
}

// ── Quarantine / block / release ─────────────────────────────────────────────

export function BatchStatusDialog({ batch, productName, onClose, onDone }: {
  batch: BatchView; productName: string; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [status, setStatus] = useState<ProductBatch["status"]>(batch.status === "Active" ? "Quarantine" : "Active");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    try { await setBatchStatus(batch.dbId, status, note); onDone(`Batch ${batch.id} is now ${status}`); }
    catch (e) { setError(message(e, "Could not change the status")); } finally { setBusy(false); }
  }

  return (
    <Shell title="Batch status" subtitle={`${productName} · batch ${batch.id}`} onClose={onClose}
      footer={<Actions onClose={onClose} onSave={save} busy={busy} error={error} label="Update status" disabled={status === batch.status} />}>
      <Facts rows={[["Current status", batch.status], ["Units", String(batch.qtyCurrent)]]} />
      <Field label="New status">
        <select aria-label="New status" style={input} value={status} onChange={e => setStatus(e.target.value as ProductBatch["status"])}>
          {(["Active", "Quarantine", "Blocked", "Damaged"] as const).map(s => <option key={s} value={s}>{s === "Active" ? "Active (release for sale)" : s}</option>)}
        </select>
      </Field>
      {status !== "Active" && <div style={{ fontSize: 12, color: "#E65100" }}>This batch will not be sold or picked by FEFO until it is released.</div>}
      <Field label="Note (optional)"><textarea aria-label="Note" style={{ ...input, minHeight: 56 }} value={note} onChange={e => setNote(e.target.value)} /></Field>
    </Shell>
  );
}

// ── Place a purchase order for this product ──────────────────────────────────

import { createPurchaseOrder } from "../../lib/purchaseApi";

export function PlaceOrderDialog({ productId, productName, distributor, onClose, onDone }: {
  productId: string; productName: string; distributor: { id: string; name: string; lastRate: number };
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(distributor.lastRate ? distributor.lastRate.toFixed(2) : "");
  const [expected, setExpected] = useState("");
  const [terms, setTerms] = useState("Credit 30 Days");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = parseInt(qty, 10);
  const r = parseFloat(rate);
  const valid = Number.isInteger(q) && q >= 1 && Number.isFinite(r) && r >= 0;

  async function save() {
    setBusy(true); setError("");
    try {
      const po = await createPurchaseOrder({
        global_distributor_id: distributor.id, distributor_name: distributor.name,
        order_date: new Date().toISOString().slice(0, 10), expected_date: expected || null, payment_terms: terms,
        items: [{ global_product_id: productId, product_name: productName, quantity_ordered: q, unit_price: r }],
      });
      onDone(`Purchase order ${po.po_number} created for ${distributor.name}`);
    } catch (e) { setError(message(e, "Could not create the purchase order")); } finally { setBusy(false); }
  }

  return (
    <Shell title="New purchase order" subtitle={`${productName} · ${distributor.name}`} onClose={onClose}
      footer={<Actions onClose={onClose} onSave={save} busy={busy} error={error} label="Create order" disabled={!valid} />}>
      <Field label="Quantity"><input aria-label="Quantity" style={input} type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} /></Field>
      <Field label="Rate per unit (₹)"><input aria-label="Rate" style={input} type="number" min={0} step="0.01" value={rate} onChange={e => setRate(e.target.value)} /></Field>
      <Field label="Expected delivery (optional)"><input aria-label="Expected delivery" style={input} type="date" value={expected} onChange={e => setExpected(e.target.value)} /></Field>
      <Field label="Payment terms"><input aria-label="Payment terms" style={input} value={terms} onChange={e => setTerms(e.target.value)} /></Field>
      {valid && <div style={{ fontSize: 12, color: "#6B7280" }}>Order value ₹{(q * r).toLocaleString("en-IN", { maximumFractionDigits: 2 })} before GST</div>}
    </Shell>
  );
}
