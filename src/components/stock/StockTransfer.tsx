import { useState } from "react";
import { drugs } from "../../data/mockData";
import { usePagination, PaginationFooter } from "../shared/usePagination";

// ── Chain of Custody data (Gap #17) ────────────────────────────────────────
interface CustodyEvent {
  id: string;
  transferRef: string;
  drug: string;
  qty: number;
  action: string;
  from: string;
  to: string;
  handedBy: string;
  receivedBy: string;
  datetime: string;
  signature: boolean;
}

const CUSTODY_TRAIL: CustodyEvent[] = [
  { id: "COC-2025-0014", transferRef: "TR-2025-0041", drug: "Amoxicillin 500mg", qty: 60, action: "Transfer", from: "Main Store", to: "Dispensary Counter", handedBy: "Store Manager", receivedBy: "Cashier A", datetime: "2025-07-28 14:32", signature: true },
  { id: "COC-2025-0013", transferRef: "TR-2025-0039", drug: "Insulin Glargine", qty: 10, action: "Transfer", from: "Cold Storage", to: "Dispensary Counter", handedBy: "Admin", receivedBy: "Pharmacist", datetime: "2025-07-22 09:18", signature: true },
  { id: "COC-2025-0012", transferRef: "TR-2025-0038", drug: "Warfarin 5mg", qty: 3, action: "Transfer", from: "Main Store", to: "Controlled Substances Safe", handedBy: "Jane Doe", receivedBy: "Dr. R. Sharma", datetime: "2025-07-18 16:05", signature: true },
  { id: "COC-2025-0011", transferRef: "TR-2025-0038", drug: "Escitalopram 10mg", qty: 20, action: "Transfer", from: "Main Store", to: "Controlled Substances Safe", handedBy: "Jane Doe", receivedBy: "Dr. R. Sharma", datetime: "2025-07-18 16:07", signature: true },
  { id: "COC-2025-0010", transferRef: "TR-2025-0040", drug: "Insulin Glargine", qty: 15, action: "Transfer", from: "Main Store", to: "Cold Storage", handedBy: "Admin", receivedBy: "—", datetime: "2025-07-25 11:44", signature: false },
];

// ── Transfer Variance data (Gap #16) ────────────────────────────────────────
interface TransferVarianceRecord {
  id: string;
  transferRef: string;
  drug: string;
  sentQty: number;
  receivedQty: number;
  variance: number;
  status: "Matched" | "Short" | "Over" | "Pending";
  investigationRef?: string;
}

const TRANSFER_VARIANCE: TransferVarianceRecord[] = [
  { id: "TV-2025-0006", transferRef: "TR-2025-0041", drug: "Amoxicillin 500mg", sentQty: 60, receivedQty: 60, variance: 0, status: "Matched" },
  { id: "TV-2025-0005", transferRef: "TR-2025-0041", drug: "Paracetamol 500mg", sentQty: 100, receivedQty: 98, variance: -2, status: "Short", investigationRef: "INV-2026-0002" },
  { id: "TV-2025-0004", transferRef: "TR-2025-0039", drug: "Insulin Glargine", sentQty: 10, receivedQty: 10, variance: 0, status: "Matched" },
  { id: "TV-2025-0003", transferRef: "TR-2025-0038", drug: "Warfarin 5mg", sentQty: 3, receivedQty: 3, variance: 0, status: "Matched" },
  { id: "TV-2025-0002", transferRef: "TR-2025-0038", drug: "Escitalopram 10mg", sentQty: 20, receivedQty: 21, variance: 1, status: "Over" },
  { id: "TV-2025-0001", transferRef: "TR-2025-0040", drug: "Insulin Glargine", sentQty: 15, receivedQty: 0, variance: -15, status: "Pending" },
];

type TransferStatus = "Drafted" | "In Transit" | "Received" | "Cancelled";

interface TransferRecord {
  id: string;
  date: string;
  from: string;
  to: string;
  items: number;
  requestedBy: string;
  approvedBy: string;
  status: TransferStatus;
  notes?: string;
}

