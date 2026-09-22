import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { providers } from "./insuranceData";

export default function Providers() {
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(providers);
  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Insurance Providers</div>
          <button style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Provider</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>ID</Th>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Provider Name</Th>
            <Th onSort={() => handleSort("type")} sortDir={sortCol === "type" ? sortDir : null}>Type</Th>
            <Th onSort={() => handleSort("contracts")} sortDir={sortCol === "contracts" ? sortDir : null}>Active Contracts</Th>
            <Th onSort={() => handleSort("claimsThisMonth")} sortDir={sortCol === "claimsThisMonth" ? sortDir : null}>Claims This Month</Th>
            <Th onSort={() => handleSort("paidAmt")} sortDir={sortCol === "paidAmt" ? sortDir : null}>Paid Amount</Th>
            <Th onSort={() => handleSort("avgDays")} sortDir={sortCol === "avgDays" ? sortDir : null}>Avg Turnaround</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{p.id}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.name}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: p.type === "Government" ? "#E3F2FD" : "#F0F0F0", color: p.type === "Government" ? "#1B6CA8" : "#6B7280" }}>{p.type}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>{p.contracts}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>{p.claimsThisMonth}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#2E7D32" }}>₹{p.paidAmt.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: p.avgDays > 6 ? "#E65100" : "#6B7280" }}>{p.avgDays}d</td>
                <td style={{ padding: "12px 14px" }}><Pill label={p.status} bg="#E8F5E9" color="#2E7D32" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
