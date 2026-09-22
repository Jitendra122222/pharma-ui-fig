import { useState, useEffect, useRef } from "react";
import { Th } from "../shared/Th";
import {
  type Alloc, type LineItem,
  MEDICINES, salesInvoices,
  formatDMY, calcAmount, pickBatch,
} from "./salesData";

// ─── Calendar / chevron icons ─────────────────────────────────────────────────

export function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5875" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function ChevronDown({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Date range picker ────────────────────────────────────────────────────────

export function DateRangePicker({
  from, to, onChange, placeholder = "Date range",
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const label = from && to ? `${formatDMY(from)} – ${formatDMY(to)}`
    : from ? `From ${formatDMY(from)}`
    : to ? `Until ${formatDMY(to)}`
    : placeholder;

  const active = !!from || !!to;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff",
          fontSize: 13, fontFamily: "Inter", cursor: "pointer",
          color: active ? "#2B3A4F" : "#8A94A8", whiteSpace: "nowrap",
          minHeight: 40,
        }}>
        <CalendarIcon />
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ marginLeft: 6, display: "inline-flex" }}><ChevronDown /></span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #EDF0F5", zIndex: 200, boxShadow: "0 10px 32px rgba(15, 30, 60, 0.10)", padding: 16, minWidth: 340 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>From</div>
              <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>To</div>
              <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F3F8" }}>
            {[
              { label: "Last 7 days", from: "2026-08-08", to: "2026-08-15" },
              { label: "This month", from: "2026-08-01", to: "2026-08-31" },
              { label: "Last month", from: "2026-07-01", to: "2026-07-31" },
              { label: "This year", from: "2026-01-01", to: "2026-12-31" },
            ].map(preset => (
              <button key={preset.label} onClick={() => { onChange(preset.from, preset.to); setOpen(false); }}
                style={{ padding: "5px 12px", border: "1px solid #EDF0F5", background: "#F8FAFC", fontSize: 11, cursor: "pointer", color: "#4A5875", fontFamily: "Inter", fontWeight: 500 }}>
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={() => onChange("", "")}
              style={{ padding: "7px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
              Clear
            </button>
            <button onClick={() => setOpen(false)}
              style={{ padding: "7px 18px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editable chip (used inside InvoiceSummaryFooter) ─────────────────────────

export function EditableChip({
  label, value, onChange, editable, color, prefix, allowNegative,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  editable: boolean;
  color: string;
  prefix?: string;
  allowNegative?: boolean;
}) {
  const displayVal = `${prefix ?? ""}₹${Math.abs(value).toFixed(2)}`;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      borderLeft: "1px solid #EEF1F6",
      background: editable ? "#FAFBFD" : undefined,
      flex: "0 0 auto",
      minWidth: 140,
    }}>
      <div>
        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>₹</span>
            <input
              type="number"
              step="0.01"
              value={value === 0 ? "" : value}
              placeholder="0.00"
              onChange={e => {
                const raw = e.target.value;
                if (raw === "" || raw === "-") { onChange?.(0); return; }
                const n = parseFloat(raw);
                if (!isNaN(n)) onChange?.(allowNegative ? n : Math.max(0, n));
              }}
              style={{
                width: 80,
                padding: "3px 6px",
                border: "1px solid #E8ECF4",
                fontSize: 13,
                fontFamily: "JetBrains Mono",
                fontWeight: 500,
                outline: "none",
                background: "#fff",
                color: "#1A2436",
              }}
            />
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color }}>
            {displayVal}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invoice summary footer ───────────────────────────────────────────────────

export function InvoiceSummaryFooter({
  items,
  paid = 0,
  cashDiscount = 0,
  onCashDiscountChange,
  adjustment = 0,
  onAdjustmentChange,
}: {
  items: LineItem[];
  paid?: number;
  cashDiscount?: number;
  onCashDiscountChange?: (v: number) => void;
  adjustment?: number;
  onAdjustmentChange?: (v: number) => void;
}) {
  const subtotal = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate : 0), 0);
  const discount = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate * (i.disc / 100) : 0), 0);
  const tax = items.reduce((s, i) => s + (i.medicineName ? (i.qty * i.saleRate - i.qty * i.saleRate * (i.disc / 100)) * (i.gst / 100) : 0), 0);
  const roundOff = 0;
  const total = subtotal - discount - cashDiscount + tax + roundOff + adjustment;
  const balance = total - paid;

  const editableCashDisc = onCashDiscountChange !== undefined;
  const editableAdjust = onAdjustmentChange !== undefined;

  const readChips = [
    { label: "Subtotal", val: `₹${subtotal.toFixed(2)}`, muted: true },
    { label: "Item Discount", val: `-₹${discount.toFixed(2)}`, muted: true },
    { label: "GST / Tax", val: `₹${tax.toFixed(2)}`, muted: true },
    { label: "Round Off", val: `₹${roundOff.toFixed(2)}`, muted: true },
    { label: "Total", val: `₹${total.toFixed(2)}`, bold: true, highlight: true },
    { label: "Paid", val: `₹${paid.toFixed(2)}`, muted: true, color: "#2E7D32" },
    { label: "Balance", val: `₹${balance.toFixed(2)}`, bold: true, color: balance > 0 ? "#C62828" : "#2E7D32" },
  ];

  return (
    <div style={{
      flexShrink: 0,
      borderTop: "2px solid #E8ECF4",
      background: "#fff",
      display: "flex",
      alignItems: "stretch",
      minHeight: 76,
    }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
        <EditableChip
          label="Cash Discount"
          value={cashDiscount}
          onChange={onCashDiscountChange}
          editable={editableCashDisc}
          color="#6B7280"
          prefix="-"
        />
        <EditableChip
          label="Adjustment"
          value={adjustment}
          onChange={onAdjustmentChange}
          editable={editableAdjust}
          color={adjustment < 0 ? "#C62828" : "#6B7280"}
          allowNegative
        />
        {readChips.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              borderLeft: "1px solid #EEF1F6",
              flex: "1 1 0",
              minWidth: 110,
            }}
          >
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
              <div style={{
                fontFamily: "JetBrains Mono",
                fontSize: s.bold ? 15 : 13,
                fontWeight: s.bold ? 700 : 500,
                color: s.color ?? (s.muted ? "#6B7280" : "#1A2436"),
                background: s.highlight ? "#EFF6FF" : undefined,
                padding: s.highlight ? "2px 6px" : undefined,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Medicine search cell ─────────────────────────────────────────────────────

export function MedicineSearchCell({
  value, onSelect, alloc = "FEFO", readOnly = false,
}: {
  value: string;
  onSelect: (med: typeof MEDICINES[0], batch: ReturnType<typeof pickBatch> & object) => void;
  alloc?: Alloc;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div style={{ padding: "5px 8px", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#1A2436", background: "#F8FAFC", border: "1px solid #E8ECF4", minWidth: 200, whiteSpace: "nowrap" }}>
        {value || "—"}
      </div>
    );
  }
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [batchMed, setBatchMed] = useState<typeof MEDICINES[0] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 0
    ? MEDICINES.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.barcode.includes(query))
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setBatchMed(null); } }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const scanCurrent = () => {
    const q = query.trim();
    if (!q) return;
    const exact = MEDICINES.find(m => m.barcode === q);
    if (exact) {
      const batch = pickBatch(exact.batches, alloc);
      if (batch) {
        onSelect(exact, batch);
        setQuery(""); setOpen(false); setBatchMed(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (results.length === 1) {
      const only = results[0];
      const batch = pickBatch(only.batches, alloc);
      if (batch) {
        onSelect(only, batch);
        setQuery(""); setOpen(false); setBatchMed(null);
        inputRef.current?.focus();
      }
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span onClick={() => inputRef.current?.focus()} style={{ fontSize: 14, color: "#C8CDD8", cursor: "pointer" }} title="Scan barcode — focus and scan, or type + Enter">⬛</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setBatchMed(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scanCurrent(); } }}
          placeholder="Search medicine, barcode..."
          style={{ flex: 1, padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", minWidth: 170 }}
        />
      </div>

      {open && !batchMed && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 280 }}>
          {results.map(m => (
            <button key={m.name} onClick={() => { setBatchMed(m); setQuery(m.name); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{m.barcode}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{m.batches.length} batch{m.batches.length !== 1 ? "es" : ""}</div>
            </button>
          ))}
        </div>
      )}

      {batchMed && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 680 }}>
          <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Select Batch — {batchMed.name}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Batch #", "Qty", "Packs", "Exp Date", "MRP", "PTR", "Margin", "Distributor"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F4F6FA", textAlign: "left", background: "#FAFBFD", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...batchMed.batches].sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)).map(b => {
                const nearExpiry = new Date(b.expDate) < new Date("2025-12-31");
                const margin = ((b.saleRate - b.ptr) / b.saleRate * 100);
                return (
                  <tr key={b.id} onClick={() => { onSelect(batchMed, b); setOpen(false); setBatchMed(null); }}
                    style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA", background: nearExpiry ? "#FFFBEB" : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = nearExpiry ? "#FFFBEB" : "transparent")}>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: b.qty < 20 ? "#C62828" : "#1A2436" }}>{b.qty}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.packs}</td>
                    <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: nearExpiry ? "#E65100" : "#6B7280", fontWeight: nearExpiry ? 600 : 400 }}>{b.expDate}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.mrp.toFixed(2)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.ptr.toFixed(2)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: margin >= 15 ? "#2E7D32" : "#E65100" }}>{margin.toFixed(1)}%</td>
                    <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "Inter", color: "#6B7280", whiteSpace: "nowrap" }}>{b.distributor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Line Items Table (shared by New Invoice and Counter Sales) ───────────────

export function LineItemsTable({
  items, onChange, onDelete, showCheckbox, checked, onCheck, onCheckAll, alloc = "FEFO", readOnly = false, stickySearch = false,
}: {
  items: LineItem[];
  onChange: (id: number, field: keyof LineItem, value: any) => void;
  onDelete: (id: number) => void;
  showCheckbox?: boolean;
  checked?: Record<number, boolean>;
  onCheck?: (id: number) => void;
  onCheckAll?: () => void;
  alloc?: Alloc;
  readOnly?: boolean;
  stickySearch?: boolean;
}) {
  const allChecked = items.length > 0 && items.filter(i => i.medicineName).every(i => checked?.[i.id]);

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1100, width: "100%" }}>
        <thead>
          <tr>
            {showCheckbox && (
              <th style={{ padding: "9px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", position: "sticky", top: 0, zIndex: 2, width: 36 }}>
                <input type="checkbox" checked={!!allChecked} onChange={onCheckAll}
                  style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
              </th>
            )}
            <Th>Barcode</Th>
            <Th>Medicine Name</Th>
            <Th>Batch</Th>
            <Th>Packs</Th>
            <Th>Mfg Date</Th>
            <Th>Exp Date</Th>
            <Th>Qty</Th>
            <Th>Free</Th>
            <Th right>MRP</Th>
            <Th right>Sale Rate</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Amount</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA", background: showCheckbox && checked?.[item.id] ? "#F0F6FF" : (stickySearch && idx === 0 ? "#F8FAFC" : "transparent"), ...(stickySearch && idx === 0 ? { position: "sticky", top: 35, zIndex: 1 } : {}) }}>
              {showCheckbox && (
                <td style={{ padding: "6px 10px" }}>
                  {item.medicineName && (
                    <input type="checkbox" checked={!!checked?.[item.id]} onChange={() => onCheck?.(item.id)}
                      style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                  )}
                </td>
              )}
              <td style={{ padding: "4px 6px", width: 36 }}>
                {!readOnly && (
                  <button title="Scan" style={{ border: "1px solid #E8ECF4", background: "#FAFBFD", padding: "4px 6px", cursor: "pointer", fontSize: 13, color: "#9CA3AF" }}>⬛</button>
                )}
              </td>
              <td style={{ padding: "4px 6px", minWidth: 220 }}>
                <MedicineSearchCell
                  value={item.medicineName}
                  alloc={alloc}
                  readOnly={readOnly}
                  onSelect={(med, batch) => {
                    onChange(item.id, "medicineName", med.name);
                    onChange(item.id, "barcode", med.barcode);
                    onChange(item.id, "batch", batch);
                    onChange(item.id, "mrp", batch.mrp);
                    onChange(item.id, "saleRate", batch.saleRate);
                    onChange(item.id, "packs", batch.packs);
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                  {item.batch?.id ?? "—"}
                </div>
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 8px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                {item.batch?.mfgDate ?? "—"}
              </td>
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                  {item.batch?.expDate ?? "—"}
                </span>
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.free || ""} disabled={readOnly} onChange={e => onChange(item.id, "free", parseFloat(e.target.value) || 0)}
                  style={{ width: 44, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 8px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#9CA3AF" }}>
                {item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.saleRate || ""} disabled={readOnly} onChange={e => onChange(item.id, "saleRate", parseFloat(e.target.value) || 0)}
                  style={{ width: 64, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.disc || ""} disabled={readOnly} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.gst || ""} disabled={readOnly} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                {item.medicineName ? `₹${calcAmount(item).toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "4px 8px" }}>
                {item.medicineName && !readOnly && (
                  <button onClick={() => onDelete(item.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Invoice ref search autocomplete ─────────────────────────────────────────

export function InvoiceRefSearch({
  value, options, onSelect, onClear,
}: {
  value: string;
  options: typeof salesInvoices;
  onSelect: (inv: typeof salesInvoices[0]) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length > 0
    ? options.filter(i => i.id.toLowerCase().includes(q) || i.patient.toLowerCase().includes(q))
    : options.slice(0, 6);

  const selected = !!value && query === value;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onClear(); }}
        onFocus={() => setOpen(true)}
        placeholder="Search invoice # or patient..."
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}

      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 320, maxHeight: 260, overflowY: "auto" }}>
          {results.map(i => (
            <button key={i.id} onClick={() => { onSelect(i); setQuery(i.id); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1B6CA8", fontFamily: "JetBrains Mono" }}>{i.id}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {i.patient} · <span style={{ fontFamily: "JetBrains Mono" }}>{i.date}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", whiteSpace: "nowrap" }}>₹{i.total.toFixed(2)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
