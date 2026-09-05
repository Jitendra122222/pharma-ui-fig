import { useState } from "react";

type SubTab = "staff" | "attendance" | "payroll" | "leave";

const TABS: { id: SubTab; label: string }[] = [
  { id: "staff", label: "Staff Directory" },
  { id: "attendance", label: "Attendance" },
  { id: "payroll", label: "Payroll" },
  { id: "leave", label: "Leave Management" },
];

function Th({ children, right, center, sortDir, onSort }: { children: React.ReactNode; right?: boolean; center?: boolean; sortDir?: "asc" | "desc" | null; onSort?: () => void; }) {
  return (
    <th onClick={onSort} style={{ padding: "10px 14px", textAlign: right ? "right" : center ? "center" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD", cursor: onSort ? "pointer" : "default", userSelect: onSort ? "none" : "auto" }}>
      {onSort ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, lineHeight: 1 }}>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
          </span>
        </span>
      ) : children}
    </th>
  );
}

const staff = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", dept: "Pharmacy", phone: "+1 555-801-2200", email: "jane.doe@citycentralpharmacy.com", start: "2018-03-01", salary: 7200, status: "Active", license: "RPH-IL-04421" },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", dept: "Pharmacy", phone: "+1 555-801-2201", email: "mark.s@citycentralpharmacy.com", start: "2020-06-15", salary: 5800, status: "Active", license: "RPH-IL-05512" },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Technician", dept: "Pharmacy", phone: "+1 555-801-2202", email: "anna.k@citycentralpharmacy.com", start: "2021-09-01", salary: 3400, status: "Active", license: "CPhT-IL-1122" },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", dept: "Sales", phone: "+1 555-801-2203", email: "leo.p@citycentralpharmacy.com", start: "2023-01-10", salary: 2400, status: "Active", license: null },
  { id: "EMP-005", name: "Rachel Hunt", role: "Admin & Billing", dept: "Admin", phone: "+1 555-801-2204", email: "rachel.h@citycentralpharmacy.com", start: "2019-11-20", salary: 3200, status: "Inactive", license: null },
];

const attendanceData = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", mon: "✓", tue: "✓", wed: "✓", thu: "✓", fri: "✓", sat: "—", sun: "—", hrs: 40, overtime: 0 },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", mon: "✓", tue: "✓", wed: "✓", thu: "L", fri: "✓", sat: "✓", sun: "—", hrs: 40, overtime: 8 },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Tech", mon: "✓", tue: "✓", wed: "A", thu: "✓", fri: "✓", sat: "—", sun: "—", hrs: 32, overtime: 0 },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", mon: "✓", tue: "✓", wed: "✓", thu: "✓", fri: "✓", sat: "✓", sun: "✓", hrs: 48, overtime: 8 },
  { id: "EMP-005", name: "Rachel Hunt", role: "Admin", mon: "—", tue: "—", wed: "—", thu: "—", fri: "—", sat: "—", sun: "—", hrs: 0, overtime: 0 },
];

const payrollData = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", base: 7200, allowance: 400, overtime: 0, gross: 7600, tax: 1596, insurance: 380, net: 5624 },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", base: 5800, allowance: 250, overtime: 580, gross: 6630, tax: 1326, insurance: 295, net: 5009 },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Tech", base: 3400, allowance: 150, overtime: 0, gross: 3550, tax: 568, insurance: 159, net: 2823 },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", base: 2400, allowance: 100, overtime: 400, gross: 2900, tax: 464, insurance: 130, net: 2306 },
];

const leaveData = [
  { id: "LV-2025-0021", employee: "Mark Stevens", type: "Annual Leave", from: "2025-08-04", to: "2025-08-08", days: 5, status: "Approved", approvedBy: "Jane Doe" },
  { id: "LV-2025-0020", employee: "Anna Kowalski", type: "Sick Leave", from: "2025-07-23", to: "2025-07-23", days: 1, status: "Approved", approvedBy: "Jane Doe" },
  { id: "LV-2025-0019", employee: "Leo Pham", type: "Annual Leave", from: "2025-08-11", to: "2025-08-15", days: 5, status: "Pending", approvedBy: "—" },
  { id: "LV-2025-0018", employee: "Jane Doe", type: "Conference Leave", from: "2025-09-10", to: "2025-09-12", days: 3, status: "Approved", approvedBy: "Self" },
];

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", color, background: bg }}>{label}</span>;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

function StaffDirectory() {
  const [selected, setSelected] = useState<typeof staff[0] | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...staff].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : staff;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staff.length.toString(), color: "#1B6CA8" },
          { label: "Active", value: staff.filter(s => s.status === "Active").length.toString(), color: "#2E7D32" },
          { label: "Licensed Staff", value: staff.filter(s => s.license).length.toString(), color: "#1B6CA8" },
          { label: "Monthly Payroll", value: `₹${staff.filter(s => s.status === "Active").reduce((s, e) => s + e.salary, 0).toLocaleString()}`, color: "#E65100" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", borderTop: `3px solid ${k.color}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
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

// ─── Attendance ───────────────────────────────────────────────────────────────

function Attendance() {
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

// ─── Payroll ──────────────────────────────────────────────────────────────────

function Payroll() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const totalGross = payrollData.reduce((s, e) => s + e.gross, 0);
  const totalNet = payrollData.reduce((s, e) => s + e.net, 0);
  const totalTax = payrollData.reduce((s, e) => s + e.tax, 0);
  const sortedRows = sortCol
    ? [...payrollData].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : payrollData;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Gross", value: `₹${totalGross.toLocaleString()}`, color: "#1B6CA8" },
          { label: "Tax Deductions", value: `₹${totalTax.toLocaleString()}`, color: "#E65100" },
          { label: "Total Net Pay", value: `₹${totalNet.toLocaleString()}`, color: "#2E7D32" },
          { label: "Employees Paid", value: payrollData.length.toString(), color: "#0C1B33" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", borderTop: `3px solid ${k.color}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
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

// ─── Leave ────────────────────────────────────────────────────────────────────

function Leave() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...leaveData].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : leaveData;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HR() {
  const [tab, setTab] = useState<SubTab>("staff");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>HR & Payroll</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Staff directory · Attendance · Payroll · Leave management</div>
      </div>
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 22px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#1B6CA8" : "#9CA3AF", borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "staff" && <StaffDirectory />}
      {tab === "attendance" && <Attendance />}
      {tab === "payroll" && <Payroll />}
      {tab === "leave" && <Leave />}
    </div>
  );
}
