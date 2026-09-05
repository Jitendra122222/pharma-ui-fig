import { Th } from "./Th";
import { ToggleSwitch } from "./ToggleSwitch";
import { calcAmount } from "./LineItemsTable";
import type { Alloc, LineItem, Medicine } from "./types";
import { useEffect, useRef, useState } from "react";
import { pickBatch } from "./LineItemsTable";
import type { Batch } from "./types";

function InlineMedicineCell({
  value, onSelect, alloc, readOnly, medicines,
}: {
  value: string;
  onSelect: (med: Medicine, batch: Batch) => void;
  alloc: Alloc;
  readOnly: boolean;
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

  const results = query.length > 0
    ? medicines.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.barcode.includes(query))
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setBatchMed(null); } }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 200 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setBatchMed(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search medicine..."
        style={{ width: "100%", padding: "5px 8px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" }}
      />
      {open && !batchMed && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 260 }}>
          {results.map(m => (
            <button key={m.name} onClick={() => { setBatchMed(m); setQuery(m.name); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{m.name}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{m.barcode}</div>
            </button>
          ))}
        </div>
      )}
      {batchMed && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 480 }}>
          <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Select Batch — {batchMed.name}
          </div>
          {[...batchMed.batches].sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate)).map(b => (
            <button key={b.id} onClick={() => { onSelect(batchMed, b); setOpen(false); setBatchMed(null); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</span>
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>Exp {b.expDate}</span>
              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{b.saleRate.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReturnItemsTable({
  items, onChange, onDelete, alloc = "FEFO", readOnly = false, medicines, rateLabel = "Sale Rate",
}: {
  items: LineItem[];
  onChange: (id: number, field: keyof LineItem, value: any) => void;
  onDelete: (id: number) => void;
  alloc?: Alloc;
  readOnly?: boolean;
  medicines: Medicine[];
  rateLabel?: string;
}) {
  // ensure pickBatch import is retained
  void pickBatch;
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1200, width: "100%" }}>
        <thead>
          <tr>
            <Th>Medicine Name</Th>
            <Th>Batch No</Th>
            <Th>Exp Date</Th>
            <Th right>Pack</Th>
            <Th right>Return Qty</Th>
            <Th right>MRP</Th>
            <Th right>{rateLabel}</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Refund Amt</Th>
            <Th center>Restock</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
              <td style={{ padding: "4px 6px", minWidth: 220 }}>
                <InlineMedicineCell
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
              <td style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                  {item.batch?.id ?? "—"}
                </div>
              </td>
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                  {item.batch?.expDate ?? "—"}
                </span>
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={{ width: 60, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 600, color: readOnly ? "#6B7280" : "#C62828", background: readOnly ? "#F8FAFC" : "#fff" }} />
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
              <td style={{ padding: "4px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#C62828", whiteSpace: "nowrap" }}>
                {item.medicineName ? `-₹${calcAmount(item).toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "4px 8px", textAlign: "center" }}>
                {item.medicineName && (
                  <ToggleSwitch
                    checked={item.restock ?? true}
                    disabled={readOnly}
                    onChange={v => onChange(item.id, "restock", v)}
                  />
                )}
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