const TRANSFER_HISTORY: TransferRecord[] = [
  { id: "TR-2025-0041", date: "2025-07-28", from: "Main Store", to: "Dispensary Counter", items: 3, requestedBy: "Jane Doe", approvedBy: "Mark Stevens", status: "Received", notes: "Routine replenishment" },
  { id: "TR-2025-0040", date: "2025-07-25", from: "Main Store", to: "Cold Storage", items: 2, requestedBy: "Admin", approvedBy: "Jane Doe", status: "In Transit" },
  { id: "TR-2025-0039", date: "2025-07-22", from: "Cold Storage", to: "Dispensary Counter", items: 1, requestedBy: "Pharmacist", approvedBy: "Mark Stevens", status: "Received" },
  { id: "TR-2025-0038", date: "2025-07-18", from: "Main Store", to: "Controlled Substances Safe", items: 2, requestedBy: "Jane Doe", approvedBy: "Dr. R. Sharma", status: "Received" },
  { id: "TR-2025-0037", date: "2025-07-14", from: "Main Store", to: "Dispensary Counter", items: 4, requestedBy: "Anna Kowalski", approvedBy: "Mark Stevens", status: "Cancelled", notes: "Items not available" },
];

const STATUS_STYLE: Record<TransferStatus, { bg: string; color: string }> = {
  "Drafted":    { bg: "#F0F3F7", color: "#6B7280" },
  "In Transit": { bg: "#FFF3E0", color: "#E65100" },
  "Received":   { bg: "#E8F5E9", color: "#2E7D32" },
  "Cancelled":  { bg: "#FFEBEE", color: "#C62828" },
};

