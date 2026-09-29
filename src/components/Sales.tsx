import { useState } from "react";
import { SL } from "../styles/sales";
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
        <h1 style={SL.pageTitle}>Sales</h1>
      </div>

      <div style={SL.tabContainer}>
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={SL.tabBtn(tab === t.id, i < TABS.length - 1)}>
            <div style={SL.tabLabel(tab === t.id)}>{t.label}</div>
            <div style={SL.tabSub(tab === t.id)}>{t.sub}</div>
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
