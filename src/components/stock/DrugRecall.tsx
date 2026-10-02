import { useState } from "react";
import { SK } from "../../styles/stock";
import { Pill } from "../shared/Pill";
import { MOVEMENTS, batches } from "./stockData";
import { salesInvoices, patientPrevItems } from "../sales/salesData";

const ALL_BATCHES = batches;

// ── Mock data ────────────────────────────────────────────────────────────────

interface RecallAlert {
  id: string;
  drug: string;
  batchRange: string;
  recallClass: "I" | "II" | "III";
  source: string;
  date: string;
  reason: string;
}

interface RecallHistoryRow {
  id: string;
  drug: string;
  batchesAffected: number;
  patientsNotified: number;
  status: "Resolved" | "Closed";
  initiatedBy: string;
  date: string;
}

const ACTIVE_ALERTS: RecallAlert[] = [
  {
    id: "RCA-2026-001",
    drug: "Metformin 1000mg",
    batchRange: "BT-2025-0117",
    recallClass: "II",
    source: "CDSCO",
    date: "2026-09-28",
    reason: "Contamination — above acceptable microbial limits",
  },
  {
    id: "RCA-2026-002",
    drug: "Atorvastatin 20mg",
    batchRange: "BT-2025-0115",
    recallClass: "I",
    source: "Manufacturer",
    date: "2026-09-30",
    reason: "Label error — incorrect dosage printed on packaging",
  },
  {
    id: "RCA-2026-003",
    drug: "Amoxicillin 500mg",
    batchRange: "BT-2025-0118",
    recallClass: "III",
    source: "FDA Alert",
    date: "2026-10-01",
    reason: "Subpotency — active ingredient below specification",
  },
];

const RECALL_HISTORY: RecallHistoryRow[] = [
  { id: "RCH-2026-004", drug: "Paracetamol 500mg",   batchesAffected: 3, patientsNotified: 12, status: "Resolved", initiatedBy: "Dr. P. Sharma",  date: "2026-08-15" },
  { id: "RCH-2026-003", drug: "Azithromycin 250mg",  batchesAffected: 1, patientsNotified: 5,  status: "Resolved", initiatedBy: "Mark Stevens",    date: "2026-07-22" },
  { id: "RCH-2026-002", drug: "Cetirizine 10mg",     batchesAffected: 2, patientsNotified: 7,  status: "Closed",   initiatedBy: "Dr. R. Sharma",   date: "2026-05-14" },
  { id: "RCH-2026-001", drug: "Ibuprofen 400mg",     batchesAffected: 2, patientsNotified: 8,  status: "Resolved", initiatedBy: "Dr. P. Sharma",   date: "2026-03-09" },
  { id: "RCH-2025-008", drug: "Metoprolol 25mg",     batchesAffected: 1, patientsNotified: 4,  status: "Closed",   initiatedBy: "Mark Stevens",    date: "2025-12-10" },
];

