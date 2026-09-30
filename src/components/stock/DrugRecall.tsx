import { useState } from "react";
import { SK } from "../../styles/stock";
import { Pill } from "../shared/Pill";
import { batches, MOVEMENTS } from "./stockData";
import { salesInvoices, patientPrevItems } from "../sales/salesData";

type RecallBatch = typeof batches[0] & { quarantined?: boolean };

export default function DrugRecall() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<RecallBatch[]>([]);
  const [quarantined, setQuarantined] = useState<Set<string>>(new Set());
  const [recallActive, setRecallActive] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSearch() {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const found = batches.filter(b =>
      b.id.toLowerCase().includes(q) || b.drug.toLowerCase().includes(q)
    );
    setResults(found);
    setSearched(true);
  }

  function handleQuarantineAll() {
    const ids = new Set(results.map(b => b.id));
    setQuarantined(ids);
    setRecallActive(true);
    showToastMsg(`${results.length} batch${results.length !== 1 ? "es" : ""} quarantined. Recall case initiated.`);
  }

  // Derive affected patients from patientPrevItems × salesInvoices
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

  // Movements for affected batches (type Sale, where batch matches)
  const affectedMovements = results.flatMap(b =>
    (MOVEMENTS[b.drug] ?? [])
      .filter(m => m.type === "Sale" || (m.batch === b.id))
      .map(m => ({ ...m, batchId: b.id, drug: b.drug }))
  ).slice(0, 20);

  const STATUS_PILL: Record<string, { bg: string; color: string }> = {
    Active:         { bg: "#E8F5E9", color: "#2E7D32" },
    Low:            { bg: "#FFF8E1", color: "#F57F17" },
    "Expiring Soon":{ bg: "#FFF3E0", color: "#E65100" },
    Expired:        { bg: "#FFEBEE", color: "#C62828" },
    Quarantined:    { bg: "#F3E5F5", color: "#6A1B9A" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Recall status */}
      {recallActive && (
        <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 6, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E65100" }}>Recall in progress — {quarantined.size} batch{quarantined.size !== 1 ? "es" : ""} quarantined</span>
        </div>
      )}

      {/* Search bar */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>
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
        <button onClick={handleSearch} style={SK.btnPrimary}>
          Search
        </button>
      </div>

      {/* Empty state */}
      {!searched && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "56px 20px", textAlign: "center" as const }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Drug Recall Search</div>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>Enter a batch ID or drug name above to identify affected stock and patients.</div>
        </div>
      )}

      {/* No results */}
      {searched && results.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "40px 20px", textAlign: "center" as const }}>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>No batches found matching "{query}".</div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Affected Stock */}
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={SK.cardHeader}>
              <div>
                <span style={SK.cardHeaderTitle}>Affected Stock</span>
                <span style={SK.cardHeaderSub}>{results.length} batch{results.length !== 1 ? "es" : ""} found</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleQuarantineAll} style={SK.btnDanger}>
                  Quarantine All
                </button>
                <button onClick={() => setShowNotify(true)} style={SK.btnSecondary}>
                  Generate Notification List
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFBFD" }}>
                    {["Batch #", "Drug", "Location", "Qty On Hand", "Expiry", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const }}>{h}</th>
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
            <div style={{ ...SK.cardHeader, justifyContent: "flex-start" }}>
              <span style={SK.cardHeaderTitle}>Affected Patients</span>
              <span style={SK.cardHeaderSub}>{affectedPatients.length} invoice{affectedPatients.length !== 1 ? "s" : ""} containing affected drugs</span>
            </div>
            {affectedPatients.length > 0 ? (
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFBFD" }}>
                      {["Invoice", "Patient", "Date", "Drugs Dispensed", "Qty"].map(h => (
                        <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const }}>{h}</th>
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

          {/* Stock Movements */}
          {affectedMovements.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
              <div style={{ ...SK.cardHeader, justifyContent: "flex-start" }}>
                <span style={SK.cardHeaderTitle}>Stock Movement History</span>
                <span style={SK.cardHeaderSub}>All movements for affected drugs</span>
              </div>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFBFD" }}>
                      {["Date", "Type", "Ref", "Drug", "Qty", "User"].map(h => (
                        <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", textAlign: "left" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affectedMovements.map(m => {
                      const typeColors: Record<string, { bg: string; color: string }> = {
                        Sale: { bg: "#FFEBEE", color: "#C62828" }, GRN: { bg: "#E8F5E9", color: "#2E7D32" },
                        Adjustment: { bg: "#FFF3E0", color: "#E65100" }, Return: { bg: "#EFF6FF", color: "#1B6CA8" },
                        "Transfer In": { bg: "#E8F5E9", color: "#2E7D32" }, "Transfer Out": { bg: "#FFEBEE", color: "#C62828" },
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

      {/* Notification modal */}
      {showNotify && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 520, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Patient Notification List</span>
              <button onClick={() => setShowNotify(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>&times;</button>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
                The following patients received drugs from the recalled batches and should be contacted:
              </div>
              {affectedPatients.length > 0 ? affectedPatients.map(({ inv, matchedItems }) => (
                <div key={inv.id} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #EEF1F6", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{inv.patient}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{matchedItems.map(i => `${i.name} (${i.qty})`).join(", ")} · Invoice {inv.id}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{inv.date}</div>
                </div>
              )) : (
                <div style={{ color: "#9CA3AF", fontSize: 13 }}>No patient records to notify.</div>
              )}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowNotify(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter" }}>Close</button>
                <button onClick={() => { window.print(); setShowNotify(false); }} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#1B6CA8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>Print List</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: "#1A2436", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "Inter", zIndex: 400, boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
