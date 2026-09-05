import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExpiryRisk = "Safe" | "Monitor" | "Near Expiry" | "Critical" | "Expired";
type ReturnStatus = "Return Eligible" | "Non-returnable" | "Return Window Closed";
type ExpiryAction = "Sell First" | "Supplier Return" | "Quarantine" | "Write Off";
type SubTab = "action" | "expiring" | "expired" | "all" | "checks";

interface ExpiryItem {
  id: string;
  medicine: string;
  batch: string;
  expiryDate: string;
  daysLeft: number;
  stock: number;
  sellable: number;
  quarantine: number;
  stockValue: number;
  risk: ExpiryRisk;
  supplier: string;
  returnEligible: boolean;
  returnWindow: number;
  returnStatus: ReturnStatus;
  avgDailySales: number;
  manufacturer: string;
  category: string;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const REF_DATE = new Date("2025-07-28");

function daysFromNow(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - REF_DATE.getTime()) / 86400000);
}

function riskFromDays(d: number): ExpiryRisk {
  if (d < 0) return "Expired";
  if (d <= 30) return "Critical";
  if (d <= 90) return "Near Expiry";
  if (d <= 180) return "Monitor";
  return "Safe";
}

const MOCK_EXPIRY_ITEMS: ExpiryItem[] = [
  { id: "EXP-001", medicine: "Dolo 650", batch: "D1234", expiryDate: "2025-08-28", daysLeft: daysFromNow("2025-08-28"), stock: 100, sellable: 98, quarantine: 2, stockValue: 2200, risk: riskFromDays(daysFromNow("2025-08-28")), supplier: "ABC Pharma", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 3, manufacturer: "Micro Labs", category: "Analgesic" },
  { id: "EXP-002", medicine: "Azithromycin 500mg", batch: "A1234", expiryDate: "2025-09-15", daysLeft: daysFromNow("2025-09-15"), stock: 60, sellable: 60, quarantine: 0, stockValue: 1080, risk: riskFromDays(daysFromNow("2025-09-15")), supplier: "XYZ Pharma", returnEligible: false, returnWindow: 0, returnStatus: "Non-returnable", avgDailySales: 2, manufacturer: "Cipla", category: "Antibiotic" },
  { id: "EXP-003", medicine: "Insulin Glargine", batch: "IG001", expiryDate: "2025-10-15", daysLeft: daysFromNow("2025-10-15"), stock: 45, sellable: 45, quarantine: 0, stockValue: 18000, risk: riskFromDays(daysFromNow("2025-10-15")), supplier: "BioPharm AG", returnEligible: true, returnWindow: 60, returnStatus: "Return Eligible", avgDailySales: 1, manufacturer: "BioPharm AG", category: "Hormones" },
  { id: "EXP-004", medicine: "Pantoprazole 40mg", batch: "P2001", expiryDate: "2025-11-20", daysLeft: daysFromNow("2025-11-20"), stock: 80, sellable: 80, quarantine: 0, stockValue: 1920, risk: riskFromDays(daysFromNow("2025-11-20")), supplier: "ABC Pharma", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 4, manufacturer: "Sun Pharma", category: "Antacid" },
  { id: "EXP-005", medicine: "Warfarin 5mg", batch: "W3312", expiryDate: "2025-12-31", daysLeft: daysFromNow("2025-12-31"), stock: 6, sellable: 6, quarantine: 0, stockValue: 240, risk: riskFromDays(daysFromNow("2025-12-31")), supplier: "PharmaCo Inc", returnEligible: false, returnWindow: 0, returnStatus: "Non-returnable", avgDailySales: 0.5, manufacturer: "PharmaCo Inc", category: "Anticoagulant" },
  { id: "EXP-006", medicine: "Ciprofloxacin 500mg", batch: "C1122", expiryDate: "2026-01-10", daysLeft: daysFromNow("2026-01-10"), stock: 120, sellable: 115, quarantine: 5, stockValue: 3600, risk: riskFromDays(daysFromNow("2026-01-10")), supplier: "PharmaCo Inc", returnEligible: true, returnWindow: 60, returnStatus: "Return Eligible", avgDailySales: 3, manufacturer: "Cipla", category: "Antibiotic" },
  { id: "EXP-007", medicine: "Metformin 1000mg", batch: "M0987", expiryDate: "2026-03-15", daysLeft: daysFromNow("2026-03-15"), stock: 200, sellable: 200, quarantine: 0, stockValue: 4800, risk: riskFromDays(daysFromNow("2026-03-15")), supplier: "GenPharm Ltd", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 8, manufacturer: "USV Ltd", category: "Antidiabetic" },
  { id: "EXP-008", medicine: "Atorvastatin 20mg", batch: "AT001", expiryDate: "2027-01-10", daysLeft: daysFromNow("2027-01-10"), stock: 312, sellable: 312, quarantine: 0, stockValue: 6240, risk: riskFromDays(daysFromNow("2027-01-10")), supplier: "MedLine Pharma", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 5, manufacturer: "Dr. Reddy's", category: "Statin" },
  { id: "EXP-009", medicine: "Paracetamol 500mg", batch: "PC-OLD1", expiryDate: "2025-07-01", daysLeft: daysFromNow("2025-07-01"), stock: 50, sellable: 0, quarantine: 50, stockValue: 250, risk: "Expired", supplier: "MedLine Pharma", returnEligible: false, returnWindow: 0, returnStatus: "Return Window Closed", avgDailySales: 20, manufacturer: "Cipla", category: "Analgesic" },
  { id: "EXP-010", medicine: "Amoxicillin 500mg", batch: "AX-OLD2", expiryDate: "2025-06-15", daysLeft: daysFromNow("2025-06-15"), stock: 30, sellable: 0, quarantine: 30, stockValue: 450, risk: "Expired", supplier: "MedLine Pharma", returnEligible: false, returnWindow: 0, returnStatus: "Return Window Closed", avgDailySales: 5, manufacturer: "Cipla", category: "Antibiotic" },
  { id: "EXP-011", medicine: "Cetirizine 10mg", batch: "CE2234", expiryDate: "2026-06-30", daysLeft: daysFromNow("2026-06-30"), stock: 150, sellable: 150, quarantine: 0, stockValue: 1500, risk: riskFromDays(daysFromNow("2026-06-30")), supplier: "XYZ Pharma", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 6, manufacturer: "Lupin", category: "Antihistamine" },
  { id: "EXP-012", medicine: "Amlodipine 5mg", batch: "AM3344", expiryDate: "2027-08-15", daysLeft: daysFromNow("2027-08-15"), stock: 240, sellable: 240, quarantine: 0, stockValue: 4800, risk: riskFromDays(daysFromNow("2027-08-15")), supplier: "ABC Pharma", returnEligible: true, returnWindow: 90, returnStatus: "Return Eligible", avgDailySales: 7, manufacturer: "Torrent Pharma", category: "Antihypertensive" },
];

