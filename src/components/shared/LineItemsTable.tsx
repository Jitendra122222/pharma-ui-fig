import { useEffect, useRef, useState } from "react";
import { Th } from "./Th";
import type { Alloc, Batch, LineItem, Medicine } from "./types";

export function calcAmount(item: LineItem) {
  const base = item.qty * item.saleRate;
  const disc = base * (item.disc / 100);
  const gst = (base - disc) * (item.gst / 100);
  return base - disc + gst;
}

export function newEmptyRow(id: number): LineItem {
  return { id, barcode: "", medicineName: "", batch: null, packs: 1, qty: 1, free: 0, mrp: 0, saleRate: 0, disc: 0, gst: 5 };
}

export function pickBatch(batches: Batch[], alloc: Alloc): Batch | null {
  const stocked = batches.filter(b => b.qty > 0);
  const pool = stocked.length > 0 ? stocked : batches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) =>
    alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)
  )[0];
}

function MedicineSearchCell({
  value, onSelect, alloc = "FEFO", readOnly = false, medicines,
}: {
  value: string;
  onSelect: (med: Medicine, batch: Batch) => void;
  alloc?: Alloc;
  readOnly?: boolean;
  medicines: Medicine[];
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
  const [batchMed, setBatchMed] = useState<Medicine | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 0
    ? medicines.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.barcode.includes(query))
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setBatchMed(null); } }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const scanCurrent = () => {
    const q = query.trim();
    if (!q) return;
    const exact = medicines.find(m => m.barcode === q);
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
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 520 }}>
          <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Select Batch — {batchMed.name}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Batch #", "Qty", "Packs", "Mfg Date", "Exp Date", "MRP", "Rate"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F4F6FA", textAlign: "left", background: "#FAFBFD" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...batchMed.batches].sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)).map(b => {
                const nearExpiry = new Date(b.expDate) < new Date("2025-12-31");
                return (
                  <tr key={b.id} onClick={() => { onSelect(batchMed, b); setOpen(false); setBatchMed(null); }}
                    style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA", background: nearExpiry ? "#FFFBEB" : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = nearExpiry ? "#FFFBEB" : "transparent")}>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: b.qty < 20 ? "#C62828" : "#1A2436" }}>{b.qty}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.packs}</td>
                    <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.mfgDate}</td>
                    <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: nearExpiry ? "#E65100" : "#6B7280", fontWeight: nearExpiry ? 600 : 400 }}>{b.expDate}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.mrp.toFixed(2)}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>₹{b.saleRate.toFixed(2)}</td>
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

export function LineItemsTable({
  items, onChange, onDelete, showCheckbox, checked, onCheck, onCheckAll, alloc = "FEFO", readOnly = false,
  medicines, rateLabel = "Sale Rate", editableBatch = false,
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
  medicines: Medicine[];
  rateLabel?: string;
  editableBatch?: boolean;
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
            <Th right>{rateLabel}</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Amount</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const editBatch = editableBatch && !readOnly;
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA", background: showCheckbox && checked?.[item.id] ? "#F0F6FF" : "transparent" }}>
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
                    medicines={medicines}
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
                {/* Batch */}
                <td style={{ padding: "4px 6px" }}>
                  {editBatch ? (
                    <input
                      type="text"
                      value={item.batch?.id ?? ""}
                      placeholder="Batch #"
                      onChange={e => onChange(item.id, "batch", { ...(item.batch ?? { id: "", qty: 0, packs: 0, mfgDate: "", expDate: "", mrp: item.mrp, saleRate: item.saleRate }), id: e.target.value })}
                      style={{ width: 90, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#1B6CA8" }}
                    />
                  ) : (
                    <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                      {item.batch?.id ?? "—"}
                    </div>
                  )}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                    style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                </td>
                {/* Mfg Date */}
                <td style={{ padding: "4px 6px" }}>
                  {editBatch ? (
                    <input
                      type="date"
                      value={item.batch?.mfgDate ?? ""}
                      onChange={e => onChange(item.id, "batch", { ...(item.batch ?? { id: "", qty: 0, packs: 0, mfgDate: "", expDate: "", mrp: item.mrp, saleRate: item.saleRate }), mfgDate: e.target.value })}
                      style={{ width: 130, padding: "4px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#6B7280" }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap" }}>{item.batch?.mfgDate ?? "—"}</span>
                  )}
                </td>
                {/* Exp Date */}
                <td style={{ padding: "4px 6px" }}>
                  {editBatch ? (
                    <input
                      type="date"
                      value={item.batch?.expDate ?? ""}
                      onChange={e => onChange(item.id, "batch", { ...(item.batch ?? { id: "", qty: 0, packs: 0, mfgDate: "", expDate: "", mrp: item.mrp, saleRate: item.saleRate }), expDate: e.target.value })}
                      style={{ width: 130, padding: "4px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#6B7280" }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                      {item.batch?.expDate ?? "—"}
                    </span>
                  )}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                    style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input type="number" value={item.free || ""} disabled={readOnly} onChange={e => onChange(item.id, "free", parseFloat(e.target.value) || 0)}
                    style={{ width: 44, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
                </td>
                <td style={{ padding: "4px 8px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#9CA3AF" }}>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
