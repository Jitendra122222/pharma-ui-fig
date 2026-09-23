import { useState } from "react";
import { usePagination, PaginationFooter } from "../shared/usePagination";

// ─── Mock data ──────────────────────────────────────────────────────────────────

const SB_RECORDS = [
  { id: "SB-2025-0042", medicine: "Insulin Glargine", batch: "IG-2025-001", category: "Antidiabetics", type: "Purchase", supplier: "BioPharm AG", orderQty: 100, receivedQty: 84, shortQty: 16, value: 256.00, date: "2025-07-24", priority: "High", status: "Open", reason: "Delivery shortage", investigator: "Priya K." },
  { id: "SB-2025-0041", medicine: "Amoxicillin 500mg", batch: "A9080", category: "Antibiotics", type: "Physical", supplier: "MedLine Pharma", orderQty: 500, receivedQty: 476, shortQty: 24, value: 10.08, date: "2025-07-22", priority: "Medium", status: "Investigating", reason: "Physical count mismatch", investigator: "Ramesh S." },
  { id: "SB-2025-0040", medicine: "Atorvastatin 20mg", batch: "AT-2025-112", category: "Statins", type: "Sales", supplier: "PharmaCo Inc", orderQty: 200, receivedQty: 192, shortQty: 8, value: 6.24, date: "2025-07-20", priority: "Low", status: "Supplier Claim", reason: "Dispensing record mismatch", investigator: "Suresh M." },
  { id: "SB-2025-0039", medicine: "Warfarin 5mg", batch: "W-445", category: "Anticoagulants", type: "Transfer", supplier: "MedLine Pharma", orderQty: 50, receivedQty: 47, shortQty: 3, value: 2.85, date: "2025-07-18", priority: "High", status: "Open", reason: "Transfer discrepancy", investigator: "Priya K." },
  { id: "SB-2025-0038", medicine: "Paracetamol 500mg", batch: "P-1200", category: "Analgesics", type: "Damage", supplier: "GenPharm Ltd", orderQty: 1000, receivedQty: 982, shortQty: 18, value: 0.72, date: "2025-07-15", priority: "Low", status: "Resolved", reason: "Reported damaged on receipt", investigator: "Suresh M." },
  { id: "SB-2025-0037", medicine: "Ciprofloxacin 500mg", batch: "C-2025-007", category: "Antibiotics", type: "Expiry", supplier: "PharmaCo Inc", orderQty: 100, receivedQty: 88, shortQty: 12, value: 14.40, date: "2025-07-10", priority: "Medium", status: "Recovery", reason: "Batch expired before dispensing", investigator: "Ramesh S." },
  { id: "SB-2025-0036", medicine: "Amlodipine 5mg", batch: "AM-2025-088", category: "Antihypertensives", type: "Purchase", supplier: "MedLine Pharma", orderQty: 300, receivedQty: 295, shortQty: 5, value: 2.25, date: "2025-07-08", priority: "Low", status: "Resolved", reason: "Supplier error", investigator: "Priya K." },
  { id: "SB-2025-0035", medicine: "Metformin 1000mg", batch: "MF-2025-033", category: "Antidiabetics", type: "Physical", supplier: "GenPharm Ltd", orderQty: 400, receivedQty: 372, shortQty: 28, value: 4.48, date: "2025-07-05", priority: "High", status: "Open", reason: "System vs physical count gap", investigator: "Suresh M." },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Open:           { bg: "#FFEBEE", color: "#C62828" },
  Investigating:  { bg: "#FFF3E0", color: "#E65100" },
  "Supplier Claim":{ bg: "#EFF6FF", color: "#1B6CA8" },
  Recovery:       { bg: "#F5F3FF", color: "#6B21A8" },
  Resolved:       { bg: "#E8F5E9", color: "#2E7D32" },
  Closed:         { bg: "#F3F4F6", color: "#6B7280" },
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  High:   { bg: "#FFEBEE", color: "#C62828" },
  Medium: { bg: "#FFF3E0", color: "#E65100" },
  Low:    { bg: "#E8F5E9", color: "#2E7D32" },
};

// ─── Supplier Claim Drawer ──────────────────────────────────────────────────────

const CLAIM_FLOW = ["Open", "Submitted", "Acknowledged", "Accepted", "Resolved"];

