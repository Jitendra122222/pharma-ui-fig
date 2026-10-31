import { useState, useRef } from "react";
import { SK } from "../../styles/stock";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { expiryItems } from "./stockData";
import { drugs } from "../../data/mockData";

// ── Supplier Return types ──────────────────────────────────────────────────
type ReturnStatus = "Eligible" | "Non-returnable" | "Window Closed" | "Initiated" | "Acknowledged" | "Picked Up" | "Credit Received";

interface ReturnRecord {
  id: string;
  drug: string;
  supplier: string;
  qty: number;
  unitCost: number;
  creditValue: number;
  status: "Initiated" | "Acknowledged" | "Picked Up" | "Credit Received";
  initiatedDate: string;
  pickupDate: string;
  notes: string;
}

// Drugs that cannot be returned (cold chain opened, controlled, or supplier policy)
const NON_RETURNABLE_DRUGS = new Set(["Insulin Glargine", "Warfarin 5mg"]);

// Return window: supplier accepts returns up to this many days after expiry
const RETURN_WINDOW_DAYS_AFTER_EXPIRY = 30;

function computeReturnStatus(d: typeof expiryItems[0], records: ReturnRecord[]): ReturnStatus {
  const active = records.find(r => r.drug === d.name);
  if (active) return active.status;
  if (NON_RETURNABLE_DRUGS.has(d.name)) return "Non-returnable";
  // Window closed if expired more than RETURN_WINDOW_DAYS_AFTER_EXPIRY days ago
  if (d.daysLeft < -RETURN_WINDOW_DAYS_AFTER_EXPIRY) return "Window Closed";
  return "Eligible";
}