export default function StockTransfer() {
  const [transferView, setTransferView] = useState<"new" | "history" | "variance" | "custody">("new");
  const [lines, setLines] = useState([{ drug: "", qty: "" }]);
  const [histSearch, setHistSearch] = useState("");
  const [histStatus, setHistStatus] = useState<"All" | TransferStatus>("All");
  const [varianceFilter, setVarianceFilter] = useState<"All" | "Short" | "Over" | "Matched" | "Pending">("All");
  const [cocSearch, setCocSearch] = useState("");

  const histFiltered = TRANSFER_HISTORY.filter(t => {
    const q = histSearch.toLowerCase();
    const matchQ = !q || t.id.toLowerCase().includes(q) || t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q) || t.requestedBy.toLowerCase().includes(q);
    const matchS = histStatus === "All" || t.status === histStatus;
    return matchQ && matchS;
  });

  const variances = TRANSFER_VARIANCE.filter(v => v.status === "Short" || v.status === "Over").length;
  const missingSigs = CUSTODY_TRAIL.filter(c => !c.signature).length;

  const cocFiltered = CUSTODY_TRAIL.filter(c => {
    if (!cocSearch) return true;
    const q = cocSearch.toLowerCase();
    return c.drug.toLowerCase().includes(q) || c.transferRef.toLowerCase().includes(q) || c.handedBy.toLowerCase().includes(q) || c.receivedBy.toLowerCase().includes(q);
  });

  const { pageRows: histPageRows, footerProps: histFooterProps } = usePagination(histFiltered, 10);
  const varianceFiltered = TRANSFER_VARIANCE.filter(v => varianceFilter === "All" || v.status === varianceFilter);
  const { pageRows: varPageRows, footerProps: varFooterProps } = usePagination(varianceFiltered, 10);
  const { pageRows: cocPageRows, footerProps: cocFooterProps } = usePagination(cocFiltered, 10);

  const kpis = [
    { label: "Drafted", value: TRANSFER_HISTORY.filter(t => t.status === "Drafted").length.toString(), color: "#6B7280" },
    { label: "In Transit", value: TRANSFER_HISTORY.filter(t => t.status === "In Transit").length.toString(), color: "#E65100" },
    { label: "Received", value: TRANSFER_HISTORY.filter(t => t.status === "Received").length.toString(), color: "#2E7D32" },
    { label: "Cancelled", value: TRANSFER_HISTORY.filter(t => t.status === "Cancelled").length.toString(), color: "#C62828" },
    { label: "Variance Detected", value: variances.toString(), color: variances > 0 ? "#C62828" : "#9CA3AF" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>


      {/* ── Tabbed Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 6px", borderBottom: "2px solid #EEF1F6" }}>
          {([
            { key: "new" as const, label: "New Transfer", badge: null },
            { key: "history" as const, label: "Transfer History", badge: TRANSFER_HISTORY.filter(t => t.status === "In Transit").length },
            { key: "variance" as const, label: "Variance", badge: variances > 0 ? variances : null, badgeColor: "#C62828", badgeBg: "#FFEBEE" },
            { key: "custody" as const, label: "Chain of Custody", badge: missingSigs > 0 ? missingSigs : null, badgeColor: "#E65100", badgeBg: "#FFF3E0" },
          ]).map(t => (
            <button key={t.key} onClick={() => setTransferView(t.key)}
              style={{
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontFamily: "Inter", fontWeight: transferView === t.key ? 600 : 400,
                color: transferView === t.key ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${transferView === t.key ? "#1B6CA8" : "transparent"}`,
                marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}>
              {t.label}
              {t.badge !== null && t.badge !== undefined && t.badge > 0 && (
                <span style={{
                  fontSize: 11, padding: "1px 7px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 700,
                  background: t.badgeBg ?? (transferView === t.key ? "#EFF6FF" : "#F0F3F7"),
                  color: t.badgeColor ?? (transferView === t.key ? "#1B6CA8" : "#9CA3AF"),
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── New Transfer tab ── */}
        {transferView === "new" && (
          <>
            <div style={{ padding: 22 }}>
              <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Transfer Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { label: "From Location", type: "select", opts: ["Main Store", "Cold Storage", "Dispensary Counter", "Controlled Substances Safe"] },
                  { label: "To Location", type: "select", opts: ["Main Store", "Cold Storage", "Dispensary Counter", "Controlled Substances Safe"] },
                  { label: "Transfer Date", type: "date", val: "2025-07-28" },
                  { label: "Requested By", type: "select", opts: ["Jane Doe", "Mark Stevens", "Anna Kowalski"] },
                  { label: "Approved By", type: "select", opts: ["Jane Doe", "Mark Stevens"] },
                  { label: "Notes", type: "text", ph: "Reason for transfer" },
                ].map((f: any) => (
                  <div key={f.label}>
                    <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: 5 }}>{f.label}</label>
                    {f.type === "select" ? (
                      <select style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                        {f.opts.map((o: string) => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.type === "date" ? (
                      <input type="date" defaultValue={f.val} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                    ) : (
                      <input type="text" placeholder={f.ph} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #EEF1F6" }}>
              <div style={{ padding: "12px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Items to Transfer</div>
                <button onClick={() => setLines(l => [...l, { drug: "", qty: "" }])}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #1B6CA8", background: "transparent", color: "#1B6CA8", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>+ Add Item</button>
              </div>
              <div style={{ padding: "12px 22px 0" }}>
                {lines.map((ln, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr auto", gap: 12, marginBottom: 12 }}>
                    <select value={ln.drug} onChange={e => setLines(l => l.map((r, j) => j === i ? { ...r, drug: e.target.value } : r))}
                      style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff" }}>
                      <option value="">— Select Drug —</option>
                      {drugs.map(d => <option key={d.id}>{d.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={ln.qty} onChange={e => setLines(l => l.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))}
                      style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right" as const }} />
                    {lines.length > 1 && <button onClick={() => setLines(l => l.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: "#C62828", cursor: "pointer", fontSize: 20 }}>×</button>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "16px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Save Draft</button>
              <button style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Post Transfer</button>
            </div>
          </>
        )}

        {/* ── Transfer History tab ── */}
        {transferView === "history" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search transfers..." value={histSearch} onChange={e => setHistSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {(["All", "Drafted", "In Transit", "Received", "Cancelled"] as const).map(s => (
                  <button key={s} onClick={() => setHistStatus(s)}
                    style={{ padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "Inter", fontWeight: 600, border: `1px solid ${histStatus === s ? "#1B6CA8" : "#DDE3EC"}`, background: histStatus === s ? "#1B6CA8" : "#fff", color: histStatus === s ? "#fff" : "#6B7280" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Transfer #", "Date", "From", "To", "Items", "Requested By", "Approved By", "Status", "Notes"].map(h => (
                      <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {histPageRows.map(t => {
                    const ss = STATUS_STYLE[t.status];
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{t.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{t.date}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{t.from}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>→</span> {t.to}
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" as const }}>{t.items}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.requestedBy}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>{t.approvedBy}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontSize: 10, padding: "3px 9px", background: ss.bg, color: ss.color, fontWeight: 700, letterSpacing: "0.04em" }}>{t.status}</span>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 12, color: "#9CA3AF", fontStyle: t.notes ? "normal" : "italic" }}>{t.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {histPageRows.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No transfers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...histFooterProps} />
          </>
        )}

        {/* ── Variance tab ── */}
        {transferView === "variance" && (
          <>
            <div style={{ padding: "10px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Filter:</span>
              {(["All", "Short", "Over", "Matched", "Pending"] as const).map(f => {
                const fColor = f === "Short" ? "#C62828" : f === "Over" ? "#E65100" : f === "Matched" ? "#2E7D32" : f === "Pending" ? "#6B7280" : "#1B6CA8";
                return (
                  <button key={f} onClick={() => setVarianceFilter(f)}
                    style={{ padding: "4px 11px", fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "Inter", border: `1px solid ${varianceFilter === f ? fColor : "#DDE3EC"}`, background: varianceFilter === f ? fColor : "#fff", color: varianceFilter === f ? "#fff" : "#6B7280" }}>
                    {f}
                  </button>
                );
              })}
              {variances > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 12, padding: "3px 10px", background: "#FFEBEE", color: "#C62828", fontWeight: 700 }}>
                  {variances} variance{variances !== 1 ? "s" : ""} detected
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Ref", "Transfer #", "Drug", "Sent", "Received", "Variance", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: h === "Sent" || h === "Received" || h === "Variance" ? "right" as const : "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {varPageRows.map(v => {
                    const varStyle = v.variance < 0 ? { bg: "#FFEBEE", color: "#C62828" } : v.variance > 0 ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#E8F5E9", color: "#2E7D32" };
                    const stStyle = v.status === "Matched" ? { bg: "#E8F5E9", color: "#2E7D32" } : v.status === "Short" ? { bg: "#FFEBEE", color: "#C62828" } : v.status === "Over" ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#F0F3F7", color: "#6B7280" };
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 13px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{v.id}</td>
                        <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{v.transferRef}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{v.drug}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{v.sentQty}</td>
                        <td style={{ padding: "11px 13px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: v.status === "Pending" ? "#9CA3AF" : "#1A2436", textAlign: "right" as const }}>{v.status === "Pending" ? "—" : v.receivedQty}</td>
                        <td style={{ padding: "11px 13px", textAlign: "right" as const }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, padding: "2px 8px", background: varStyle.bg, color: varStyle.color }}>
                            {v.variance === 0 ? "0" : v.variance > 0 ? `+${v.variance}` : v.variance}
                          </span>
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", background: stStyle.bg, color: stStyle.color, fontWeight: 700 }}>{v.status}</span>
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          {v.investigationRef && (
                            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{v.investigationRef}</span>
                          )}
                          {(v.status === "Short" || v.status === "Over") && !v.investigationRef && (
                            <button style={{ padding: "4px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                              Investigate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...varFooterProps} />
          </>
        )}

        {/* ── Chain of Custody tab ── */}
        {transferView === "custody" && (
          <>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
                <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search chain of custody..." value={cocSearch} onChange={e => setCocSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
              </div>
              {missingSigs > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 12, padding: "3px 10px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>
                  {missingSigs} missing signature{missingSigs !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Custody ID", "Transfer #", "Drug", "Qty", "Action", "From → To", "Handed By", "Received By", "Date & Time", "Signature"].map(h => (
                      <th key={h} style={{ padding: "9px 13px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left" as const, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cocPageRows.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 13px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.id}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{c.transferRef}</td>
                      <td style={{ padding: "11px 13px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{c.drug}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>{c.qty}</td>
                      <td style={{ padding: "11px 13px" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 700 }}>{c.action}</span>
                      </td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#6B7280" }}>
                        {c.from} <span style={{ color: "#9CA3AF", margin: "0 4px" }}>→</span> {c.to}
                      </td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: "#1A2436" }}>{c.handedBy}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, color: c.receivedBy === "—" ? "#9CA3AF" : "#1A2436", fontStyle: c.receivedBy === "—" ? "italic" : "normal" }}>{c.receivedBy}</td>
                      <td style={{ padding: "11px 13px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.datetime}</td>
                      <td style={{ padding: "11px 13px" }}>
                        {c.signature ? (
                          <span style={{ fontSize: 10, padding: "2px 8px", background: "#E8F5E9", color: "#2E7D32", fontWeight: 700 }}>Signed</span>
                        ) : (
                          <span style={{ fontSize: 10, padding: "2px 8px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter {...cocFooterProps} />
          </>
        )}
      </div>
    </div>
  );
}
