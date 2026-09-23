import { useState } from "react";
import { usePagination, PaginationFooter } from "../shared/usePagination";

// ─── Mock data ──────────────────────────────────────────────────────────────────

const TRANSFERS = [
  { id: "TRF-2025-041", medicine: "Amoxicillin 500mg", batch: "A9080", from: "Section A", to: "Section B", qty: 50, initiatedBy: "Priya K.", date: "28 Jul 2025", status: "Completed" },
  { id: "TRF-2025-040", medicine: "Atorvastatin 20mg", batch: "AT-2025-112", from: "Cold Storage", to: "Section C", qty: 20, initiatedBy: "Ramesh S.", date: "27 Jul 2025", status: "In Transit" },
  { id: "TRF-2025-039", medicine: "Paracetamol 500mg", batch: "P-1200", from: "Section A", to: "Section D", qty: 200, initiatedBy: "Suresh M.", date: "25 Jul 2025", status: "Completed" },
  { id: "TRF-2025-038", medicine: "Metformin 1000mg", batch: "MF-2025-033", from: "Section B", to: "Section A", qty: 30, initiatedBy: "Priya K.", date: "24 Jul 2025", status: "Draft" },
];

const ADJUSTMENTS = [
  { id: "ADJ-2025-019", medicine: "Amlodipine 5mg", batch: "AM-2025-088", type: "Positive", qty: 5, before: 380, after: 385, reason: "Physical count correction", user: "Priya K.", date: "28 Jul 2025", status: "Approved" },
  { id: "ADJ-2025-018", medicine: "Ciprofloxacin 500mg", batch: "C-2025-007", type: "Negative", qty: -3, before: 12, after: 9, reason: "Damaged units written off", user: "Suresh M.", date: "26 Jul 2025", status: "Approved" },
  { id: "ADJ-2025-017", medicine: "Warfarin 5mg", batch: "W-445", type: "Negative", qty: -1, before: 6, after: 5, reason: "Count mismatch", user: "Ramesh S.", date: "25 Jul 2025", status: "Pending" },
  { id: "ADJ-2025-016", medicine: "Insulin Glargine", batch: "IG-2025-001", type: "Positive", qty: 2, before: 45, after: 47, reason: "Over-receipt correction", user: "Priya K.", date: "22 Jul 2025", status: "Pending" },
];

const DAMAGED = [
  { id: "DMG-2025-009", medicine: "Amoxicillin 500mg", batch: "A9080", qty: 12, reason: "Damaged on receipt", value: 5.04, reportedBy: "Priya K.", date: "28 Jul 2025", status: "Pending Approval" },
  { id: "DMG-2025-008", medicine: "Paracetamol 500mg", batch: "P-1200", qty: 30, reason: "Packaging damage", value: 1.20, reportedBy: "Suresh M.", date: "26 Jul 2025", status: "Approved" },
  { id: "DMG-2025-007", medicine: "Insulin Glargine", batch: "IG-2025-001", qty: 3, reason: "Cold chain break", value: 126.0, reportedBy: "Ramesh S.", date: "24 Jul 2025", status: "Written Off" },
  { id: "DMG-2025-006", medicine: "Ciprofloxacin 500mg", batch: "C-2025-007", qty: 6, reason: "Expired during handling", value: 7.20, reportedBy: "Priya K.", date: "20 Jul 2025", status: "Written Off" },
];

const QUARANTINE = [
  { id: "QRN-2025-005", medicine: "Metformin 1000mg", batch: "MF-2025-033", qty: 50, reason: "Supplier investigation", location: "Quarantine Zone", created: "28 Jul 2025" },
  { id: "QRN-2025-004", medicine: "Atorvastatin 20mg", batch: "AT-2025-112", qty: 20, reason: "Quality complaint", location: "Quarantine Zone", created: "25 Jul 2025" },
  { id: "QRN-2025-003", medicine: "Warfarin 5mg", batch: "W-445", qty: 10, reason: "Recall check", location: "Cold Storage Q-Zone", created: "20 Jul 2025" },
];

const BLOCKED = [
  { id: "BLK-2025-003", batch: "MF-2025-RECALL", medicine: "Metformin 1000mg", qty: 120, reason: "Manufacturer recall — lot BX22", blockedOn: "28 Jul 2025", status: "Blocked" },
  { id: "BLK-2025-002", batch: "A9080-HOLD", medicine: "Amoxicillin 500mg", qty: 60, reason: "Quality hold — pending lab test", blockedOn: "26 Jul 2025", status: "Blocked" },
  { id: "BLK-2025-001", batch: "IG-2025-FREEZE", medicine: "Insulin Glargine", qty: 15, reason: "Cold chain breach", blockedOn: "24 Jul 2025", status: "Blocked" },
];

