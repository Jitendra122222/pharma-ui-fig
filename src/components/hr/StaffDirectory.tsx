import { useState } from "react";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { StatTile } from "../shared/StatTile";
import { staff } from "./hrData";

export default function StaffDirectory() {
  const [selected, setSelected] = useState<typeof staff[0] | null>(null);
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(staff);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staff.length.toString(), color: "#1B6CA8" },
          { label: "Active", value: staff.filter(s => s.status === "Active").length.toString(), color: "#2E7D32" },
          { label: "Licensed Staff", value: staff.filter(s => s.license).length.toString(), color: "#1B6CA8" },
          { label: "Monthly Payroll", value: `₹${staff.filter(s => s.status === "Active").reduce((s, e) => s + e.salary, 0).toLocaleString()}`, color: "#E65100" },
        ].map(k => (
          <StatTile key={k.label} label={k.label} value={k.value} color={k.color} accentBorder />
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: selected ? "1fr 340px" : "1fr" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Employees</div>
            <button style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Employee</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>ID</Th>
              <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Name</Th>
              <Th onSort={() => handleSort("role")} sortDir={sortCol === "role" ? sortDir : null}>Role</Th>
              <Th onSort={() => handleSort("dept")} sortDir={sortCol === "dept" ? sortDir : null}>Department</Th>
              <Th onSort={() => handleSort("phone")} sortDir={sortCol === "phone" ? sortDir : null}>Phone</Th>
              <Th onSort={() => handleSort("start")} sortDir={sortCol === "start" ? sortDir : null}>Start Date</Th>
              <Th onSort={() => handleSort("salary")} sortDir={sortCol === "salary" ? sortDir : null}>Salary/mo</Th>
              <Th onSort={() => handleSort("license")} sortDir={sortCol === "license" ? sortDir : null}>License #</Th>
              <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
            </tr></thead>
            <tbody>
              {sortedRows.map(e => (
                <tr key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)}
                  style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer", background: selected?.id === e.id ? "#EFF6FF" : "transparent" }}
                  onMouseEnter={ev => { if (selected?.id !== e.id) ev.currentTarget.style.background = "#F7F9FC"; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = selected?.id === e.id ? "#EFF6FF" : "transparent"; }}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{e.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{e.name}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{e.role}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{e.dept}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{e.phone}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{e.start}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>₹{e.salary.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: e.license ? "#2E7D32" : "#C8CDD8" }}>{e.license ?? "N/A"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <Pill label={e.status} color={e.status === "Active" ? "#2E7D32" : "#9E9E9E"} bg={e.status === "Active" ? "#E8F5E9" : "#F5F5F5"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{selected.role} · {selected.dept}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ background: "#FAFBFD", padding: 16 }}>
              {[
                { label: "Employee ID", value: selected.id },
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
                { label: "Start Date", value: selected.start },
                { label: "Monthly Salary", value: `₹${selected.salary.toLocaleString()}` },
                { label: "License #", value: selected.license ?? "Not required" },
                { label: "Status", value: selected.status },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#1A2436", fontWeight: 500 }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button style={{ flex: 1, padding: "9px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436" }}>Edit</button>
              <button style={{ flex: 1, padding: "9px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Payslip</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
