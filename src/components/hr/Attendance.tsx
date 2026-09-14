import { attendanceData } from "./hrData";

export default function Attendance() {
  const days = ["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25", "Sat 26", "Sun 27"];
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Week of July 21–27, 2025</div>
        <div className="flex gap-3" style={{ fontSize: 12, color: "#6B7280" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#2E7D32", display: "inline-block" }} />Present</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#E65100", display: "inline-block" }} />Leave</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#C62828", display: "inline-block" }} />Absent</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#EEF1F6", display: "inline-block" }} />Off</span>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFBFD" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #EEF1F6" }}>Employee</th>
              {days.map(d => (
                <th key={d} style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", minWidth: 60 }}>{d}</th>
              ))}
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6" }}>Hours</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6" }}>OT</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{e.role}</div>
                </td>
                {keys.map(k => {
                  const val = e[k];
                  const bg = val === "✓" ? "#E8F5E9" : val === "L" ? "#FFF3E0" : val === "A" ? "#FFEBEE" : "#F4F6FA";
                  const color = val === "✓" ? "#2E7D32" : val === "L" ? "#E65100" : val === "A" ? "#C62828" : "#C8CDD8";
                  return (
                    <td key={k} style={{ padding: "8px 6px", textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, background: bg, color, fontSize: 12, fontWeight: 700 }}>{val}</span>
                    </td>
                  );
                })}
                <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{e.hrs}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: e.overtime > 0 ? "#E65100" : "#C8CDD8" }}>{e.overtime > 0 ? `+${e.overtime}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
