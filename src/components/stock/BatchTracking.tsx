import { useState } from "react";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { batches } from "./stockData";

export default function BatchTracking() {
  const [batchSearch, setBatchSearch] = useState("");
  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(batches);
  const filteredBatches = sortedAll.filter(b =>
    !batchSearch || b.id.toLowerCase().includes(batchSearch.toLowerCase()) || b.drug.toLowerCase().includes(batchSearch.toLowerCase()) || b.supplier.toLowerCase().includes(batchSearch.toLowerCase())
  );
  const { pageRows, footerProps } = usePagination(filteredBatches, 10);

  const activeCount = batches.filter(b => b.status === "Active").length;
  const lowCount = batches.filter(b => b.status === "Low").length;
  const expiredCount = batches.filter(b => b.status === "Expired").length;
  const nearExpiry = batches.filter(b => {
    const days = Math.round((new Date(b.expiry).getTime() - new Date("2025-11-28").getTime()) / 86400000);
    return days > 0 && days < 90;
  }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>


      {/* ── Table Card ── */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Search batches..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Batch #</Th>
              <Th onSort={() => handleSort("drug")} sortDir={sortCol === "drug" ? sortDir : null}>Drug</Th>
              <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Supplier</Th>
              <Th onSort={() => handleSort("received")} sortDir={sortCol === "received" ? sortDir : null}>Date Received</Th>
              <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Expiry Date</Th>
              <Th onSort={() => handleSort("qtyReceived")} sortDir={sortCol === "qtyReceived" ? sortDir : null}>Qty Received</Th>
              <Th onSort={() => handleSort("qtyCurrent")} sortDir={sortCol === "qtyCurrent" ? sortDir : null}>Qty Remaining</Th>
              <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
              <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
            </tr></thead>
            <tbody>
              {pageRows.map(b => {
                const used = b.qtyReceived - b.qtyCurrent;
                const pct = (b.qtyCurrent / b.qtyReceived) * 100;
                const batchStatus = b.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : b.status === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.drug}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{b.supplier}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: new Date(b.expiry) < new Date("2025-11-28") ? "#C62828" : "#6B7280" }}>{b.expiry}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>{b.qtyReceived}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: "#EEF1F6" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct < 20 ? "#C62828" : pct < 50 ? "#F57F17" : "#2E7D32" }} />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", minWidth: 30 }}>{b.qtyCurrent}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{used} used · {pct.toFixed(0)}% remaining</div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.location}</td>
                    <td style={{ padding: "11px 14px" }}><Pill label={b.status} bg={batchStatus.bg} color={batchStatus.color} /></td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "32px 14px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No batches found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}
