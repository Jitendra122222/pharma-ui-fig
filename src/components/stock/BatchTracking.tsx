import { useState } from "react";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { batches, MOVEMENTS } from "./stockData";

export default function BatchTracking() {
  const [batchSearch, setBatchSearch] = useState("");
  const [selBatch, setSelBatch] = useState<typeof batches[0] | null>(null);
  const [bTab, setBTab] = useState<"history" | "genealogy">("history");
  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(batches);
  const filteredBatches = sortedAll.filter(b =>
    !batchSearch || b.id.toLowerCase().includes(batchSearch.toLowerCase()) || b.drug.toLowerCase().includes(batchSearch.toLowerCase()) || b.supplier.toLowerCase().includes(batchSearch.toLowerCase())
  );
  const { pageRows, footerProps } = usePagination(filteredBatches, 10);

  const activeCount = batches.filter(b => b.status === "Active").length;
  const lowCount = batches.filter(b => b.status === "Low").length;
  const expiredCount = batches.filter(b => b.status === "Expired").length;
  const nearExpiry = batches.filter(b => {
    const days = Math.round((new Date(b.expiry).getTime() - Date.now()) / 86400000);
    return days > 0 && days < 90;
  }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Active Batches",  value: activeCount,      color: "#2E7D32", bg: "#E8F5E9" },
          { label: "Near Expiry",     value: nearExpiry,        color: "#E65100", bg: "#FFF3E0" },
          { label: "Expired",         value: expiredCount,      color: "#C62828", bg: "#FFEBEE" },
          { label: "Total Batches",   value: batches.length,    color: "#1B6CA8", bg: "#EFF6FF" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

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
                  <tr key={b.id} onClick={() => { setSelBatch(b); setBTab("history"); }}
                    style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selBatch?.id === b.id ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={e => { if (selBatch?.id !== b.id) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{b.id}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{b.drug}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{b.supplier}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: new Date(b.expiry) < new Date() ? "#C62828" : "#6B7280" }}>{b.expiry}</td>
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

      {/* ── Batch detail drawer ── */}
      {selBatch && (
        <>
          <div onClick={() => setSelBatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 100 }} />
          <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(12,27,51,0.12)" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 800, color: "#1B6CA8" }}>{selBatch.id}</span>
                  {(() => {
                    const s = selBatch.status;
                    const sp = s === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : s === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                    return <Pill label={s} bg={sp.bg} color={sp.color} />;
                  })()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{selBatch.drug}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{selBatch.supplier} · {selBatch.location}</div>
              </div>
              <button onClick={() => setSelBatch(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 24, lineHeight: 1, padding: 4 }}>&times;</button>
            </div>

            {/* 4 stat tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              {[
                { label: "Qty Received",  value: selBatch.qtyReceived,                          color: "#1B6CA8" },
                { label: "Qty Remaining", value: selBatch.qtyCurrent,                            color: "#2E7D32" },
                { label: "Qty Used",      value: selBatch.qtyReceived - selBatch.qtyCurrent,     color: "#E65100" },
                { label: "Days to Expiry", value: Math.max(0, Math.round((new Date(selBatch.expiry).getTime() - Date.now()) / 86400000)), color: Math.round((new Date(selBatch.expiry).getTime() - Date.now()) / 86400000) < 90 ? "#C62828" : "#1A2436" },
              ].map((tile, i) => (
                <div key={tile.label} style={{ padding: "12px 14px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none", textAlign: "center" as const }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>{tile.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 800, color: tile.color }}>{tile.value}</div>
                </div>
              ))}
            </div>

            {/* Inner tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              {(["history", "genealogy"] as const).map(t => (
                <button key={t} onClick={() => setBTab(t)} style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: bTab === t ? 700 : 400, color: bTab === t ? "#1B6CA8" : "#6B7280", fontFamily: "Inter", borderBottom: bTab === t ? "2px solid #1B6CA8" : "2px solid transparent", textTransform: "capitalize" as const }}>
                  {t === "genealogy" ? "Lot Genealogy" : "Movement History"}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {bTab === "history" && (() => {
                const moves = (MOVEMENTS[selBatch.drug] ?? []).filter(m => m.batch === selBatch.id);
                if (moves.length === 0) return <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" as const, paddingTop: 32 }}>No movements recorded for this batch.</div>;
                const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
                  Sale: { bg: "#FFEBEE", color: "#C62828" }, GRN: { bg: "#E8F5E9", color: "#2E7D32" },
                  Adjustment: { bg: "#FFF3E0", color: "#E65100" }, Return: { bg: "#EFF6FF", color: "#1B6CA8" },
                  "Transfer In": { bg: "#E8F5E9", color: "#2E7D32" }, "Transfer Out": { bg: "#FFEBEE", color: "#C62828" },
                };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {moves.map(m => {
                      const ts = TYPE_STYLE[m.type] ?? { bg: "#F0F3F7", color: "#6B7280" };
                      return (
                        <div key={m.id} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flexShrink: 0, marginTop: 2 }}>
                            <Pill label={m.type} bg={ts.bg} color={ts.color} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{m.ref}</span>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{m.date}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "#6B7280" }}>{m.user}{m.reason ? ` · ${m.reason}` : ""}</span>
                              <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                            </div>
                            {m.qtyAfter !== undefined && (
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Balance after: {m.qtyAfter}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {bTab === "genealogy" && (() => {
                const allMoves = MOVEMENTS[selBatch.drug] ?? [];
                const batchMoves = allMoves.filter(m => m.batch === selBatch.id);
                const receipts  = batchMoves.filter(m => m.type === "GRN");
                const sales     = batchMoves.filter(m => m.type === "Sale");
                const returns_  = batchMoves.filter(m => m.type === "Return");
                const transfers = batchMoves.filter(m => m.type === "Transfer In" || m.type === "Transfer Out");

                const Section = ({ title, icon, moves, emptyMsg }: { title: string; icon: string; moves: typeof batchMoves; emptyMsg: string }) => (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>{icon} {title}</div>
                    {moves.length === 0
                      ? <div style={{ fontSize: 12, color: "#9CA3AF", padding: "8px 12px", background: "#F8FAFC", borderRadius: 4 }}>{emptyMsg}</div>
                      : moves.map(m => (
                        <div key={m.id} style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #EEF1F6", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{m.ref}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{m.date} · {m.user}</div>
                          </div>
                          <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: m.qty > 0 ? "#2E7D32" : "#C62828" }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                        </div>
                      ))
                    }
                  </div>
                );

                if (batchMoves.length === 0) return <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" as const, paddingTop: 32 }}>No traced movements for this batch.</div>;

                return (
                  <div>
                    <Section title="Received From" icon="↓" moves={receipts} emptyMsg="No GRN records for this batch." />
                    <Section title="Dispensed To (Sales)" icon="→" moves={sales} emptyMsg="No sales dispensed from this batch." />
                    <Section title="Returns" icon="←" moves={returns_} emptyMsg="No returns for this batch." />
                    <Section title="Transfers" icon="⇄" moves={transfers} emptyMsg="No transfers for this batch." />
                  </div>
                );
              })()}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
