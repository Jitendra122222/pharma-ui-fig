import { Th } from "../shared/Th";
import { StatTile } from "../shared/StatTile";
import { accounts } from "./accountsData";

export default function AccountsOverview() {
  const assets = accounts.filter(a => a.type === "Asset").reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter(a => a.type === "Liability").reduce((s, a) => s + Math.abs(a.balance), 0);
  const equity = accounts.filter(a => a.type === "Equity").reduce((s, a) => s + Math.abs(a.balance), 0);
  const revenue = Math.abs(accounts.find(a => a.code === "4000")!.balance);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const netIncome = revenue - expenses;

  return (
    <div className="flex flex-col gap-5">
      {/* Balance sheet summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Assets", value: `₹${assets.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "#1B6CA8", sub: "Current period" },
          { label: "Total Liabilities", value: `₹${liabilities.toFixed(2)}`, color: "#E65100", sub: "+ Equity = Assets" },
          { label: "Net Income (YTD)", value: `₹${netIncome.toFixed(2)}`, color: "#2E7D32", sub: `Revenue ₹${revenue.toFixed(0)} — Expenses ₹${expenses.toFixed(0)}` },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} sub={k.sub} accentBorder fontSize={28} />
        ))}
      </div>

      {/* Chart of accounts */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Chart of Accounts</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Code", "Account Name", "Type", "Debit Total", "Credit Total", "Balance"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {["Asset", "Liability", "Equity", "Revenue", "Expense"].map(type => {
              const group = accounts.filter(a => a.type === type);
              return [
                <tr key={`hdr-${type}`}>
                  <td colSpan={6} style={{ padding: "8px 14px", background: "#F0F6FF", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{type}</td>
                </tr>,
                ...group.map(a => (
                  <tr key={a.code} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.code}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#1A2436" }}>{a.name}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{a.type}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#6B7280" }}>₹{a.debit.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#6B7280" }}>₹{a.credit.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: Math.abs(a.balance) > 0 ? "#1A2436" : "#9CA3AF" }}>
                      ${Math.abs(a.balance).toFixed(2)}
                    </td>
                  </tr>
                ))
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