function SupplierClaimDrawer({ record, onClose }: { record: typeof SB_RECORDS[0]; onClose: () => void }) {
  const [resolution, setResolution] = useState("Replacement");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const claimValue = (record.shortQty * (record.value / record.shortQty)).toFixed(2);

  if (submitted) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 440, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-6px 0 32px rgba(0,0,0,0.18)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>Claim Submitted</div>
            <div style={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>Supplier claim for {record.medicine} has been submitted for review.</div>
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
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Short Book</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Submit Supplier Claim</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Reference card */}
          <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>Claim Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ label: "Short Book", value: record.id }, { label: "Supplier", value: record.supplier }, { label: "Short Qty", value: String(record.shortQty) }, { label: "Claim Value", value: `₹${record.value.toFixed(2)}` }].map(r => (
                <div key={r.label}><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div><div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{r.value}</div></div>
              ))}
            </div>
          </div>

          {/* Resolution type */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 8 }}>Resolution Type</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Replacement", "Credit Note", "Refund"].map(r => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1px solid ${resolution === r ? "#1B6CA8" : "#E8ECF4"}`, background: resolution === r ? "#EFF6FF" : "#fff" }}>
                  <input type="radio" value={r} checked={resolution === r} onChange={() => setResolution(r)} style={{ accentColor: "#1B6CA8" }} />
                  <span style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter", fontWeight: resolution === r ? 600 : 400 }}>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 8 }}>Evidence</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Attach Invoice", "Attach PO", "Add Photo"].map(b => (
                <button key={b} style={{ flex: 1, padding: "8px 0", border: "1px dashed #DDE3EC", background: "#FAFBFD", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>{b}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional context for the supplier..." style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", resize: "vertical", boxSizing: "border-box" as const }} onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
          </div>

          {/* Status flow */}
          <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #EEF1F6" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Status Flow</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {CLAIM_FLOW.map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "#1B6CA8" : "#E8ECF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {i === 0 ? <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>1</span> : <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700 }}>{i + 1}</span>}
                    </div>
                    <div style={{ fontSize: 9, color: i === 0 ? "#1B6CA8" : "#9CA3AF", marginTop: 4, fontWeight: i === 0 ? 700 : 400, textAlign: "center", whiteSpace: "nowrap" }}>{step}</div>
                  </div>
                  {i < CLAIM_FLOW.length - 1 && <div style={{ height: 1, flex: 0.3, background: "#E8ECF4" }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={() => setSubmitted(true)} style={{ flex: 2, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Submit Claim</button>
        </div>
      </div>
    </>
  );
}

// ─── Short Book Detail Page ────────────────────────────────────────────────────

const CHAIN_STEPS = ["Purchase Order", "Supplier Confirmation", "Invoice", "Verification"];
const CHECK_ITEMS = ["Verify with supplier's dispatch note", "Check physical stock physically", "Review purchase order terms", "Confirm with logistics", "Document evidence photos"];

function ShortBookDetailPage({ record, onBack }: { record: typeof SB_RECORDS[0]; onBack: () => void }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [showClaimDrawer, setShowClaimDrawer] = useState(false);
  const toggle = (i: number) => setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const statusStyle = STATUS_STYLE[record.status] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
  const priorityStyle = PRIORITY_STYLE[record.priority] ?? { bg: "#F3F4F6", color: "#9CA3AF" };

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory / Short Book</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{record.id}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ padding: "4px 10px", borderRadius: 2, background: priorityStyle.bg, color: priorityStyle.color, fontSize: 11, fontWeight: 700 }}>{record.priority}</span>
          <span style={{ padding: "4px 10px", borderRadius: 2, background: statusStyle.bg, color: statusStyle.color, fontSize: 11, fontWeight: 700 }}>{record.status}</span>
          <button onClick={() => setShowClaimDrawer(true)} style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Supplier Claim</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignContent: "start" }}>
        {/* Medicine info */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Medicine Details</div>
          <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>{record.medicine}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>{record.category} &middot; Batch: {record.batch}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ label: "Supplier", value: record.supplier }, { label: "Type", value: record.type }, { label: "Date Reported", value: record.date }, { label: "Investigator", value: record.investigator }].map(r => (
              <div key={r.label}><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div><div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{r.value}</div></div>
            ))}
          </div>
        </div>

        {/* Quantity breakdown */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Quantity Breakdown</div>
          {[
            { label: "Ordered", value: record.orderQty, color: "#1B6CA8" },
            { label: "Confirmed", value: record.orderQty, color: "#1B6CA8" },
            { label: "Invoiced", value: record.orderQty, color: "#1B6CA8" },
            { label: "Received", value: record.receivedQty, color: "#2E7D32" },
            { label: "Short", value: record.shortQty, color: "#C62828", bold: true },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F4F6FA" }}>
              <span style={{ fontSize: 13, color: "#4A5875" }}>{r.label}</span>
              <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: r.bold ? 700 : 600, color: r.color }}>{r.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2" }}>
            <div style={{ fontSize: 11, color: "#C62828", fontWeight: 700 }}>Short Reason: {record.reason}</div>
            <div style={{ fontSize: 11, color: "#E65100", marginTop: 4, fontFamily: "JetBrains Mono" }}>Claim Value: ₹{record.value.toFixed(2)}</div>
          </div>
        </div>

        {/* Source chain */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Source Chain</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
            {CHAIN_STEPS.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "#1B6CA8" : "#FFEBEE", border: `2px solid ${i < 3 ? "#1B6CA8" : "#C62828"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i < 3 ? <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>&#10003;</span> : <span style={{ fontSize: 11, color: "#C62828", fontWeight: 700 }}>!</span>}
                  </div>
                  <div style={{ fontSize: 10, color: i < 3 ? "#1B6CA8" : "#C62828", marginTop: 5, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{step}</div>
                </div>
                {i < CHAIN_STEPS.length - 1 && <div style={{ height: 2, flex: 0.3, background: i < 2 ? "#1B6CA8" : "#E8ECF4" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Investigation checklist */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Investigation Checklist</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CHECK_ITEMS.map((item, i) => (
              <label key={i} onClick={() => toggle(i)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, border: `2px solid ${checkedItems.has(i) ? "#1B6CA8" : "#DDE3EC"}`, background: checkedItems.has(i) ? "#1B6CA8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {checkedItems.has(i) && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>&#10003;</span>}
                </div>
                <span style={{ fontSize: 13, color: checkedItems.has(i) ? "#9CA3AF" : "#1A2436", textDecoration: checkedItems.has(i) ? "line-through" : "none", fontFamily: "Inter" }}>{item}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "8px 0", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Purchase Return</button>
            <button style={{ flex: 1, padding: "8px 0", border: "1px solid #2E7D32", background: "#E8F5E9", fontSize: 12, cursor: "pointer", color: "#2E7D32", fontFamily: "Inter", fontWeight: 600 }}>Resolve</button>
          </div>
        </div>
      </div>

      {showClaimDrawer && <SupplierClaimDrawer record={record} onClose={() => setShowClaimDrawer(false)} />}
    </div>
  );
}

// ─── Main Short Book Screen ────────────────────────────────────────────────────

const TYPE_TABS = ["All", "Purchase", "Physical", "Sales", "Transfer", "Damage", "Expiry"];

export default function ShortBookScreen() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [detailRecord, setDetailRecord] = useState<typeof SB_RECORDS[0] | null>(null);

  const openCount       = SB_RECORDS.filter(r => r.status === "Open").length;
  const investigatingCount = SB_RECORDS.filter(r => r.status === "Investigating").length;
  const claimCount      = SB_RECORDS.filter(r => r.status === "Supplier Claim").length;
  const recoveryCount   = SB_RECORDS.filter(r => r.status === "Recovery").length;

  const STATUS_HEADER = [
    { label: "Open",          count: openCount,          color: "#C62828", bg: "#FFEBEE" },
    { label: "Investigating",  count: investigatingCount, color: "#E65100", bg: "#FFF3E0" },
    { label: "Supplier Claim", count: claimCount,         color: "#1B6CA8", bg: "#EFF6FF" },
    { label: "Recovery",       count: recoveryCount,      color: "#6B21A8", bg: "#F5F3FF" },
  ];

  const filtered = SB_RECORDS.filter(r => {
    const matchSearch = !search || r.medicine.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.supplier.toLowerCase().includes(search.toLowerCase());
    const matchType = activeType === "All" || r.type === activeType;
    const matchStatus = activeStatus === "All" || r.status === activeStatus;
    return matchSearch && matchType && matchStatus;
  });

  const { pageRows, footerProps } = usePagination(filtered, 10);

  if (detailRecord) return <ShortBookDetailPage record={detailRecord} onBack={() => setDetailRecord(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Short Book</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{SB_RECORDS.length} cases &middot; Shortage investigation center</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export CSV</button>
          <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ New Short</button>
        </div>
      </div>

      {/* Status header counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {STATUS_HEADER.map(s => (
          <button key={s.label} onClick={() => setActiveStatus(activeStatus === s.label ? "All" : s.label)}
            style={{ padding: "12px 16px", border: `1px solid ${activeStatus === s.label ? s.color : "#DDE3EC"}`, background: activeStatus === s.label ? s.bg : "#fff", cursor: "pointer", textAlign: "left" as const }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{s.label}</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", padding: "0 12px" }}>
          {TYPE_TABS.map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              style={{ padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: activeType === t ? 700 : 400, color: activeType === t ? "#1B6CA8" : "#6B7280", borderBottom: activeType === t ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -1 }}>
              {t}
            </button>
          ))}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0 4px" }}>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search short book..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 220, padding: "6px 10px 6px 28px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
              <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Short Book ID", "Medicine", "Batch", "Type", "Supplier", "Ordered", "Received", "Short Qty", "Value", "Priority", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: i >= 5 ? "right" as const : "left" as const, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => {
              const ss = STATUS_STYLE[r.status] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
              const ps = PRIORITY_STYLE[r.priority] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
              return (
                <tr key={r.id} onClick={() => setDetailRecord(r)} style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{r.id}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#1B6CA8" }}>{r.medicine}</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.batch}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#4A5875" }}>{r.type}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>{r.supplier}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>{r.orderQty}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>{r.receivedQty}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right" as const, color: "#C62828" }}>{r.shortQty}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right" as const, color: "#1A2436" }}>₹{r.value.toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ps.bg, color: ps.color }}>{r.priority}</span></td>
                  <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: ss.bg, color: ss.color, whiteSpace: "nowrap" as const }}>{r.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No short book records match your search.</div>}
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}