// ─── UI primitives ─────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: right ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD" }}>
      {children}
    </th>
  );
}

const RISK_STYLE: Record<ExpiryRisk, { bg: string; color: string }> = {
  "Safe": { bg: "#E8F5E9", color: "#2E7D32" },
  "Monitor": { bg: "#E3F2FD", color: "#1B6CA8" },
  "Near Expiry": { bg: "#FFF8E1", color: "#F57F17" },
  "Critical": { bg: "#FFEBEE", color: "#C62828" },
  "Expired": { bg: "#F3F4F6", color: "#4B5563" },
};

const RETURN_STYLE: Record<ReturnStatus, { bg: string; color: string }> = {
  "Return Eligible": { bg: "#E8F5E9", color: "#2E7D32" },
  "Non-returnable": { bg: "#FFEBEE", color: "#C62828" },
  "Return Window Closed": { bg: "#F3F4F6", color: "#9CA3AF" },
};

function RiskPill({ risk }: { risk: ExpiryRisk }) {
  const s = RISK_STYLE[risk];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: s.bg, color: s.color, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{risk}</span>;
}

function ReturnPill({ status }: { status: ReturnStatus }) {
  const s = RETURN_STYLE[status];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: s.bg, color: s.color, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{status}</span>;
}

// ─── Expiry Detail Drawer ──────────────────────────────────────────────────────

