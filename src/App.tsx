import { useState, useRef } from "react";
import { PrinterProvider } from "./components/shared/PrinterContext";
import Login from "./components/Login";
import LoadingScreen from "./components/LoadingScreen";
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
  suppliers: "Distributors",
  accounts: "Accounts & Finance",
  insurance: "Insurance & Claims",
  reports: "Reports & Analytics",
  hr: "HR & Payroll",
  settings: "Settings",
};

interface AuthUser { name: string; role: string; phone: string; }

export interface PurchasesDeepLink { tab: "orders" | "invoices" | "returns" | "payments"; id: string; }

export default function App() {
  const [module, setModule] = useState<Module>("dashboard");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [purchasesDeepLink, setPurchasesDeepLink] = useState<PurchasesDeepLink | null>(null);
  const pendingDeepLink = useRef<PurchasesDeepLink | null>(null);
  const pendingModule = useRef<Module | null>(null);

  function navigatePurchases(link: PurchasesDeepLink) {
    pendingDeepLink.current = link;
    pendingModule.current = "purchases";
    setExiting(false);
    setLoading(true);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setModule("purchases");
        setPurchasesDeepLink(link);
        setLoading(false);
        setExiting(false);
        pendingDeepLink.current = null;
      }, 300);
    }, 1100);
  }

  function navigateTo(m: Module) {
    if (m === module || loading) return;
    pendingModule.current = m;
    setExiting(false);
    setLoading(true);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setModule(pendingModule.current!);
        setLoading(false);
        setExiting(false);
      }, 300);
    }, 1100);
  }

  function handleLogin(u: AuthUser) {
    setLoading(true);
    setExiting(false);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setUser(u);
        setLoading(false);
        setExiting(false);
      }, 300);
    }, 1500);
  }

  if (loading) {
    return <LoadingScreen exiting={exiting} module={pendingModule.current ?? undefined} />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <PrinterProvider>
    <div className="app-shell" style={{ display: "flex", overflow: "hidden", background: "#F0F3F7" }}>
      <Sidebar active={module} onChange={(m) => navigateTo(m as Module)} />

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "#1B6CA8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "Inter" }}>
                  {user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{user.name}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>{user.role}</span>
              </div>
              <button
                onClick={() => setUser(null)}
                style={{ border: "1px solid #E8ECF4", background: "#fff", borderRadius: 4, padding: "4px 10px", fontSize: 11, color: "#6B7280", fontFamily: "Inter", cursor: "pointer", marginLeft: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFF0F0"; (e.currentTarget as HTMLButtonElement).style.color = "#C62828"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#6B7280"; }}
              >
                Logout
              </button>
            </div>
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
          {module === "purchases" && <Purchases deepLink={purchasesDeepLink} onDeepLinkConsumed={() => setPurchasesDeepLink(null)} />}
          {module === "suppliers" && <Suppliers onNavigatePurchases={navigatePurchases} />}
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
