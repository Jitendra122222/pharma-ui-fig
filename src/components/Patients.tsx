import { useState } from "react";
import { patients } from "../data/mockData";
import AddPatientDrawer from "./AddPatientDrawer";
import { Th } from "./shared/Th";
import { useTableSort } from "./shared/useTableSort";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof patients[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(filtered);

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
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Patient ID</Th>
                <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Name</Th>
                <Th onSort={() => handleSort("dob")} sortDir={sortCol === "dob" ? sortDir : null}>DOB</Th>
                <Th onSort={() => handleSort("gender")} sortDir={sortCol === "gender" ? sortDir : null}>Gender</Th>
                <Th onSort={() => handleSort("bloodGroup")} sortDir={sortCol === "bloodGroup" ? sortDir : null}>Blood Group</Th>
                <Th onSort={() => handleSort("phone")} sortDir={sortCol === "phone" ? sortDir : null}>Phone</Th>
                <Th onSort={() => handleSort("allergies")} sortDir={sortCol === "allergies" ? sortDir : null}>Allergies</Th>
                <Th onSort={() => handleSort("lastVisit")} sortDir={sortCol === "lastVisit" ? sortDir : null}>Last Visit</Th>
                <Th onSort={() => handleSort("prescriptions")} sortDir={sortCol === "prescriptions" ? sortDir : null}>Rx</Th>
                <Th onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
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
