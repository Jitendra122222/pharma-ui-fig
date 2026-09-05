import { useState } from "react";
import { PrinterProvider } from "./components/shared/PrinterContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import Sales from "./components/Sales";
import Prescriptions from "./components/Prescriptions";
import Patients from "./components/Patients";
import Purchases from "./components/Purchases";
import Suppliers from "./components/Suppliers";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import StockManagement from "./components/StockManagement";
import ShortBook from "./components/ShortBook";
import ExpiryManagement from "./components/ExpiryManagement";
import Accounts from "./components/Accounts";
import HR from "./components/HR";
import Insurance from "./components/Insurance";

type Module =
  | "dashboard" | "inventory" | "stock" | "shortbook" | "expiry" | "sales" | "prescriptions"
  | "patients" | "purchases" | "suppliers" | "accounts" | "insurance"
  | "reports" | "hr" | "settings";

const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  stock: "Stock Management",
  shortbook: "Short Book",
  expiry: "Expiry Management",
  sales: "Sales",
  prescriptions: "Prescriptions",
  patients: "Patients",
  purchases: "Purchasing",
  suppliers: "Suppliers",
  accounts: "Accounts & Finance",
  insurance: "Insurance & Claims",
  reports: "Reports & Analytics",
  hr: "HR & Payroll",
  settings: "Settings",
};

export default function App() {
  const [module, setModule] = useState<Module>("dashboard");

  return (
    <PrinterProvider>
    <div className="app-shell" style={{ display: "flex", overflow: "hidden", background: "#F0F3F7" }}>
      <Sidebar active={module} onChange={(m) => setModule(m as Module)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{
          height: 50, background: "#fff", borderBottom: "1px solid #E8ECF4",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", flexShrink: 0,
        }}>
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: "#9CA3AF" }}>
            <span style={{ fontFamily: "JetBrains Mono" }}>PharmERP</span>
            <span style={{ fontSize: 10 }}>›</span>
            <span style={{ color: "#1A2436", fontWeight: 600, fontFamily: "Inter" }}>{MODULE_LABELS[module]}</span>
          </div>
          <div className="flex items-center gap-5">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Quick search..."
                style={{ width: 210, padding: "6px 10px 6px 30px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#FAFBFD" }}
              />
              <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#C8CDD8" }}>⌕</span>
            </div>
            <div style={{ position: "relative", cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <span style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, background: "#C62828", borderRadius: "50%", fontSize: 8, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>5</span>
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>28 Jul 2025</div>
            <div style={{ width: 1, height: 20, background: "#E8ECF4" }} />
            <div style={{ fontSize: 12, color: "#6B7280" }}>v2.1.0</div>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {module === "dashboard" && <Dashboard />}
          {module === "inventory" && <Inventory />}
          {module === "stock" && <StockManagement />}
          {module === "shortbook" && <ShortBook />}
          {module === "expiry" && <ExpiryManagement />}
          {module === "sales" && <Sales />}
          {module === "prescriptions" && <Prescriptions />}
          {module === "patients" && <Patients />}
          {module === "purchases" && <Purchases />}
          {module === "suppliers" && <Suppliers />}
          {module === "accounts" && <Accounts />}
          {module === "insurance" && <Insurance />}
          {module === "reports" && <Reports />}
          {module === "hr" && <HR />}
          {module === "settings" && <Settings />}
        </main>
      </div>
    </div>
    </PrinterProvider>
  );
}
