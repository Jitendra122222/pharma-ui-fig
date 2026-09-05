import { useState } from "react";
import { prescriptions } from "../data/mockData";
import PrintDialog from "./shared/PrintDialog";
import type { PrintJobType } from "./shared/PrintDialog";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "Dispensed": { bg: "#E8F5E9", color: "#2E7D32" },
  "Pending": { bg: "#FFF3E0", color: "#E65100" },
  "Partial": { bg: "#E3F2FD", color: "#1B6CA8" },
  "Cancelled": { bg: "#F5F5F5", color: "#9E9E9E" },
};

export default function Prescriptions() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof prescriptions[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filtered = prescriptions.filter((p) => {
    const matchSearch = p.patient.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.doctor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const sortedRows = sortCol
    ? [...filtered].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : filtered;

  return (
    <>
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Prescriptions</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>℞ {prescriptions.length} total · 2 pending</div>
        </div>
        <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}>+ New Prescription</button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4">
        {["All", "Pending", "Partial", "Dispensed", "Cancelled"].slice(1).map((s) => {
          const count = prescriptions.filter(p => p.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? "All" : s)}
              style={{ padding: "16px 20px", background: "#fff", border: `1px solid ${statusFilter === s ? st.color : "#DDE3EC"}`, cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s}</div>
              <div style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, color: st.color }}>{count}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: selected ? "1fr 380px" : "1fr" }}>
        {/* List */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #DDE3EC", display: "flex", gap: 12 }}>
            <input
              type="text"
              placeholder="Search by patient, Rx ID, or doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}
            >
              {["All", "Pending", "Partial", "Dispensed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th onClick={() => handleSort("id")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Rx ID<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("date")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Date<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "date" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "date" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("patient")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Patient<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "patient" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "patient" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("doctor")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Prescribing Doctor<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "doctor" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "doctor" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("items")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Items<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "items" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "items" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("total")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Total<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "total" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "total" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("status")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Status<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "status" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "status" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC" }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((rx) => {
                const st = STATUS_STYLE[rx.status];
                return (
                  <tr
                    key={rx.id}
                    onClick={() => setSelected(selected?.id === rx.id ? null : rx)}
                    style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selected?.id === rx.id ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={(e) => { if (selected?.id !== rx.id) e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selected?.id === rx.id ? "#EFF6FF" : "transparent"; }}
                  >
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{rx.id}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{rx.date}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{rx.patient}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{rx.doctor}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{rx.items.length}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33" }}>₹{rx.total.toFixed(2)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: st.bg, color: st.color }}>{rx.status}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#1B6CA8" }}>View →</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>{selected.id}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{selected.date}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18 }}>×</button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Patient", value: selected.patient + " (" + selected.patientId + ")" },
                { label: "Doctor", value: selected.doctor },
                { label: "Status", value: selected.status },
              ].map(r => (
                <div key={r.label} className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "#6B7280" }}>{r.label}</span>
                  <span style={{ color: "#0C1B33", fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Prescribed Items</div>
              {selected.items.map((item, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #F0F3F7" }}>
                  <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{item.drug}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>Qty: {item.qty} · {item.days} days supply</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between" style={{ borderTop: "1px solid #DDE3EC", paddingTop: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "Outfit", color: "#0C1B33" }}>Total</span>
              <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>₹{selected.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPrintJob({ jobType: "Prescription Label", docId: selected.id })} style={{ flex: 1, padding: "9px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Print Label</button>
              {selected.status === "Pending" && (
                <button style={{ flex: 1, padding: "9px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Dispense</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </>
  );
}