const RETURN_STATUS_STYLE: Record<ReturnStatus, { bg: string; color: string; border?: string }> = {
  "Eligible":        { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Non-returnable":  { bg: "#FFEBEE", color: "#C62828" },
  "Window Closed":   { bg: "#F0F3F7", color: "#6B7280", border: "#DDE3EC" },
  "Initiated":       { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
  "Acknowledged":    { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
  "Picked Up":       { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Credit Received": { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
};

// ── Write-off types ───────────────────────────────────────────────────────
type DisposalMethod = "Municipal Waste (non-hazardous)" | "Incineration (hazardous)" | "Drain Disposal (liquids)" | "CPCB Authorised Facility" | "Return to Supplier";

interface WriteOffRecord {
  id: string;
  drug: string;
  qty: number;
  unitCost: number;
  totalValue: number;
  disposalMethod: DisposalMethod;
  disposalCertRef: string;
  glAccount: string;
  notes: string;
  createdDate: string;
  status: "Pending Approval" | "Approved" | "Disposed";
}

const GL_ACCOUNT = "5202 — Expired Stock Write-off Expense";

// ── Alert Threshold types ─────────────────────────────────────────────────
interface CategoryThreshold {
  category: string;
  warning: number;  // days — yellow zone
  critical: number; // days — orange zone
  urgent: number;   // days — red zone
}

const DEFAULT_THRESHOLDS: CategoryThreshold[] = [
  { category: "Antibiotics",      warning: 90, critical: 30, urgent: 7 },
  { category: "Antidiabetics",    warning: 90, critical: 30, urgent: 7 },
  { category: "Antihypertensives",warning: 90, critical: 30, urgent: 7 },
  { category: "Hormones",         warning: 60, critical: 30, urgent: 7 },
  { category: "Anticoagulants",   warning: 90, critical: 30, urgent: 7 },
  { category: "Antacids",         warning: 90, critical: 30, urgent: 7 },
  { category: "Bronchodilators",  warning: 90, critical: 30, urgent: 7 },
  { category: "Analgesics",       warning: 90, critical: 30, urgent: 7 },
  { category: "Statins",          warning: 90, critical: 30, urgent: 7 },
  { category: "Antidepressants",  warning: 90, critical: 30, urgent: 7 },
];

// ── Stock Velocity data (avg units sold per day, last 30 days) ────────────
// Keyed by drug name. Drugs not listed default to 0.
const SALES_VELOCITY: Record<string, number> = {
  "Paracetamol 500mg":   14.2,
  "Amoxicillin 500mg":    1.8,
  "Metformin 1000mg":     3.1,
  "Amlodipine 5mg":       6.4,
  "Omeprazole 20mg":      4.7,
  "Atorvastatin 20mg":    5.2,
  "Ciprofloxacin 500mg":  0.8,
  "Insulin Glargine":     1.1,
  "Warfarin 5mg":         0.5,
  "Lisinopril 10mg":      2.3,
  "Salbutamol Inhaler":   0.9,
  "Sertraline 50mg":      2.0,
};

function computeVelocityInsight(d: { name: string; stock: number; daysLeft: number }) {
  const vel = SALES_VELOCITY[d.name] ?? 0;
  if (vel === 0) return { vel: 0, willExpire: d.stock, pct: 100, surplus: d.stock };
  if (d.daysLeft <= 0) return { vel, willExpire: d.stock, pct: 100, surplus: d.stock };
  const canSell = Math.min(d.stock, Math.round(vel * d.daysLeft));
  const willExpire = Math.max(0, d.stock - canSell);
  const pct = d.stock > 0 ? Math.round((willExpire / d.stock) * 100) : 0;
  return { vel, willExpire, pct, surplus: willExpire };
}

// ── Audit Log types ───────────────────────────────────────────────────────
type AuditCheckType = "Full Inventory" | "Near-Expiry Only" | "Expired Only" | "Category Spot-check";
type AuditCheckStatus = "Completed" | "Overdue" | "Scheduled" | "In Progress";

interface AuditCheckRecord {
  id: string;
  type: AuditCheckType;
  checkedBy: string;
  scheduledDate: string;
  completedDate: string;
  itemsReviewed: number;
  issuesFound: number;
  status: AuditCheckStatus;
  notes: string;
}

const AUDIT_LOG_DATA: AuditCheckRecord[] = [
  { id: "EXP-CHK-0021", type: "Full Inventory",     checkedBy: "Rajesh Kumar",    scheduledDate: "2026-09-25", completedDate: "2026-09-25", itemsReviewed: 12, issuesFound: 3, status: "Completed",  notes: "3 expired SKUs flagged for disposal." },
  { id: "EXP-CHK-0020", type: "Near-Expiry Only",   checkedBy: "Priya Nair",      scheduledDate: "2026-09-10", completedDate: "2026-09-10", itemsReviewed:  6, issuesFound: 1, status: "Completed",  notes: "Omeprazole batch nearing expiry, queued for return." },
  { id: "EXP-CHK-0019", type: "Expired Only",       checkedBy: "Amit Sharma",     scheduledDate: "2026-08-28", completedDate: "",           itemsReviewed:  0, issuesFound: 0, status: "Overdue",   notes: "" },
  { id: "EXP-CHK-0018", type: "Category Spot-check", checkedBy: "Rajesh Kumar",   scheduledDate: "2026-08-15", completedDate: "2026-08-16", itemsReviewed:  4, issuesFound: 2, status: "Completed",  notes: "Antibiotics shelf audit — 2 expired items quarantined." },
  { id: "EXP-CHK-0017", type: "Full Inventory",     checkedBy: "Priya Nair",      scheduledDate: "2026-07-30", completedDate: "2026-07-30", itemsReviewed: 12, issuesFound: 5, status: "Completed",  notes: "Quarterly full check." },
  { id: "EXP-CHK-0022", type: "Near-Expiry Only",   checkedBy: "—",               scheduledDate: "2026-10-15", completedDate: "",           itemsReviewed:  0, issuesFound: 0, status: "Scheduled", notes: "" },
];

const AUDIT_STATUS_STYLE: Record<AuditCheckStatus, { bg: string; color: string; border?: string }> = {
  "Completed":   { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Overdue":     { bg: "#FFEBEE", color: "#C62828" },
  "Scheduled":   { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
  "In Progress": { bg: "#FFF3E0", color: "#E65100" },
};

type QuarantineStatus = "Quarantined" | "Under Review" | "Cleared" | "Disposed";

interface QuarantineRecord {
  id: string;
  drug: string;
  qty: number;
  reason: string;
  startDate: string;
  reviewDate: string;
  status: QuarantineStatus;
  location: string;
  value: number;
  daysInQuarantine: number;
}

const QUARANTINE_DATA: QuarantineRecord[] = [
  { id: "QRN-2025-0012", drug: "Ciprofloxacin 500mg", qty: 12, reason: "Near-expiry (< 30 days)", startDate: "2025-07-18", reviewDate: "2025-07-28", status: "Under Review", location: "Quarantine Bay 1", value: 720, daysInQuarantine: 10 },
  { id: "QRN-2025-0011", drug: "Insulin Glargine", qty: 5, reason: "Cold chain breach suspected", startDate: "2025-07-12", reviewDate: "2025-07-22", status: "Quarantined", location: "Cold Quarantine", value: 4250, daysInQuarantine: 16 },
  { id: "QRN-2025-0010", drug: "Warfarin 5mg", qty: 4, reason: "Damaged packaging", startDate: "2025-07-05", reviewDate: "2025-07-15", status: "Disposed", location: "—", value: 200, daysInQuarantine: 23 },
  { id: "QRN-2025-0009", drug: "Metformin 1000mg", qty: 18, reason: "Moisture damage", startDate: "2025-06-28", reviewDate: "2025-07-08", status: "Cleared", location: "—", value: 1080, daysInQuarantine: 10 },
];

const Q_STATUS_STYLE: Record<QuarantineStatus, { bg: string; color: string }> = {
  "Quarantined":  { bg: "#FFEBEE", color: "#C62828" },
  "Under Review": { bg: "#FFF3E0", color: "#E65100" },
  "Cleared":      { bg: "#E8F5E9", color: "#2E7D32" },
  "Disposed":     { bg: "#F3E5F5", color: "#7B1FA2" },
};

export default function StockExpiry() {
  const [expiryView, setExpiryView] = useState<"expiry" | "quarantine" | "auditlog">("expiry");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [qFilter, setQFilter] = useState<"All" | QuarantineStatus>("All");
  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>(QUARANTINE_DATA);
  const [showAddQ, setShowAddQ] = useState(false);
  const [qLockedDrug, setQLockedDrug] = useState<string | null>(null);
  const EMPTY_Q_FORM = { drug: "", qty: "", reason: "", location: "", reviewDate: "" };
  const [qForm, setQForm] = useState(EMPTY_Q_FORM);
  const [qDrugOpen, setQDrugOpen] = useState(false);
  const [qDrugSearch, setQDrugSearch] = useState("");
  const qDrugInputRef = useRef<HTMLInputElement>(null);
  const [qReasonOpen, setQReasonOpen] = useState(false);
  const [qLocationOpen, setQLocationOpen] = useState(false);
  const [expirySearch, setExpirySearch] = useState("");
  const [qSearch, setQSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<"All" | AuditCheckStatus>("All");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "dispose" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [expiryMenuOpen, setExpiryMenuOpen] = useState<string | null>(null);

  // ── Supplier Return state ──────────────────────────────────────────────
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>([]);
  const [returnModal, setReturnModal] = useState<typeof expiryItems[0] | null>(null);
  const EMPTY_RETURN_FORM = { qty: "", pickupDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), notes: "" };
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN_FORM);

  // ── Write-off state ────────────────────────────────────────────────────
  const [writeOffRecords, setWriteOffRecords] = useState<WriteOffRecord[]>([]);
  const [writeOffModal, setWriteOffModal] = useState<typeof expiryItems[0] | null>(null);
  const EMPTY_WO_FORM: { qty: string; disposalMethod: DisposalMethod; certRef: string; notes: string } = {
    qty: "", disposalMethod: "Municipal Waste (non-hazardous)", certRef: "", notes: "",
  };
  const [woForm, setWoForm] = useState(EMPTY_WO_FORM);
  const [woDisposalOpen, setWoDisposalOpen] = useState(false);

  // ── Audit Log state ────────────────────────────────────────────────────
  // ── Alert Threshold state ──────────────────────────────────────────────
  const [thresholds, setThresholds] = useState<CategoryThreshold[]>(DEFAULT_THRESHOLDS);
  const [showThresholds, setShowThresholds] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState<CategoryThreshold[]>([]);

  const [auditLog, setAuditLog] = useState<AuditCheckRecord[]>(AUDIT_LOG_DATA);
  const [showScheduleCheck, setShowScheduleCheck] = useState(false);
  const EMPTY_SCH: { type: AuditCheckType; scheduledDate: string; checkedBy: string; notes: string } = {
    type: "Near-Expiry Only",
    scheduledDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    checkedBy: "", notes: "",
  };
  const [schForm, setSchForm] = useState(EMPTY_SCH);
  const [schTypeOpen, setSchTypeOpen] = useState(false);

  function showToast(message: string, type: "success" | "error" | "dispose") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  const TOAST_COLOR = { success: "#2E7D32", error: "#C62828", dispose: "#7B1FA2" };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedRows = sortCol
    ? [...expiryItems].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : expiryItems;

  // Expiry Financial View calculations
  const expiredItems = expiryItems.filter(d => d.daysLeft < 0);
  const criticalItems = expiryItems.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30);
  const warningItems = expiryItems.filter(d => d.daysLeft > 30 && d.daysLeft <= 90);
  const expiredValue = expiredItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const criticalValue = criticalItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const warningValue = warningItems.reduce((s, d) => s + d.stock * (d.cost ?? 0), 0);
  const totalAtRisk = expiredValue + criticalValue + warningValue;

  // Quarantine stats
  const activeQ = quarantine.filter(q => q.status === "Quarantined" || q.status === "Under Review");
  const activeQValue = activeQ.reduce((s, q) => s + q.value, 0);
  const overdue = activeQ.filter(q => q.daysInQuarantine > 14);

  const filteredQ = (qFilter === "All" ? quarantine : quarantine.filter(q => q.status === qFilter))
    .filter(q => !qSearch || q.drug.toLowerCase().includes(qSearch.toLowerCase()) || q.id.toLowerCase().includes(qSearch.toLowerCase()));

  const searchedExpiryRows = sortedRows.filter(d =>
    !expirySearch || d.name.toLowerCase().includes(expirySearch.toLowerCase()) || d.category.toLowerCase().includes(expirySearch.toLowerCase())
  );
  const { pageRows: expiryPageRows, footerProps: expiryFooterProps } = usePagination(searchedExpiryRows, 10);
  const { pageRows: qPageRows, footerProps: qFooterProps } = usePagination(filteredQ, 10);

  const filteredAudit = auditLog
    .filter(a => auditStatusFilter === "All" || a.status === auditStatusFilter)
    .filter(a => !auditSearch || a.id.toLowerCase().includes(auditSearch.toLowerCase()) || a.checkedBy.toLowerCase().includes(auditSearch.toLowerCase()) || a.type.toLowerCase().includes(auditSearch.toLowerCase()) || a.notes.toLowerCase().includes(auditSearch.toLowerCase()))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const { pageRows: auditPageRows, footerProps: auditFooterProps } = usePagination(filteredAudit, 10);

  // ── Action Required Banner derived data ──────────────────────────────────
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  const immediateItems = expiryItems.filter(d => d.daysLeft < 0);
  const within7Items   = expiryItems.filter(d => d.daysLeft >= 0 && d.daysLeft <= 7);
  const within30Items  = expiryItems.filter(d => d.daysLeft > 7 && d.daysLeft <= 30);
  const totalActionItems = immediateItems.length + within7Items.length + within30Items.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Action Required Banner ── */}
      {totalActionItems > 0 && (
        <div style={{ background: "#fff", border: "1px solid #FFCDD2", borderLeft: "4px solid #C62828", borderRadius: 5, overflow: "hidden" }}>
          {/* Banner header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", cursor: "pointer" }}
            onClick={() => setBannerCollapsed(c => !c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 700, color: "#C62828" }}>
                {totalActionItems} item{totalActionItems !== 1 ? "s" : ""} require immediate action
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {immediateItems.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFEBEE", color: "#C62828", fontWeight: 700, fontFamily: "Inter", borderRadius: 3 }}>{immediateItems.length} EXPIRED</span>}
                {within7Items.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFF3E0", color: "#E65100", fontWeight: 700, fontFamily: "Inter", borderRadius: 3 }}>{within7Items.length} WITHIN 7D</span>}
                {within30Items.length > 0 && <span style={{ fontSize: 10, padding: "1px 8px", background: "#FFFDE7", color: "#F57F17", fontWeight: 700, fontFamily: "Inter", borderRadius: 3 }}>{within30Items.length} WITHIN 30D</span>}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: bannerCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}><path d="m6 9 6 6 6-6"/></svg>
          </div>

          {/* Banner body */}
          {!bannerCollapsed && (
            <div style={{ borderTop: "1px solid #FFEBEE", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Dispose immediately", items: immediateItems, color: "#C62828", bg: "#FFEBEE", tabKey: "expiry" as const },
                { label: "Action within 7 days", items: within7Items, color: "#E65100", bg: "#FFF3E0", tabKey: "expiry" as const },
                { label: "Monitor within 30 days", items: within30Items, color: "#F57F17", bg: "#FFFDE7", tabKey: "expiry" as const },
              ].filter(g => g.items.length > 0).map(g => (
                <div key={g.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 12px", background: g.bg, borderRadius: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: g.color, fontFamily: "Inter", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{g.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                      {g.items.map(d => (
                        <span key={d.id} style={{ fontSize: 11, padding: "2px 8px", background: "#fff", border: `1px solid ${g.color}`, color: g.color, fontWeight: 600, fontFamily: "Inter", borderRadius: 3 }}>{d.name}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setExpiryView(g.tabKey)}
                    style={{ padding: "5px 13px", border: `1px solid ${g.color}`, background: "#fff", color: g.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter", flexShrink: 0, borderRadius: 3 }}>
                    Review
                  </button>
                </div>
              ))}
              {activeQ.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 12px", background: "#F3E5F5", borderRadius: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7B1FA2", fontFamily: "Inter", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Quarantine review overdue ({activeQ.filter(q => q.daysInQuarantine > 14).length} items)</div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                      {activeQ.filter(q => q.daysInQuarantine > 14).map(q => (
                        <span key={q.id} style={{ fontSize: 11, padding: "2px 8px", background: "#fff", border: "1px solid #7B1FA2", color: "#7B1FA2", fontWeight: 600, fontFamily: "Inter", borderRadius: 3 }}>{q.drug}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setExpiryView("quarantine")}
                    style={{ padding: "5px 13px", border: "1px solid #7B1FA2", background: "#fff", color: "#7B1FA2", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter", flexShrink: 0, borderRadius: 3 }}>
                    Review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Expired — Write-off Required", value: `₹${expiredValue.toFixed(0)}`, sub: `${expiredItems.length} SKUs`, color: "#C62828" },
          { label: "Critical Risk (≤ 30 days)",    value: `₹${criticalValue.toFixed(0)}`, sub: `${criticalItems.length} SKUs`, color: "#E65100" },
          { label: "Warning Zone (≤ 90 days)",     value: `₹${warningValue.toFixed(0)}`,  sub: `${warningItems.length} SKUs`,  color: "#F57F17" },
          { label: "Total Capital at Risk",         value: `₹${totalAtRisk.toFixed(0)}`,   sub: "Combined exposure",             color: "#1A2436" },
        ].map(k => (
          <div key={k.label} style={SK.kpiTile}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabbed Card: Expiry Alerts / Quarantine ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "expiry" as const, label: "Expiry Alerts", count: expiryItems.filter(d => d.daysLeft <= 90).length },
            { key: "quarantine" as const, label: "Quarantine", count: activeQ.length },
            { key: "auditlog" as const, label: "Audit Log", count: auditLog.filter(a => a.status === "Overdue").length },
          ]).map(t => (
            <button key={t.key} onClick={() => setExpiryView(t.key)}
              style={{
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontFamily: "Inter", fontWeight: expiryView === t.key ? 600 : 400,
                color: expiryView === t.key ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${expiryView === t.key ? "#1B6CA8" : "transparent"}`,
                marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700,
                  background: expiryView === t.key ? (t.key === "auditlog" ? "#FFEBEE" : "#EFF6FF") : "#F0F3F7",
                  color: expiryView === t.key ? (t.key === "auditlog" ? "#C62828" : "#1B6CA8") : "#9CA3AF",
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Expiry Alerts tab ── */}
        {expiryView === "expiry" && (
          <>
            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={SK.searchWrapper}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search by drug or category..." value={expirySearch} onChange={e => setExpirySearch(e.target.value)}
                  style={SK.searchInput} />
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button
                  onClick={() => { setThresholdDraft(thresholds.map(t => ({ ...t }))); setShowThresholds(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", border: "1px solid #DDE3EC", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "Inter", color: "#6B7280", fontWeight: 600 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Alert Thresholds
                </button>
              </div>
            </div>
            {/* Expiry table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Drug</Th>
                  <Th onSort={() => handleSort("category")} sortDir={sortCol === "category" ? sortDir : null}>Category</Th>
                  <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
                  <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock</Th>
                  <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
                  <Th onSort={() => handleSort("daysLeft")} sortDir={sortCol === "daysLeft" ? sortDir : null}>Days Left</Th>
                  <Th>Action Needed</Th>
                  <Th>Velocity / Forecast</Th>
                  <Th>Supplier</Th>
                  <Th>Return Status</Th>
                  <Th>Actions</Th>
                </tr></thead>
                <tbody>
                  {expiryPageRows.map(d => {
                    const thr = thresholds.find(t => t.category === d.category) ?? { warning: 90, critical: 30, urgent: 7 };
                    const expired = d.daysLeft < 0;
                    const urgent = !expired && d.daysLeft <= thr.critical;
                    const warning = !expired && !urgent && d.daysLeft <= thr.warning;
                    const rowBg = expired ? "#FFF5F5" : urgent ? "#FFFBEB" : "transparent";
                    const dayColor = expired ? "#C62828" : urgent ? "#E65100" : warning ? "#F57F17" : "#6B7280";
                    const action = expired ? "Dispose immediately" : urgent ? "Initiate return / disposal" : warning ? "Monitor & prioritise sales" : "No action required";
                    const isQuarantined = quarantine.some(q => q.drug === d.name && (q.status === "Quarantined" || q.status === "Under Review"));
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid #F4F6FA", background: rowBg }}>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" as const }}>{d.stock}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: dayColor }}>{d.expiry}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: dayColor }}>
                            {expired ? "EXPIRED" : `${d.daysLeft}d`}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: dayColor, fontWeight: urgent || expired ? 600 : 400 }}>{action}</td>
                        <td style={{ padding: "11px 14px", minWidth: 148 }}>
                          {(() => {
                            const vi = computeVelocityInsight(d);
                            const noVel = vi.vel === 0;
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>
                                  {noVel
                                    ? <span style={{ color: "#9CA3AF" }}>No sales data</span>
                                    : <><span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{vi.vel.toFixed(1)}</span> units/day</>
                                  }
                                </div>
                                {!noVel && !expired && (
                                  <div style={{ height: 4, background: "#F0F3F7", position: "relative" as const, width: 100 }}>
                                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, 100 - vi.pct)}%`, background: vi.pct > 50 ? "#C62828" : vi.pct > 20 ? "#E65100" : "#2E7D32" }} />
                                  </div>
                                )}
                                {vi.willExpire > 0 && (
                                  <div style={{ fontSize: 10, fontWeight: 700, color: expired ? "#C62828" : vi.pct > 50 ? "#C62828" : "#E65100", fontFamily: "Inter" }}>
                                    {vi.willExpire} units expire unsold
                                  </div>
                                )}
                                {!noVel && vi.willExpire === 0 && !expired && (
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#2E7D32", fontFamily: "Inter" }}>On track to sell out</div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{d.supplier}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {(() => {
                            const rs = computeReturnStatus(d, returnRecords);
                            const sty = RETURN_STATUS_STYLE[rs];
                            return (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 9px",
                                background: sty.bg, color: sty.color,
                                border: `1px solid ${sty.border ?? sty.color}`,
                                whiteSpace: "nowrap" as const,
                              }}>{rs}</span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {(() => {
                            const rs = computeReturnStatus(d, returnRecords);
                            const canReturn = rs === "Eligible";
                            const woPending = !!writeOffRecords.find(w => w.drug === d.name);
                            const hasActions = canReturn || expired || urgent || isQuarantined;
                            if (!hasActions) return null;
                            return (
                              <div style={{ position: "relative" }}>
                                {expiryMenuOpen === d.id && (
                                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setExpiryMenuOpen(null)} />
                                )}
                                <button
                                  onClick={() => setExpiryMenuOpen(open => open === d.id ? null : d.id)}
                                  style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: expiryMenuOpen === d.id ? "#F0F3F7" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                                </button>
                                {expiryMenuOpen === d.id && (
                                  <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 150 }}>
                                    {canReturn && (
                                      <div onMouseDown={() => { setReturnModal(d); setReturnForm({ ...EMPTY_RETURN_FORM, qty: String(d.stock) }); setExpiryMenuOpen(null); }}
                                        style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#2E7D32", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F0FFF4"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                                        Return to Supplier
                                      </div>
                                    )}
                                    {expired && !woPending && (
                                      <div onMouseDown={() => { setWriteOffModal(d); setWoForm({ ...EMPTY_WO_FORM, qty: String(d.stock), notes: `Batch expired ${d.expiry}` }); setExpiryMenuOpen(null); }}
                                        style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#7B1FA2", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAF5FF"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                        Write-off
                                      </div>
                                    )}
                                    {woPending && (
                                      <div style={{ padding: "9px 14px", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 8, cursor: "default" }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        Write-off Pending
                                      </div>
                                    )}
                                    {isQuarantined ? (
                                      <div style={{ padding: "9px 14px", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 8, cursor: "default" }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        In Quarantine
                                      </div>
                                    ) : (urgent || expired) ? (
                                      <div onMouseDown={() => { setQLockedDrug(d.name); setQForm({ ...EMPTY_Q_FORM, drug: d.name }); setShowAddQ(true); setExpiryMenuOpen(null); }}
                                        style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#C62828", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Quarantine
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...expiryFooterProps} />
          </>
        )}

        {/* ── Quarantine tab ── */}
        {expiryView === "quarantine" && (
          <>
            {/* Search + filter pills + action (single row) */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 240px", minHeight: 40, boxSizing: "border-box" as const }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search quarantine..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
              </div>
              <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["All", "Quarantined", "Under Review", "Cleared", "Disposed"] as const).map(f => (
                  <button key={f} onClick={() => setQFilter(f)}
                    style={{ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: qFilter === f ? 600 : 400, fontFamily: "Inter", border: `1px solid ${qFilter === f ? "#1B6CA8" : "#DDE3EC"}`, background: qFilter === f ? "#EFF6FF" : "#fff", color: qFilter === f ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" as const }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => { setQLockedDrug(null); setQForm(EMPTY_Q_FORM); setShowAddQ(true); }} style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", minHeight: 40, boxSizing: "border-box" as const }}>
                  + Add to Quarantine
                </button>
              </div>
            </div>
            {/* Quarantine table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["QRN #", "Drug", "Qty", "Reason", "Start Date", "Days in Quarantine", "Review Date", "Location", "Value", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qPageRows.map(q => {
                    const ss = Q_STATUS_STYLE[q.status];
                    const ageColor = q.daysInQuarantine > 14 ? "#C62828" : q.daysInQuarantine > 7 ? "#E65100" : "#6B7280";
                    return (
                      <tr key={q.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{q.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{q.drug}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{q.qty}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{q.reason}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.startDate}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ height: 5, width: 60, background: "#F0F3F7", position: "relative" as const, flexShrink: 0 }}>
                              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (q.daysInQuarantine / 21) * 100)}%`, background: ageColor }} />
                            </div>
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: ageColor }}>{q.daysInQuarantine}d</span>
                            {q.daysInQuarantine > 14 && <span style={{ fontSize: 10, background: "#FFEBEE", color: "#C62828", padding: "1px 5px", fontWeight: 700 }}>OVERDUE</span>}
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.reviewDate}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{q.location}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>₹{q.value.toFixed(0)}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <Pill label={q.status} bg={ss.bg} color={ss.color} />
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          {(q.status === "Quarantined" || q.status === "Under Review") ? (
                            <div style={{ position: "relative" }}>
                              {actionMenuOpen === q.id && (
                                <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setActionMenuOpen(null)} />
                              )}
                              <button
                                onClick={() => setActionMenuOpen(open => open === q.id ? null : q.id)}
                                style={{ width: 30, height: 30, border: "1px solid #DDE3EC", borderRadius: 6, background: actionMenuOpen === q.id ? "#F0F3F7" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                              </button>
                              {actionMenuOpen === q.id && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 130 }}>
                                  {q.status === "Under Review" && (
                                    <div onMouseDown={() => {
                                      setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Quarantined" as QuarantineStatus } : r));
                                      setActionMenuOpen(null);
                                      showToast(`${q.drug} moved to Quarantined`, "error");
                                    }}
                                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#C62828", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                      Quarantine
                                    </div>
                                  )}
                                  <div onMouseDown={() => {
                                    setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Cleared" as QuarantineStatus } : r));
                                    setActionMenuOpen(null);
                                    showToast(`${q.drug} cleared from quarantine`, "success");
                                  }}
                                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#2E7D32", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F0FFF4"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                    Clear
                                  </div>
                                  <div onMouseDown={() => {
                                    setQuarantine(prev => prev.map(r => r.id === q.id ? { ...r, status: "Disposed" as QuarantineStatus } : r));
                                    setActionMenuOpen(null);
                                    showToast(`${q.drug} marked as disposed`, "dispose");
                                  }}
                                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#7B1FA2", display: "flex", alignItems: "center", gap: 8, background: "#fff" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAF0FF"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                    Dispose
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {qPageRows.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No quarantine records for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...qFooterProps} />
          </>
        )}

        {/* ── Audit Log tab ── */}
        {expiryView === "auditlog" && (() => {
          const overdueCks = auditLog.filter(a => a.status === "Overdue");
          const completedCks = auditLog.filter(a => a.status === "Completed");
          const lastCompleted = completedCks.sort((a, b) => b.completedDate.localeCompare(a.completedDate))[0];
          const nextScheduled = auditLog.filter(a => a.status === "Scheduled").sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
          return (
            <>
              {/* Summary strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #EEF1F6" }}>
                {[
                  { label: "Last Check", value: lastCompleted?.completedDate ?? "—", sub: lastCompleted?.type ?? "", color: "#1A2436" },
                  { label: "Next Scheduled", value: nextScheduled?.scheduledDate ?? "—", sub: nextScheduled?.type ?? "None scheduled", color: "#1B6CA8" },
                  { label: "Overdue Checks", value: String(overdueCks.length), sub: overdueCks.length > 0 ? "Attention required" : "All clear", color: overdueCks.length > 0 ? "#C62828" : "#2E7D32" },
                  { label: "Total Checks", value: String(auditLog.length), sub: `${completedCks.length} completed`, color: "#1A2436" },
                ].map(s => (
                  <div key={s.label} style={{ padding: "14px 18px", borderRight: "1px solid #EEF1F6" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: 4, fontFamily: "Inter" }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "JetBrains Mono" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Overdue alert banner */}
              {overdueCks.length > 0 && (
                <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 12, color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>
                    {overdueCks.length} overdue {overdueCks.length === 1 ? "check" : "checks"} — {overdueCks.map(c => c.id).join(", ")}. Schedule and complete immediately.
                  </span>
                </div>
              )}

              {/* Toolbar: search + filter pills + action */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 240px", minHeight: 40, boxSizing: "border-box" as const }}>
                  <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search checks..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
                </div>
                <div style={{ width: 1, height: 20, background: "#DDE3EC" }} />
                {/* Status filter pills */}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["All", "Completed", "Overdue", "Scheduled", "In Progress"] as const).map(f => (
                    <button key={f} onClick={() => setAuditStatusFilter(f)}
                      style={{ padding: "0 14px", fontSize: 12, cursor: "pointer", fontWeight: auditStatusFilter === f ? 600 : 400, fontFamily: "Inter", border: `1px solid ${auditStatusFilter === f ? "#1B6CA8" : "#DDE3EC"}`, background: auditStatusFilter === f ? "#EFF6FF" : "#fff", color: auditStatusFilter === f ? "#1B6CA8" : "#6B7280", borderRadius: 20, minHeight: 40, boxSizing: "border-box" as const }}>
                      {f}
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <button onClick={() => { setSchForm(EMPTY_SCH); setShowScheduleCheck(true); }}
                    style={{ padding: "9px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Schedule Check
                  </button>
                </div>
              </div>

              {/* Audit table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Check ID", "Type", "Scheduled Date", "Completed Date", "Checked By", "Items Reviewed", "Issues Found", "Status", "Notes"].map(h => (
                        <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditPageRows.map(a => {
                      const ss = AUDIT_STATUS_STYLE[a.status];
                      const rowBg = a.status === "Overdue" ? "#FFF5F5" : "transparent";
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid #F4F6FA", background: rowBg }}
                          onMouseEnter={e => { if (a.status !== "Overdue") (e.currentTarget as HTMLElement).style.background = "#F7F9FC"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}>
                          <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{a.id}</td>
                          <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436", fontFamily: "Inter" }}>{a.type}</td>
                          <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.scheduledDate}</td>
                          <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: a.completedDate ? "#2E7D32" : "#C62828" }}>{a.completedDate || "—"}</td>
                          <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{a.checkedBy || "—"}</td>
                          <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{a.itemsReviewed || "—"}</td>
                          <td style={{ padding: "11px 13px", textAlign: "right" as const }}>
                            {a.issuesFound > 0 ? (
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: "#C62828" }}>{a.issuesFound}</span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{a.status === "Completed" ? "0" : "—"}</span>
                            )}
                          </td>
                          <td style={{ padding: "11px 13px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", background: ss.bg, color: ss.color, border: `1px solid ${ss.border ?? ss.color}`, whiteSpace: "nowrap" as const }}>{a.status}</span>
                          </td>
                          <td style={{ padding: "11px 13px", fontSize: 11, color: "#6B7280", fontFamily: "Inter", maxWidth: 200 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{a.notes || "—"}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationFooter {...auditFooterProps} />
            </>
          );
        })()}
      </div>

      {/* ── Alert Threshold Configuration modal ── */}
      {showThresholds && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 560, borderRadius: 6, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Alert Threshold Configuration</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Set warning / critical / urgent day limits per drug category</div>
              </div>
              <button onClick={() => setShowThresholds(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: "14px 20px 0" }}>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "9px 13px", fontSize: 11, color: "#1B6CA8", fontFamily: "Inter", lineHeight: 1.5 }}>
                Days remaining before expiry. <strong>Warning</strong> = amber, <strong>Critical</strong> = orange, <strong>Urgent</strong> = red.
              </div>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, padding: "6px 0", borderBottom: "1px solid #EEF1F6", marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", fontFamily: "Inter" }}>Category</div>
                {[
                  { label: "Warning", color: "#F57F17", bg: "#FFFDE7" },
                  { label: "Critical", color: "#E65100", bg: "#FFF3E0" },
                  { label: "Urgent", color: "#C62828", bg: "#FFEBEE" },
                ].map(c => (
                  <div key={c.label} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: c.color, fontFamily: "Inter", textAlign: "center" as const, background: c.bg, padding: "3px 0", borderRadius: 3 }}>{c.label}</div>
                ))}
              </div>
              {thresholdDraft.map((t, i) => (
                <div key={t.category} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, padding: "7px 0", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{t.category}</div>
                  {(["warning", "critical", "urgent"] as const).map(field => (
                    <div key={field} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number" min={1} max={365}
                        value={thresholdDraft[i][field]}
                        onChange={e => {
                          const val = Math.max(1, Math.min(365, Number(e.target.value)));
                          setThresholdDraft(prev => prev.map((r, ri) => ri === i ? { ...r, [field]: val } : r));
                        }}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #DDE3EC", borderRadius: 4, fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, outline: "none", textAlign: "center" as const, boxSizing: "border-box" as const }}
                      />
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>d</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
                <button
                  onClick={() => setThresholdDraft(DEFAULT_THRESHOLDS.map(t => ({ ...t })))}
                  style={{ padding: "8px 14px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
                  Reset to defaults
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowThresholds(false)}
                    style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                    Cancel
                  </button>
                  <button onClick={() => { setThresholds(thresholdDraft); setShowThresholds(false); showToast("Alert thresholds updated", "success"); }}
                    style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                    Save Thresholds
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Check modal ── */}
      {showScheduleCheck && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 440, borderRadius: 6, border: "1px solid #E8ECF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Schedule Expiry Check</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Plan a new audit check for this pharmacy location</div>
              </div>
              <button onClick={() => { setShowScheduleCheck(false); setSchForm(EMPTY_SCH); setSchTypeOpen(false); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Check type */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Check Type</label>
                <div style={{ position: "relative" }}>
                  {schTypeOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setSchTypeOpen(false)} />}
                  <button type="button" onClick={() => setSchTypeOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${schTypeOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", color: "#1A2436", boxSizing: "border-box" as const }}>
                    <span>{schForm.type}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={schTypeOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: schTypeOpen ? "rotate(180deg)" : "none" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {schTypeOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {(["Full Inventory", "Near-Expiry Only", "Expired Only", "Category Spot-check"] as AuditCheckType[]).map(o => {
                        const active = schForm.type === o;
                        return (
                          <div key={o} onMouseDown={() => { setSchForm(p => ({ ...p, type: o })); setSchTypeOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Scheduled date */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Scheduled Date</label>
                <input type="date" value={schForm.scheduledDate} onChange={e => setSchForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>
              {/* Assigned to */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Assign To</label>
                <input type="text" placeholder="Staff member name" value={schForm.checkedBy}
                  onChange={e => setSchForm(p => ({ ...p, checkedBy: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>
              {/* Notes */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Notes (optional)</label>
                <textarea rows={2} value={schForm.notes} onChange={e => setSchForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Focus on Antibiotics shelf..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, resize: "vertical" as const }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowScheduleCheck(false); setSchForm(EMPTY_SCH); setSchTypeOpen(false); }}
                  style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                  Cancel
                </button>
                <button
                  disabled={!schForm.scheduledDate}
                  onClick={() => {
                    if (!schForm.scheduledDate) return;
                    const newId = `EXP-CHK-${String(auditLog.length + 1).padStart(4, "0")}`;
                    const newCheck: AuditCheckRecord = {
                      id: newId,
                      type: schForm.type,
                      checkedBy: schForm.checkedBy || "—",
                      scheduledDate: schForm.scheduledDate,
                      completedDate: "",
                      itemsReviewed: 0,
                      issuesFound: 0,
                      status: "Scheduled",
                      notes: schForm.notes,
                    };
                    setAuditLog(prev => [newCheck, ...prev]);
                    setShowScheduleCheck(false);
                    setSchForm(EMPTY_SCH);
                    setSchTypeOpen(false);
                    showToast(`${newId} scheduled for ${schForm.scheduledDate}`, "success");
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, opacity: !schForm.scheduledDate ? 0.5 : 1 }}>
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Write-off Voucher modal ── */}
      {writeOffModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 500, borderRadius: 6, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Generate Write-off Voucher</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{writeOffModal.name} — expired {writeOffModal.expiry}</div>
              </div>
              <button onClick={() => { setWriteOffModal(null); setWoForm(EMPTY_WO_FORM); setWoDisposalOpen(false); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Approval warning */}
              <div style={{ background: "#FFF3E0", border: "1px solid #E65100", borderRadius: 5, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div style={{ fontSize: 12, color: "#E65100", lineHeight: 1.5 }}>
                  <strong>Manager approval required</strong> for write-offs above ₹5,000. This voucher will be submitted for approval before posting to accounts.
                </div>
              </div>

              {/* Drug / Batch info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Drug", val: writeOffModal.name },
                  { label: "Batch #", val: writeOffModal.batchId ?? "—" },
                  { label: "Stock on Hand", val: `${writeOffModal.stock} ${writeOffModal.unit}` },
                  { label: "Unit Cost", val: `₹${writeOffModal.cost?.toFixed(2) ?? "—"}` },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "#F8FAFC", borderRadius: 5, padding: "9px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: 3, fontFamily: "Inter" }}>{label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1A2436", fontFamily: label === "Batch #" || label === "Unit Cost" ? "JetBrains Mono" : "Inter" }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Qty + total */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Qty to Write-off</label>
                  <input type="number" min={1} max={writeOffModal.stock} value={woForm.qty}
                    onChange={e => setWoForm(p => ({ ...p, qty: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Total Write-off Value</label>
                  <div style={{ padding: "9px 12px", borderRadius: 5, background: "#FFEBEE", color: "#C62828", fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, border: "1px solid #FFCDD2" }}>
                    {woForm.qty ? `₹${(Number(woForm.qty) * (writeOffModal.cost ?? 0)).toFixed(2)}` : "₹—"}
                  </div>
                </div>
              </div>

              {/* Disposal method dropdown */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Disposal Method</label>
                <div style={{ position: "relative" }}>
                  {woDisposalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setWoDisposalOpen(false)} />}
                  <button type="button" onClick={() => setWoDisposalOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${woDisposalOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", color: "#1A2436", boxSizing: "border-box" as const }}>
                    <span>{woForm.disposalMethod}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={woDisposalOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: woDisposalOpen ? "rotate(180deg)" : "none" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {woDisposalOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {(["Municipal Waste (non-hazardous)", "Incineration (hazardous)", "Drain Disposal (liquids)", "CPCB Authorised Facility", "Return to Supplier"] as DisposalMethod[]).map(o => {
                        const active = woForm.disposalMethod === o;
                        return (
                          <div key={o} onMouseDown={() => { setWoForm(p => ({ ...p, disposalMethod: o })); setWoDisposalOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* GL account (read-only) */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>GL Account (auto-mapped)</label>
                <div style={{ padding: "9px 12px", borderRadius: 5, background: "#F8FAFC", border: "1px solid #DDE3EC", fontSize: 12.5, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{GL_ACCOUNT}</div>
              </div>

              {/* Disposal cert ref */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Disposal Certificate Ref (optional)</label>
                <input type="text" placeholder="e.g. DISP-2026-0042" value={woForm.certRef}
                  onChange={e => setWoForm(p => ({ ...p, certRef: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Notes</label>
                <textarea rows={2} value={woForm.notes} onChange={e => setWoForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, resize: "vertical" as const }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setWriteOffModal(null); setWoForm(EMPTY_WO_FORM); setWoDisposalOpen(false); }}
                  style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                  Cancel
                </button>
                <button
                  disabled={!woForm.qty || Number(woForm.qty) < 1}
                  onClick={() => {
                    if (!woForm.qty || Number(woForm.qty) < 1) return;
                    const item = writeOffModal!;
                    const refId = `WOV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
                    const newRecord: WriteOffRecord = {
                      id: refId,
                      drug: item.name,
                      qty: Number(woForm.qty),
                      unitCost: item.cost ?? 0,
                      totalValue: Number(woForm.qty) * (item.cost ?? 0),
                      disposalMethod: woForm.disposalMethod,
                      disposalCertRef: woForm.certRef,
                      glAccount: GL_ACCOUNT,
                      notes: woForm.notes,
                      createdDate: new Date().toISOString().slice(0, 10),
                      status: "Pending Approval",
                    };
                    setWriteOffRecords(prev => [...prev, newRecord]);
                    setWriteOffModal(null);
                    setWoForm(EMPTY_WO_FORM);
                    setWoDisposalOpen(false);
                    showToast(`Voucher ${refId} created — pending manager approval`, "dispose");
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#7B1FA2", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, opacity: !woForm.qty || Number(woForm.qty) < 1 ? 0.5 : 1 }}>
                  Generate Voucher &amp; Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier Return modal ── */}
      {returnModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 500, borderRadius: 6, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Initiate Supplier Return</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{returnModal.name} — {returnModal.supplier}</div>
              </div>
              <button onClick={() => { setReturnModal(null); setReturnForm(EMPTY_RETURN_FORM); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Supplier info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Supplier", val: returnModal.supplier },
                  { label: "Return Window", val: returnModal.daysLeft >= -RETURN_WINDOW_DAYS_AFTER_EXPIRY ? "Open" : "Closed", valColor: returnModal.daysLeft >= -RETURN_WINDOW_DAYS_AFTER_EXPIRY ? "#2E7D32" : "#C62828" },
                  { label: "Drug", val: returnModal.name },
                  { label: "Batch #", val: returnModal.batchId ?? "—" },
                  { label: "Expiry Date", val: returnModal.expiry, valColor: returnModal.daysLeft < 0 ? "#C62828" : "#E65100" },
                  { label: "Stock on Hand", val: `${returnModal.stock} ${returnModal.unit}` },
                ].map(({ label, val, valColor }) => (
                  <div key={label} style={{ background: "#F8FAFC", borderRadius: 5, padding: "9px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: 3, fontFamily: "Inter" }}>{label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: valColor ?? "#1A2436", fontFamily: label === "Batch #" || label === "Expiry Date" ? "JetBrains Mono" : "Inter" }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Return process steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", fontFamily: "Inter" }}>Return Process</div>
                {[
                  { n: 1, title: "Quantity & pickup", desc: "Enter qty to return and preferred pickup date." },
                  { n: 2, title: "Credit note raised", desc: `Credit note for ₹${returnForm.qty ? (Number(returnForm.qty) * (returnModal.cost ?? 0)).toFixed(2) : "—"} auto-created once confirmed.` },
                  { n: 3, title: "Debit note posted to Accounts", desc: "DR Expired Stock / CR Accounts Payable — linked to supplier ledger.", muted: true },
                  { n: 4, title: "Supplier notified", desc: "Supplier receives pickup request with batch details.", muted: true },
                ].map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.muted ? "#E8ECF4" : "#1B6CA8", color: s.muted ? "#9CA3AF" : "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: s.muted ? "#6B7280" : "#1A2436", fontFamily: "Inter" }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, fontFamily: "Inter" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Qty input */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Quantity to Return</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="number" min={1} max={returnModal.stock}
                    value={returnForm.qty}
                    onChange={e => setReturnForm(p => ({ ...p, qty: e.target.value }))}
                    style={{ width: 140, padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                  />
                  {returnForm.qty && (
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>
                      ₹{(Number(returnForm.qty) * (returnModal.cost ?? 0)).toFixed(2)} credit
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup date */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Preferred Pickup Date</label>
                <input type="date" value={returnForm.pickupDate} onChange={e => setReturnForm(p => ({ ...p, pickupDate: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Notes to Supplier (optional)</label>
                <textarea value={returnForm.notes} onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="e.g. Cold chain maintained, original packaging..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 5, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, resize: "vertical" as const }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setReturnModal(null); setReturnForm(EMPTY_RETURN_FORM); }}
                  style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                  Cancel
                </button>
                <button
                  disabled={!returnForm.qty || Number(returnForm.qty) < 1}
                  onClick={() => {
                    if (!returnForm.qty || Number(returnForm.qty) < 1) return;
                    const item = returnModal!;
                    const refId = `SR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
                    const newRecord: ReturnRecord = {
                      id: refId,
                      drug: item.name,
                      supplier: item.supplier,
                      qty: Number(returnForm.qty),
                      unitCost: item.cost ?? 0,
                      creditValue: Number(returnForm.qty) * (item.cost ?? 0),
                      status: "Initiated",
                      initiatedDate: new Date().toISOString().slice(0, 10),
                      pickupDate: returnForm.pickupDate,
                      notes: returnForm.notes,
                    };
                    setReturnRecords(prev => [...prev, newRecord]);
                    setReturnModal(null);
                    setReturnForm(EMPTY_RETURN_FORM);
                    showToast(`Return ${refId} initiated — ${item.supplier} notified`, "success");
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#2E7D32", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, opacity: !returnForm.qty || Number(returnForm.qty) < 1 ? 0.5 : 1 }}>
                  Confirm & Initiate Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Quarantine modal */}
      {showAddQ && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 460, borderRadius: 6, border: "1px solid #E8ECF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Add Stock to Quarantine</div>
              <button onClick={() => { setShowAddQ(false); setQForm(EMPTY_Q_FORM); setQLockedDrug(null); setQDrugSearch(""); setQDrugOpen(false); setQReasonOpen(false); setQLocationOpen(false); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Drug */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Drug</label>
                {qLockedDrug ? (
                  <div style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", fontWeight: 600, boxSizing: "border-box" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{qLockedDrug}</span>
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>pre-filled</span>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    {qDrugOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => { setQDrugOpen(false); setQDrugSearch(""); }} />}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}
                      onClick={() => { setQDrugOpen(true); setTimeout(() => qDrugInputRef.current?.focus(), 50); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input ref={qDrugInputRef}
                        value={qDrugSearch || qForm.drug}
                        onChange={e => { setQDrugSearch(e.target.value); setQDrugOpen(true); if (!e.target.value) setQForm(p => ({ ...p, drug: "" })); }}
                        onFocus={() => { setQDrugOpen(true); setQDrugSearch(""); }}
                        placeholder="Search drug name..."
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6, border: `1px solid ${qDrugOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer", minHeight: 40 }}
                      />
                      {qForm.drug && !qDrugSearch && (
                        <span style={{ position: "absolute", right: 12, fontSize: 11, background: "#EFF6FF", color: "#1B6CA8", padding: "2px 8px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, pointerEvents: "none" }}>selected</span>
                      )}
                    </div>
                    {qDrugOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 210, maxHeight: 200, overflowY: "auto" }}>
                        {(qDrugSearch
                          ? expiryItems.filter(d => d.name.toLowerCase().includes(qDrugSearch.toLowerCase()))
                          : expiryItems
                        ).length === 0
                          ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No drugs found</div>
                          : (qDrugSearch
                              ? expiryItems.filter(d => d.name.toLowerCase().includes(qDrugSearch.toLowerCase()))
                              : expiryItems
                            ).map(d => {
                              const active = qForm.drug === d.name;
                              return (
                                <div key={d.name}
                                  onMouseDown={() => { setQForm(p => ({ ...p, drug: d.name })); setQDrugSearch(""); setQDrugOpen(false); }}
                                  style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                                  {d.name}
                                </div>
                              );
                            })
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Quantity to Quarantine</label>
                <input type="number" placeholder="Units" value={qForm.qty} onChange={e => setQForm(p => ({ ...p, qty: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, minHeight: 40 }} />
              </div>
              {/* Reason */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Reason</label>
                <div style={{ position: "relative" }}>
                  {qReasonOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setQReasonOpen(false)} />}
                  <button type="button" onClick={() => setQReasonOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", border: `1px solid ${qReasonOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: qForm.reason ? 600 : 400, color: qForm.reason ? "#0C1B33" : "#9CA3AF", boxSizing: "border-box" as const, minHeight: 40 }}>
                    <span>{qForm.reason || "— Select reason —"}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={qReasonOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: qReasonOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {qReasonOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {["Near-expiry (< 30 days)", "Damaged packaging", "Cold chain breach suspected", "Quality hold", "Supplier recall", "Other"].map(o => {
                        const active = qForm.reason === o;
                        return (
                          <div key={o}
                            onMouseDown={() => { setQForm(p => ({ ...p, reason: o })); setQReasonOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Storage Location */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Storage Location</label>
                <div style={{ position: "relative" }}>
                  {qLocationOpen && <div style={{ position: "fixed", inset: 0, zIndex: 209 }} onMouseDown={() => setQLocationOpen(false)} />}
                  <button type="button" onClick={() => setQLocationOpen(o => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", border: `1px solid ${qLocationOpen ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: qForm.location ? 600 : 400, color: qForm.location ? "#0C1B33" : "#9CA3AF", boxSizing: "border-box" as const, minHeight: 40 }}>
                    <span>{qForm.location || "— Select location —"}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={qLocationOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.15s", transform: qLocationOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {qLocationOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 210, overflow: "hidden" }}>
                      {["Quarantine Bay 1", "Quarantine Bay 2", "Cold Quarantine", "Controlled Quarantine"].map(o => {
                        const active = qForm.location === o;
                        return (
                          <div key={o}
                            onMouseDown={() => { setQForm(p => ({ ...p, location: o })); setQLocationOpen(false); }}
                            style={{ padding: "9px 14px", paddingLeft: active ? 11 : 14, borderLeft: `3px solid ${active ? "#1B6CA8" : "transparent"}`, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: active ? 700 : 400, color: active ? "#1B6CA8" : "#0C1B33", background: active ? "#EFF6FF" : "#fff" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "#EFF6FF" : "#fff"; }}>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Review By Date */}
              <div>
                <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5, fontFamily: "Inter" }}>Review By Date</label>
                <input type="date" value={qForm.reviewDate} onChange={e => setQForm(p => ({ ...p, reviewDate: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, minHeight: 40 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowAddQ(false); setQForm(EMPTY_Q_FORM); setQLockedDrug(null); setQDrugSearch(""); setQDrugOpen(false); setQReasonOpen(false); setQLocationOpen(false); }} style={{ padding: "9px 16px", borderRadius: 4, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!qForm.drug || !qForm.qty || !qForm.reason) return;
                    const drugRecord = drugs.find(d => d.name === qForm.drug);
                    const newRecord: QuarantineRecord = {
                      id: `QRN-${Date.now()}`,
                      drug: qForm.drug,
                      qty: Number(qForm.qty),
                      reason: qForm.reason,
                      startDate: new Date().toISOString().slice(0, 10),
                      reviewDate: qForm.reviewDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                      status: qLockedDrug ? "Under Review" : "Quarantined",
                      location: qForm.location || "Quarantine Bay 1",
                      value: drugRecord ? Math.round(drugRecord.cost * Number(qForm.qty)) : 0,
                      daysInQuarantine: 0,
                    };
                    setQuarantine(prev => [newRecord, ...prev]);
                    setQForm(EMPTY_Q_FORM);
                    setQLockedDrug(null);
                    setQDrugSearch("");
                    setQDrugOpen(false);
                    setQReasonOpen(false);
                    setQLocationOpen(false);
                    setShowAddQ(false);
                    showToast(`${newRecord.drug} added to quarantine`, "success");
                  }}
                  style={{ padding: "9px 20px", border: "none", borderRadius: 4, background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Quarantine Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: TOAST_COLOR[toast.type], boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : toast.type === "dispose" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 7h8M8 7V5h4v2M9 10v4M11 10v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
