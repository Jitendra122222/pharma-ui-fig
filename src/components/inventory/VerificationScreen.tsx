import { useState } from "react";
import { usePagination, PaginationFooter } from "../shared/usePagination";

// ─── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_COUNTS = [
  { id: "CNT-2025-018", location: "Section A — Shelf 1-3", type: "Normal", progress: 82, counted: 41, total: 50, differences: 3, status: "Active",    assigned: "Priya K.",   started: "28 Jul, 10:15 AM" },
  { id: "CNT-2025-017", location: "Cold Storage Zone",    type: "Blind",  progress: 100, counted: 12, total: 12, differences: 1, status: "Completed", assigned: "Ramesh S.",  started: "27 Jul, 2:30 PM" },
  { id: "CNT-2025-016", location: "Section B — Full",     type: "Normal", progress: 100, counted: 78, total: 78, differences: 0, status: "Completed", assigned: "Suresh M.",  started: "25 Jul, 9:00 AM" },
  { id: "CNT-2025-015", location: "Section C — Shelf 2",  type: "Blind",  progress: 45,  counted: 9,  total: 20, differences: 2, status: "Active",    assigned: "Priya K.",   started: "28 Jul, 11:45 AM" },
  { id: "CNT-2025-014", location: "Section A — Full",     type: "Normal", progress: 100, counted: 112, total: 112, differences: 5, status: "Review",  assigned: "Ramesh S.",  started: "22 Jul, 8:30 AM" },
];

