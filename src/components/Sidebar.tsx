import { useEffect, useState } from "react";

type Module = string;

interface NavItem {
  id: Module;
  label: string;
  icon: string;
  badge?: number;
  group?: string;
}

const navGroups = [
  {
    label: "Core Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "⊞" },
      { id: "sales", label: "Sales", icon: "◈", badge: 2 },
      { id: "prescriptions", label: "Prescriptions", icon: "℞", badge: 2 },
      { id: "patients", label: "Patients", icon: "♡" },
    ],
  },
  {
    label: "Inventory & Stock",
    items: [
      { id: "inventory", label: "Inventory", icon: "▤", badge: 3 },
      { id: "stock", label: "Stock Management", icon: "◫" },
      { id: "shortbook", label: "Short Book", icon: "◑", badge: 8 },
      { id: "expiry", label: "Expiry Management", icon: "◷", badge: 12 },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { id: "purchases", label: "Purchasing", icon: "⊕" },
      { id: "suppliers", label: "Suppliers", icon: "◇" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "accounts", label: "Accounts", icon: "▣" },
      { id: "insurance", label: "Insurance & Claims", icon: "⊙" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "reports", label: "Reports", icon: "▦" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "hr", label: "HR & Payroll", icon: "◎" },
      { id: "settings", label: "Settings", icon: "⚙" },
    ],
  },
];

interface SidebarProps {
  active: Module;
  onChange: (m: Module) => void;
}

const EXPANDED_W = 228;
const COLLAPSED_W = 56;

export default function Sidebar({ active, onChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? COLLAPSED_W : EXPANDED_W;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
  }, [width]);

  return (
    <aside className="flex flex-col h-full" style={{
      background: "#0C1B33",
      width,
      minWidth: width,
      flexShrink: 0,
      transition: "width 180ms ease, min-width 180ms ease",
      position: "relative",
    }}>
      {/* Logo + collapse toggle */}
      <div
        className="flex items-center"
        style={{
          padding: collapsed ? "18px 0" : "18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10,
          minHeight: 66,
        }}
      >
        <div className="flex items-center gap-2" style={{ minWidth: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ width: 30, height: 30, background: "#1B6CA8", fontFamily: "Outfit", letterSpacing: "0.02em" }}>
            Rx
          </div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
              <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: "#FFFFFF", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>PharmERP</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1, whiteSpace: "nowrap" }}>City Central Pharmacy</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse"
            style={{
              width: 26, height: 26,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            «
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand"
          style={{
            position: "absolute",
            top: 74,
            right: -12,
            width: 22, height: 22,
            borderRadius: "50%",
            background: "#1B6CA8",
            border: "2px solid #0C1B33",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            zIndex: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          ›
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: "0.12em", padding: "10px 20px 4px", textTransform: "uppercase" }}>
                {group.label}
              </div>
            )}
            {collapsed && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 12px 6px" }} />
            )}
            {group.items.map((item) => (
              <NavBtn
                key={item.id}
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                onClick={() => onChange(item.id)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: collapsed ? "14px 0" : "14px 16px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
      }}>
        <div className="flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ width: 32, height: 32, background: "#1B6CA8", borderRadius: 2, fontFamily: "Outfit" }}
          title={collapsed ? "Jane Doe · Head Pharmacist" : undefined}>
          JD
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 500, fontFamily: "Outfit", whiteSpace: "nowrap" }}>Jane Doe</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>Head Pharmacist</div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavBtn({
  item, active, collapsed, onClick,
}: {
  item: NavItem; active: boolean; collapsed: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center text-left"
      title={collapsed ? item.label : undefined}
      style={{
        gap: 12,
        padding: collapsed ? "8px 0" : "7px 20px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? "#1B6CA8" : "transparent",
        color: active ? "#FFFFFF" : "rgba(255,255,255,0.5)",
        fontSize: 12.5, fontFamily: "Inter", fontWeight: active ? 600 : 400,
        border: "none", cursor: "pointer", position: "relative", transition: "background 0.1s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#162544"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        fontSize: 15,
        width: collapsed ? 24 : 18,
        textAlign: "center",
        opacity: active ? 1 : 0.65,
        position: "relative",
      }}>
        {item.icon}
        {collapsed && item.badge != null && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -6,
            background: "#C62828",
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            padding: "0 4px",
            minWidth: 12,
            height: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            fontFamily: "JetBrains Mono",
          }}>
            {item.badge}
          </span>
        )}
      </span>
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
      {!collapsed && item.badge != null && (
        <span style={{ background: active ? "rgba(255,255,255,0.22)" : "#C62828", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, fontFamily: "JetBrains Mono" }}>
          {item.badge}
        </span>
      )}
      {active && <span style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "#00ACC1" }} />}
    </button>
  );
}
