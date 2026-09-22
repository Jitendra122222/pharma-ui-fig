import { Th } from "../shared/Th";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import type { LedgerRow } from "./accountsData";

export default function AgingTable({ data, type }: { data: LedgerRow[]; type: "receivable" | "payable" }) {
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(data);
  const total = data.reduce((s, r) => s + r.balance, 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Total ${type === "receivable" ? "Receivable" : "Payable"}`, value: `₹${total.toFixed(2)}`, color: type === "receivable" ? "#1B6CA8" : "#E65100" },
          { label: "Current (0–30d)", value: `₹${total.toFixed(2)}`, color: "#2E7D32" },
          { label: "Overdue (>30d)", value: "₹0.00", color: "#C62828" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder fontSize={26} />
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
          {type === "receivable" ? "Customer Receivables" : "Supplier Payables"} Ledger
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>{type === "receivable" ? "Patient" : "Supplier"}</Th>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>ID</Th>
            <Th onSort={() => handleSort("invoice")} sortDir={sortCol === "invoice" ? sortDir : null}>Invoice</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Invoice Date</Th>
            <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due Date</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
            <Th onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
            <Th onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
            <Th onSort={() => handleSort("daysOut")} sortDir={sortCol === "daysOut" ? sortDir : null}>Days Outstanding</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.id}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{r.invoice}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.date}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.due}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>₹{r.amount.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#2E7D32" }}>₹{r.paid.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: r.balance > 0 ? "#C62828" : "#9CA3AF" }}>₹{r.balance.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: r.daysOut > 30 ? "#C62828" : "#6B7280" }}>{r.daysOut}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
