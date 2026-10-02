import { useState, useEffect } from "react";
import { PU } from "../styles/purchases";
import type { SubTab } from "./purchases/purchasesData";
import type { PurchasesDeepLink } from "../App";
import PurchaseOrders from "./purchases/PurchaseOrders";
import PurchaseInvoices from "./purchases/PurchaseInvoices";
import PurchaseReturns from "./purchases/PurchaseReturns";
import PurchasePayments from "./purchases/PurchasePayments";

const TABS: { id: SubTab; label: string; sub: string }[] = [
  { id: "orders", label: "Purchase Order", sub: "Orders placed with distributors" },
  { id: "invoices", label: "Purchase Invoice", sub: "Bills from distributors" },
  { id: "returns", label: "Purchase Return", sub: "Credit notes" },
  { id: "payments", label: "Purchase Payment", sub: "Distributor settlements" },
];

// Payment summary stats (derived from mock data in PurchasePayments)
const PAY_SUMMARY = [
  { label: "Paid This Month", value: "₹87,300", accent: "#2E7D32" },
  { label: "Outstanding", value: "₹2,27,900", accent: "#C62828" },
  { label: "Advances Available", value: "₹25,000", accent: "#1B6CA8" },
  { label: "Active Holds", value: "3", accent: "#E65100" },
];

export default function Purchases({ deepLink, onDeepLinkConsumed }: {
  deepLink?: PurchasesDeepLink | null;
  onDeepLinkConsumed?: () => void;
}) {
  const [tab, setTab] = useState<SubTab>("orders");

  useEffect(() => {
    if (deepLink) setTab(deepLink.tab);
  }, [deepLink]);
  const isPayments = tab === "payments";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {isPayments ? (
        <div style={{ flexShrink: 0, paddingBottom: 10 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setTab("orders")}
              style={PU.backBtn}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 style={PU.pageTitle}>Purchase Payments</h1>
          </div>
          {/* Summary stat tiles */}
          <div style={{ display: "flex", gap: 10 }}>
            {PAY_SUMMARY.map(s => (
              <div key={s.label} style={{ ...PU.statTile, borderLeft: `3px solid ${s.accent}` }}>
                <div style={PU.statLabel}>{s.label}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: s.accent, marginTop: 3, letterSpacing: "-0.01em" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "0 0 8px 0", flexShrink: 0 }}>
            <h1 style={PU.pageTitle}>Purchases</h1>
          </div>
          <div style={PU.tabContainer}>
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={PU.tabBtn(tab === t.id, i < TABS.length - 1)}>
                <div style={PU.tabLabel(tab === t.id)}>{t.label}</div>
                <div style={PU.tabSub(tab === t.id)}>{t.sub}</div>
              </button>
            ))}
          </div>
        </>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "orders"   && <PurchaseOrders   initialViewId={deepLink?.tab === "orders"   ? deepLink.id : undefined} onDeepLinkConsumed={onDeepLinkConsumed} />}
        {tab === "invoices" && <PurchaseInvoices initialViewId={deepLink?.tab === "invoices" ? deepLink.id : undefined} onDeepLinkConsumed={onDeepLinkConsumed} />}
        {tab === "returns"  && <PurchaseReturns  initialViewId={deepLink?.tab === "returns"  ? deepLink.id : undefined} onDeepLinkConsumed={onDeepLinkConsumed} />}
        {tab === "payments" && <PurchasePayments initialViewId={deepLink?.tab === "payments" ? deepLink.id : undefined} onDeepLinkConsumed={onDeepLinkConsumed} />}
      </div>
    </div>
  );
}