const TRANSFER_STATUS: Record<string, { bg: string; color: string }> = {
  Draft:       { bg: "#F3F4F6", color: "#6B7280" },
  "In Transit":{ bg: "#EFF6FF", color: "#1B6CA8" },
  Completed:   { bg: "#E8F5E9", color: "#2E7D32" },
  Short:       { bg: "#FFEBEE", color: "#C62828" },
};

const DAMAGE_STATUS: Record<string, { bg: string; color: string }> = {
  "Pending Approval": { bg: "#FFF3E0", color: "#E65100" },
  Approved:           { bg: "#E8F5E9", color: "#2E7D32" },
  "Written Off":      { bg: "#F3F4F6", color: "#6B7280" },
  Rejected:           { bg: "#FFEBEE", color: "#C62828" },
};

const ADJ_STATUS: Record<string, { bg: string; color: string }> = {
  Approved: { bg: "#E8F5E9", color: "#2E7D32" },
  Pending:  { bg: "#FFF3E0", color: "#E65100" },
  Rejected: { bg: "#FFEBEE", color: "#C62828" },
};

// ─── Report Damage Drawer ──────────────────────────────────────────────────────

function ReportDamageDrawer({ onClose }: { onClose: () => void }) {
  const [medicine, setMedicine] = useState("");
  const [batch, setBatch] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Damaged on receipt");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 440, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-6px 0 32px rgba(0,0,0,0.18)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#E65100" }}>!</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>Damage Report Submitted</div>
            <div style={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>Pending approval by warehouse manager.</div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6" }}>
            <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Done</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 440, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-6px 0 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#C62828", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Inventory</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Report Damage</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Medicine Name <span style={{ color: "#C62828" }}>*</span></div><input value={medicine} onChange={e => setMedicine(e.target.value)} placeholder="Search medicine..." style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Batch</div><input value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. BT-2025-118" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Damaged Qty <span style={{ color: "#C62828" }}>*</span></div><input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", boxSizing: "border-box" as const }}>
              {["Damaged on receipt", "Packaging damage", "Cold chain break", "Expiry", "Water damage", "Other"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Notes</div><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional details..." style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", resize: "vertical", boxSizing: "border-box" as const }} /></div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Evidence (Optional)</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Add Photo", "Attach Document"].map(b => (
                <button key={b} style={{ flex: 1, padding: "8px 0", border: "1px dashed #DDE3EC", background: "#FAFBFD", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>{b}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={() => setSubmitted(true)} disabled={!medicine || !qty} style={{ flex: 2, padding: "9px 0", border: "none", background: !medicine || !qty ? "#C8CDD8" : "#C62828", fontSize: 13, cursor: !medicine || !qty ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Submit for Approval</button>
        </div>
      </div>
    </>
  );
}

// ─── Block Batch Modal ─────────────────────────────────────────────────────────

function BlockBatchModal({ onClose }: { onClose: () => void }) {
  const [batchId, setBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.42)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 40, minWidth: 360, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#C62828", marginBottom: 8 }}>Batch Blocked</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 20 }}>Batch {batchId || "selected"} has been blocked and cannot be dispensed.</div>
        <button onClick={onClose} style={{ padding: "9px 24px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.42)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", minWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#C62828" }}>Block Batch</div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Batch ID <span style={{ color: "#C62828" }}>*</span></div><input value={batchId} onChange={e => setBatchId(e.target.value)} placeholder="e.g. BT-2025-118" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason <span style={{ color: "#C62828" }}>*</span></div>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", boxSizing: "border-box" as const }}>
              <option value="">Select reason...</option>
              {["Manufacturer recall", "Quality hold", "Regulatory action", "Cold chain breach", "Damaged batch", "Other"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", fontSize: 12, color: "#C62828", fontWeight: 600 }}>
            Blocking a batch will immediately prevent it from being dispensed or transferred.
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={() => setConfirmed(true)} disabled={!batchId || !reason} style={{ flex: 2, padding: "9px 0", border: "none", background: !batchId || !reason ? "#C8CDD8" : "#C62828", fontSize: 13, cursor: !batchId || !reason ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Block Batch</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Movement & Control Screen ───────────────────────────────────────────

const SUB_TABS = ["Transfers", "Adjustments", "Damaged", "Quarantine", "Blocked / Recall"] as const;
type MovTab = typeof SUB_TABS[number];

export default function MovementControlScreen() {
  const [tab, setTab] = useState<MovTab>("Transfers");
  const [showDamageDrawer, setShowDamageDrawer] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const { pageRows: trfRows, footerProps: trfFooter } = usePagination(TRANSFERS, 10);
  const { pageRows: adjRows, footerProps: adjFooter } = usePagination(ADJUSTMENTS, 10);
  const { pageRows: dmgRows, footerProps: dmgFooter } = usePagination(DAMAGED, 10);
  const { pageRows: qrnRows, footerProps: qrnFooter } = usePagination(QUARANTINE, 10);
  const { pageRows: blkRows, footerProps: blkFooter } = usePagination(BLOCKED, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Movement & Control</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Transfers, adjustments, damage reporting, quarantine, and batch control</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "Transfers" && <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ New Transfer</button>}
          {tab === "Adjustments" && <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ New Adjustment</button>}
          {tab === "Damaged" && <button onClick={() => setShowDamageDrawer(true)} style={{ padding: "8px 16px", border: "none", background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Report Damage</button>}
          {tab === "Quarantine" && <button style={{ padding: "8px 16px", border: "none", background: "#E65100", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Quarantine Batch</button>}
          {tab === "Blocked / Recall" && <button onClick={() => setShowBlockModal(true)} style={{ padding: "8px 16px", border: "none", background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Block Batch</button>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1B6CA8" : "#6B7280", borderBottom: tab === t ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap" as const }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Transfers tab ── */}
      {tab === "Transfers" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Transfer ID", "Medicine", "Batch", "From", "To", "Qty", "Initiated By", "Date", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trfRows.map((r, i, arr) => {
                const ss = TRANSFER_STATUS[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                return (
                  <tr key={r.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#4A5875" }}>{r.from}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>→</span>
                        <span style={{ fontSize: 12, color: "#1A2436", fontWeight: 600 }}>{r.to}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{r.qty}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{r.initiatedBy}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color }}>{r.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationFooter {...trfFooter} />
        </div>
      )}

      {/* ── Adjustments tab ── */}
      {tab === "Adjustments" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Adj ID", "Medicine", "Batch", "Type", "Qty Change", "Before", "After", "Reason", "User", "Date", "Status"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: i >= 4 && i <= 6 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjRows.map((r, i, arr) => {
                const ss = ADJ_STATUS[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                return (
                  <tr key={r.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 2, background: r.type === "Positive" ? "#E8F5E9" : "#FFEBEE", color: r.type === "Positive" ? "#2E7D32" : "#C62828", fontWeight: 700 }}>{r.type}</span></td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: r.qty > 0 ? "#2E7D32" : "#C62828" }}>{r.qty > 0 ? `+${r.qty}` : r.qty}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#9CA3AF" }}>{r.before}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436", fontWeight: 700 }}>{r.after}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#4A5875" }}>{r.reason}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>{r.user}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color }}>{r.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationFooter {...adjFooter} />
        </div>
      )}

      {/* ── Damaged tab ── */}
      {tab === "Damaged" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Report ID", "Medicine", "Batch", "Qty", "Reason", "Value", "Reported By", "Date", "Status"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: i === 3 || i === 5 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dmgRows.map((r, i, arr) => {
                const ss = DAMAGE_STATUS[r.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                return (
                  <tr key={r.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#C62828", fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: "#C62828" }}>{r.qty}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#4A5875" }}>{r.reason}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>₹{r.value.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{r.reportedBy}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.date}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color, whiteSpace: "nowrap" as const }}>{r.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationFooter {...dmgFooter} />
        </div>
      )}

      {/* ── Quarantine tab ── */}
      {tab === "Quarantine" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Quarantine ID", "Medicine", "Batch", "Qty", "Reason", "Location", "Created", "Action"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qrnRows.map((r, i, arr) => (
                <tr key={r.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#E65100", fontWeight: 600 }}>{r.id}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#E65100" }}>{r.qty}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#4A5875" }}>{r.reason}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.location}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.created}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ padding: "4px 10px", border: "1px solid #2E7D32", background: "#E8F5E9", fontSize: 11, cursor: "pointer", color: "#2E7D32", fontFamily: "Inter", fontWeight: 600 }}>Release</button>
                      <button style={{ padding: "4px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Return</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter {...qrnFooter} />
        </div>
      )}

      {/* ── Blocked / Recall tab ── */}
      {tab === "Blocked / Recall" && (
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Block ID", "Batch", "Medicine", "Qty", "Reason", "Blocked On", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blkRows.map((r, i, arr) => (
                <tr key={r.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#C62828", fontWeight: 600 }}>{r.id}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>{r.qty}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#4A5875" }}>{r.reason}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.blockedOn}</td>
                  <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: "#FFEBEE", color: "#C62828" }}>{r.status}</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <button style={{ padding: "4px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Unblock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter {...blkFooter} />
        </div>
      )}

      {showDamageDrawer && <ReportDamageDrawer onClose={() => setShowDamageDrawer(false)} />}
      {showBlockModal && <BlockBatchModal onClose={() => setShowBlockModal(false)} />}
    </div>
  );
}
