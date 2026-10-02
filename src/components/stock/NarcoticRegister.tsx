import { useRef, useState } from "react";
import { SK } from "../../styles/stock";
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
    { id: "NR-001", date: "2026-09-01", time: "09:15", type: "Receipt",    ref: "GRN-2026-0041",  prescriber: "—",               patient: "—",                 qty: 100, balance: 100, signedBy: "Dr. P. Sharma" },
    { id: "NR-002", date: "2026-09-03", time: "11:30", type: "Issue",      ref: "RX-20260903-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",     qty: -10, balance: 90,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-003", date: "2026-09-05", time: "10:00", type: "Issue",      ref: "RX-20260905-01", prescriber: "Dr. Sarah Chen",   patient: "James Whitfield",   qty: -14, balance: 76,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-004", date: "2026-09-08", time: "14:45", type: "Issue",      ref: "RX-20260908-02", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",      qty: -10, balance: 66,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-005", date: "2026-09-12", time: "09:00", type: "Receipt",    ref: "GRN-2026-0052",  prescriber: "—",               patient: "—",                 qty: 50,  balance: 116, signedBy: "Dr. P. Sharma" },
    { id: "NR-006", date: "2026-09-15", time: "11:00", type: "Issue",      ref: "RX-20260915-01", prescriber: "Dr. Maria Santos", patient: "Margaret Thompson", qty: -10, balance: 106, signedBy: "Dr. Maria Santos" },
    { id: "NR-007", date: "2026-09-18", time: "15:20", type: "Issue",      ref: "RX-20260918-03", prescriber: "Dr. Sarah Chen",   patient: "Marcus Adeyemi",    qty: -10, balance: 96,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-008", date: "2026-09-22", time: "10:30", type: "Adjustment", ref: "ADJ-NARC-0012",  prescriber: "—",               patient: "—",                 qty: -2,  balance: 94,  signedBy: "Dr. P. Sharma" },
    { id: "NR-009", date: "2026-09-25", time: "13:10", type: "Issue",      ref: "RX-20260925-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",     qty: -10, balance: 84,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-010", date: "2026-09-28", time: "09:45", type: "Issue",      ref: "RX-20260928-02", prescriber: "Dr. Maria Santos", patient: "Elena Vasquez",     qty: -10, balance: 74,  signedBy: "Dr. Maria Santos" },
  ],
  "Alprazolam 0.5mg": [
    { id: "NR-101", date: "2026-09-02", time: "08:30", type: "Receipt",    ref: "GRN-2026-0042",  prescriber: "—",               patient: "—",                 qty: 60,  balance: 60,  signedBy: "Dr. P. Sharma" },
    { id: "NR-102", date: "2026-09-04", time: "11:00", type: "Issue",      ref: "RX-20260904-01", prescriber: "Dr. Sarah Chen",   patient: "James Whitfield",   qty: -15, balance: 45,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-103", date: "2026-09-09", time: "10:15", type: "Issue",      ref: "RX-20260909-02", prescriber: "Dr. Maria Santos", patient: "Margaret Thompson", qty: -15, balance: 30,  signedBy: "Dr. Maria Santos" },
    { id: "NR-104", date: "2026-09-14", time: "15:00", type: "Issue",      ref: "RX-20260914-01", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",      qty: -10, balance: 20,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-105", date: "2026-09-20", time: "09:00", type: "Receipt",    ref: "GRN-2026-0058",  prescriber: "—",               patient: "—",                 qty: 60,  balance: 80,  signedBy: "Dr. P. Sharma" },
    { id: "NR-106", date: "2026-09-24", time: "11:30", type: "Issue",      ref: "RX-20260924-01", prescriber: "Dr. Sarah Chen",   patient: "Sofia Lindqvist",   qty: -15, balance: 65,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-107", date: "2026-09-27", time: "14:20", type: "Issue",      ref: "RX-20260927-03", prescriber: "Dr. Maria Santos", patient: "Amara Nwosu",       qty: -10, balance: 55,  signedBy: "Dr. Maria Santos" },
  ],
  "Codeine 30mg": [
    { id: "NR-201", date: "2026-09-01", time: "10:00", type: "Receipt",    ref: "GRN-2026-0043",  prescriber: "—",               patient: "—",                 qty: 80,  balance: 80,  signedBy: "Dr. P. Sharma" },
    { id: "NR-202", date: "2026-09-06", time: "11:45", type: "Issue",      ref: "RX-20260906-01", prescriber: "Dr. Ahmed Hassan", patient: "Robert Kiefer",     qty: -8,  balance: 72,  signedBy: "Dr. Ahmed Hassan" },
    { id: "NR-203", date: "2026-09-11", time: "09:30", type: "Issue",      ref: "RX-20260911-01", prescriber: "Dr. Sarah Chen",   patient: "Marcus Adeyemi",    qty: -8,  balance: 64,  signedBy: "Dr. Sarah Chen" },
    { id: "NR-204", date: "2026-09-16", time: "14:00", type: "Issue",      ref: "RX-20260916-02", prescriber: "Dr. Maria Santos", patient: "James Whitfield",   qty: -8,  balance: 56,  signedBy: "Dr. Maria Santos" },
    { id: "NR-205", date: "2026-09-21", time: "10:45", type: "Adjustment", ref: "ADJ-NARC-0013",  prescriber: "—",               patient: "—",                 qty: -1,  balance: 55,  signedBy: "Dr. P. Sharma" },
    { id: "NR-206", date: "2026-09-26", time: "13:00", type: "Issue",      ref: "RX-20260926-01", prescriber: "Dr. Ahmed Hassan", patient: "David Okafor",      qty: -8,  balance: 47,  signedBy: "Dr. Ahmed Hassan" },
  ],
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export default function NarcoticRegister() {
  const [selDrug, setSelDrug]     = useState("");
  const [drugOpen, setDrugOpen]   = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const drugRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(8); // 0-indexed
  const [year, setYear]   = useState(2026);
  const [dateOpen, setDateOpen]   = useState(false);
  const [pickerYear, setPickerYear] = useState(2026);

  const [toast, setToast]   = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const filteredDrugs = H1_DRUGS.filter(d => d.toLowerCase().includes(drugSearch.toLowerCase()));

  const entries = (REGISTER[selDrug] ?? []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const allEntries = entries;

  const openingBalance = allEntries.length > 0 ? allEntries[0].balance - allEntries[0].qty : 0;
  const totalReceipts  = allEntries.filter(e => e.type === "Receipt").reduce((s, e) => s + e.qty, 0);
  const totalIssues    = Math.abs(allEntries.filter(e => e.type === "Issue").reduce((s, e) => s + e.qty, 0));
  const closingBalance = allEntries.length > 0 ? allEntries[allEntries.length - 1].balance : openingBalance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Opening Balance", value: String(openingBalance), color: "#1B6CA8" },
          { label: "Total Receipts",  value: `+${totalReceipts}`,    color: "#2E7D32" },
          { label: "Total Issues",    value: `-${totalIssues}`,      color: "#C62828" },
          { label: "Closing Balance", value: String(closingBalance), color: "#0C1B33" },
        ].map(k => (
          <div key={k.label} style={{ ...SK.kpiTile, background: "#fff" }}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar — search + drug dropdown + date button + actions */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>

        {/* Drug searchable dropdown */}
        <div style={{ position: "relative", flex: "0 0 280px" }}>
          {drugOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => { setDrugOpen(false); setDrugSearch(""); }} />
          )}
          <div
            onClick={() => { setDrugOpen(o => !o); setTimeout(() => drugRef.current?.focus(), 50); }}
            style={{ height: 40, padding: "0 10px", border: "1px solid #DDE3EC", borderRadius: 6, background: drugOpen ? "#fff" : "#F8FAFC", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxSizing: "border-box" as const }}
          >
            {drugOpen ? (
              <input
                ref={drugRef}
                value={drugSearch}
                onChange={e => setDrugSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Search drug..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 12, fontFamily: "Inter", color: "#1A2436", background: "transparent" }}
              />
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 12, fontFamily: "Inter", color: selDrug ? "#1A2436" : "#9CA3AF", fontWeight: selDrug ? 600 : 400 }}>
                  {selDrug || "Select drug..."}
                </span>
                {selDrug && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 5px", borderRadius: 3, background: "#FFEBEE", color: "#C62828" }}>H1</span>}
              </>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {drugOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              {filteredDrugs.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>No drugs found</div>
              ) : filteredDrugs.map(d => (
                <div key={d}
                  onMouseDown={() => { setSelDrug(d); setDrugOpen(false); setDrugSearch(""); }}
                  style={{
                    padding: "9px 12px",
                    paddingLeft: selDrug === d ? 9 : 12,
                    borderLeft: selDrug === d ? "3px solid #1B6CA8" : "3px solid transparent",
                    background: selDrug === d ? "#EFF6FF" : "#fff",
                    color: selDrug === d ? "#1B6CA8" : "#1A2436",
                    fontSize: 12, fontFamily: "Inter", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                  onMouseEnter={ev => { if (selDrug !== d) ev.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={ev => { if (selDrug !== d) ev.currentTarget.style.background = "#fff"; }}
                >
                  <span>{d}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 3, background: "#FFEBEE", color: "#C62828" }}>H1</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date filter button */}
        <div style={{ position: "relative" }}>
          {dateOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setDateOpen(false)} />
          )}
          <button
            onClick={() => { setDateOpen(o => !o); setPickerYear(year); }}
            style={{
              height: 40, padding: "0 12px", border: "1px solid #DDE3EC", borderRadius: 6,
              background: dateOpen ? "#EFF6FF" : "#FAFBFD",
              color: dateOpen ? "#1B6CA8" : "#1A2436",
              fontSize: 12, fontFamily: "Inter", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
              borderColor: dateOpen ? "#1B6CA8" : "#DDE3EC",
            }}
          >
            {/* calendar icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke={dateOpen ? "#1B6CA8" : "#6B7280"} strokeWidth="2" />
              <path d="M3 9h18" stroke={dateOpen ? "#1B6CA8" : "#6B7280"} strokeWidth="2" />
              <path d="M8 2v4M16 2v4" stroke={dateOpen ? "#1B6CA8" : "#6B7280"} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {MONTHS[month]} {year}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke={dateOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Month/year picker dropdown */}
          {dateOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 240, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
              {/* Year navigator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                <button
                  onMouseDown={() => setPickerYear(y => y - 1)}
                  style={{ width: 26, height: 26, border: "1px solid #DDE3EC", borderRadius: 5, background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{pickerYear}</span>
                <button
                  onMouseDown={() => setPickerYear(y => y + 1)}
                  style={{ width: 26, height: 26, border: "1px solid #DDE3EC", borderRadius: 5, background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              {/* Month grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 12px 12px" }}>
                {MONTHS.map((m, i) => {
                  const isActive = i === month && pickerYear === year;
                  return (
                    <button key={m}
                      onMouseDown={() => { setMonth(i); setYear(pickerYear); setDateOpen(false); }}
                      style={{
                        padding: "7px 0", border: "none", borderRadius: 5, cursor: "pointer",
                        background: isActive ? "#1B6CA8" : "transparent",
                        color: isActive ? "#fff" : "#1A2436",
                        fontSize: 12, fontFamily: "Inter", fontWeight: isActive ? 700 : 500,
                      }}
                      onMouseEnter={ev => { if (!isActive) ev.currentTarget.style.background = "#F0F3F7"; }}
                      onMouseLeave={ev => { if (!isActive) ev.currentTarget.style.background = "transparent"; }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button onClick={() => showToast(`Day register closed for ${selDrug} — ${MONTHS[month]} ${year}`)} style={SK.btnSecondary}>
          Close Day
        </button>
        <button onClick={() => window.print()} style={SK.btnPrimary}>
          Print Register
        </button>
      </div>

      {/* Register table */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={SK.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={SK.cardHeaderTitle}>{selDrug ? `${selDrug} — Schedule H1 Register` : "Schedule H1 Register"}</span>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: "#FFEBEE", color: "#C62828", fontFamily: "Inter", letterSpacing: "0.05em" }}>CONTROLLED SUBSTANCE</span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>{MONTHS[month]} {year}</span>
        </div>
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFD" }}>
                {["Date", "Time", "Type", "Ref #", "Prescriber", "Patient", "Qty", "Balance", "Signed By"].map(h => (
                  <th key={h} style={SK.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{fmtDate(e.date)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{e.time}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <Pill
                      label={e.type}
                      bg={e.type === "Receipt" ? "#E8F5E9" : e.type === "Issue" ? "#FFEBEE" : "#F0F3F7"}
                      color={e.type === "Receipt" ? "#2E7D32" : e.type === "Issue" ? "#C62828" : "#6B7280"}
                    />
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{e.ref}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.prescriber}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{e.patient}</td>
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
                    color: e.qty > 0 ? "#2E7D32" : e.qty < 0 ? "#C62828" : "#6B7280" }}>
                    {e.qty > 0 ? `+${e.qty}` : e.qty}
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 800, color: "#0C1B33" }}>{e.balance}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.signedBy}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "36px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>
                    {selDrug ? `No entries for ${selDrug} in ${MONTHS[month]} ${year}.` : "Select a drug to view its register."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 400, pointerEvents: "none" }}>
          <div style={{ background: "#2E7D32", color: "#fff", padding: "10px 24px", fontSize: 13, fontFamily: "Inter", boxShadow: "0 2px 12px rgba(0,0,0,0.18)", pointerEvents: "auto" }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
