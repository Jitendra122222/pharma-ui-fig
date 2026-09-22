import { useState } from "react";
import { drugs } from "../../data/mockData";

export default function StockTransfer() {
  const [lines, setLines] = useState([{ drug: "", qty: "" }]);
  return (
    <div className="flex flex-col gap-5">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 22 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Transfer Details</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "From Location", type: "select", opts: ["Main Store", "Cold Storage", "Dispensary Counter", "Controlled Substances Safe"] },
            { label: "To Location", type: "select", opts: ["Main Store", "Cold Storage", "Dispensary Counter", "Controlled Substances Safe"] },
            { label: "Transfer Date", type: "date", val: "2025-07-28" },
            { label: "Requested By", type: "select", opts: ["Jane Doe", "Mark Stevens", "Anna Kowalski"] },
            { label: "Approved By", type: "select", opts: ["Jane Doe", "Mark Stevens"] },
            { label: "Notes", type: "text", ph: "Reason for transfer" },
          ].map((f: any) => (
            <div key={f.label}>
              <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  {f.opts.map((o: string) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === "date" ? (
                <input type="date" defaultValue={f.val} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              ) : (
                <input type="text" placeholder={f.ph} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Items to Transfer</div>
          <button onClick={() => setLines(l => [...l, { drug: "", qty: "" }])}
            style={{ padding: "6px 14px", border: "1px solid #1B6CA8", background: "transparent", color: "#1B6CA8", fontSize: 12, cursor: "pointer" }}>+ Add Item</button>
        </div>
        <div style={{ padding: 16 }}>
          {lines.map((ln, i) => (
            <div key={i} className="grid gap-3 mb-3" style={{ gridTemplateColumns: "3fr 1fr auto" }}>
              <select value={ln.drug} onChange={e => setLines(l => l.map((r, j) => j === i ? { ...r, drug: e.target.value } : r))}
                style={{ padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff" }}>
                <option value="">— Select Drug —</option>
                {drugs.map(d => <option key={d.id}>{d.name}</option>)}
              </select>
              <input type="number" placeholder="Qty" value={ln.qty} onChange={e => setLines(l => l.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))}
                style={{ padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right" }} />
              {lines.length > 1 && <button onClick={() => setLines(l => l.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: "#C62828", cursor: "pointer", fontSize: 20 }}>×</button>}
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 18px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Save Draft</button>
          <button style={{ padding: "9px 22px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Transfer</button>
        </div>
      </div>
    </div>
  );
}
