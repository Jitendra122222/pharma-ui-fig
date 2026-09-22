import { useState } from "react";
import type { Tab } from "./sales/salesData";
import SalesInvoices from "./sales/SalesInvoices";
import CounterSales from "./sales/CounterSales";
import SalesReturns from "./sales/SalesReturns";
import SalesPayments from "./sales/SalesPayments";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "invoices", label: "Sales Invoices", sub: "Customer billing" },
  { id: "counter", label: "Counter Sales", sub: "Walk-in checkout" },
  { id: "returns", label: "Sales Returns", sub: "Refunds & credits" },
  { id: "payments", label: "Sales Payments", sub: "Received payments" },
];

export default function Sales() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [preloadItems, setPreloadItems] = useState<{ name: string; qty: number; packs: number }[] | undefined>(undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexShrink: 0 }}>
        <h1 style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Sales</h1>
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

      {tab === "counter" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CounterSales
            onGenerate={(items) => {
              setPreloadItems(items);
              setTab("invoices");
            }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          {tab === "invoices" && (
            <SalesInvoices
              preloadItems={preloadItems}
              onPreloadConsumed={() => setPreloadItems(undefined)}
            />
          )}
          {tab === "returns" && <SalesReturns />}
          {tab === "payments" && <SalesPayments />}
        </div>
      )}
    </div>
  );
}