const MOCK_DISCREPANCIES = [
  { id: "DIS-2025-022", countId: "CNT-2025-018", medicine: "Amoxicillin 500mg",   batch: "A9080",     location: "A1-02", system: 240, physical: 226, diff: -14, status: "Open",          action: "" },
  { id: "DIS-2025-021", countId: "CNT-2025-018", medicine: "Ciprofloxacin 500mg", batch: "C-2025-007", location: "A1-06", system: 12,  physical: 9,   diff: -3,  status: "Investigating", action: "" },
  { id: "DIS-2025-020", countId: "CNT-2025-017", medicine: "Insulin Glargine",    batch: "IG-2025-001",location: "COLD-01", system: 45, physical: 47,  diff: +2,  status: "Resolved",      action: "Accepted" },
  { id: "DIS-2025-019", countId: "CNT-2025-015", medicine: "Atorvastatin 20mg",   batch: "AT-2025-112", location: "C1-04", system: 312, physical: 308, diff: -4,  status: "Open",          action: "" },
  { id: "DIS-2025-018", countId: "CNT-2025-015", medicine: "Warfarin 5mg",        batch: "W-445",      location: "B4-02", system: 6,   physical: 5,   diff: -1,  status: "Open",          action: "" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active:    { bg: "#EFF6FF", color: "#1B6CA8" },
  Completed: { bg: "#E8F5E9", color: "#2E7D32" },
  Review:    { bg: "#FFF3E0", color: "#E65100" },
  Open:      { bg: "#FFEBEE", color: "#C62828" },
  Investigating: { bg: "#FFF3E0", color: "#E65100" },
  Resolved:  { bg: "#E8F5E9", color: "#2E7D32" },
};

// ─── Count Session Screen ──────────────────────────────────────────────────────

const COUNT_ITEMS = [
  { id: 1, name: "Amoxicillin 500mg",    batch: "A9080",       systemQty: 240 },
  { id: 2, name: "Paracetamol 500mg",    batch: "P-1200",      systemQty: 1200 },
  { id: 3, name: "Ciprofloxacin 500mg",  batch: "C-2025-007",  systemQty: 12 },
  { id: 4, name: "Atorvastatin 20mg",    batch: "AT-2025-112", systemQty: 312 },
  { id: 5, name: "Amlodipine 5mg",       batch: "AM-2025-088", systemQty: 380 },
];

function CountSessionScreen({ count, onBack }: { count: typeof MOCK_COUNTS[0]; onBack: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [scan, setScan] = useState("");
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);

  const current = COUNT_ITEMS[currentIdx];
  const physicalQty = counts[current.id] ?? current.systemQty;
  const diff = physicalQty - current.systemQty;
  const completed = Object.keys(counts).length;
  const progress = Math.round((completed / COUNT_ITEMS.length) * 100);

  const setQty = (v: number) => { if (v >= 0) setCounts(prev => ({ ...prev, [current.id]: v })); };

  const handleNext = () => {
    if (diff !== 0) { setShowDiscrepancy(true); return; }
    if (currentIdx < COUNT_ITEMS.length - 1) setCurrentIdx(i => i + 1);
  };

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory / Verification</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{count.id}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{completed} / {COUNT_ITEMS.length} counted</span>
          <span style={{ padding: "4px 10px", borderRadius: 2, background: "#EFF6FF", color: "#1B6CA8", fontSize: 11, fontWeight: 700 }}>{count.type} Count</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#E8ECF4", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "#1B6CA8", transition: "width 0.3s" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px", display: "flex", gap: 24, alignContent: "start" }}>
        {/* Left: scan + current item */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Scan input */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Scan Barcode or Batch</div>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Scan or type barcode / batch ID..." value={scan} onChange={e => setScan(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 36px", border: "2px solid #1B6CA8", fontSize: 14, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }}
                autoFocus />
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
            </div>
          </div>

          {/* Current medicine card */}
          <div style={{ background: "#fff", border: "2px solid #1B6CA8" }}>
            <div style={{ padding: "12px 20px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Now Counting &mdash; {currentIdx + 1} of {COUNT_ITEMS.length}</div>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>{current.name}</div>
              <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", marginBottom: 20 }}>Batch: {current.batch}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ padding: "12px 16px", background: "#F8FAFC", border: "1px solid #EEF1F6" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>System Qty</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: "#6B7280" }}>{current.systemQty}</div>
                </div>
                <div style={{ padding: "12px 16px", background: diff < 0 ? "#FFEBEE" : diff > 0 ? "#FFF3E0" : "#E8F5E9", border: `1px solid ${diff < 0 ? "#FFCDD2" : diff > 0 ? "#FFE082" : "#A5D6A7"}` }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Difference</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: diff < 0 ? "#C62828" : diff > 0 ? "#E65100" : "#2E7D32" }}>{diff >= 0 ? "+" : ""}{diff}</div>
                </div>
              </div>

              {/* Qty stepper */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4A5875" }}>Physical Count</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setQty(physicalQty - 1)} style={{ width: 44, height: 44, border: "2px solid #DDE3EC", background: "#fff", cursor: "pointer", fontSize: 20, color: "#1A2436", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <input type="number" value={physicalQty} onChange={e => setQty(Number(e.target.value))}
                    style={{ flex: 1, padding: "10px 14px", border: "2px solid #1B6CA8", fontSize: 20, textAlign: "center", outline: "none", fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33" }} />
                  <button onClick={() => setQty(physicalQty + 1)} style={{ width: 44, height: 44, border: "2px solid #DDE3EC", background: "#fff", cursor: "pointer", fontSize: 20, color: "#1A2436", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => currentIdx > 0 && setCurrentIdx(i => i - 1)} disabled={currentIdx === 0} style={{ flex: 1, padding: "10px 0", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: currentIdx === 0 ? "not-allowed" : "pointer", color: currentIdx === 0 ? "#C8CDD8" : "#1A2436", fontFamily: "Inter" }}>Previous</button>
                <button onClick={handleNext} style={{ flex: 2, padding: "10px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  {currentIdx < COUNT_ITEMS.length - 1 ? "Save & Next" : "Complete Count"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: medicine list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Count List</div>
            {COUNT_ITEMS.map((item, i) => {
              const counted = counts[item.id];
              const d = counted !== undefined ? counted - item.systemQty : null;
              return (
                <button key={item.id} onClick={() => setCurrentIdx(i)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: i === currentIdx ? "#EFF6FF" : "#fff", cursor: "pointer", borderBottom: i < COUNT_ITEMS.length - 1 ? "1px solid #F4F6FA" : "none" as const, borderLeft: `3px solid ${i === currentIdx ? "#1B6CA8" : counted !== undefined ? (d === 0 ? "#2E7D32" : "#C62828") : "#E8ECF4"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{item.batch}</div>
                  {counted !== undefined && (
                    <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: d === 0 ? "#2E7D32" : "#C62828", marginTop: 2, fontWeight: 700 }}>
                      {counted} counted {d !== 0 ? `(${d! >= 0 ? "+" : ""}${d})` : "(OK)"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discrepancy modal */}
      {showDiscrepancy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.42)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 32, minWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>Discrepancy Detected</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
              <strong>{current.name}</strong>: System has {current.systemQty}, you counted {physicalQty} ({diff >= 0 ? "+" : ""}{diff}).
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4A5875", marginBottom: 10 }}>Create a Short Book entry?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowDiscrepancy(false); if (currentIdx < COUNT_ITEMS.length - 1) setCurrentIdx(i => i + 1); }}
                style={{ flex: 1, padding: "9px 0", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Review Later</button>
              <button onClick={() => { setShowDiscrepancy(false); if (currentIdx < COUNT_ITEMS.length - 1) setCurrentIdx(i => i + 1); }}
                style={{ flex: 2, padding: "9px 0", border: "none", background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Create Short</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Count Modal ────────────────────────────────────────────────────────

function CreateCountModal({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const [location, setLocation] = useState("Section A");
  const [type, setType] = useState("Normal");
  const [scope, setScope] = useState("Full Location");
  const [assigned, setAssigned] = useState("Priya K.");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.42)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", minWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>New Stock Count</div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Location</div>
            <select value={location} onChange={e => setLocation(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", boxSizing: "border-box" as const }}>
              {["Section A", "Section B", "Section C", "Cold Storage", "All Locations"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Count Type</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Normal", "Blind"].map(t => (
                <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "9px 0", border: `1px solid ${type === t ? "#1B6CA8" : "#E8ECF4"}`, background: type === t ? "#EFF6FF" : "#fff", fontSize: 13, cursor: "pointer", color: type === t ? "#1B6CA8" : "#6B7280", fontFamily: "Inter", fontWeight: type === t ? 600 : 400 }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Scope</div>
            <select value={scope} onChange={e => setScope(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", boxSizing: "border-box" as const }}>
              {["Full Location", "Selected Medicines", "Selected Batches"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Assigned To</div>
            <select value={assigned} onChange={e => setAssigned(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", boxSizing: "border-box" as const }}>
              {["Priya K.", "Ramesh S.", "Suresh M.", "Admin"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={onStart} style={{ flex: 2, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Start Count</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Verification Screen ──────────────────────────────────────────────────

const SUB_TABS = ["Stock Count", "Blind Count", "Discrepancies"] as const;
type VerifTab = typeof SUB_TABS[number];

export default function VerificationScreen() {
  const [tab, setTab] = useState<VerifTab>("Stock Count");
  const [showCreate, setShowCreate] = useState(false);
  const [activeCount, setActiveCount] = useState<typeof MOCK_COUNTS[0] | null>(null);

  const typedCounts = MOCK_COUNTS.filter(c => tab === "Blind Count" ? c.type === "Blind" : c.type === "Normal");
  const { pageRows: countRows, footerProps: countFooter } = usePagination(typedCounts, 5);
  const { pageRows: discrepancyRows, footerProps: discrepancyFooter } = usePagination(MOCK_DISCREPANCIES, 10);

  if (activeCount) return <CountSessionScreen count={activeCount} onBack={() => setActiveCount(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Verification</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Stock counting and discrepancy management</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ New Count</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1B6CA8" : "#6B7280", borderBottom: tab === t ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 }}>
            {t}
            {t === "Discrepancies" && <span style={{ background: "#C62828", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{MOCK_DISCREPANCIES.filter(d => d.status === "Open").length}</span>}
          </button>
        ))}
      </div>

      {/* Stock Count / Blind Count tab */}
      {(tab === "Stock Count" || tab === "Blind Count") && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Count ID", "Location", "Type", "Progress", "Counted", "Differences", "Status", "Assigned", "Started", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countRows.map((c, i, arr) => {
                const ss = STATUS_STYLE[c.status] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                return (
                  <tr key={c.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{c.id}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#1A2436" }}>{c.location}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{c.type}</td>
                    <td style={{ padding: "10px 14px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#EEF1F6" }}>
                          <div style={{ height: "100%", width: `${c.progress}%`, background: c.progress === 100 ? "#2E7D32" : "#1B6CA8" }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280", flexShrink: 0 }}>{c.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{c.counted}/{c.total}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: c.differences > 0 ? "#C62828" : "#2E7D32" }}>{c.differences}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color }}>{c.status}</span></td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{c.assigned}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.started}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {c.status === "Active" ? (
                        <button onClick={() => setActiveCount(c)} style={{ padding: "5px 12px", border: "none", background: "#1B6CA8", fontSize: 11, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Continue</button>
                      ) : (
                        <button style={{ padding: "5px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>View</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {typedCounts.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No {tab.toLowerCase()} sessions found.</div>}
          <PaginationFooter {...countFooter} />
        </div>
      )}

      {/* Discrepancies tab */}
      {tab === "Discrepancies" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Discrepancy ID", "Count Session", "Medicine", "Batch", "Location", "System", "Physical", "Difference", "Status", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: i >= 5 && i <= 7 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discrepancyRows.map((d, i, arr) => {
                const ss = STATUS_STYLE[d.status] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                return (
                  <tr key={d.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{d.id}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.countId}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{d.medicine}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.batch}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.location}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>{d.system}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>{d.physical}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: d.diff < 0 ? "#C62828" : "#E65100" }}>{d.diff >= 0 ? "+" : ""}{d.diff}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color }}>{d.status}</span></td>
                    <td style={{ padding: "10px 14px" }}>
                      {d.status !== "Resolved" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ padding: "4px 8px", border: "1px solid #C62828", background: "#FFEBEE", fontSize: 10, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>Create Short</button>
                          <button style={{ padding: "4px 8px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 10, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Adjust</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationFooter {...discrepancyFooter} />
        </div>
      )}

      {showCreate && <CreateCountModal onClose={() => setShowCreate(false)} onStart={() => { setShowCreate(false); setActiveCount(MOCK_COUNTS[0]); }} />}
    </div>
  );
}
