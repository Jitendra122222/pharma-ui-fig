import { Th } from "../shared/Th";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import { payrollData } from "./hrData";

export default function Payroll() {
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(payrollData);
  const totalGross = payrollData.reduce((s, e) => s + e.gross, 0);
  const totalNet = payrollData.reduce((s, e) => s + e.net, 0);
  const totalTax = payrollData.reduce((s, e) => s + e.tax, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Gross", value: `₹${totalGross.toLocaleString()}`, color: "#1B6CA8" },
          { label: "Tax Deductions", value: `₹${totalTax.toLocaleString()}`, color: "#E65100" },
          { label: "Total Net Pay", value: `₹${totalNet.toLocaleString()}`, color: "#2E7D32" },
          { label: "Employees Paid", value: payrollData.length.toString(), color: "#0C1B33" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder fontSize={22} />
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>July 2025 Payroll Run</div>
          <div className="flex gap-2">
            <button style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Export Payslips</button>
            <button style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Process Payroll</button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Employee</Th>
            <Th onSort={() => handleSort("role")} sortDir={sortCol === "role" ? sortDir : null}>Role</Th>
            <Th onSort={() => handleSort("base")} sortDir={sortCol === "base" ? sortDir : null}>Base Salary</Th>
            <Th onSort={() => handleSort("allowance")} sortDir={sortCol === "allowance" ? sortDir : null}>Allowances</Th>
            <Th onSort={() => handleSort("overtime")} sortDir={sortCol === "overtime" ? sortDir : null}>Overtime</Th>
            <Th onSort={() => handleSort("gross")} sortDir={sortCol === "gross" ? sortDir : null}>Gross Pay</Th>
            <Th onSort={() => handleSort("tax")} sortDir={sortCol === "tax" ? sortDir : null}>Income Tax</Th>
            <Th onSort={() => handleSort("insurance")} sortDir={sortCol === "insurance" ? sortDir : null}>Health Ins.</Th>
            <Th onSort={() => handleSort("net")} sortDir={sortCol === "net" ? sortDir : null}>Net Pay</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={ev => (ev.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{e.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>{e.role}</td>
                {[e.base, e.allowance, e.overtime].map((v, i) => (
                  <td key={i} style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#6B7280" }}>₹{v.toLocaleString()}</td>
                ))}
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#1A2436" }}>₹{e.gross.toLocaleString()}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#E65100" }}>-${e.tax.toLocaleString()}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#E65100" }}>-${e.insurance.toLocaleString()}</td>
                <td style={{ padding: "12px 14px", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#2E7D32" }}>₹{e.net.toLocaleString()}</td>
              </tr>
            ))}
            <tr style={{ background: "#F0F6FF", borderTop: "2px solid #1B6CA8" }}>
              <td colSpan={5} style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#1B6CA8", fontFamily: "Outfit" }}>TOTALS</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#1B6CA8" }}>₹{totalGross.toLocaleString()}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#E65100" }}>-${totalTax.toLocaleString()}</td>
              <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#E65100" }}>-${payrollData.reduce((s, e) => s + e.insurance, 0).toLocaleString()}</td>
              <td style={{ padding: "12px 14px", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#2E7D32" }}>₹{totalNet.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