const CLASS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  I:   { bg: "#FFEBEE", color: "#C62828", label: "Class I"   },
  II:  { bg: "#FFF3E0", color: "#E65100", label: "Class II"  },
  III: { bg: "#EFF6FF", color: "#1B6CA8", label: "Class III" },
};

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Active:          { bg: "#E8F5E9", color: "#2E7D32" },
  Low:             { bg: "#FFF8E1", color: "#F57F17" },
  "Expiring Soon": { bg: "#FFF3E0", color: "#E65100" },
  Expired:         { bg: "#FFEBEE", color: "#C62828" },
  "Out of Stock":  { bg: "#F0F3F7", color: "#6B7280" },
  Quarantined:     { bg: "#F3E5F5", color: "#6A1B9A" },
  Resolved:        { bg: "#E8F5E9", color: "#2E7D32" },
  Closed:          { bg: "#F0F3F7", color: "#6B7280" },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function DrugRecall() {
  const [query, setQuery]           = useState("");
  const [searched, setSearched]     = useState(false);
  const [results, setResults]       = useState<RecallBatch[]>([]);
  const [quarantined, setQuarantined] = useState<Set<string>>(new Set());
  const [recallActive, setRecallActive] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [toast, setToast]           = useState<string | null>(null);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function runSearch(q: string) {
    if (!q.trim()) return;
    const lower = q.trim().toLowerCase();
    const found = ALL_BATCHES.filter(b =>
      b.id.toLowerCase().includes(lower) ||
      b.drug.toLowerCase().includes(lower) ||
      b.manufacturer.toLowerCase().includes(lower) ||
      b.category.toLowerCase().includes(lower) ||
      b.supplier.toLowerCase().includes(lower)
    );
    setResults(found);
    setSearched(true);
  }

  function handleSearch() { runSearch(query); }

  function handleInvestigate(drug: string) {
    setQuery(drug);
    runSearch(drug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleQuarantineAll() {
    const ids = new Set(results.map(b => b.id));
    setQuarantined(ids);
    setRecallActive(true);
    showToastMsg(`${results.length} batch${results.length !== 1 ? "es" : ""} quarantined. Recall case initiated.`);
  }

  const affectedPatients = results.length > 0 ? (() => {
    const drugNames = new Set(results.map(b => b.drug));
    return Object.entries(patientPrevItems)
      .filter(([, items]) => items.some(i => drugNames.has(i.name)))
      .map(([invId, items]) => {
        const inv = salesInvoices.find(si => si.id === invId);
        const matchedItems = items.filter(i => drugNames.has(i.name));
        return inv ? { inv, matchedItems } : null;
      })
      .filter(Boolean) as { inv: typeof salesInvoices[0]; matchedItems: { name: string; qty: number; packs: number }[] }[];
  })() : [];

  const affectedMovements = results.flatMap(b =>
    (MOVEMENTS[b.drug] ?? [])
      .filter(m => m.type === "Sale" || m.batch === b.id)
      .map(m => ({ ...m, batchId: b.id, drug: b.drug }))
  ).slice(0, 20);

  // KPI values
  const totalPatientsNotified = RECALL_HISTORY.reduce((s, r) => s + r.patientsNotified, 0);
  const resolvedThisMonth = RECALL_HISTORY.filter(r => r.date.startsWith("2026-09") || r.date.startsWith("2026-10")).length;

  const TH_STYLE: React.CSSProperties = {
    padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF",
    letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", textAlign: "left",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Recall active banner */}
      {recallActive && (
        <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 6, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="#E65100" strokeWidth="2.2" strokeLinecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#E65100" strokeWidth="2" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E65100", fontFamily: "Inter" }}>
            Recall in progress — {quarantined.size} batch{quarantined.size !== 1 ? "es" : ""} quarantined
          </span>
        </div>
      )}

      {/* Search bar */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 6, fontFamily: "Inter" }}>
            Batch ID or Drug Name
          </label>
          <div style={{ ...SK.searchWrapper, flex: 1 }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. BT-2025-0118 or Amoxicillin"
              style={SK.searchInput} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {searched && (
            <button onClick={() => { setSearched(false); setResults([]); setQuery(""); setRecallActive(false); setQuarantined(new Set()); }} style={SK.btnSecondary}>
              Clear
            </button>
          )}
          <button onClick={handleSearch} style={SK.btnPrimary}>
            Search
          </button>
        </div>
      </div>

      {/* ── DEFAULT VIEW ── */}
      {!searched && (
        <>
          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Active Recalls",        value: String(ACTIVE_ALERTS.length),    color: "#C62828" },
              { label: "Batches Quarantined",   value: String(quarantined.size),         color: "#6A1B9A" },
              { label: "Patients Notified",     value: String(totalPatientsNotified),    color: "#1B6CA8" },
              { label: "Resolved This Month",   value: String(resolvedThisMonth),        color: "#2E7D32" },
            ].map(k => (
              <div key={k.label} style={{ ...SK.kpiTile, background: "#fff" }}>
                <div style={SK.kpiLabel}>{k.label}</div>
                <div style={SK.kpiValue(k.color)}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Active Recall Alerts */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={SK.cardHeaderTitle}>Active Recall Alerts</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#FFEBEE", color: "#C62828", fontFamily: "Inter" }}>
                  {ACTIVE_ALERTS.length} Open
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Notices received from CDSCO, manufacturers and regulators</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {ACTIVE_ALERTS.map((alert, idx) => {
                const cls = CLASS_STYLE[alert.recallClass];
                return (
                  <div key={alert.id} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 20px",
                    borderBottom: idx < ACTIVE_ALERTS.length - 1 ? "1px solid #F0F3F7" : "none",
                    borderLeft: `3px solid ${cls.color}`,
                  }}>
                    {/* Class badge */}
                    <div style={{ flex: "0 0 72px" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: cls.bg, color: cls.color, fontFamily: "Inter", letterSpacing: "0.05em" }}>
                        {cls.label}
                      </span>
                    </div>

                    {/* Drug + reason */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter", marginBottom: 3 }}>{alert.drug}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{alert.reason}</div>
                    </div>

                    {/* Batch range */}
                    <div style={{ flex: "0 0 200px" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, fontFamily: "Inter" }}>Batch Range</div>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{alert.batchRange}</div>
                    </div>

                    {/* Source + date */}
                    <div style={{ flex: "0 0 120px" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, fontFamily: "Inter" }}>Source</div>
                      <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{alert.source}</div>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", marginTop: 1 }}>{alert.date}</div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handleInvestigate(alert.drug)}
                      style={{ ...SK.btnPrimary, flex: "0 0 auto" }}
                    >
                      Investigate
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recall History */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={{ ...SK.cardHeader, borderBottom: "1px solid #EEF1F6" }}>
              <span style={SK.cardHeaderTitle}>Recall History</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>{RECALL_HISTORY.length} past recalls</span>
            </div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFBFD" }}>
                    {["Recall ID", "Drug", "Batches Affected", "Patients Notified", "Initiated By", "Date", "Status"].map(h => (
                      <th key={h} style={TH_STYLE}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECALL_HISTORY.map(r => {
                    const sp = STATUS_PILL[r.status] ?? { bg: "#F0F3F7", color: "#6B7280" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{r.id}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{r.drug}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436", textAlign: "center" as const }}>{r.batchesAffected}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1B6CA8", textAlign: "center" as const }}>{r.patientsNotified}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.initiatedBy}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date}</td>
                        <td style={{ padding: "11px 14px" }}><Pill label={r.status} bg={sp.bg} color={sp.color} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SEARCH RESULTS VIEW ── */}
      {searched && results.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "40px 20px", textAlign: "center" as const }}>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>No batches found matching "{query}".</div>
        </div>
      )}

      {searched && results.length > 0 && (
        <>
          {/* Affected Stock */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div>
                <span style={SK.cardHeaderTitle}>Affected Stock</span>
                <span style={SK.cardHeaderSub}>{results.length} batch{results.length !== 1 ? "es" : ""} found</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleQuarantineAll} style={SK.btnDanger}>Quarantine All</button>
                <button onClick={() => setShowNotify(true)} style={SK.btnSecondary}>Generate Notification List</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFBFD" }}>
                    {["Batch #", "Drug", "Manufacturer", "Category", "Location", "Qty On Hand", "Expiry", "Status"].map(h => (
                      <th key={h} style={TH_STYLE}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(b => {
                    const isQ = quarantined.has(b.id);
                    const statusKey = isQ ? "Quarantined" : b.status;
                    const sp = STATUS_PILL[statusKey] ?? { bg: "#F0F3F7", color: "#6B7280" };
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #F0F3F7", background: isQ ? "#FAF5FF" : "transparent" }}>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.drug}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{b.manufacturer}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{b.category}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.location}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: b.qtyCurrent === 0 ? "#C62828" : "#1A2436" }}>{b.qtyCurrent}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                        <td style={{ padding: "11px 14px" }}><Pill label={statusKey} bg={sp.bg} color={sp.color} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Affected Patients */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={{ ...SK.cardHeader }}>
              <div>
                <span style={SK.cardHeaderTitle}>Affected Patients</span>
                <span style={SK.cardHeaderSub}>{affectedPatients.length} invoice{affectedPatients.length !== 1 ? "s" : ""} containing affected drugs</span>
              </div>
            </div>
            {affectedPatients.length > 0 ? (
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFBFD" }}>
                      {["Invoice", "Patient", "Date", "Drugs Dispensed", "Qty"].map(h => (
                        <th key={h} style={TH_STYLE}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affectedPatients.map(({ inv, matchedItems }) => (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{inv.id}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{inv.patient}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.date}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{matchedItems.map(i => i.name).join(", ")}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{matchedItems.reduce((s, i) => s + i.qty, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "24px 16px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>
                No patient dispensing records found for these batches.
              </div>
            )}
          </div>

          {/* Stock Movement History */}
          {affectedMovements.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
              <div style={{ ...SK.cardHeader }}>
                <div>
                  <span style={SK.cardHeaderTitle}>Stock Movement History</span>
                  <span style={SK.cardHeaderSub}>All movements for affected batches</span>
                </div>
              </div>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFBFD" }}>
                      {["Date", "Type", "Ref", "Drug", "Qty", "User"].map(h => (
                        <th key={h} style={TH_STYLE}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affectedMovements.map(m => {
                      const typeColors: Record<string, { bg: string; color: string }> = {
                        Sale:          { bg: "#FFEBEE", color: "#C62828" },
                        GRN:           { bg: "#E8F5E9", color: "#2E7D32" },
                        Adjustment:    { bg: "#FFF3E0", color: "#E65100" },
                        Return:        { bg: "#EFF6FF", color: "#1B6CA8" },
                        "Transfer In": { bg: "#E8F5E9", color: "#2E7D32" },
                        "Transfer Out":{ bg: "#FFEBEE", color: "#C62828" },
                      };
                      const tc = typeColors[m.type] ?? { bg: "#F0F3F7", color: "#6B7280" };
                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{m.date}</td>
                          <td style={{ padding: "9px 14px" }}><Pill label={m.type} bg={tc.bg} color={tc.color} /></td>
                          <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{m.ref}</td>
                          <td style={{ padding: "9px 14px", fontSize: 12, color: "#1A2436", fontWeight: 500 }}>{m.drug}</td>
                          <td style={{ padding: "9px 14px", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>
                            {m.qty > 0 ? `+${m.qty}` : m.qty}
                          </td>
                          <td style={{ padding: "9px 14px", fontSize: 12, color: "#6B7280" }}>{m.user}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Patient Notification modal */}
      {showNotify && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 520, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Patient Notification List</span>
              <button onClick={() => setShowNotify(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, fontFamily: "Inter" }}>
                The following patients received drugs from the recalled batches and should be contacted:
              </div>
              {affectedPatients.length > 0 ? affectedPatients.map(({ inv, matchedItems }) => (
                <div key={inv.id} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #EEF1F6", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{inv.patient}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>{matchedItems.map(i => `${i.name} (${i.qty})`).join(", ")} · Invoice {inv.id}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{inv.date}</div>
                </div>
              )) : (
                <div style={{ color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No patient records to notify.</div>
              )}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowNotify(false)} style={SK.btnSecondary}>Close</button>
                <button onClick={() => { window.print(); setShowNotify(false); }} style={SK.btnPrimary}>Print List</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
