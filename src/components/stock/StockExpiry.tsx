import { useState } from "react";
import { Th } from "../shared/Th";
import { expiryItems } from "./stockData";

export default function StockExpiry() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...expiryItems].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : expiryItems;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Expired", value: expiryItems.filter(d => d.daysLeft < 0).length, color: "#B71C1C", bg: "#FFEBEE" },
          { label: "Expiring ≤ 30 days", value: expiryItems.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30).length, color: "#C62828", bg: "#FFEBEE" },
          { label: "Expiring ≤ 90 days", value: expiryItems.filter(d => d.daysLeft > 30 && d.daysLeft <= 90).length, color: "#E65100", bg: "#FFF3E0" },
          { label: "Expiring ≤ 180 days", value: expiryItems.filter(d => d.daysLeft > 90 && d.daysLeft <= 180).length, color: "#F57F17", bg: "#FFF8E1" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}30`, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: k.color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
          Expiry Calendar — All Products
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Drug</Th>
            <Th onSort={() => handleSort("category")} sortDir={sortCol === "category" ? sortDir : null}>Category</Th>
            <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
            <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock</Th>
            <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
            <Th onSort={() => handleSort("daysLeft")} sortDir={sortCol === "daysLeft" ? sortDir : null}>Days Left</Th>
            <Th>Action Needed</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(d => {
              const urgent = d.daysLeft < 30;
              const warning = d.daysLeft >= 30 && d.daysLeft < 90;
              const expired = d.daysLeft < 0;
              const rowBg = expired ? "#FFF5F5" : urgent ? "#FFFBEB" : "transparent";
              const dayColor = expired ? "#C62828" : urgent ? "#E65100" : warning ? "#F57F17" : "#6B7280";
              const action = expired ? "Dispose immediately" : urgent ? "Initiate return / disposal" : warning ? "Monitor & prioritise sales" : "No action required";
              return (
                <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA", background: rowBg }}>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>{d.stock}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: dayColor }}>{d.expiry}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: dayColor }}>
                      {expired ? "EXPIRED" : `${d.daysLeft}d`}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: dayColor, fontWeight: urgent || expired ? 600 : 400 }}>{action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
