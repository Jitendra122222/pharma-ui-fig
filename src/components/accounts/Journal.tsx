import { Th } from "../shared/Th";
import { useTableSort } from "../shared/useTableSort";
import { journalEntries } from "./accountsData";

export default function Journal() {
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(journalEntries);
  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Journal Entries</div>
          <button style={{ padding: "8px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Manual Entry</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>JE #</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
            <Th onSort={() => handleSort("desc")} sortDir={sortCol === "desc" ? sortDir : null}>Description</Th>
            <Th onSort={() => handleSort("dr")} sortDir={sortCol === "dr" ? sortDir : null}>Debit Account</Th>
            <Th onSort={() => handleSort("cr")} sortDir={sortCol === "cr" ? sortDir : null}>Credit Account</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
            <Th onSort={() => handleSort("ref")} sortDir={sortCol === "ref" ? sortDir : null}>Reference</Th>
            <Th onSort={() => handleSort("by")} sortDir={sortCol === "by" ? sortDir : null}>Posted By</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(je => (
              <tr key={je.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{je.id}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{je.date}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#1A2436", maxWidth: 220 }}>{je.desc}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#1B6CA8" }}>Dr: {je.dr}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#E65100" }}>Cr: {je.cr}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" }}>₹{je.amount.toFixed(2)}</td>
                <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{je.ref}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{je.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
