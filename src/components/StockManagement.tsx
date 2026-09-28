import { useState } from "react";
import { type SubTab, TABS } from "./stock/stockData";
import type { StorageType } from "./stock/stockData";
import StockOverview from "./stock/StockOverview";
import Adjustments from "./stock/Adjustments";
import BatchTracking from "./stock/BatchTracking";
import StockExpiry from "./stock/StockExpiry";
import StockTransfer from "./stock/StockTransfer";
import StockInvestigation from "./stock/StockInvestigation";
import StockLocations from "./stock/StockLocations";

const TAB_SUBTITLE: Record<SubTab, string> = {
  overview: "Stock levels, expiry, and inventory health across all SKUs",
  locations: "Bin layout, fill levels, and stock placement",
  adjustments: "Record and approve stock write-offs, damages, and count corrections",
  batches: "Track lot and batch numbers, expiry dates, and quantities",
  expiry: "Monitor near-expiry items and manage quarantine",
  transfer: "Manage inter-location stock movements and chain of custody",
  investigation: "Investigate and resolve stock count discrepancies",
};

interface Props {
  storageType: StorageType;
}

const FULL_PAGE_TABS: SubTab[] = ["adjustments"];

export default function StockManagement({ storageType }: Props) {
  const [tab, setTab] = useState<SubTab>("overview");

  const isFullPage = FULL_PAGE_TABS.includes(tab);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Module Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Stock Management</h1>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3, fontFamily: "Inter" }}>{TAB_SUBTITLE[isFullPage ? "overview" : tab]}</div>
          </div>
          <button style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export</button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as SubTab)}
              style={{
                padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "#1B6CA8" : "#6B7280",
                borderBottom: `2px solid ${tab === t.id ? "#1B6CA8" : "transparent"}`,
                marginBottom: -2, whiteSpace: "nowrap" as const,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content (non-full-page tabs) ── */}
        {tab === "overview" && <StockOverview />}
        {tab === "locations" && <StockLocations storageType={storageType} />}
        {tab === "batches" && <BatchTracking />}
        {tab === "expiry" && <StockExpiry />}
        {tab === "transfer" && <StockTransfer />}
        {tab === "investigation" && <StockInvestigation />}
      </div>

      {/* ── Adjustments: Full-page overlay ── */}
      {tab === "adjustments" && (
        <div style={{
          position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0,
          zIndex: 50, background: "#F0F3F7", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Page header */}
          <div style={{
            background: "#fff", borderBottom: "1px solid #DDE3EC",
            padding: "0 24px", height: 52, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <button onClick={() => setTab("overview")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: "0 12px 0 0", height: "100%", flexShrink: 0, width: 40 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Stock Management</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: 13, color: "#1A2436", fontWeight: 700 }}>Adjustments</span>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          {/* Section header */}
          <div style={{ padding: "16px 24px 0 24px", flexShrink: 0 }}>
            <div style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Stock Adjustments</div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3, fontFamily: "Inter" }}>Record and approve stock write-offs, damages, and count corrections</div>
              </div>
            </div>
          </div>

          {/* Scrollable Adjustments content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 20px 24px" }}>
            <Adjustments />
          </div>
        </div>
      )}
    </>
  );
}
