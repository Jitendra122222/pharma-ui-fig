import { useState, useMemo, useEffect } from "react";
import { suppliers } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";
import {
  type POLine, type PurchaseOrderRecord,
  purchaseOrders, PO_MOCK_LINES,
  formatDMY, money,
  WAREHOUSES, PAYMENT_TERMS_OPTIONS,
} from "./purchasesData";
import {
  Td, TableRow, PrimaryBtn, GhostBtn,
  FilterSearch, FilterDropdown, ClearFiltersButton, NewButton,
  EmptyTableRow,
  FieldLabel, DropdownSelect, TextInput, POLineSearch,
} from "./purchasesShared";
import NewPurchaseOrder from "./NewPurchaseOrder";

// ── Drawer mock data ──────────────────────────────────────────────────────────

type ChangeDetail = {
  medicine: string;
  changeType: "Price" | "Scheme" | "Delivery";
  original: string;
  updated: string;
  mrp?: number;
  originalRate?: number;
  updatedRate?: number;
  originalScheme?: string;
  updatedScheme?: string;
  schemeRate?: number;
};
type POSupplierResponse = {
  receivedAt: string;
  priceChanges: number;
  schemeChanges: number;
  deliveryChanges: number;
  changeDetails: ChangeDetail[];
};
const PO_SUPPLIER_RESPONSE: Record<string, POSupplierResponse> = {
  "PO-2026-0155": {
    receivedAt: "18 Aug 2026, 04:20 PM",
    priceChanges: 1, schemeChanges: 1, deliveryChanges: 1,
    changeDetails: [
      { medicine: "Paracetamol 500mg", changeType: "Price",    original: "₹1.80",       updated: "₹1.95",       mrp: 3.50,  originalRate: 1.80, updatedRate: 1.95 },
      { medicine: "Amoxicillin 500mg",  changeType: "Scheme",   original: "5+1",          updated: "4+1",         mrp: 10.00, originalScheme: "5+1", updatedScheme: "4+1", schemeRate: 5.20 },
      { medicine: "All items",          changeType: "Delivery", original: "20 Aug 2026",  updated: "22 Aug 2026" },
    ],
  },
};

type ActivityEntry = { time: string; actor: string; action: string; note?: string };
const PO_ACTIVITY: Record<string, ActivityEntry[]> = {
  "PO-2026-0155": [
    { time: "15 Aug, 09:00 AM", actor: "Raj Patel", action: "PO created", note: "9 items · ₹3,650.00" },
    { time: "16 Aug, 11:30 AM", actor: "Raj Patel", action: "Submitted for approval" },
    { time: "17 Aug, 03:15 PM", actor: "Ramesh Kumar", action: "Approved" },
    { time: "18 Aug, 10:00 AM", actor: "System", action: "PO sent to distributor", note: "Email: medline@pharma.com" },
    { time: "18 Aug, 04:20 PM", actor: "System", action: "Supplier responded", note: "3 changes received" },
  ],
  "PO-2026-0154": [
    { time: "12 Aug, 10:00 AM", actor: "Raj Patel", action: "PO created", note: "5 items · ₹1,544.58" },
    { time: "13 Aug, 02:00 PM", actor: "Raj Patel", action: "Submitted for approval" },
    { time: "14 Aug, 04:30 PM", actor: "Ramesh Kumar", action: "Approved" },
    { time: "15 Aug, 10:00 AM", actor: "System", action: "PO sent to distributor" },
    { time: "16 Aug, 02:00 PM", actor: "System", action: "GRN posted", note: "All 5 items received" },
  ],
  "PO-2026-0153": [
    { time: "12 Aug, 09:00 AM", actor: "Raj Patel", action: "PO created", note: "12 items · ₹4,437.82" },
    { time: "12 Aug, 11:00 AM", actor: "Raj Patel", action: "Submitted for approval" },
    { time: "12 Aug, 05:00 PM", actor: "Ramesh Kumar", action: "Approved" },
    { time: "13 Aug, 09:00 AM", actor: "System", action: "PO sent to distributor" },
  ],
  "PO-2026-0152": [
    { time: "05 Aug, 10:00 AM", actor: "Raj Patel", action: "PO created", note: "4 items · ₹3,066.75" },
    { time: "05 Aug, 03:00 PM", actor: "Ramesh Kumar", action: "Approved" },
    { time: "06 Aug, 09:00 AM", actor: "System", action: "PO sent to distributor" },
    { time: "07 Aug, 11:00 AM", actor: "System", action: "GRN posted", note: "All 4 items received" },
  ],
};

