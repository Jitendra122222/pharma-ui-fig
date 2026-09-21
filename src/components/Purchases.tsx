import { useState, useEffect } from "react";
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
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, border: "none", background: "transparent",
                cursor: "pointer", padding: 0, flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Purchase Payments</h1>
          </div>
          {/* Summary stat tiles */}
          <div style={{ display: "flex", gap: 10 }}>
            {PAY_SUMMARY.map(s => (
              <div key={s.label} style={{ flex: 1, background: "#fff", border: "1px solid #E8ECF4", borderLeft: `3px solid ${s.accent}`, padding: "10px 14px", minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "Inter" }}>{s.label}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: s.accent, marginTop: 3, letterSpacing: "-0.01em" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "0 0 8px 0", flexShrink: 0 }}>
            <h1 style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Purchases</h1>
          </div>
          <div style={{ display: "flex", background: "#fff", border: "1px solid #E8ECF4", flexShrink: 0 }}>
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "14px 16px", border: "none",
                  borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                  background: tab === t.id ? "#F0F6FF" : "transparent",
                  borderRight: i < TABS.length - 1 ? "1px solid #EEF1F6" : undefined,
                  cursor: "pointer", textAlign: "left",
                }}>
                <div style={{ fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#1B6CA8" : "#6B7280", fontFamily: "Inter" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: tab === t.id ? "#5AA0D6" : "#C8CDD8", marginTop: 2, fontFamily: "Inter" }}>{t.sub}</div>
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