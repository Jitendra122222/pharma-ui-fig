import { useState } from "react";
import { drugs } from "../../data/mockData";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import { adjustments } from "./stockData";

export default function Adjustments() {
  const [showModal, setShowModal] = useState(false);
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(adjustments);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Adjustments This Month", value: adjustments.length.toString(), color: "#1B6CA8" },
          { label: "Write-offs", value: adjustments.filter(a => a.type === "Write-off").length.toString(), color: "#C62828" },
          { label: "Net Qty Change", value: adjustments.reduce((s, a) => s + a.qty, 0).toString(), color: "#E65100" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder />
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Stock Adjustments</div>
          <button onClick={() => setShowModal(true)} style={{ padding: "8px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ New Adjustment</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Adj #</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
            <Th onSort={() => handleSort("drug")} sortDir={sortCol === "drug" ? sortDir : null}>Drug</Th>
            <Th onSort={() => handleSort("type")} sortDir={sortCol === "type" ? sortDir : null}>Type</Th>
            <Th onSort={() => handleSort("qtyBefore")} sortDir={sortCol === "qtyBefore" ? sortDir : null}>Qty Before</Th>
            <Th onSort={() => handleSort("qty")} sortDir={sortCol === "qty" ? sortDir : null}>Change</Th>
            <Th onSort={() => handleSort("qtyAfter")} sortDir={sortCol === "qtyAfter" ? sortDir : null}>Qty After</Th>
            <Th onSort={() => handleSort("reason")} sortDir={sortCol === "reason" ? sortDir : null}>Reason</Th>
            <Th onSort={() => handleSort("ref")} sortDir={sortCol === "ref" ? sortDir : null}>Reference</Th>
            <Th onSort={() => handleSort("by")} sortDir={sortCol === "by" ? sortDir : null}>By</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(a => {
              const typeStyle = a.type === "Write-off" ? { bg: "#FFEBEE", color: "#C62828" } : a.type === "Damage" ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#E3F2FD", color: "#1B6CA8" };
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{a.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.date}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{a.drug}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={a.type} bg={typeStyle.bg} color={typeStyle.color} /></td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>{a.qtyBefore}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: a.qty > 0 ? "#2E7D32" : "#C62828", textAlign: "right" }}>
                    {a.qty > 0 ? `+${a.qty}` : a.qty}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>{a.qtyAfter}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{a.reason}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{a.ref}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{a.by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 500, border: "1px solid #E8ECF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>New Stock Adjustment</div>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 22 }} className="flex flex-col gap-4">
              {[
                { label: "Drug / Item", type: "select", options: drugs.map(d => d.name) },
                { label: "Adjustment Type", type: "select", options: ["Write-off", "Stock Count", "Damage", "Donation", "Other"] },
                { label: "Quantity Change", type: "number", placeholder: "Use negative for reduction (e.g. -10)" },
                { label: "Reason", type: "text", placeholder: "Describe the reason for adjustment" },
                { label: "Reference #", type: "text", placeholder: "e.g. COUNT-JUL28" },
              ].map((f: any) => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
                  {f.type === "select" ? (
                    <select style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                      <option value="">— Select —</option>
                      {f.options.map((o: string) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} placeholder={f.placeholder}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={() => setShowModal(false)} style={{ padding: "9px 22px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
