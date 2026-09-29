import { useState } from "react";
import { Pill } from "../shared/Pill";

const H1_DRUGS = ["Tramadol 50mg", "Alprazolam 0.5mg", "Codeine 30mg"];

interface NarcoticEntry {
  id: string;
  date: string;
  time: string;
  type: "Receipt" | "Issue" | "Adjustment";
  ref: string;
  prescriber: string;
  patient: string;
  qty: number;
  balance: number;
  signedBy: string;
}

const REGISTER: Record<string, NarcoticEntry[]> = {
  "Tramadol 50mg": [
    { id: "NR-001", date: "2026-09-01", time: "09:15", type: "Receipt",    ref: "GRN-2026-0041", prescriber: "—",              patient: "—",                   qty: 100, balance: 100, signedBy: "Dr. P. Sharma" },
    { id: "NR-002", date: "2026-09-03", time: "11:30", type: "Issue",      ref: "RX-20260903-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",       qty: -10, balance: 90,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-003", date: "2026-09-05", time: "10:00", type: "Issue",      ref: "RX-20260905-01", prescriber: "Dr. Sarah Chen",   patient: "James Whitfield",     qty: -14, balance: 76,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-004", date: "2026-09-08", time: "14:45", type: "Issue",      ref: "RX-20260908-02", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",        qty: -10, balance: 66,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-005", date: "2026-09-12", time: "09:00", type: "Receipt",    ref: "GRN-2026-0052", prescriber: "—",              patient: "—",                   qty: 50,  balance: 116, signedBy: "Dr. P. Sharma" },
    { id: "NR-006", date: "2026-09-15", time: "11:00", type: "Issue",      ref: "RX-20260915-01", prescriber: "Dr. Maria Santos", patient: "Margaret Thompson",   qty: -10, balance: 106, signedBy: "Dr. Maria Santos" },
    { id: "NR-007", date: "2026-09-18", time: "15:20", type: "Issue",      ref: "RX-20260918-03", prescriber: "Dr. Sarah Chen",   patient: "Marcus Adeyemi",      qty: -10, balance: 96,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-008", date: "2026-09-22", time: "10:30", type: "Adjustment", ref: "ADJ-NARC-0012",  prescriber: "—",              patient: "—",                   qty: -2,  balance: 94,  signedBy: "Dr. P. Sharma" },
    { id: "NR-009", date: "2026-09-25", time: "13:10", type: "Issue",      ref: "RX-20260925-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",       qty: -10, balance: 84,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-010", date: "2026-09-28", time: "09:45", type: "Issue",      ref: "RX-20260928-02", prescriber: "Dr. Maria Santos", patient: "Elena Vasquez",       qty: -10, balance: 74,  signedBy: "Dr. Maria Santos" },
  ],
  "Alprazolam 0.5mg": [
    { id: "NR-101", date: "2026-09-02", time: "08:30", type: "Receipt",    ref: "GRN-2026-0042", prescriber: "—",              patient: "—",                   qty: 60,  balance: 60,  signedBy: "Dr. P. Sharma" },
    { id: "NR-102", date: "2026-09-04", time: "11:00", type: "Issue",      ref: "RX-20260904-01", prescriber: "Dr. Sarah Chen",   patient: "James Whitfield",     qty: -15, balance: 45,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-103", date: "2026-09-09", time: "10:15", type: "Issue",      ref: "RX-20260909-02", prescriber: "Dr. Maria Santos", patient: "Margaret Thompson",   qty: -15, balance: 30,  signedBy: "Dr. Maria Santos" },
    { id: "NR-104", date: "2026-09-14", time: "15:00", type: "Issue",      ref: "RX-20260914-01", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",        qty: -10, balance: 20,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-105", date: "2026-09-20", time: "09:00", type: "Receipt",    ref: "GRN-2026-0058", prescriber: "—",              patient: "—",                   qty: 60,  balance: 80,  signedBy: "Dr. P. Sharma" },
    { id: "NR-106", date: "2026-09-24", time: "11:30", type: "Issue",      ref: "RX-20260924-01", prescriber: "Dr. Sarah Chen",   patient: "Sofia Lindqvist",     qty: -15, balance: 65,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-107", date: "2026-09-27", time: "14:20", type: "Issue",      ref: "RX-20260927-03", prescriber: "Dr. Maria Santos", patient: "Amara Nwosu",         qty: -10, balance: 55,  signedBy: "Dr. Maria Santos" },
  ],
  "Codeine 30mg": [
    { id: "NR-201", date: "2026-09-01", time: "10:00", type: "Receipt",    ref: "GRN-2026-0043", prescriber: "—",              patient: "—",                   qty: 80,  balance: 80,  signedBy: "Dr. P. Sharma" },
    { id: "NR-202", date: "2026-09-06", time: "11:45", type: "Issue",      ref: "RX-20260906-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",       qty: -8,  balance: 72,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-203", date: "2026-09-11", time: "09:30", type: "Issue",      ref: "RX-20260911-01", prescriber: "Dr. Sarah Chen",   patient: "Marcus Adeyemi",      qty: -8,  balance: 64,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-204", date: "2026-09-16", time: "14:00", type: "Issue",      ref: "RX-20260916-02", prescriber: "Dr. Maria Santos", patient: "James Whitfield",     qty: -8,  balance: 56,  signedBy: "Dr. Maria Santos" },
    { id: "NR-205", date: "2026-09-21", time: "10:45", type: "Adjustment", ref: "ADJ-NARC-0013",  prescriber: "—",              patient: "—",                   qty: -1,  balance: 55,  signedBy: "Dr. P. Sharma" },
    { id: "NR-206", date: "2026-09-26", time: "13:00", type: "Issue",      ref: "RX-20260926-01", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",        qty: -8,  balance: 47,  signedBy: "Dr. Ahmed Hassan" },
  ],
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function NarcoticRegister() {
  const [selDrug, setSelDrug] = useState(H1_DRUGS[0]);
  const [month, setMonth] = useState(8); // 0-indexed, 8 = Sep
  const [year, setYear] = useState(2026);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const entries = (REGISTER[selDrug] ?? []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const openingBalance = entries.length > 0 ? entries[0].balance - entries[0].qty : 0;
  const totalReceipts = entries.filter(e => e.type === "Receipt").reduce((s, e) => s + e.qty, 0);
  const totalIssues = Math.abs(entries.filter(e => e.type === "Issue").reduce((s, e) => s + e.qty, 0));
  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : openingBalance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Drug selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
        {H1_DRUGS.map(d => (
          <button key={d} onClick={() => setSelDrug(d)}
            style={{
              padding: "7px 16px", borderRadius: 20, border: "1px solid",
              borderColor: selDrug === d ? "#C62828" : "#DDE3EC",
              background: selDrug === d ? "#FFEBEE" : "#fff",
              color: selDrug === d ? "#C62828" : "#6B7280",
              fontSize: 13, fontWeight: selDrug === d ? 700 : 500, cursor: "pointer", fontFamily: "Inter",
            }}>
            {d}
            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 3, background: "#C62828", color: "#fff" }}>H1</span>
          </button>
        ))}
      </div>

      {/* Month / year navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          style={{ width: 28, height: 28, border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit", minWidth: 120, textAlign: "center" as const }}>{MONTHS[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          style={{ width: 28, height: 28, border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Opening Balance", value: openingBalance, color: "#1B6CA8", bg: "#EFF6FF" },
          { label: "Total Receipts",  value: `+${totalReceipts}`,  color: "#2E7D32", bg: "#E8F5E9" },
          { label: "Total Issues",    value: `-${totalIssues}`,    color: "#C62828", bg: "#FFEBEE" },
          { label: "Closing Balance", value: closingBalance,       color: "#0C1B33", bg: "#F0F3F7" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.bg}`, borderRadius: 6, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Register table */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>
            {selDrug} — Schedule H1 Register
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => showToast(`Day register closed for ${selDrug} — ${MONTHS[month]} ${year}`)}
              style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
              Close Day
            </button>
            <button onClick={() => window.print()}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Print Register
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFD" }}>
                {["Date", "Time", "Type", "Ref #", "Prescriber", "Patient", "Qty", "Balance", "Signed By"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const, whiteSpace: "nowrap" as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{e.date}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{e.time}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Pill
                      label={e.type}
                      bg={e.type === "Receipt" ? "#E8F5E9" : e.type === "Issue" ? "#FFEBEE" : "#F0F3F7"}
                      color={e.type === "Receipt" ? "#2E7D32" : e.type === "Issue" ? "#C62828" : "#6B7280"}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{e.ref}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.prescriber}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{e.patient}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
                    color: e.qty > 0 ? "#2E7D32" : e.qty < 0 ? "#C62828" : "#6B7280" }}>
                    {e.qty > 0 ? `+${e.qty}` : e.qty}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 800, color: "#0C1B33" }}>{e.balance}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.signedBy}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>
                    No entries for {selDrug} in {MONTHS[month]} {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: "#1A2436", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "Inter", zIndex: 400, boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
