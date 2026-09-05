import { useState } from "react";
import { suppliers } from "../data/mockData";

export default function Suppliers() {
  const [selected, setSelected] = useState<typeof suppliers[0] | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...suppliers].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : suppliers;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Suppliers</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{suppliers.length} active suppliers</div>
        </div>
        <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}>+ Add Supplier</button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: selected ? "1fr 340px" : "1fr" }}>
        <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th onClick={() => handleSort("id")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Supplier ID<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("name")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Name<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("contact")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Contact<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "contact" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "contact" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("products")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Products<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "products" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "products" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("lastOrder")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Last Order<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "lastOrder" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "lastOrder" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("balance")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Balance<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "balance" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "balance" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("rating")} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Rating<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "rating" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "rating" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selected?.id === s.id ? "#EFF6FF" : "transparent" }}
                  onMouseEnter={(e) => { if (selected?.id !== s.id) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selected?.id === s.id ? "#EFF6FF" : "transparent"; }}
                >
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{s.id}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#0C1B33", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#6B7280" }}>{s.contact}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.products}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.lastOrder}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: s.balance < 0 ? "#C62828" : "#2E7D32" }}>
                    {s.balance < 0 ? `(₹${Math.abs(s.balance).toFixed(2)})` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div className="flex items-center gap-1">
                      <span style={{ color: "#F59E0B", fontSize: 13 }}>{"★".repeat(Math.round(s.rating))}</span>
                      <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.rating}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="flex justify-between">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>{selected.name}</div>
                <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{selected.id}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18 }}>×</button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "14px 16px" }}>
              {[
                { label: "Contact Person", value: selected.contact },
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
                { label: "Address", value: selected.address },
                { label: "Products Supplied", value: selected.products.toString() },
                { label: "Last Order", value: selected.lastOrder },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "#0C1B33" }}>{r.value}</div>
                </div>
              ))}
            </div>

            {selected.balance < 0 && (
              <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "#C62828", fontWeight: 600 }}>Amount Owed</div>
                <div style={{ fontSize: 18, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>₹{Math.abs(selected.balance).toFixed(2)}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button style={{ flex: 1, padding: "9px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Order History</button>
              <button style={{ flex: 1, padding: "9px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>New Order</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
