import { useState } from "react";
import { patients } from "../data/mockData";
import AddPatientDrawer from "./AddPatientDrawer";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof patients[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );
  const sortedRows = sortCol
    ? [...filtered].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : filtered;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Patients</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{patients.length} registered patients</div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}
        >
          + Add Patient
        </button>
      </div>

      <AddPatientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="grid gap-4" style={{ gridTemplateColumns: selected ? "1fr 360px" : "1fr" }}>
        <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #DDE3EC" }}>
            <input
              type="text"
              placeholder="Search by name, ID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter" }}
            />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th onClick={() => handleSort("id")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Patient ID<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "id" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("name")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Name<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("dob")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>DOB<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "dob" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "dob" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("gender")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Gender<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "gender" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "gender" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("bloodGroup")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Blood Group<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "bloodGroup" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "bloodGroup" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("phone")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Phone<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "phone" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "phone" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("allergies")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Allergies<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "allergies" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "allergies" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("lastVisit")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Last Visit<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "lastVisit" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "lastVisit" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("prescriptions")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Rx<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "prescriptions" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "prescriptions" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                <th onClick={() => handleSort("balance")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>Balance<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "balance" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "balance" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selected?.id === p.id ? "#EFF6FF" : "transparent" }}
                  onMouseEnter={(e) => { if (selected?.id !== p.id) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selected?.id === p.id ? "#EFF6FF" : "transparent"; }}
                >
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{p.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#0C1B33", fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.dob}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{p.gender}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, padding: "2px 7px", background: "#FFF3E0", color: "#E65100" }}>{p.bloodGroup}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{p.phone}</td>
                  <td style={{ padding: "11px 14px" }}>
                    {p.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.allergies.map(a => (
                          <span key={a} style={{ fontSize: 10, padding: "2px 6px", background: "#FFEBEE", color: "#C62828", fontWeight: 600 }}>{a}</span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 12, color: "#9CA3AF" }}>None</span>}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{p.lastVisit}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{p.prescriptions}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: p.balance > 0 ? 600 : 400, color: p.balance > 0 ? "#C62828" : "#9CA3AF" }}>
                    {p.balance > 0 ? `₹${p.balance.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Patient detail */}
        {selected && (
          <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>{selected.name}</div>
                <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", marginTop: 2 }}>{selected.id}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18 }}>×</button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "14px 16px" }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date of Birth", value: selected.dob },
                  { label: "Gender", value: selected.gender === "M" ? "Male" : "Female" },
                  { label: "Blood Group", value: selected.bloodGroup },
                  { label: "Phone", value: selected.phone },
                  { label: "Last Visit", value: selected.lastVisit },
                  { label: "Total Rx", value: selected.prescriptions.toString() },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Allergies</div>
              {selected.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selected.allergies.map(a => (
                    <span key={a} style={{ fontSize: 12, padding: "4px 10px", background: "#FFEBEE", color: "#C62828", fontWeight: 600 }}>⚠ {a}</span>
                  ))}
                </div>
              ) : <span style={{ fontSize: 13, color: "#9CA3AF" }}>No known allergies</span>}
            </div>

            {selected.balance > 0 && (
              <div style={{ background: "#FFF3E0", border: "1px solid #FFB74D", padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "#E65100", fontWeight: 600 }}>Outstanding Balance</div>
                <div style={{ fontSize: 20, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#E65100", marginTop: 4 }}>₹{selected.balance.toFixed(2)}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button style={{ flex: 1, padding: "9px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Rx History</button>
              <button style={{ flex: 1, padding: "9px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>New Prescription</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
