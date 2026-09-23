import { useEffect, useState } from "react";

type Module = string;

interface NavItem {
  id: Module;
  label: string;
  badge?: number;
}

function NavIcon({ id, size = 18 }: { id: string; size?: number }) {
  const p = {
    width: size, height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "-4 -4 32 32",
    style: { display: "block", flexShrink: 0 },
  };
  switch (id) {
    case "dashboard": return (
      <svg {...p}>
        <path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m0 12h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1m10-4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1m0-8h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1" />
      </svg>
    );
    case "sales": return (
      <svg {...p}>
        <path d="M18 5H7h3a4 4 0 0 1 0 8H7l6 6M7 9h11" />
      </svg>
    );
    case "prescriptions": return (
      <svg {...p}>
        <path d="M6 19V3h4.5a4.5 4.5 0 1 1 0 9H6m13 9-9-9m3 9 6-6" />
      </svg>
    );
    case "patients": return (
      <svg {...p}>
        <path d="M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" />
      </svg>
    );
    case "inventory": return (
      <svg {...p}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zm0 9 8-4.5M12 12v9m0-9L4 7.5m12-2.25-8 4.5" />
      </svg>
    );
    case "stock": return (
      <svg {...p}>
        <path d="M12 4 4 8l8 4 8-4zm-8 8 8 4 8-4M4 16l8 4 8-4" />
      </svg>
    );
    case "shortbook": return (
      <svg {...p}>
        <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2" />
      </svg>
    );
    case "expiry": return (
      <svg {...p}>
        <path d="M20.986 12.502a9 9 0 1 0-5.973 7.98" />
        <path d="M12 7v5l3 3m4 1v3m0 3v.01" />
      </svg>
    );
    case "purchases": return (
      <svg {...p}>
        <path d="M4 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0m11 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
        <path d="M17 17H6V3H4" />
        <path d="m6 5 14 1-1 7H6" />
      </svg>
    );
    case "suppliers": return (
      <svg {...p}>
        <path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
        <path d="M5 17H3v-4M2 5h11v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5M3 9h4" />
      </svg>
    );
    case "accounts": return (
      <svg {...p}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2m5 6h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3H10m2 0v1m0-8v1" />
      </svg>
    );
    case "insurance": return (
      <svg {...p}>
        <path d="M11.46 20.846A12 12 0 0 1 3.5 6 12 12 0 0 0 12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-.09 7.06M15 19l2 2 4-4" />
      </svg>
    );
    case "reports": return (
      <svg {...p}>
        <path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 20h14" />
      </svg>
    );
    case "hr": return (
      <svg {...p}>
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
      </svg>
    );
    case "settings": return (
      <svg {...p}>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
    case "verification": return (
      <svg {...p}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2M8 13l3 3 5-5" />
      </svg>
    );
    case "movement": return (
      <svg {...p}>
        <path d="m16 3 4 4-4 4M10 7h10M8 21l-4-4 4-4M14 17H4" />
      </svg>
    );
    default: return null;
  }
}

const INV_SUBSECTIONS = [
  { id: "stock",        label: "Stock" },
  { id: "shortbook",    label: "Short Book", badge: 8 },
  { id: "verification", label: "Verification" },
  { id: "expiry",       label: "Expiry & Risk", badge: 21 },
  { id: "movement",     label: "Movement & Control" },
  { id: "reports",      label: "Reports" },
];

const navGroups = [
  {
    label: "Core Operations",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "sales", label: "Sales", badge: 2 },
      { id: "prescriptions", label: "Prescriptions", badge: 2 },
      { id: "patients", label: "Patients" },
    ],
  },
  {
    label: "Inventory & Stock",
    items: INV_SUBSECTIONS,
  },
  {
    label: "Purchasing",
    items: [
      { id: "purchases", label: "Purchasing" },
      { id: "suppliers", label: "Distributors" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "accounts", label: "Accounts" },
      { id: "insurance", label: "Insurance & Claims" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "reports", label: "Reports" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "hr", label: "HR & Payroll" },
      { id: "settings", label: "Settings" },
    ],
  },
];

interface SidebarProps {
  active: Module;
  onChange: (m: Module) => void;
  invSection?: string;
  onInvSection?: (s: string) => void;
}

const EXPANDED_W = 228;
const COLLAPSED_W = 56;

export default function Sidebar({ active, onChange, invSection, onInvSection }: SidebarProps) {
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
            {group.label === "Inventory & Stock"
              ? group.items.map(item => (
                  <NavBtn
                    key={item.id}
                    item={item}
                    active={active === "inventory" && invSection === item.id}
                    collapsed={collapsed}
                    onClick={() => { onChange("inventory"); onInvSection?.(item.id); }}
                  />
                ))
              : group.items.map(item => (
                  <NavBtn
                    key={item.id}
                    item={item}
                    active={active === item.id}
                    collapsed={collapsed}
                    onClick={() => onChange(item.id)}
                  />
                ))
            }
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
        gap: 10,
        padding: collapsed ? "8px 0" : "7px 16px 7px 18px",
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
        width: 18, height: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        opacity: active ? 1 : 0.6,
        position: "relative",
      }}>
        <NavIcon id={item.id} size={18} />
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
