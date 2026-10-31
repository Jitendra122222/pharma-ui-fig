import { useState, useEffect } from "react";
import { drugs } from "../data/mockData";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Reason = "Low Stock" | "Out of Stock" | "Today's Sales" | "Manual" | "Customer Demand";
export type SBStatus = "Ready" | "Pending" | "Ordered";

export interface ShortBookItem {
  id: string;
  medicine: string;
  manufacturer: string;
  reason: Reason;
  currentStock: number;
  minStock?: number;
  unit?: string;
  priority?: "High" | "Medium" | "Low";
  suggestedQty: number;
  orderQty: number;
  bestSupplier: string;
  status: SBStatus;
  addedOn: string;
  source?: string;
  avgDailySales?: number;
  salesTrend?: number[];
  pendingOrderQty?: number;
  lastPurchasePrice?: number;
  currentPrice?: number;
  nearExpiry?: boolean;
  critical?: boolean;
  alternatives?: string[];
  addedTimestamp?: string;
}

interface SupplierOption {
  name: string;
  availability: "Available" | "Limited" | "Unavailable";
  purchaseRate: number;
  mrp: number;
  deliveryDays: number;
  expiryReturn: boolean;
  score: number;
  margin: number;
  scoreBreakdown: { margin: number; delivery: number; expiryReturn: number; availability: number };
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_SHORT_BOOK: ShortBookItem[] = [
  {
    id: "SB-001", medicine: "Dolo 650", manufacturer: "Micro Labs", reason: "Low Stock",
    currentStock: 8, minStock: 30, avgDailySales: 4.2, salesTrend: [3, 5, 4, 6, 4, 5, 4],
    suggestedQty: 42, orderQty: 42, bestSupplier: "ABC Pharma", status: "Ready",
    addedOn: "2026-09-28", source: "Stock Count",
    critical: true, lastPurchasePrice: 20, currentPrice: 22,
  },
  {
    id: "SB-002", medicine: "Pantoprazole 40mg", manufacturer: "Sun Pharma", reason: "Today's Sales",
    currentStock: 12, minStock: 25, avgDailySales: 2.1, salesTrend: [2, 3, 2, 4, 2, 2, 3],
    suggestedQty: 30, orderQty: 30, bestSupplier: "XYZ Pharma", status: "Ready",
    addedOn: "2026-09-28", source: "Stock Management",
    pendingOrderQty: 20, lastPurchasePrice: 21, currentPrice: 21,
  },
  {
    id: "SB-003", medicine: "Azithromycin 500mg", manufacturer: "Cipla", reason: "Out of Stock",
    currentStock: 0, minStock: 20, avgDailySales: 3.5, salesTrend: [3, 4, 3, 4, 3, 4, 3],
    suggestedQty: 50, orderQty: 50, bestSupplier: "Medico", status: "Ready",
    addedOn: "2026-09-27", source: "Stock Management",
    critical: true, alternatives: ["Azithral 500mg", "Zithromax 500mg"],
    lastPurchasePrice: 25, currentPrice: 23,
  },
  {
    id: "SB-004", medicine: "Metformin 500mg", manufacturer: "USV Ltd", reason: "Low Stock",
    currentStock: 15, minStock: 50, avgDailySales: 8.1, salesTrend: [7, 9, 8, 8, 7, 9, 8],
    suggestedQty: 100, orderQty: 80, bestSupplier: "ABC Pharma", status: "Ready",
    addedOn: "2026-09-27", source: "Purchase GRN",
    nearExpiry: true, lastPurchasePrice: 18, currentPrice: 20,
  },
  {
    id: "SB-005", medicine: "Cetirizine 10mg", manufacturer: "Lupin", reason: "Customer Demand",
    currentStock: 22, minStock: 30, avgDailySales: 1.8, salesTrend: [1, 2, 2, 1, 2, 2, 1],
    suggestedQty: 40, orderQty: 40, bestSupplier: "XYZ Pharma", status: "Pending",
    addedOn: "2026-09-26", source: "Manual",
    addedTimestamp: "2026-09-26T10:00:00", lastPurchasePrice: 14, currentPrice: 14,
  },
  {
    id: "SB-006", medicine: "Atorvastatin 20mg", manufacturer: "Dr. Reddy's", reason: "Low Stock",
    currentStock: 18, minStock: 40, avgDailySales: 2.8, salesTrend: [3, 2, 3, 3, 2, 3, 3],
    suggestedQty: 60, orderQty: 60, bestSupplier: "ABC Pharma", status: "Ready",
    addedOn: "2026-09-26", source: "Stock Count",
    critical: true, lastPurchasePrice: 32, currentPrice: 35,
  },
  {
    id: "SB-007", medicine: "Omeprazole 20mg", manufacturer: "Cipla", reason: "Manual",
    currentStock: 45, minStock: 30, avgDailySales: 3.0, salesTrend: [3, 3, 2, 3, 4, 3, 2],
    suggestedQty: 50, orderQty: 50, bestSupplier: "Medico", status: "Pending",
    addedOn: "2026-09-25", source: "Manual",
    addedTimestamp: "2026-09-25T14:00:00", lastPurchasePrice: 19, currentPrice: 19,
  },
  {
    id: "SB-008", medicine: "Amlodipine 5mg", manufacturer: "Torrent Pharma", reason: "Today's Sales",
    currentStock: 5, minStock: 20, avgDailySales: 2.2, salesTrend: [2, 2, 3, 2, 2, 3, 2],
    suggestedQty: 30, orderQty: 30, bestSupplier: "XYZ Pharma", status: "Ready",
    addedOn: "2026-09-25", source: "Sales Return",
    nearExpiry: true, lastPurchasePrice: 28, currentPrice: 27,
  },
];

const SUPPLIER_OPTIONS: Record<string, SupplierOption[]> = {
  default: [
    { name: "ABC Pharma", availability: "Available", purchaseRate: 22, mrp: 30, deliveryDays: 1, expiryReturn: true, score: 91, margin: 26.7, scoreBreakdown: { margin: 90, delivery: 100, expiryReturn: 100, availability: 100 } },
    { name: "XYZ Pharma", availability: "Available", purchaseRate: 21, mrp: 30, deliveryDays: 3, expiryReturn: false, score: 82, margin: 30.0, scoreBreakdown: { margin: 95, delivery: 60, expiryReturn: 0, availability: 100 } },
    { name: "Medico", availability: "Available", purchaseRate: 23, mrp: 30, deliveryDays: 0, expiryReturn: true, score: 88, margin: 23.3, scoreBreakdown: { margin: 80, delivery: 100, expiryReturn: 100, availability: 100 } },
  ],
};

const ALL_MEDICINES = [
  "Dolo 650", "Pantoprazole 40mg", "Azithromycin 500mg", "Metformin 500mg",
  "Cetirizine 10mg", "Atorvastatin 20mg", "Omeprazole 20mg", "Amlodipine 5mg",
  "Paracetamol 500mg", "Amoxicillin 500mg", "Ibuprofen 400mg", "Aspirin 75mg",
  "Ranitidine 150mg", "Ciprofloxacin 500mg", "Warfarin 5mg",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const NOW_MS = new Date("2026-10-02T00:00:00").getTime();

function isOverdue(item: ShortBookItem): boolean {
  if (item.status !== "Pending" || !item.addedTimestamp) return false;
  return NOW_MS - new Date(item.addedTimestamp).getTime() > 48 * 60 * 60 * 1000;
}

function fmtDate(iso: string): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts = iso.split("-");
  return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

function daysRemaining(item: ShortBookItem): number | null {
  if (!item.avgDailySales || item.avgDailySales <= 0) return null;
  return Math.floor(item.currentStock / item.avgDailySales);
}

// ─── UI primitives ─────────────────────────────────────────────────────────────

function Th({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: center ? "center" : right ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD" }}>
      {children}
    </th>
  );
}

function Td({ children, right, mono, center }: { children: React.ReactNode; right?: boolean; mono?: boolean; center?: boolean }) {
  return (
    <td style={{ padding: "11px 14px", fontSize: 13, textAlign: center ? "center" : right ? "right" : "left", fontFamily: mono ? "JetBrains Mono" : "Inter", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

const REASON_STYLE: Record<string, { bg: string; color: string }> = {
  "Low Stock": { bg: "#FFF8E1", color: "#F57F17" },
  "Out of Stock": { bg: "#FFEBEE", color: "#C62828" },
  "Today's Sales": { bg: "#E3F2FD", color: "#1B6CA8" },
  "Manual": { bg: "#F3F4F6", color: "#4B5563" },
  "Customer Demand": { bg: "#F3E5F5", color: "#7B1FA2" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "Ready": { bg: "#E8F5E9", color: "#2E7D32" },
  "Pending": { bg: "#FFF8E1", color: "#F57F17" },
  "Ordered": { bg: "#E3F2FD", color: "#1B6CA8" },
};

const SOURCE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "Stock Management": { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
  "Manual":           { bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB" },
  "Sales Return":     { bg: "#F3E5F5", color: "#7B1FA2", border: "#CE93D8" },
  "Purchase GRN":     { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Stock Count":      { bg: "#FFF3E0", color: "#E65100", border: "#FFCC80" },
};

const REASON_CONFIG: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
  "Low Stock": {
    bg: "#FFF8E1", color: "#F57F17", border: "#FFD54F",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  "Out of Stock": {
    bg: "#FFEBEE", color: "#C62828", border: "#EF9A9A",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  "Today's Sales": {
    bg: "#E3F2FD", color: "#1B6CA8", border: "#90CAF9",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  "Manual": {
    bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
      </svg>
    ),
  },
  "Customer Demand": {
    bg: "#F3E5F5", color: "#7B1FA2", border: "#CE93D8",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
  "Ready": {
    bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  "Pending": {
    bg: "#FFF8E1", color: "#F57F17", border: "#FFD54F",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  "Ordered": {
    bg: "#E3F2FD", color: "#1B6CA8", border: "#90CAF9",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
};

function ReasonPill({ reason }: { reason: Reason }) {
  const c = REASON_CONFIG[reason] || { bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB", icon: null };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "4px 10px 4px 7px",
      background: c.bg, color: c.color,
      border: `1.5px solid ${c.border}`, borderRadius: 20,
      letterSpacing: "0.01em", whiteSpace: "nowrap" as const,
    }}>
      {c.icon}
      {reason}
    </span>
  );
}

function StatusPill({ status }: { status: SBStatus }) {
  const c = STATUS_CONFIG[status] || { bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB", icon: null };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "4px 10px 4px 7px",
      background: c.bg, color: c.color,
      border: `1.5px solid ${c.border}`, borderRadius: 20,
      letterSpacing: "0.01em", whiteSpace: "nowrap" as const,
    }}>
      {c.icon}
      {status}
    </span>
  );
}

function SourcePill({ source }: { source?: string }) {
  if (!source) return <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>;
  const s = SOURCE_STYLE[source] || { bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB" };
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" as const }}>{source}</span>;
}

// ─── New sub-components ────────────────────────────────────────────────────────


function DaysCell({ item }: { item: ShortBookItem }) {
  const days = daysRemaining(item);
  if (days === null) return <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>;
  if (item.currentStock === 0) return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#FFEBEE", color: "#C62828" }}>OOS</span>;
  const color = days < 3 ? "#C62828" : days < 7 ? "#E65100" : "#2E7D32";
  const bg = days < 3 ? "#FFEBEE" : days < 7 ? "#FFF3E0" : "#E8F5E9";
  return (
    <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, padding: "2px 8px", background: bg, color, whiteSpace: "nowrap" as const }}>
      {days}d
    </span>
  );
}

function StatusCell({ item }: { item: ShortBookItem }) {
  const overdue = isOverdue(item);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
      <StatusPill status={item.status} />
      {overdue && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, fontWeight: 700, padding: "3px 8px 3px 6px",
          background: "#FFEBEE", color: "#C62828",
          border: "1.5px solid #EF9A9A", borderRadius: 20,
          letterSpacing: "0.03em", whiteSpace: "nowrap" as const,
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Overdue
        </span>
      )}
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface SBToastData { msg: string; type: "success" | "error"; key: number; }

function SBToastComp({ toast, onDone }: { toast: SBToastData; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const t1 = setTimeout(() => { setVisible(true); setProgress(0); }, 16);
    const t2 = setTimeout(() => { setVisible(false); }, 3000);
    const t3 = setTimeout(onDone, 3350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isSuccess = toast.type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", zIndex: 9999,
      background: isSuccess ? "#2E7D32" : "#C62828",
      color: "#fff", padding: "13px 20px 16px",
      fontFamily: "Inter", fontSize: 13, fontWeight: 600,
      boxShadow: "0 4px 18px rgba(0,0,0,0.22)",
      transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(80px)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.25s ease, opacity 0.25s ease",
      minWidth: 240, maxWidth: 380,
      borderRadius: 0,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span>{toast.msg}</span>
        <button onClick={() => { setVisible(false); setTimeout(onDone, 300); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>
          &#10005;
        </button>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.25)" }}>
        <div style={{ height: "100%", background: "rgba(255,255,255,0.65)", width: `${progress}%`, transition: "width 3s linear" }} />
      </div>
    </div>
  );
}

// ─── Alternatives Drawer ───────────────────────────────────────────────────────

function AlternativesDrawer({ item, onClose }: { item: ShortBookItem; onClose: () => void }) {
  const alts = item.alternatives ?? [];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 380, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#C62828", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>Out of Stock</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Alternative Medicines</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Same-salt substitutes for {item.medicine}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {alts.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No alternatives on record.</div>
          ) : alts.map(alt => (
            <div key={alt} style={{ padding: "12px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#1A2436" }}>{alt}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Same salt composition</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: "#E8F5E9", color: "#2E7D32" }}>In Stock</span>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: "12px 14px", background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 12, color: "#F57F17" }}>
            Confirm substitute with the prescribing doctor before dispensing.
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Supplier Comparison Drawer ────────────────────────────────────────────────

function SupplierComparisonDrawer({
  item, onClose, onSelect,
}: {
  item: ShortBookItem; onClose: () => void; onSelect: (supplier: string) => void;
}) {
  const suppliers = SUPPLIER_OPTIONS.default;
  const [selected, setSelected] = useState<string | null>(item.bestSupplier);
  const best = suppliers.reduce((a, b) => (a.score > b.score ? a : b));

  const selectedSup = suppliers.find(s => s.name === selected);
  const estCost = selectedSup ? selectedSup.purchaseRate * item.orderQty : null;

  const ROWS: { label: string; render: (sup: SupplierOption) => React.ReactNode }[] = [
    {
      label: "Rate / Unit",
      render: (sup) => (
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>
          ₹{sup.purchaseRate}
        </span>
      ),
    },
    {
      label: "Margin",
      render: (sup) => (
        <span style={{
          fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700,
          color: sup.margin >= 25 ? "#2E7D32" : sup.margin >= 15 ? "#F57F17" : "#C62828",
        }}>{sup.margin.toFixed(1)}%</span>
      ),
    },
    {
      label: "Delivery",
      render: (sup) => (
        <span style={{
          fontSize: 13, fontWeight: 600, fontFamily: "Inter",
          color: sup.deliveryDays === 0 ? "#2E7D32" : sup.deliveryDays <= 1 ? "#2E7D32" : sup.deliveryDays <= 3 ? "#F57F17" : "#C62828",
        }}>
          {sup.deliveryDays === 0 ? "Same Day" : `${sup.deliveryDays} Day${sup.deliveryDays > 1 ? "s" : ""}`}
        </span>
      ),
    },
    {
      label: "Expiry Return",
      render: (sup) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {sup.expiryReturn ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" fill="#E8F5E9" stroke="#A5D6A7" />
                <path d="M4 7l2 2 4-4" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32" }}>Allowed</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" fill="#FFEBEE" stroke="#EF9A9A" />
                <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#C62828" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#C62828" }}>Not Allowed</span>
            </>
          )}
        </div>
      ),
    },
    {
      label: "Availability",
      render: (sup) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: sup.availability === "Available" ? "#2E7D32" : "#F57F17",
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: sup.availability === "Available" ? "#2E7D32" : "#F57F17",
          }}>{sup.availability}</span>
        </div>
      ),
    },
  ];

  const LABEL_W = 120;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 560, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>Supplier Comparison</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>{item.medicine}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3, display: "flex", gap: 12 }}>
                <span>Qty: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{item.orderQty} units</span></span>
                {estCost != null && (
                  <span>Est. Cost: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>₹{estCost.toLocaleString()}</span></span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        {/* Recommended banner */}
        <div style={{ padding: "9px 22px", background: "#F0F7FF", borderBottom: "1px solid #BFDBFE", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1l1.3 3.6h4L8.7 6.8l1.4 3.7-3.6-2.4-3.6 2.4 1.4-3.7-3.1-2.2h4z" fill="#F57F17" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1B6CA8" }}>Recommended: {best.name}</span>
          <span style={{ fontSize: 11, color: "#6B7280" }}>· Score {best.score}/100</span>
          <div style={{ display: "flex", gap: 5, marginLeft: "auto", flexWrap: "wrap" as const }}>
            {[
              best.margin > 25 ? "Good margin" : null,
              best.deliveryDays <= 1 ? "Fast delivery" : null,
              best.expiryReturn ? "Expiry return" : null,
            ].filter(Boolean).map(tag => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: "#E8F5E9", color: "#2E7D32", borderRadius: 4, border: "1px solid #A5D6A7" }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {/* empty label cell */}
                <th style={{ width: LABEL_W }} />
                {suppliers.map(sup => {
                  const isBest = sup.name === best.name;
                  const isSelected = selected === sup.name;
                  const scoreColor = sup.score >= 85 ? "#2E7D32" : sup.score >= 70 ? "#F57F17" : "#C62828";
                  const scoreBg = sup.score >= 85 ? "#E8F5E9" : sup.score >= 70 ? "#FFF8E1" : "#FFEBEE";
                  const scoreBorder = sup.score >= 85 ? "#A5D6A7" : sup.score >= 70 ? "#FFD54F" : "#EF9A9A";
                  return (
                    <th key={sup.name} onClick={() => setSelected(sup.name)}
                      style={{
                        padding: "16px 10px 14px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: isSelected ? "#EFF6FF" : "#FAFBFD",
                        borderTop: `3px solid ${isBest ? "#1B6CA8" : "#EEF1F6"}`,
                        borderLeft: "1px solid #EEF1F6",
                        borderRight: "1px solid #EEF1F6",
                        borderBottom: `3px solid ${isSelected ? "#1B6CA8" : "transparent"}`,
                        transition: "background 0.12s",
                        position: "relative" as const,
                        userSelect: "none" as const,
                      }}>
                      {isBest && (
                        <div style={{ position: "absolute" as const, top: 0, left: "50%", transform: "translateX(-50%)" }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", background: "#1B6CA8", color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "inline-block", borderRadius: "0 0 4px 4px" }}>BEST</span>
                        </div>
                      )}
                      <div style={{ marginTop: isBest ? 10 : 0, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{sup.name}</span>
                        <div style={{
                          width: 46, height: 46, borderRadius: "50%",
                          background: scoreBg,
                          border: `2px solid ${scoreBorder}`,
                          display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{sup.score}</span>
                          <span style={{ fontSize: 8, color: "#9CA3AF", lineHeight: 1.2 }}>/100</span>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.label}>
                  <td style={{
                    padding: "14px 12px 14px 0",
                    width: LABEL_W,
                    fontSize: 11, fontWeight: 700, color: "#6B7280",
                    letterSpacing: "0.06em", textTransform: "uppercase" as const,
                    whiteSpace: "nowrap" as const,
                    background: ri % 2 === 0 ? "#FAFBFD" : "#fff",
                    borderBottom: "1px solid #EEF1F6",
                  }}>
                    {row.label}
                  </td>
                  {suppliers.map(sup => (
                    <td key={sup.name} onClick={() => setSelected(sup.name)}
                      style={{
                        padding: "14px 10px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: selected === sup.name ? "#EFF6FF" : ri % 2 === 0 ? "#FAFBFD" : "#fff",
                        borderBottom: "1px solid #EEF1F6",
                        borderLeft: "1px solid #EEF1F6",
                        borderRight: "1px solid #EEF1F6",
                        transition: "background 0.12s",
                      }}>
                      {row.render(sup)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: "#C4CAD6", textAlign: "center", fontStyle: "italic" as const }}>
            Click a column to select supplier
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={() => { if (selected) { onSelect(selected); onClose(); } }} disabled={!selected}
            style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: selected ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: selected ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            {selected ? `Select ${selected}` : "Select Supplier"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Add Medicine Drawer ───────────────────────────────────────────────────────

function AddMedicineDrawer({
  onClose, onAdd, onUpdateQty, existingItems, initialSearch = "",
}: {
  onClose: () => void; onAdd: (item: ShortBookItem) => void;
  onUpdateQty: (id: string, qty: number) => void; existingItems: ShortBookItem[];
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [selected, setSelected] = useState(initialSearch);
  const [reason, setReason] = useState<Reason>("Customer Demand");
  const [orderQty, setOrderQty] = useState("40");
  const [supplier, setSupplier] = useState("ABC Pharma");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updateQtyMode, setUpdateQtyMode] = useState(false);
  const [updateQtyInput, setUpdateQtyInput] = useState("");

  const matches = search.length >= 1 ? ALL_MEDICINES.filter(m => m.toLowerCase().includes(search.toLowerCase())) : [];
  const isDuplicate = existingItems.some(i => i.medicine.toLowerCase() === selected.toLowerCase());
  const existingItem = existingItems.find(i => i.medicine.toLowerCase() === selected.toLowerCase());
  const canAdd = selected.length > 0 && !isDuplicate && Number(orderQty) > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const newItem: ShortBookItem = {
      id: `SB-${String(existingItems.length + 9).padStart(3, "0")}`,
      medicine: selected, manufacturer: "Various", reason,
      currentStock: Math.floor(Math.random() * 20), avgDailySales: 2,
      salesTrend: [2, 2, 2, 2, 2, 2, 2],
      suggestedQty: Number(orderQty), orderQty: Number(orderQty),
      bestSupplier: supplier, status: "Ready",
      addedOn: new Date().toISOString().slice(0, 10), source: "Manual",
      addedTimestamp: new Date().toISOString(),
    };
    onAdd(newItem);
    setSaved(true);
  };

  if (saved) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>
              {updateQtyMode ? `${selected} quantity updated` : `${selected} added to Short Book`}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>Order quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{updateQtyMode ? updateQtyInput : orderQty} units</span></div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Close</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>Short Book</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Add to Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Medicine <span style={{ color: "#C62828" }}>*</span></div>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search medicine..." value={search}
                onChange={e => { setSearch(e.target.value); setSelected(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)} />
              {showDropdown && matches.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
                  {matches.map(m => (
                    <button key={m} onMouseDown={() => { setSelected(m); setSearch(m); setShowDropdown(false); }}
                      style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isDuplicate && existingItem && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 12, color: "#F57F17" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected} is already in your Short Book.</div>
                <div style={{ color: "#6B7280" }}>Current Order Quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{existingItem.orderQty}</span></div>
              </div>
            )}
          </div>

          {selected && !isDuplicate && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div>
                <select value={reason} onChange={e => setReason(e.target.value as Reason)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                  {(["Low Stock", "Out of Stock", "Today's Sales", "Manual", "Customer Demand"] as Reason[]).map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Order Quantity <span style={{ color: "#C62828" }}>*</span></div>
                <input type="number" value={orderQty} min={1} onChange={e => setOrderQty(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Preferred Supplier</div>
                <select value={supplier} onChange={e => setSupplier(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                  {["ABC Pharma", "XYZ Pharma", "Medico", "PharmaCo Inc", "MedLine Pharma"].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {isDuplicate && existingItem && (
            updateQtyMode ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>New Order Quantity</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={updateQtyInput} min={1} onChange={e => setUpdateQtyInput(e.target.value)} autoFocus
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: "1px solid #1B6CA8", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
                  <button
                    onClick={() => { if (Number(updateQtyInput) > 0) { onUpdateQty(existingItem.id, Number(updateQtyInput)); setSaved(true); } }}
                    disabled={!updateQtyInput || Number(updateQtyInput) <= 0}
                    style={{ padding: "9px 16px", border: "none", background: Number(updateQtyInput) > 0 ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: Number(updateQtyInput) > 0 ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600, flexShrink: 0 }}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setUpdateQtyMode(true); setUpdateQtyInput(String(existingItem.orderQty)); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                  Update Quantity
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Go to Short Book
                </button>
              </div>
            )
          )}
        </div>

        {!isDuplicate && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
            <button onClick={handleAdd} disabled={!canAdd}
              style={{ flex: 2, padding: "9px 0", border: "none", background: canAdd ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canAdd ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Add to Short Book
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Edit Qty inline ───────────────────────────────────────────────────────────

function EditQtyCell({ item, onSave }: { item: ShortBookItem; onSave: (qty: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.orderQty));

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" value={val} min={1} onChange={e => setVal(e.target.value)} autoFocus
          style={{ width: 72, padding: "5px 8px", borderRadius: 6, border: "1px solid #1B6CA8", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono" }}
          onKeyDown={e => { if (e.key === "Enter") { onSave(Number(val)); setEditing(false); } if (e.key === "Escape") { setEditing(false); setVal(String(item.orderQty)); } }} />
        <button onClick={() => { onSave(Number(val)); setEditing(false); }}
          style={{ padding: "4px 8px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "Inter" }}>
          Save
        </button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setEditing(true)}>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#1A2436" }}>{item.orderQty}</span>
        <span style={{ fontSize: 10, color: "#1B6CA8" }}>&#9998;</span>
      </div>
      {(item.pendingOrderQty ?? 0) > 0 && (
        <div style={{ fontSize: 10, color: "#2E7D32", fontWeight: 600, marginTop: 3 }}>
          {item.pendingOrderQty} on order
        </div>
      )}
    </div>
  );
}

// ─── Purchase Plan Drawer ──────────────────────────────────────────────────────

function PurchasePlanDrawer({
  items, onClose, onToast,
}: {
  items: ShortBookItem[]; onClose: () => void; onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [createdPOs, setCreatedPOs] = useState<Set<string>>(new Set());
  const bySupplier = items.reduce<Record<string, ShortBookItem[]>>((acc, item) => {
    if (!acc[item.bestSupplier]) acc[item.bestSupplier] = [];
    acc[item.bestSupplier].push(item);
    return acc;
  }, {});
  const total = items.reduce((s, i) => s + i.orderQty * (i.currentPrice ?? 22), 0);

  const handleCreateAll = () => {
    setCreatedPOs(new Set(Object.keys(bySupplier)));
    onToast(`${Object.keys(bySupplier).length} Purchase Orders created`, "success");
    setTimeout(onClose, 1400);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 520, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>Purchase Plan</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Create Purchase Orders</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{items.length} medicines across {Object.keys(bySupplier).length} suppliers</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.entries(bySupplier).map(([supplier, sitems]) => {
            const subtotal = sitems.reduce((s, i) => s + i.orderQty * (i.currentPrice ?? 22), 0);
            const isPOCreated = createdPOs.has(supplier);
            return (
              <div key={supplier} style={{ borderRadius: 6, border: `1px solid ${isPOCreated ? "#A5D6A7" : "#E8ECF4"}`, background: isPOCreated ? "#F9FFF9" : "#fff" }}>
                <div style={{ padding: "12px 16px", background: isPOCreated ? "#F0FFF4" : "#FAFBFD", borderBottom: `1px solid ${isPOCreated ? "#A5D6A7" : "#EEF1F6"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isPOCreated && <span style={{ color: "#2E7D32", fontSize: 14 }}>&#10003;</span>}
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0C1B33", fontFamily: "Inter" }}>{supplier}</div>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{sitems.length} item{sitems.length > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>₹{subtotal.toFixed(0)}</span>
                    {!isPOCreated && (
                      <>
                        <button
                          onClick={() => { onToast(`Order sent to ${supplier} via WhatsApp`, "success"); }}
                          style={{ padding: "4px 10px", border: "1px solid #A5D6A7", borderRadius: 4, background: "#E8F5E9", fontSize: 11, cursor: "pointer", color: "#2E7D32", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          WhatsApp
                        </button>
                        <button
                          onClick={() => { onToast(`PDF exported for ${supplier}`, "success"); }}
                          style={{ padding: "4px 10px", border: "1px solid #BFDBFE", borderRadius: 4, background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                          Export
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {sitems.map((item, i, arr) => (
                  <div key={item.id} style={{ padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", display: "flex", alignItems: "center", gap: 6 }}>
                        {item.medicine}
                        {item.critical && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", background: "#FFEBEE", color: "#C62828" }}>Critical</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.orderQty} units</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>₹{(item.orderQty * (item.currentPrice ?? 22)).toFixed(0)}</div>
                      {item.lastPurchasePrice && item.currentPrice && item.currentPrice !== item.lastPurchasePrice && (
                        <div style={{ fontSize: 10, color: item.currentPrice > item.lastPurchasePrice ? "#C62828" : "#2E7D32", marginTop: 1 }}>
                          was ₹{item.lastPurchasePrice}/unit
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "14px 16px" }}>
            {[
              { label: "Suppliers", val: String(Object.keys(bySupplier).length) },
              { label: "Purchase Orders", val: String(Object.keys(bySupplier).length) },
              { label: "Total Items", val: String(items.length) },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{r.label}</span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700 }}>{r.val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #E8ECF4" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>Total</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={handleCreateAll}
            style={{ flex: 2, padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Create All Purchase Orders
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Inventory Picker Drawer ───────────────────────────────────────────────────

function InventoryPickerDrawer({
  existingItems, onAdd, onClose,
}: {
  existingItems: ShortBookItem[];
  onAdd: (item: ShortBookItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Need Reorder" | "Out of Stock">("All");
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const existingMeds = new Set(existingItems.map(i => i.medicine.toLowerCase()));

  const filtered = drugs
    .filter(d => {
      const q = search.toLowerCase();
      const matchSearch = q === "" || d.name.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q);
      const matchFilter =
        filter === "All" ||
        (filter === "Out of Stock" && d.stock === 0) ||
        (filter === "Need Reorder" && d.stock < d.minStock && d.stock > 0);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const aPct = a.minStock > 0 ? a.stock / a.minStock : 1;
      const bPct = b.minStock > 0 ? b.stock / b.minStock : 1;
      return aPct - bPct;
    });

  const handleAdd = (drug: (typeof drugs)[0]) => {
    const suggested = Math.max(drug.minStock - drug.stock, 10);
    const reason: Reason = drug.stock === 0 ? "Out of Stock" : "Low Stock";
    const newItem: ShortBookItem = {
      id: `SB-INV-${drug.id}-${Date.now().toString(36)}`,
      medicine: drug.name,
      manufacturer: drug.manufacturer,
      reason,
      currentStock: drug.stock,
      minStock: drug.minStock,
      unit: drug.unit,
      avgDailySales: 2,
      salesTrend: [2, 2, 2, 2, 2, 2, 2],
      suggestedQty: suggested,
      orderQty: suggested,
      bestSupplier: drug.supplier,
      status: "Ready",
      addedOn: new Date().toISOString().slice(0, 10),
      source: "Stock Count",
      addedTimestamp: new Date().toISOString(),
    };
    onAdd(newItem);
    setAddedIds(prev => new Set([...prev, drug.id]));
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 540, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>Inventory</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Add from Inventory</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Select medicines to add to the Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 6, border: "1px solid #DDE3EC", padding: "8px 12px", flex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search medicine or manufacturer..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
            {search.length > 0 && (
              <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "#C4CAD6", fontSize: 14, flexShrink: 0, lineHeight: 1 }}>&#215;</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {(["All", "Need Reorder", "Out of Stock"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: "7px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "Inter",
                  fontWeight: filter === f ? 700 : 400,
                  border: `1px solid ${filter === f ? "#1B6CA8" : "#DDE3EC"}`,
                  background: filter === f ? "#EFF6FF" : "#fff",
                  color: filter === f ? "#1B6CA8" : "#6B7280",
                  whiteSpace: "nowrap" as const,
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No medicines found</div>
          ) : (
            <>
              {/* Column headings */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 22px 6px", borderBottom: "1px solid #F4F6FA", background: "#FAFBFD" }}>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Medicine</div>
                <div style={{ width: 64, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: "right" as const }}>Stock</div>
                <div style={{ width: 80, fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: "right" as const }}>Reorder</div>
                <div style={{ width: 62 }} />
              </div>
              {filtered.map((drug, i) => {
                const reorderPct = drug.minStock > 0 ? Math.round((drug.stock / drug.minStock) * 100) : 100;
                const pctColor = drug.stock === 0 ? "#C62828" : reorderPct < 60 ? "#C62828" : reorderPct < 100 ? "#F57F17" : "#2E7D32";
                const alreadyAdded = existingMeds.has(drug.name.toLowerCase()) || addedIds.has(drug.id);

                return (
                  <div key={drug.id}
                    style={{ padding: "11px 22px", borderBottom: i < filtered.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", alignItems: "center", gap: 14, background: alreadyAdded ? "#FAFBFD" : "#fff" }}>

                    {/* Medicine info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: alreadyAdded ? "#9CA3AF" : "#1A2436", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{drug.name}</span>
                        {drug.stock === 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", background: "#FFEBEE", color: "#C62828", borderRadius: 3, flexShrink: 0 }}>OOS</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{drug.manufacturer} · {drug.unit}</div>
                    </div>

                    {/* Current Stock */}
                    <div style={{ width: 64, textAlign: "right" as const, flexShrink: 0 }}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: drug.stock === 0 ? "#C62828" : drug.stock < drug.minStock ? "#F57F17" : "#1A2436" }}>
                        {drug.stock}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>/ {drug.minStock} min</div>
                    </div>

                    {/* Reorder % */}
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: pctColor }}>{reorderPct}%</span>
                      </div>
                      <div style={{ height: 4, background: "#EEF1F6", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(reorderPct, 100)}%`, background: pctColor, borderRadius: 2, transition: "width 0.3s" }} />
                      </div>
                    </div>

                    {/* Add button */}
                    <div style={{ width: 62, textAlign: "right" as const, flexShrink: 0 }}>
                      {alreadyAdded ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#2E7D32" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" fill="#E8F5E9" stroke="#A5D6A7"/><path d="M3.5 6l2 2 3-3" stroke="#2E7D32" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Added
                        </span>
                      ) : (
                        <button onClick={() => handleAdd(drug)}
                          style={{ padding: "5px 10px", border: "1px solid #1B6CA8", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            {addedIds.size > 0
              ? `${addedIds.size} medicine${addedIds.size > 1 ? "s" : ""} added to Short Book`
              : `${filtered.length} medicine${filtered.length !== 1 ? "s" : ""} shown`}
          </span>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ShortBook({
  items: propItems,
  onItemsChange,
}: {
  items?: ShortBookItem[];
  onItemsChange?: (items: ShortBookItem[]) => void;
} = {}) {
  const [localItems, setLocalItems] = useState<ShortBookItem[]>(MOCK_SHORT_BOOK);
  const items = propItems ?? localItems;
  const setItems = (updater: ShortBookItem[] | ((prev: ShortBookItem[]) => ShortBookItem[])) => {
    const next = typeof updater === "function" ? updater(items) : updater;
    if (onItemsChange) onItemsChange(next);
    else setLocalItems(next);
  };

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Low Stock" | "Out of Stock" | "Today's Sales" | "Manual">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [addDrawerPreSearch, setAddDrawerPreSearch] = useState("");
  const [compareItem, setCompareItem] = useState<ShortBookItem | null>(null);
  const [alternativesItem, setAlternativesItem] = useState<ShortBookItem | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sbToast, setSbToast] = useState<{ msg: string; type: "success" | "error"; key: number } | null>(null);
  const [bulkPlanItems, setBulkPlanItems] = useState<ShortBookItem[] | null>(null);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [qtyCountMode, setQtyCountMode] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setSbToast({ msg, type, key: Date.now() });
  };

  const handleEnterQtyCount = () => {
    const drafts: Record<string, string> = {};
    items.forEach(i => { drafts[i.id] = String(i.orderQty); });
    setQtyDrafts(drafts);
    setQtyCountMode(true);
  };

  const handleSaveQtyCount = () => {
    let changed = 0;
    setItems(prev => prev.map(i => {
      const draft = qtyDrafts[i.id];
      const n = draft !== undefined ? Number(draft) : NaN;
      if (!isNaN(n) && n > 0 && n !== i.orderQty) { changed++; return { ...i, orderQty: n }; }
      return i;
    }));
    setQtyCountMode(false);
    setQtyDrafts({});
    showToast(changed > 0 ? `${changed} order ${changed === 1 ? "quantity" : "quantities"} updated` : "No changes made");
  };

  const handleCancelQtyCount = () => {
    setQtyCountMode(false);
    setQtyDrafts({});
  };

  const filtered = items.filter(item => {
    const matchSearch = search === "" ||
      item.medicine.toLowerCase().includes(search.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "All" || item.reason === activeTab;
    return matchSearch && matchTab;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id));
  const someSelected = filtered.some(i => selectedIds.has(i.id));

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(i => n.delete(i.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(i => n.add(i.id)); return n; });
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleBulkCreatePO = () => {
    const sel = items.filter(i => selectedIds.has(i.id));
    setBulkPlanItems(sel);
    setShowPlan(true);
  };

  const handleBulkMarkOrdered = () => {
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status: "Ordered" as const } : i));
    showToast(`${selectedIds.size} items marked as Ordered`);
    setSelectedIds(new Set());
  };

  const handleBulkRemove = () => {
    const count = selectedIds.size;
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    showToast(`${count} items removed from Short Book`);
    setSelectedIds(new Set());
  };

  const handleQtyChange = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, orderQty: qty } : i));
  };

  const handleSupplierChange = (id: string, supplier: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, bestSupplier: supplier } : i));
  };

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleToggleCritical = (id: string, current: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, critical: !current } : i));
    showToast(current ? "Removed from critical list" : "Marked as critical medicine");
  };

  const summary = {
    total: items.length,
    estimated: items.reduce((s, i) => s + i.orderQty * (i.currentPrice ?? 22), 0),
    lowStock: items.filter(i => i.reason === "Low Stock").length,
    todaySales: items.filter(i => i.reason === "Today's Sales").length,
    manual: items.filter(i => i.reason === "Manual").length,
  };

  const TABS = ["All", "Low Stock", "Out of Stock", "Today's Sales", "Manual"] as const;
  const TAB_COUNTS: Record<string, number> = {
    "All": items.length,
    "Low Stock": items.filter(i => i.reason === "Low Stock").length,
    "Out of Stock": items.filter(i => i.reason === "Out of Stock").length,
    "Today's Sales": items.filter(i => i.reason === "Today's Sales").length,
    "Manual": items.filter(i => i.reason === "Manual").length,
  };

  const planItems = bulkPlanItems ?? filtered;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>
            PharmERP <span style={{ color: "#C8CDD8" }}>›</span> Inventory <span style={{ color: "#C8CDD8" }}>›</span>
            <span style={{ color: "#1A2436", fontWeight: 600 }}> Short Book</span>
          </div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.01em" }}>Short Book</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Medicines pending purchase</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => { setBulkPlanItems(null); setShowPlan(true); }}
            style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", minHeight: 40, boxSizing: "border-box" as const }}>
            Purchase Plan
          </button>
          <button onClick={() => { setAddDrawerPreSearch(""); setShowAdd(true); }}
            style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            + Add Medicine
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Items", value: summary.total, color: "#1B6CA8" },
          { label: "Estimated Purchase", value: `₹${summary.estimated.toLocaleString()}`, color: "#0C1B33", mono: true },
          { label: "Low Stock", value: summary.lowStock, color: "#F57F17" },
          { label: "Today's Sales", value: summary.todaySales, color: "#1B6CA8" },
          { label: "Manual", value: summary.manual, color: "#4B5563" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", padding: "14px 18px", borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: (c as { mono?: boolean }).mono ? "JetBrains Mono" : "Outfit", fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
        {/* Toolbar: search + filter pills + actions */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>

          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 6, border: "1px solid #DDE3EC", padding: "8px 12px", width: 300, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search medicine, barcode..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%", minWidth: 0 }} />
            {search.length > 0 && (
              <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "#C4CAD6", fontSize: 14, flexShrink: 0 }}>&#215;</button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" as const }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "Inter",
                    fontSize: 12, fontWeight: isActive ? 700 : 400,
                    border: `1px solid ${isActive ? "#1B6CA8" : "#DDE3EC"}`,
                    background: isActive ? "#EFF6FF" : "#fff",
                    color: isActive ? "#1B6CA8" : "#6B7280",
                    display: "flex", alignItems: "center",
                    whiteSpace: "nowrap" as const,
                  }}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* From Inventory */}
          <button onClick={() => setShowInventoryPicker(true)}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            Add from Inventory
          </button>

          {/* Bulk Order */}
          <button onClick={() => { setBulkPlanItems(null); setShowPlan(true); }}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #1B6CA8", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1.5h1.5l2 6h5.5l1-4H4" stroke="#1B6CA8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5.5" cy="10.5" r="1" fill="#1B6CA8"/><circle cx="9" cy="10.5" r="1" fill="#1B6CA8"/></svg>
            Bulk Order
          </button>

          {/* Qty Count */}
          <button onClick={qtyCountMode ? undefined : handleEnterQtyCount}
            style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${qtyCountMode ? "#F57F17" : "#E8ECF4"}`, background: qtyCountMode ? "#FFF9E6" : "#F8FAFC", fontSize: 12, cursor: qtyCountMode ? "default" : "pointer", color: qtyCountMode ? "#F57F17" : "#4A5875", fontFamily: "Inter", fontWeight: qtyCountMode ? 700 : 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke={qtyCountMode ? "#F57F17" : "#4A5875"} strokeWidth="1.2"/><path d="M4 5h5M4 7h3M4 9h4" stroke={qtyCountMode ? "#F57F17" : "#4A5875"} strokeWidth="1.1" strokeLinecap="round"/></svg>
            Qty Count
          </button>

        </div>

        {/* Qty Count mode banner */}
        {qtyCountMode && (
          <div style={{ padding: "10px 16px", background: "#FFFDE7", borderBottom: "1px solid #FFE082", display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="1.5" y="1.5" width="21" height="21" rx="2.5"/><path d="M6 8h12M6 12h9M6 16h6"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F57F17", fontFamily: "Inter" }}>Qty Count Mode</span>
            <span style={{ fontSize: 12, color: "#9B6B00", fontFamily: "Inter" }}>
              Edit order quantities in the <strong>Ord. Qty</strong> column below.
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={handleCancelQtyCount}
              style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={handleSaveQtyCount}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#2E7D32", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Save Qty
            </button>
          </div>
        )}

        {/* Bulk action bar */}
        {someSelected && (
          <div style={{ padding: "10px 16px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter" }}>
              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <button onClick={handleBulkCreatePO}
              style={{ padding: "5px 14px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Create Purchase Orders
            </button>
            <button onClick={handleBulkMarkOrdered}
              style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #A5D6A7", background: "#E8F5E9", fontSize: 12, cursor: "pointer", color: "#2E7D32", fontFamily: "Inter", fontWeight: 600 }}>
              Mark as Ordered
            </button>
            <button onClick={handleBulkRemove}
              style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #FFCDD2", background: "#FFEBEE", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>
              Remove
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
              Deselect all
            </button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: "#D1D5DB" }}>&#9776;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>Your Short Book is empty</div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Add medicines from Inventory or Today's Sales.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 14px", background: "#FAFBFD", borderBottom: "1px solid #EEF1F6", width: 36 }}>
                    <input type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                      onChange={handleSelectAll}
                      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#1B6CA8" }} />
                  </th>
                  <Th>Medicine</Th>
                  <Th>Reason</Th>
                  <Th right>Curr. Stock</Th>
                  <Th center>Days</Th>
                  <Th right>Sug. Qty</Th>
                  {qtyCountMode ? (
                    <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "2px solid #1B6CA8", whiteSpace: "nowrap", background: "#EFF6FF" }}>
                      Ord. Qty &#9998;
                    </th>
                  ) : (
                    <Th right>Ord. Qty</Th>
                  )}
                  <Th>Supplier</Th>
                  <Th>Source</Th>
                  <Th>Added</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  const priceDiff = item.lastPurchasePrice && item.currentPrice ? item.currentPrice - item.lastPurchasePrice : 0;
                  return (
                    <tr key={item.id}
                      style={{ borderBottom: "1px solid #F4F6FA", background: isSelected ? "#F0F6FF" : undefined }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F7F9FC"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>

                      {/* Checkbox */}
                      <td style={{ padding: "11px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(item.id)}
                          style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#1B6CA8" }} />
                      </td>

                      {/* Medicine */}
                      <Td>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#1A2436", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                              {item.medicine}
                              {item.critical && (
                                <span title="Critical medicine" style={{ cursor: "default", fontSize: 12, color: "#E65100" }}>&#9733;</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.manufacturer}</div>
                            {item.nearExpiry && (
                              <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#E65100", background: "#FFF3E0", padding: "2px 6px", borderRadius: 3, border: "1px solid #FFCC80" }}>
                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                  <path d="M4.5 1L8.5 8H0.5L4.5 1z" fill="#FFF3E0" stroke="#E65100" strokeWidth="1" strokeLinejoin="round"/>
                                  <line x1="4.5" y1="3.5" x2="4.5" y2="5.5" stroke="#E65100" strokeWidth="0.9" strokeLinecap="round"/>
                                  <circle cx="4.5" cy="7" r="0.5" fill="#E65100"/>
                                </svg>
                                Near Expiry
                              </div>
                            )}
                          </div>
                        </div>
                      </Td>

                      {/* Reason */}
                      <Td>
                        <ReasonPill reason={item.reason} />
                      </Td>

                      {/* Current Stock + avg daily consumption */}
                      <Td right>
                        <div>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: item.currentStock === 0 ? "#C62828" : item.currentStock < 10 ? "#F57F17" : "#1A2436" }}>
                            {item.currentStock}
                          </span>
                          {item.avgDailySales != null && (
                            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter", textAlign: "right" }}>
                              {item.avgDailySales}/day avg
                            </div>
                          )}
                        </div>
                      </Td>

                      {/* Days Left */}
                      <td style={{ padding: "11px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        <DaysCell item={item} />
                      </td>

                      <Td right mono>{item.suggestedQty}</Td>

                      {/* Order Qty + pending badge */}
                      {qtyCountMode ? (
                        <td style={{ padding: "8px 14px", textAlign: "right", verticalAlign: "middle", background: "#FAFEFF" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qtyDrafts[item.id] ?? String(item.orderQty)}
                            onChange={e => setQtyDrafts(prev => ({ ...prev, [item.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") handleCancelQtyCount(); }}
                            style={{ width: 72, padding: "4px 2px", border: "none", borderBottom: "2px solid #1B6CA8", borderRadius: 0, fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "transparent", color: "#0C1B33" }}
                          />
                          {(item.pendingOrderQty ?? 0) > 0 && (
                            <div style={{ fontSize: 10, color: "#2E7D32", fontWeight: 600, marginTop: 3 }}>
                              {item.pendingOrderQty} on order
                            </div>
                          )}
                        </td>
                      ) : (
                        <Td right>
                          <EditQtyCell item={item} onSave={qty => handleQtyChange(item.id, qty)} />
                        </Td>
                      )}

                      {/* Best Supplier */}
                      <Td>
                        <span style={{ fontSize: 13, color: "#1A2436", whiteSpace: "nowrap" as const }}>{item.bestSupplier}</span>
                      </Td>

                      <Td><SourcePill source={item.source} /></Td>

                      <Td mono>
                        <span style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>{fmtDate(item.addedOn)}</span>
                      </Td>

                      {/* Status + overdue */}
                      <Td>
                        <StatusCell item={item} />
                      </Td>

                      {/* Action menu */}
                      <Td>
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 0 }}>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6B7280", display: "block" }} />
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6B7280", display: "block" }} />
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6B7280", display: "block" }} />
                          </button>
                          {openMenuId === item.id && (
                            <>
                              <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                              <div style={{ position: "absolute", right: 0, top: 32, background: "#fff", border: "1px solid #E8ECF4", borderRadius: 6, boxShadow: "0 4px 16px rgba(10,22,44,0.12)", zIndex: 50, minWidth: 175, overflow: "hidden" }}>
                                {[
                                  {
                                    label: "Compare Suppliers",
                                    action: () => { setCompareItem(item); setOpenMenuId(null); },
                                    color: "#1A2436",
                                    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h4M9 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M3.5 4.5L1 7l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 4.5L13 7l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                                  },
                                  ...(item.reason === "Out of Stock" && item.alternatives?.length ? [{
                                    label: "View Alternatives",
                                    action: () => { setAlternativesItem(item); setOpenMenuId(null); },
                                    color: "#1B6CA8",
                                    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4.5h7M7 2.5l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 9.5H5M5 7.5l-2 2 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                                  }] : []),
                                  {
                                    label: "Mark as Ordered",
                                    action: () => { setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "Ordered" as const } : i)); setOpenMenuId(null); showToast("Marked as Ordered"); },
                                    color: "#1A2436",
                                    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                                  },
                                  {
                                    label: "Mark as Pending",
                                    action: () => { setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "Pending" as const } : i)); setOpenMenuId(null); },
                                    color: "#1A2436",
                                    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3.2l2 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                                  },
                                  {
                                    label: item.critical ? "Unmark Critical" : "Mark as Critical",
                                    action: () => { handleToggleCritical(item.id, !!item.critical); setOpenMenuId(null); },
                                    color: item.critical ? "#E65100" : "#7B1FA2",
                                    icon: item.critical
                                      ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.4 3.8H13L9.8 7.5l1.4 3.8L7 9l-4.2 2.3 1.4-3.8L1 5.3h4.6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M2 12L12 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                      : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.4 3.8H13L9.8 7.5l1.4 3.8L7 9l-4.2 2.3 1.4-3.8L1 5.3h4.6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
                                  },
                                  {
                                    label: "Remove",
                                    action: () => { handleRemove(item.id); setOpenMenuId(null); showToast("Removed from Short Book"); },
                                    color: "#C62828",
                                    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><line x1="5.5" y1="6.5" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="8.5" y1="6.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
                                  },
                                ].map(opt => (
                                  <button key={opt.label} onClick={opt.action}
                                    style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: opt.color, fontFamily: "Inter", borderBottom: "1px solid #F4F6FA", display: "flex", alignItems: "center", gap: 9 }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    {opt.icon}
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Drawers */}
      {showAdd && (
        <AddMedicineDrawer
          initialSearch={addDrawerPreSearch}
          onClose={() => { setShowAdd(false); setAddDrawerPreSearch(""); }}
          onAdd={item => { setItems(prev => [...prev, item]); showToast(`${item.medicine} added to Short Book`); }}
          onUpdateQty={(id, qty) => setItems(prev => prev.map(i => i.id === id ? { ...i, orderQty: qty } : i))}
          existingItems={items}
        />
      )}
      {compareItem && (
        <SupplierComparisonDrawer
          item={compareItem}
          onClose={() => setCompareItem(null)}
          onSelect={supplier => { handleSupplierChange(compareItem.id, supplier); showToast(`Supplier updated to ${supplier}`); }}
        />
      )}
      {alternativesItem && (
        <AlternativesDrawer item={alternativesItem} onClose={() => setAlternativesItem(null)} />
      )}
      {showPlan && (
        <PurchasePlanDrawer
          items={planItems}
          onClose={() => { setShowPlan(false); setBulkPlanItems(null); }}
          onToast={showToast}
        />
      )}
      {showInventoryPicker && (
        <InventoryPickerDrawer
          existingItems={items}
          onAdd={item => {
            setItems(prev => [...prev, item]);
            showToast(`${item.medicine} added to Short Book`);
          }}
          onClose={() => setShowInventoryPicker(false)}
        />
      )}

      {/* Toast */}
      {sbToast && (
        <SBToastComp key={sbToast.key} toast={sbToast} onDone={() => setSbToast(null)} />
      )}
    </div>
  );
}