// ── Drawer tab sub-components ─────────────────────────────────────────────────

function OverviewTab({ order, response, onReviewChanges }: { order: PurchaseOrderRecord; response: POSupplierResponse | undefined; onReviewChanges: () => void }) {
  const pct = order.items > 0 ? Math.round((order.received / order.items) * 100) : 0;
  const infoRows: { label: string; value: string; mono?: boolean; bold?: boolean }[] = [
    { label: "Distributor", value: order.supplier },
    { label: "PO Number", value: order.id, mono: true },
    { label: "Order Date", value: formatDMY(order.date), mono: true },
    { label: "Expected Delivery", value: formatDMY(order.expectedDelivery), mono: true },
    { label: "Warehouse", value: order.warehouse },
    { label: "Payment Terms", value: order.paymentTerms },
    { label: "PO Value", value: money(order.orderValue), mono: true, bold: true },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* PO Summary */}
      <div style={{ border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>PO Summary</div>
        {infoRows.map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 16px", borderBottom: "1px solid #F4F5F7" }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.label}</span>
            <span style={{ fontSize: 13, fontFamily: r.mono ? "JetBrains Mono" : "Inter", fontWeight: r.bold ? 700 : 500, color: "#1A2436" }}>{r.value}</span>
          </div>
        ))}
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Received {order.received} of {order.items} items</span>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: pct === 100 ? "#2E7D32" : "#E65100" }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#2E7D32" : "#1B6CA8", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Response Summary */}
      <div style={{ border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Response Summary</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.04em" }}>Supplier Response</span>
        </div>
        {response ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 16px", borderBottom: "1px solid #F4F5F7" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Response received</span>
              <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{response.receivedAt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 16px", borderBottom: "1px solid #F4F5F7" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Changes detected</span>
              <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#E65100" }}>{response.priceChanges + response.schemeChanges + response.deliveryChanges}</span>
            </div>
            {response.priceChanges > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px 8px 32px", borderBottom: "1px solid #F4F5F7" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Price Changes</span>
                <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#C62828" }}>{response.priceChanges}</span>
              </div>
            )}
            {response.schemeChanges > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px 8px 32px", borderBottom: "1px solid #F4F5F7" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Scheme Changes</span>
                <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#E65100" }}>{response.schemeChanges}</span>
              </div>
            )}
            {response.deliveryChanges > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px 8px 32px", borderBottom: "1px solid #F4F5F7" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Delivery Changes</span>
                <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#E65100" }}>{response.deliveryChanges}</span>
              </div>
            )}
            <div style={{ padding: "12px 16px" }}>
              <button onClick={onReviewChanges} style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#1B6CA8", border: "1px solid #1B6CA8", background: "transparent", padding: "6px 14px", cursor: "pointer" }}>
                Review Changes
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
            No supplier response received yet
          </div>
        )}
      </div>
    </div>
  );
}

