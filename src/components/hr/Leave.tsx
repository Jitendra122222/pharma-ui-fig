import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { staff, leaveData } from "./hrData";

export default function Leave() {
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(leaveData);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button style={{ padding: "8px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Apply Leave</button>
      </div>

      {/* Leave balances */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 20 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 14 }}>Leave Balances — 2025</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {staff.filter(s => s.status === "Active").map(e => (
            <div key={e.id} style={{ border: "1px solid #EEF1F6", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", marginBottom: 8 }}>{e.name}</div>
              {[{ type: "Annual", total: 20, used: 5 }, { type: "Sick", total: 10, used: 1 }, { type: "Other", total: 5, used: 0 }].map(l => (
                <div key={l.type} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
                    <span>{l.type}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>{l.total - l.used}/{l.total}</span>
                  </div>
                  <div style={{ height: 4, background: "#EEF1F6" }}>
                    <div style={{ height: "100%", width: `${((l.total - l.used) / l.total) * 100}%`, background: "#1B6CA8" }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Leave Requests</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Request #</Th>
            <Th onSort={() => handleSort("employee")} sortDir={sortCol === "employee" ? sortDir : null}>Employee</Th>
            <Th onSort={() => handleSort("type")} sortDir={sortCol === "type" ? sortDir : null}>Leave Type</Th>
            <Th onSort={() => handleSort("from")} sortDir={sortCol === "from" ? sortDir : null}>From</Th>
            <Th onSort={() => handleSort("to")} sortDir={sortCol === "to" ? sortDir : null}>To</Th>
            <Th onSort={() => handleSort("days")} sortDir={sortCol === "days" ? sortDir : null}>Days</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
            <Th onSort={() => handleSort("approvedBy")} sortDir={sortCol === "approvedBy" ? sortDir : null}>Approved By</Th>
            <Th></Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(l => {
              const st = l.status === "Approved" ? { bg: "#E8F5E9", color: "#2E7D32" } : { bg: "#FFF3E0", color: "#E65100" };
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{l.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{l.employee}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{l.type}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{l.from}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{l.to}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436" }}>{l.days}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={l.status} bg={st.bg} color={st.color} /></td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{l.approvedBy}</td>
                  <td style={{ padding: "11px 14px" }}>
                    {l.status === "Pending" && (
                      <div className="flex gap-1">
                        <button style={{ padding: "4px 10px", fontSize: 11, border: "none", background: "#2E7D32", cursor: "pointer", color: "#fff" }}>Approve</button>
                        <button style={{ padding: "4px 10px", fontSize: 11, border: "none", background: "#C62828", cursor: "pointer", color: "#fff" }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
