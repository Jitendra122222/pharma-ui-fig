import { useState } from "react";
import { S } from "../styles/common";
import { RX } from "../styles/prescriptions";
import { prescriptions } from "../data/mockData";
import PrintDialog from "./shared/PrintDialog";
import type { PrintJobType } from "./shared/PrintDialog";
import { Th } from "./shared/Th";
import { Pill, STATUS_PILL } from "./shared/Pill";
import { useTableSort } from "./shared/useTableSort";

export default function Prescriptions() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof prescriptions[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const filtered = prescriptions.filter((p) => {
    const matchSearch = p.patient.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.doctor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(filtered);

  return (
    <>
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={S.pageTitle}>Prescriptions</h1>
          <div style={{ ...S.mutedText, marginTop: 2 }}>℞ {prescriptions.length} total · 2 pending</div>
        </div>
        <button style={S.btnPrimary}>+ New Prescription</button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4">
        {["Pending", "Partial", "Dispensed", "Cancelled"].map((s) => {
          const count = prescriptions.filter(p => p.status === s).length;
          const pill = STATUS_PILL[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? "All" : s)}
              style={{ ...RX.statusCard, border: `1px solid ${statusFilter === s ? (pill?.color ?? "#6B7280") : "#DDE3EC"}` }}
            >
              <div style={RX.statusLabel}>{s}</div>
              <div style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, color: pill?.color ?? "#6B7280" }}>{count}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: selected ? "1fr 380px" : "1fr" }}>
        {/* List */}
        <div style={RX.tableCard}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #DDE3EC", display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "5px 10px", flex: 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search by patient, Rx ID, or doctor..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", minHeight: 40, boxSizing: "border-box" as const }}
            >
              {["All", "Pending", "Partial", "Dispensed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Rx ID</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
                <Th onSort={() => handleSort("doctor")} sortDir={sortCol === "doctor" ? sortDir : null}>Prescribing Doctor</Th>
                <Th onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((rx) => (
                <tr
                  key={rx.id}
                  onClick={() => setSelected(selected?.id === rx.id ? null : rx)}
                  style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selected?.id === rx.id ? "#EFF6FF" : "transparent" }}
                  onMouseEnter={(e) => { if (selected?.id !== rx.id) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selected?.id === rx.id ? "#EFF6FF" : "transparent"; }}
                >
                  <td style={RX.rowId}>{rx.id}</td>
                  <td style={RX.rowMuted}>{rx.date}</td>
                  <td style={RX.rowName}>{rx.patient}</td>
                  <td style={RX.rowMuted}>{rx.doctor}</td>
                  <td style={RX.rowMono}>{rx.items.length}</td>
                  <td style={RX.rowMonoBold}>₹{rx.total.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px" }}><Pill status={rx.status} /></td>
                  <td style={RX.rowLink}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={RX.detailCard}>
            <div className="flex justify-between items-start">
              <div>
                <div style={RX.detailTitle}>{selected.id}</div>
                <div style={RX.detailDate}>{selected.date}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Patient", value: selected.patient + " (" + selected.patientId + ")" },
                { label: "Doctor", value: selected.doctor },
                { label: "Status", value: selected.status },
              ].map(r => (
                <div key={r.label} className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "#6B7280" }}>{r.label}</span>
                  <span style={{ color: "#0C1B33", fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={RX.itemsLabel}>Prescribed Items</div>
              {selected.items.map((item, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #F0F3F7" }}>
                  <div style={RX.itemDrug}>{item.drug}</div>
                  <div style={RX.itemMeta}>Qty: {item.qty} · {item.days} days supply</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between" style={{ borderTop: "1px solid #DDE3EC", paddingTop: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "Outfit", color: "#0C1B33" }}>Total</span>
              <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>₹{selected.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPrintJob({ jobType: "Prescription Label", docId: selected.id })} style={{ flex: 1, padding: "9px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Print Label</button>
              {selected.status === "Pending" && (
                <button style={{ flex: 1, padding: "9px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Dispense</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </>
  );
}