function ItemsTab({ lines }: { lines: POLine[] }) {
  if (lines.length === 0) {
    return <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>No line items available for this PO</div>;
  }
  const total = lines.reduce((s, l) => s + l.orderQty * l.purchaseRate, 0);
  return (
    <div style={{ border: "1px solid #E8ECF4", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>
            {(["Medicine", "Pack", "Qty", "Free", "Scheme", "Rate", "Total"] as const).map((h, i) => (
              <th key={h} style={{ padding: "8px 10px", textAlign: i >= 2 && i !== 4 ? "right" : i === 4 ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id} style={{ borderBottom: "1px solid #F4F5F7", background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
              <td style={{ padding: "8px 10px", fontSize: 12, color: "#1A2436", fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.medicineName}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{l.pack}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{l.orderQty}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: l.freeQty > 0 ? "#2E7D32" : "#9CA3AF" }}>{l.freeQty > 0 ? `+${l.freeQty}` : "—"}</td>
              <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 11, color: "#6B7280" }}>{l.scheme || "—"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{money(l.purchaseRate)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{money(l.orderQty * l.purchaseRate)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E8ECF4" }}>
            <td colSpan={6} style={{ padding: "10px 10px", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{lines.length} items</td>
            <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{money(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ResponseTab({ response, order, onToast }: { response: POSupplierResponse | undefined; order: PurchaseOrderRecord; onToast: (msg: string) => void }) {
  const [showReject, setShowReject] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [negotiateVals, setNegotiateVals] = useState<Record<number, string>>({});
  const [negotiateMsg, setNegotiateMsg] = useState("");

  if (!response) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F8FAFC", border: "1px solid #E8ECF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="4" width="16" height="14" rx="1" stroke="#9CA3AF" strokeWidth="1.4" />
            <path d="M3 8l8 5 8-5" stroke="#9CA3AF" strokeWidth="1.4" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2436" }}>Awaiting distributor response</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>No response from {order.supplier} yet</div>
      </div>
    );
  }

  const total = response.priceChanges + response.schemeChanges + response.deliveryChanges;

  function parseSch(s: string) { const m = s.match(/(\d+)\+(\d+)/); return m ? { q: +m[1], f: +m[2] } : { q: 1, f: 0 }; }
  function marginPct(rate: number, mrp: number) { return mrp > 0 ? +((mrp - rate) / mrp * 100).toFixed(1) : null; }
  function effR(rate: number, sch: string) { const { q, f } = parseSch(sch); return f > 0 ? (rate * q) / (q + f) : rate; }
  function getMargins(c: ChangeDetail) {
    if (c.changeType === "Price" && c.mrp != null && c.originalRate != null && c.updatedRate != null)
      return { before: marginPct(c.originalRate, c.mrp!), after: marginPct(c.updatedRate, c.mrp!) };
    if (c.changeType === "Scheme" && c.mrp != null && c.schemeRate != null && c.originalScheme && c.updatedScheme)
      return { before: marginPct(effR(c.schemeRate!, c.originalScheme), c.mrp!), after: marginPct(effR(c.schemeRate!, c.updatedScheme), c.mrp!) };
    return { before: null as null | number, after: null as null | number };
  }
  function negMargin(c: ChangeDetail, val: string) {
    if (c.changeType === "Price" && c.mrp) { const n = parseFloat(val.replace(/[₹\s]/g, "")); if (!isNaN(n)) return marginPct(n, c.mrp); }
    if (c.changeType === "Scheme" && c.mrp && c.schemeRate) { if (/\d+\+\d+/.test(val)) return marginPct(effR(c.schemeRate, val), c.mrp); }
    return null;
  }

  const openNegotiate = () => {
    const init: Record<number, string> = {};
    response.changeDetails.forEach((c, i) => { init[i] = c.updated; });
    setNegotiateVals(init); setNegotiateMsg(""); setShowNegotiate(true);
  };

  const typeBadge = (t: string) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", background: t === "Price" ? "#FFEBEE" : t === "Scheme" ? "#FFF3E0" : "#EFF6FF", color: t === "Price" ? "#C62828" : t === "Scheme" ? "#E65100" : "#1B6CA8" }}>{t}</span>
  );

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #E8ECF4", padding: "5px 8px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", background: "#fff", boxSizing: "border-box" };

  const ModalWrap = ({ children, width = 480 }: { children: React.ReactNode; width?: number }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.6)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>{children}</div>
    </div>
  );
  const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
      <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{title}</div>
      <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
    </div>
  );
  const ModalFooter = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid #EEF1F6" }}>{children}</div>
  );

  const medicinesToReject = response.changeDetails.filter(c => c.medicine !== "—" && c.medicine !== "All items").map(c => c.medicine);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Banner */}
      <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="9" cy="9" r="8" fill="#E65100" />
          <path d="M9 5v5M9 12.5h.01" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E65100" }}>{total} change{total !== 1 ? "s" : ""} received from {order.supplier}</div>
          <div style={{ fontSize: 11, color: "#A05000", marginTop: 2 }}>Received {response.receivedAt}</div>
        </div>
      </div>

      {/* Change Details + Margin table */}
      <div style={{ border: "1px solid #E8ECF4", overflowX: "auto" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Change Details</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>
              {["Medicine", "Type", "Original (PO)", "Distributor", "Margin Before", "Margin After", "Diff"].map((h, i) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: i >= 2 ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.changeDetails.map((c, i) => {
              const { before, after } = getMargins(c);
              const diff = before != null && after != null ? +(after - before).toFixed(1) : null;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #F4F5F7" }}>
                  <td style={{ padding: "9px 10px", fontSize: 12, color: "#1A2436", fontWeight: 500, whiteSpace: "nowrap" }}>{c.medicine}</td>
                  <td style={{ padding: "9px 10px" }}>{typeBadge(c.changeType)}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF", textDecoration: "line-through" }}>{c.original}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: c.changeType === "Price" ? "#C62828" : c.changeType === "Scheme" ? "#E65100" : "#1B6CA8" }}>{c.updated}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{before != null ? `${before}%` : "—"}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{after != null ? `${after}%` : "—"}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: diff == null ? "#9CA3AF" : diff >= 0 ? "#2E7D32" : "#C62828" }}>
                    {diff != null ? `${diff > 0 ? "+" : ""}${diff}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <GhostBtn onClick={() => setShowReject(true)}>Reject All</GhostBtn>
        <GhostBtn onClick={openNegotiate}>Negotiate</GhostBtn>
        <div style={{ flex: 1 }}><PrimaryBtn onClick={() => setShowAccept(true)}>Accept All</PrimaryBtn></div>
      </div>

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      {showReject && (
        <ModalWrap width={460}>
          <ModalHeader title="Reject All Changes" onClose={() => setShowReject(false)} />
          <div style={{ padding: "20px 20px 16px" }}>
            <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>
              Rejecting all <strong style={{ color: "#1A2436" }}>{total}</strong> changes from <strong style={{ color: "#1A2436" }}>{order.supplier}</strong>. Your original PO terms and quantities will be maintained.
            </div>
            {medicinesToReject.length > 0 && (
              <div style={{ border: "1px solid #E8ECF4", marginBottom: 16 }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEF1F6", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Affected items</div>
                {medicinesToReject.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: i < medicinesToReject.length - 1 ? "1px solid #F4F5F7" : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C62828", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#1A2436" }}>{m}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 4 }}>Add to Short Book?</div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>Short Book registers rejected items for priority re-ordering from alternate distributors in future POs.</div>
            </div>
          </div>
          <ModalFooter>
            <GhostBtn onClick={() => setShowReject(false)}>Cancel</GhostBtn>
            <GhostBtn onClick={() => { setShowReject(false); onToast("All items are rejected successfully."); }}>Reject Only</GhostBtn>
            <div style={{ flex: 1 }}><PrimaryBtn onClick={() => { setShowReject(false); onToast("Successfully Added to Short Book."); }}>+ Short Book</PrimaryBtn></div>
          </ModalFooter>
        </ModalWrap>
      )}

      {/* ── Accept Modal ──────────────────────────────────────────────────── */}
      {showAccept && (
        <ModalWrap width={440}>
          <ModalHeader title="Accept All Changes" onClose={() => setShowAccept(false)} />
          <div style={{ padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="10" fill="#2E7D32" />
                  <path d="M6.5 11l3.5 3.5L15.5 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 4 }}>Accepting {total} change{total !== 1 ? "s" : ""} from {order.supplier}</div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>The PO will be updated with the distributor's revised terms. This action cannot be undone.</div>
              </div>
            </div>
            <div style={{ border: "1px solid #E8ECF4", marginBottom: 16 }}>
              {response.changeDetails.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: i < response.changeDetails.length - 1 ? "1px solid #F4F5F7" : "none" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{c.medicine} · {c.changeType}</span>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600 }}>{c.updated}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 4 }}>Notify distributor of acceptance?</div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>An email or WhatsApp notification will be sent to {order.supplier} confirming your acceptance.</div>
            </div>
          </div>
          <ModalFooter>
            <GhostBtn onClick={() => setShowAccept(false)}>Cancel</GhostBtn>
            <GhostBtn onClick={() => { setShowAccept(false); onToast("All changes accepted successfully."); }}>Accept Only</GhostBtn>
            <div style={{ flex: 1 }}><PrimaryBtn onClick={() => { setShowAccept(false); onToast("Changes accepted and distributor notified successfully."); }}>Accept &amp; Notify Distributor</PrimaryBtn></div>
          </ModalFooter>
        </ModalWrap>
      )}

      {/* ── Negotiate Modal ───────────────────────────────────────────────── */}
      {showNegotiate && (
        <ModalWrap width={680}>
          <ModalHeader title={`Negotiate with ${order.supplier}`} onClose={() => setShowNegotiate(false)} />
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
              Enter your negotiated values below. The Margin column updates as you type.
            </div>
            <div style={{ border: "1px solid #E8ECF4", overflowX: "auto", marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>
                    {["Medicine", "Type", "Original (PO)", "Distributor", "Your Negotiate", "Margin"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: i >= 2 ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {response.changeDetails.map((c, i) => {
                    const val = negotiateVals[i] ?? c.updated;
                    const nm = negMargin(c, val);
                    const { after: distMargin } = getMargins(c);
                    const diff = nm != null && distMargin != null ? +(nm - distMargin).toFixed(1) : null;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #F4F5F7" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#1A2436", fontWeight: 500, whiteSpace: "nowrap" }}>{c.medicine}</td>
                        <td style={{ padding: "8px 10px" }}>{typeBadge(c.changeType)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF" }}>{c.original}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", textDecoration: "line-through" }}>{c.updated}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", minWidth: 110 }}>
                          <input
                            value={val}
                            onChange={e => setNegotiateVals(v => ({ ...v, [i]: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                            onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {nm != null ? (
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: diff != null && diff >= 0 ? "#2E7D32" : "#C62828" }}>
                              {nm}%{diff != null ? <span style={{ fontSize: 10, marginLeft: 3, opacity: 0.8 }}>({diff > 0 ? "+" : ""}{diff}%)</span> : null}
                            </span>
                          ) : <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", marginBottom: 6 }}>Message to distributor <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span></div>
              <textarea
                value={negotiateMsg}
                onChange={e => setNegotiateMsg(e.target.value)}
                placeholder="e.g. Please consider our rates — we order consistently in high volume."
                rows={3}
                style={{ width: "100%", border: "1px solid #E8ECF4", padding: "8px 10px", fontSize: 12, fontFamily: "Inter", color: "#1A2436", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
              />
            </div>
          </div>
          <ModalFooter>
            <GhostBtn onClick={() => setShowNegotiate(false)}>Cancel</GhostBtn>
            <div style={{ flex: 1 }}><PrimaryBtn onClick={() => { setShowNegotiate(false); onToast("Negotiation sent to distributor successfully."); }}>Send Notification</PrimaryBtn></div>
          </ModalFooter>
        </ModalWrap>
      )}
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) {
    return <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>No activity recorded</div>;
  }
  return (
    <div style={{ paddingTop: 4 }}>
      {activity.map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 20, position: "relative" }}>
          {i < activity.length - 1 && (
            <div style={{ position: "absolute", left: 11, top: 24, bottom: 0, width: 1, background: "#EEF1F6" }} />
          )}
          <div style={{ width: 23, height: 23, borderRadius: "50%", background: i === activity.length - 1 ? "#EFF6FF" : "#F8FAFC", border: `1.5px solid ${i === activity.length - 1 ? "#1B6CA8" : "#DDE3EC"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === activity.length - 1 ? "#1B6CA8" : "#9CA3AF" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{a.action}</span>
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap" }}>{a.time}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              by {a.actor}{a.note ? <> · <span style={{ color: "#9CA3AF" }}>{a.note}</span></> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PO Detail Drawer ──────────────────────────────────────────────────────────

function PODetailDrawer({ order, onClose, onEdit, onToast }: {
  order: PurchaseOrderRecord;
  onClose: () => void;
  onEdit: () => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "items" | "response" | "activity">("overview");
  const lines = PO_MOCK_LINES[order.id] ?? [];
  const response = PO_SUPPLIER_RESPONSE[order.id];
  const activity = PO_ACTIVITY[order.id] ?? [];
  const responseCount = response ? response.priceChanges + response.schemeChanges + response.deliveryChanges : 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const TABS = [
    { key: "overview" as const, label: "Overview" },
    { key: "items" as const, label: "Items" },
    { key: "response" as const, label: "Distributor Response", badge: responseCount },
    { key: "activity" as const, label: "Activity" },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(580px, 90vw)", background: "#fff", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "-8px 0 28px rgba(12,27,51,0.18)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Purchase Order</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{order.id}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <Pill status={order.status} />
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{order.supplier}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={onEdit} style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: "#1B6CA8", border: "1px solid #1B6CA8", background: "transparent", padding: "6px 14px", cursor: "pointer" }}>Edit PO</button>
              <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", marginRight: -24 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: "8px 14px", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#1B6CA8" : "#6B7280", borderBottom: tab === t.key ? "2px solid #1B6CA8" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                {t.label}
                {(t.badge ?? 0) > 0 && (
                  <span style={{ background: "#FFF3E0", color: "#E65100", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Tab body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {tab === "overview"  && <OverviewTab order={order} response={response} onReviewChanges={() => setTab("response")} />}
          {tab === "items"     && <ItemsTab lines={lines} />}
          {tab === "response"  && <ResponseTab response={response} order={order} onToast={onToast} />}
          {tab === "activity"  && <ActivityTab activity={activity} />}
        </div>
      </aside>
    </>
  );
}

// ── Purchase Order list ───────────────────────────────────────────────────────

function PurchaseOrderList({ onNew, onView }: {
  onNew: (data?: { supplier: string; warehouse: string; expectedDelivery: string; paymentTerms: string }) => void;
  onView: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => purchaseOrders.filter(o => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || o.id.toLowerCase().includes(q) || o.supplier.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || o.supplier === supplierFilter;
    const mStatus = statusFilter === "All" || o.status === statusFilter;
    const mFrom = !fromDate || o.date >= fromDate;
    const mTo = !toDate || o.date <= toDate;
    return mSearch && mSupplier && mStatus && mFrom && mTo;
  }), [search, supplierFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setStatusFilter("All"); };

  const PO_STATUSES = ["Draft", "Pending Approval", "Approved", "Sent", "Partially Received", "Completed", "Cancelled"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Orders</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Orders placed with distributors</div>
        </div>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search PO no., distributor..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={PO_STATUSES} allLabel="All PO Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <div style={{ marginLeft: "auto" }}>
            <NewButton label="+ Create PO" onClick={() => onNew()} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>PO #</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Order Date</Th>
                <Th onSort={() => handleSort("expectedDelivery")} sortDir={sortCol === "expectedDelivery" ? sortDir : null}>Expected Delivery</Th>
                <Th right onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("orderValue")} sortDir={sortCol === "orderValue" ? sortDir : null}>Order Value</Th>
                <Th center onSort={() => handleSort("received")} sortDir={sortCol === "received" ? sortDir : null}>Received</Th>
                <Th center onSort={() => handleSort("pending")} sortDir={sortCol === "pending" ? sortDir : null}>Pending</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(po => (
                <TableRow key={po.id} onClick={() => onView(po.id)}>
                  <Td mono>
                    <button
                      onClick={e => { e.stopPropagation(); onView(po.id); }}
                      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                      {po.id}
                    </button>
                  </Td>
                  <Td bold>{po.supplier}</Td>
                  <Td mono>{formatDMY(po.date)}</Td>
                  <Td mono color={po.status === "Partially Received" || po.status === "Sent" || po.status === "Approved" ? "#E65100" : "#6B7280"}>{formatDMY(po.expectedDelivery)}</Td>
                  <Td mono right>{po.items}</Td>
                  <Td mono right bold color="#1A2436">{money(po.orderValue)}</Td>
                  <Td center>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: po.received > 0 ? "#2E7D32" : "#9CA3AF" }}>
                      {po.received}<span style={{ color: "#C8CDD8" }}>/{po.items}</span>
                    </span>
                  </Td>
                  <Td center>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: po.pending > 0 ? 600 : 400, color: po.pending > 0 ? "#C62828" : "#9CA3AF" }}>
                      {po.pending > 0 ? po.pending : "—"}
                    </span>
                  </Td>
                  <Td><Pill status={po.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <EmptyTableRow colSpan={9} message="No purchase orders match your filters." />
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function PurchaseOrders({ initialViewId, onDeepLinkConsumed }: {
  initialViewId?: string;
  onDeepLinkConsumed?: () => void;
} = {}) {
  const [view, setView] = useState<"list" | "new-order" | "view-order">("list");
  const [openOrder, setOpenOrder] = useState<PurchaseOrderRecord | null>(null);
  const [drawerOrder, setDrawerOrder] = useState<PurchaseOrderRecord | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!initialViewId) return;
    const order = purchaseOrders.find(o => o.id === initialViewId) ?? null;
    setOpenOrder(order);
    setView("view-order");
    onDeepLinkConsumed?.();
  }, [initialViewId]);

  if (view === "new-order" || view === "view-order") {
    return (
      <NewPurchaseOrder
        onBack={(result) => {
          setView("list");
          setOpenOrder(null);
          if (result) setToast(result);
        }}
        initialData={openOrder ?? undefined}
        defaultViewMode={view === "view-order"}
      />
    );
  }

  return (
    <>
      <PurchaseOrderList
        onNew={() => setView("new-order")}
        onView={(id) => {
          const order = purchaseOrders.find(o => o.id === id) ?? null;
          setDrawerOrder(order);
        }}
      />
      {drawerOrder && (
        <PODetailDrawer
          order={drawerOrder}
          onClose={() => setDrawerOrder(null)}
          onEdit={() => {
            setOpenOrder(drawerOrder);
            setDrawerOrder(null);
            setView("view-order");
          }}
          onToast={(msg) => { setDrawerOrder(null); setToast({ type: "success", message: msg }); }}
        />
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 500, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
                  <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 5s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
