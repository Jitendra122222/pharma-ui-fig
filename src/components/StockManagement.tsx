import { useState } from "react";
import { TabBar } from "./shared/TabBar";
import { type SubTab, TABS } from "./stock/stockData";
import StockOverview from "./stock/StockOverview";
import Adjustments from "./stock/Adjustments";
import BatchTracking from "./stock/BatchTracking";
import StockExpiry from "./stock/StockExpiry";
import StockTransfer from "./stock/StockTransfer";

export default function StockManagement() {
  const [tab, setTab] = useState<SubTab>("overview");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Stock Management</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Overview · Adjustments · Batches · Expiry · Transfers</div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      {tab === "overview" && <StockOverview />}
      {tab === "adjustments" && <Adjustments />}
      {tab === "batches" && <BatchTracking />}
      {tab === "expiry" && <StockExpiry />}
      {tab === "transfer" && <StockTransfer />}
    </div>
  );
}
