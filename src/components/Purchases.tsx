import { useState } from "react";
import type { SubTab } from "./purchases/purchasesData";
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

export default function Purchases() {
  const [tab, setTab] = useState<SubTab>("orders");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "orders" && <PurchaseOrders />}
        {tab === "invoices" && <PurchaseInvoices />}
        {tab === "returns" && <PurchaseReturns />}
        {tab === "payments" && <PurchasePayments />}
      </div>
    </div>
  );
}