function ExpiryDetailDrawer({ item, onClose }: { item: ExpiryItem; onClose: () => void }) {
  const [showRiskExplain, setShowRiskExplain] = useState(false);
  const [confirmedAction, setConfirmedAction] = useState<string | null>(null);
  const expectedSales = Math.round(item.avgDailySales * Math.max(0, item.daysLeft));
  const excessStock = Math.max(0, item.stock - expectedSales);

  const actions: { label: string; primary?: boolean; danger?: boolean }[] = [];
  if (item.risk === "Expired") {
    actions.push({ label: "Quarantine", danger: true });
    actions.push({ label: "Write Off", danger: true });
  } else if (item.returnEligible) {
    actions.push({ label: "Create Return", primary: true });
    actions.push({ label: "Sell First" });
  } else {
    actions.push({ label: "Sell First", primary: true });
    actions.push({ label: "Quarantine", danger: true });
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 480, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        {/* Dark header */}
        <div style={{ background: "#0C1B33", padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <RiskPill risk={item.risk} />
              <ReturnPill status={item.returnStatus} />
            </div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#9CA3AF", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
          <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>{item.medicine}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>{item.manufacturer} &middot; {item.category}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #162544", paddingTop: 14, paddingBottom: 14 }}>
            {[
              { label: "Days Left", value: item.daysLeft < 0 ? "Expired" : String(item.daysLeft), color: item.risk === "Expired" ? "#9CA3AF" : item.risk === "Critical" ? "#EF5350" : "#00ACC1" },
              { label: "Stock", value: String(item.stock), color: "#E8ECF4" },
              { label: "Value", value: `₹${item.stockValue.toLocaleString()}`, color: "#E8ECF4" },
              { label: "Batch", value: item.batch, color: "#9CA3AF" },
            ].map((k, i) => (
              <div key={k.label} style={{ paddingLeft: i > 0 ? 10 : 0, paddingRight: i < 3 ? 10 : 0, borderRight: i < 3 ? "1px solid #162544" : "none" }}>
                <div style={{ fontSize: 9, color: "#4B5D78", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "#F0F3F7" }}>

          {/* Batch info */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Batch Details</div>
            {[
              { label: "Batch Number", value: item.batch, mono: true },
              { label: "Expiry Date", value: item.expiryDate, mono: true },
              { label: "Supplier", value: item.supplier, mono: false },
              { label: "Sellable Qty", value: String(item.sellable), mono: true },
              { label: "Quarantine Qty", value: String(item.quarantine), mono: true },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: r.mono ? "JetBrains Mono" : "Inter" }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Expiry return policy */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Expiry Return Policy</div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Supplier</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{item.supplier}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Medicine Return</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.returnEligible ? "#2E7D32" : "#C62828" }}>
                  {item.returnEligible ? "Allowed" : "Not Allowed"}
                </span>
              </div>
              {item.returnEligible && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Return Window</span>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{item.returnWindow} days before expiry</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Return Status</span>
                <ReturnPill status={item.returnStatus} />
              </div>
              <div style={{ marginTop: 10, padding: "8px 10px", background: "#F8FAFC", border: "1px solid #EEF1F6", fontSize: 11, color: "#9CA3AF" }}>
                Policy applies to this medicine only. Other medicines from {item.supplier} may have different return terms.
              </div>
            </div>
          </div>

          {/* Risk explanation */}
          {item.risk !== "Safe" && (
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <button onClick={() => setShowRiskExplain(prev => !prev)}
                style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: showRiskExplain ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Why {item.risk}?
                </span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{showRiskExplain ? "−" : "+"}</span>
              </button>
              {showRiskExplain && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Current Stock", value: String(item.stock) },
                    { label: "Avg Daily Sales", value: `${item.avgDailySales} units/day` },
                    { label: "Days Remaining", value: item.daysLeft < 0 ? "Expired" : `${item.daysLeft} days` },
                    { label: "Expected Sales Before Expiry", value: `${expectedSales} units` },
                    { label: "Potential Excess", value: excessStock > 0 ? `${excessStock} units at risk` : "None", highlight: excessStock > 0 ? "#C62828" : "#2E7D32" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F4F6FA" }}>
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: (r as { highlight?: string }).highlight || "#1A2436" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #E8ECF4", background: "#fff", display: "flex", gap: 10, flexShrink: 0 }}>
          {confirmedAction ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, color: "#2E7D32" }}>&#10003;</span>
                <span style={{ fontSize: 13, color: "#1A2436" }}><strong>{confirmedAction}</strong> recorded for {item.medicine}</span>
              </div>
              <button onClick={onClose} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Done
              </button>
            </div>
          ) : (
            <>
              {actions.map(a => (
                <button key={a.label}
                  onClick={() => setConfirmedAction(a.label)}
                  style={{
                    flex: 1, padding: "9px 0",
                    border: a.danger ? "1px solid #FFCDD2" : a.primary ? "none" : "1px solid #E8ECF4",
                    background: a.danger ? "#FFEBEE" : a.primary ? "#1B6CA8" : "#fff",
                    fontSize: 12, cursor: "pointer",
                    color: a.danger ? "#C62828" : a.primary ? "#fff" : "#1A2436",
                    fontFamily: "Inter", fontWeight: a.primary ? 600 : 500,
                  }}>
                  {a.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Expiry Checks Tab ────────────────────────────────────────────────────────

function ExpiryChecks() {
  const [checks, setChecks] = useState([
    { id: "CHK-001", date: "2025-07-25", by: "Jane Doe", items: 120, flagged: 8, notes: "Quarterly expiry audit" },
    { id: "CHK-002", date: "2025-06-28", by: "Mark Stevens", items: 108, flagged: 12, notes: "Pre-month-end review" },
    { id: "CHK-003", date: "2025-05-30", by: "Jane Doe", items: 115, flagged: 6, notes: "Monthly check" },
  ]);
  const [showNew, setShowNew] = useState(false);

  const handleStartCheck = () => {
    const newId = `CHK-${String(checks.length + 1).padStart(3, "0")}`;
    setChecks(prev => [{ id: newId, date: "2025-07-28", by: "Jane Doe", items: MOCK_EXPIRY_ITEMS.length, flagged: 0, notes: "In progress..." }, ...prev]);
    setShowNew(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowNew(true)} style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
          + New Expiry Check
        </button>
      </div>
      {showNew && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1B6CA8", marginBottom: 4 }}>Start New Expiry Check</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>This will scan all {MOCK_EXPIRY_ITEMS.length} batches and flag items that are expired or near expiry.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
            <button onClick={() => setShowNew(false)} style={{ padding: "7px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
            <button onClick={handleStartCheck} style={{ padding: "7px 14px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Start Check</button>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Check ID", "Date", "Checked By", "Items Checked", "Flagged", "Notes"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {checks.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{c.id}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.date}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, color: "#1A2436" }}>{c.by}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{c.items}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: c.flagged > 0 ? "#FFEBEE" : "#E8F5E9", color: c.flagged > 0 ? "#C62828" : "#2E7D32" }}>
                    {c.flagged > 0 ? `${c.flagged} flagged` : "Clean"}
                  </span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{c.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main table ────────────────────────────────────────────────────────────────

function ExpiryTable({
  items,
  onReview,
  emptyLabel,
}: {
  items: ExpiryItem[];
  onReview: (item: ExpiryItem) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 10, color: "#2E7D32" }}>&#10003;</div>
        <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>{emptyLabel}</div>
        <div style={{ fontSize: 13, color: "#9CA3AF" }}>No batches currently require attention.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th>Medicine</Th>
            <Th>Batch</Th>
            <Th>Expiry Date</Th>
            <Th right>Days Left</Th>
            <Th right>Stock</Th>
            <Th right>Stock Value</Th>
            <Th>Risk</Th>
            <Th>Supplier</Th>
            <Th>Return Status</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}
              style={{ borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{item.medicine}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.manufacturer}</div>
              </td>
              <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{item.batch}</td>
              <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{item.expiryDate}</td>
              <td style={{ padding: "11px 14px", textAlign: "right" }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: item.daysLeft < 0 ? "#9CA3AF" : item.daysLeft <= 30 ? "#C62828" : item.daysLeft <= 90 ? "#F57F17" : "#2E7D32" }}>
                  {item.daysLeft < 0 ? "Expired" : `${item.daysLeft}d`}
                </span>
              </td>
              <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>{item.stock}</td>
              <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>₹{item.stockValue.toLocaleString()}</td>
              <td style={{ padding: "11px 14px" }}><RiskPill risk={item.risk} /></td>
              <td style={{ padding: "11px 14px", fontSize: 13, color: "#6B7280" }}>{item.supplier}</td>
              <td style={{ padding: "11px 14px" }}><ReturnPill status={item.returnStatus} /></td>
              <td style={{ padding: "11px 14px" }}>
                <button onClick={() => onReview(item)}
                  style={{ padding: "5px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ExpiryManagement() {
  const [activeTab, setActiveTab] = useState<SubTab>("action");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ExpiryItem | null>(null);

  const handleExport = () => {
    const headers = ["Medicine", "Batch", "Expiry Date", "Days Left", "Stock", "Stock Value", "Risk", "Supplier", "Return Status"];
    const rows = MOCK_EXPIRY_ITEMS.map(i => [
      i.medicine, i.batch, i.expiryDate, String(i.daysLeft), String(i.stock),
      String(i.stockValue), i.risk, i.supplier, i.returnStatus,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expiry-report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const searchFiltered = MOCK_EXPIRY_ITEMS.filter(i =>
    search === "" ||
    i.medicine.toLowerCase().includes(search.toLowerCase()) ||
    i.batch.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const expired = searchFiltered.filter(i => i.risk === "Expired");
  const critical = searchFiltered.filter(i => i.risk === "Critical");
  const nearExpiry = searchFiltered.filter(i => i.risk === "Near Expiry");
  const actionRequired = searchFiltered.filter(i => i.risk === "Expired" || i.risk === "Critical" || i.risk === "Near Expiry");
  const expiringSoon = searchFiltered.filter(i => i.risk === "Critical" || i.risk === "Near Expiry");

  const summary = {
    expired: MOCK_EXPIRY_ITEMS.filter(i => i.risk === "Expired").length,
    critical: MOCK_EXPIRY_ITEMS.filter(i => i.risk === "Critical").length,
    nearExpiry: MOCK_EXPIRY_ITEMS.filter(i => i.risk === "Near Expiry").length,
    valueAtRisk: MOCK_EXPIRY_ITEMS.filter(i => i.risk !== "Safe").reduce((s, i) => s + i.stockValue, 0),
    returnEligible: MOCK_EXPIRY_ITEMS.filter(i => i.returnStatus === "Return Eligible").length,
    nonReturnable: MOCK_EXPIRY_ITEMS.filter(i => i.returnStatus === "Non-returnable").length,
  };

  const TABS: { id: SubTab; label: string; count?: number }[] = [
    { id: "action", label: "Action Required", count: actionRequired.length },
    { id: "expiring", label: "Expiring Soon", count: expiringSoon.length },
    { id: "expired", label: "Expired", count: MOCK_EXPIRY_ITEMS.filter(i => i.risk === "Expired").length },
    { id: "all", label: "All Batches" },
    { id: "checks", label: "Expiry Checks" },
  ];

  const tabItems: Record<SubTab, ExpiryItem[]> = {
    action: actionRequired,
    expiring: expiringSoon,
    expired: expired,
    all: searchFiltered,
    checks: [],
  };

  const emptyLabels: Record<SubTab, string> = {
    action: "No urgent expiry items",
    expiring: "No batches expiring soon",
    expired: "No expired batches",
    all: "No batches found",
    checks: "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>
            PharmERP <span style={{ color: "#C8CDD8" }}>›</span> Inventory <span style={{ color: "#C8CDD8" }}>›</span>
            <span style={{ color: "#1A2436", fontWeight: 600 }}> Expiry Management</span>
          </div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.01em" }}>Expiry Management</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Monitor and action near-expiry and expired batches</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleExport} style={{ padding: "8px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Export</button>
          <button onClick={() => setActiveTab("checks")} style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            + Expiry Check
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {[
          { label: "Expired", value: summary.expired, color: "#9CA3AF" },
          { label: "Critical <30 Days", value: summary.critical, color: "#C62828" },
          { label: "Near Expiry <90 Days", value: summary.nearExpiry, color: "#F57F17" },
          { label: "Value at Risk", value: `₹${summary.valueAtRisk.toLocaleString()}`, color: "#C62828", mono: true },
          { label: "Return Eligible", value: summary.returnEligible, color: "#2E7D32" },
          { label: "Non-returnable", value: summary.nonReturnable, color: "#E65100" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "14px 16px", borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: (c as { mono?: boolean }).mono ? "JetBrains Mono" : "Outfit", fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Action required quick list */}
      {(critical.length > 0 || expired.length > 0 || nearExpiry.length > 0) && (() => {
        const actionRows: { dot: string; text: string; tab: SubTab }[] = [];
        if (expired.length > 0) actionRows.push({ dot: "#9CA3AF", text: `${expired.length} batch${expired.length > 1 ? "es" : ""} are expired — quarantine or write off`, tab: "expired" });
        if (critical.length > 0) actionRows.push({ dot: "#C62828", text: `${critical.length} batch${critical.length > 1 ? "es" : ""} expire within 30 days`, tab: "action" });
        if (nearExpiry.length > 0) actionRows.push({ dot: "#F57F17", text: `${nearExpiry.length} batch${nearExpiry.length > 1 ? "es" : ""} expire within 90 days`, tab: "expiring" });
        return (
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Action Required
            </div>
            {actionRows.map((row, i) => (
              <div key={i} style={{ padding: "11px 16px", borderBottom: i < actionRows.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.dot, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#1A2436" }}>{row.text}</span>
                </div>
                <button onClick={() => setActiveTab(row.tab)}
                  style={{ padding: "4px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                  Review
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Main table card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Tabs */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", borderBottom: "none" }}>
          <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid #EEF1F6" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? "#1B6CA8" : "#6B7280", borderBottom: activeTab === tab.id ? "2px solid #1B6CA8" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ fontSize: 10, padding: "1px 6px", background: activeTab === tab.id ? "#1B6CA8" : "#F3F4F6", color: activeTab === tab.id ? "#fff" : "#6B7280", fontWeight: 700, fontFamily: "JetBrains Mono", borderRadius: 10 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab !== "checks" && (
            <div style={{ padding: "10px 16px" }}>
              <input type="text" placeholder="Search medicine, batch, supplier..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 320, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter" }} />
            </div>
          )}
        </div>

        {/* Table or checks */}
        {activeTab === "checks" ? (
          <ExpiryChecks />
        ) : (
          <ExpiryTable items={tabItems[activeTab]} onReview={setSelected} emptyLabel={emptyLabels[activeTab]} />
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <ExpiryDetailDrawer item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
