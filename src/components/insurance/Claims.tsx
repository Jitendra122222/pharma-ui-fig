import { useState } from "react";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import { claims } from "./insuranceData";

export default function Claims() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = claims.filter(c =>
    (c.patient.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "All" || c.status === statusFilter)
  );
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(filtered);
  const totalClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.reduce((s, c) => s + c.approved, 0);
  const totalPending = claims.filter(c => c.status === "Pending").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Claimed", value: `₹${totalClaimed.toFixed(2)}`, color: "#1B6CA8" },
          { label: "Approved / Paid", value: `₹${totalApproved.toFixed(2)}`, color: "#2E7D32" },
          { label: "Pending Review", value: `₹${totalPending.toFixed(2)}`, color: "#F57F17" },
          { label: "Rejection Rate", value: `${((claims.filter(c => c.status === "Rejected").length / claims.length) * 100).toFixed(0)}%`, color: "#C62828" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder />
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10 }}>
          <input type="text" placeholder="Search by patient or claim ID..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter" }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff" }}>
            {["All", "Pending", "Approved", "Partial", "Paid", "Rejected"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Claim #</Th>
            <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
            <Th onSort={() => handleSort("provider")} sortDir={sortCol === "provider" ? sortDir : null}>Provider</Th>
            <Th onSort={() => handleSort("invoice")} sortDir={sortCol === "invoice" ? sortDir : null}>Invoice</Th>
            <Th onSort={() => handleSort("rx")} sortDir={sortCol === "rx" ? sortDir : null}>Rx Ref</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Billed</Th>
            <Th onSort={() => handleSort("approved")} sortDir={sortCol === "approved" ? sortDir : null}>Approved</Th>
            <Th onSort={() => handleSort("copay")} sortDir={sortCol === "copay" ? sortDir : null}>Copay</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(c => {
              const st = { Approved: { bg: "#E8F5E9", color: "#2E7D32" }, Paid: { bg: "#E8F5E9", color: "#2E7D32" }, Pending: { bg: "#FFF8E1", color: "#F57F17" }, Partial: { bg: "#E3F2FD", color: "#1B6CA8" }, Rejected: { bg: "#FFEBEE", color: "#C62828" } }[c.status] ?? { bg: "#F5F5F5", color: "#9E9E9E" };
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{c.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436", whiteSpace: "nowrap" }}>{c.patient}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{c.provider}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.invoice}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.rx}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.date}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#1A2436" }}>₹{c.amount.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#2E7D32" }}>{c.approved > 0 ? `₹${c.approved.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: c.copay > 0 ? "#E65100" : "#9CA3AF" }}>{c.copay > 0 ? `₹${c.copay.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={c.status} bg={st.bg} color={st.color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
