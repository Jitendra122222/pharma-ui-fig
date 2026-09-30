import { useState } from "react";
import { SK } from "../styles/stock";
import { type SubTab, TABS } from "./stock/stockData";
import type { StorageType } from "./stock/stockData";
import type { ShortBookItem } from "./ShortBook";
import StockOverview from "./stock/StockOverview";
import Adjustments from "./stock/Adjustments";
import BatchTracking from "./stock/BatchTracking";
import StockExpiry from "./stock/StockExpiry";
import StockTransfer from "./stock/StockTransfer";
import StockInvestigation from "./stock/StockInvestigation";
import StockLocations from "./stock/StockLocations";
import NarcoticRegister from "./stock/NarcoticRegister";
import DrugRecall from "./stock/DrugRecall";

const TAB_SUBTITLE: Record<SubTab, string> = {
  overview: "Stock levels, expiry, and inventory health across all SKUs",
  locations: "Bin layout, fill levels, and stock placement",
  adjustments: "Record and approve stock write-offs, damages, and count corrections",
  batches: "Track lot and batch numbers, expiry dates, and quantities",
  expiry: "Monitor near-expiry items and manage quarantine",
  transfer: "Manage inter-location stock movements and chain of custody",
  investigation: "Investigate and resolve stock count discrepancies",
  narcotic: "Schedule H1 controlled substance running balance register",
  recall: "Batch-level drug recall search and patient traceability",
};

interface Props {
  storageType: StorageType;
  onNavigate?: (m: string) => void;
  onAddToShortBook?: (item: ShortBookItem) => void;
}

const FULL_PAGE_TABS: SubTab[] = ["adjustments"];

export default function StockManagement({ storageType, onNavigate, onAddToShortBook }: Props) {
  const [tab, setTab] = useState<SubTab>("overview");

  const isFullPage = FULL_PAGE_TABS.includes(tab);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Module Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={SK.pageTitle}>Stock Management</h1>
            <div style={SK.subtitle}>{TAB_SUBTITLE[isFullPage ? "overview" : tab]}</div>
          </div>
          <button style={SK.exportBtn}>Export</button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={SK.tabBar}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as SubTab)}
              style={SK.tabBtn(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content (non-full-page tabs) ── */}
        {tab === "overview" && <StockOverview onNavigate={onNavigate} onAddToShortBook={onAddToShortBook} />}
        {tab === "locations" && <StockLocations storageType={storageType} />}
        {tab === "batches" && <BatchTracking />}
        {tab === "expiry" && <StockExpiry />}
        {tab === "transfer" && <StockTransfer />}
        {tab === "investigation" && <StockInvestigation />}
        {tab === "narcotic" && <NarcoticRegister />}
        {tab === "recall" && <DrugRecall />}
      </div>

      {/* ── Adjustments: Full-page overlay ── */}
      {tab === "adjustments" && (
        <div style={SK.overlay}>
          {/* Page header */}
          <div style={SK.overlayHeader}>
            <button onClick={() => setTab("overview")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: "0 12px 0 0", height: "100%", flexShrink: 0, width: 40 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter" }}>
              <span style={SK.breadcrumbParent}>Stock Management</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={SK.breadcrumbCurrent}>Adjustments</span>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          {/* Section header */}
          <div style={{ padding: "16px 24px 0 24px", flexShrink: 0 }}>
            <div style={SK.sectionHeaderCard}>
              <div>
                <div style={SK.sectionTitle}>Stock Adjustments</div>
                <div style={SK.subtitle}>Record and approve stock write-offs, damages, and count corrections</div>
              </div>
            </div>
          </div>

          {/* Scrollable Adjustments content */}
          <div style={SK.overlayBody}>
            <Adjustments />
          </div>
        </div>
      )}
    </>
  );
}
