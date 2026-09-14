import { useState } from "react";

type ColTooltip = { formula: string; example?: string };

export function Th({
  children, right, center, sortDir, onSort, tooltip,
}: {
  children?: React.ReactNode;
  right?: boolean;
  center?: boolean;
  sortDir?: "asc" | "desc" | null;
  onSort?: () => void;
  tooltip?: ColTooltip;
}) {
  const [showTip, setShowTip] = useState(false);
  const align = right ? "right" : center ? "center" : "left";
  return (
    <th
      onClick={onSort}
      style={{
        padding: "9px 10px",
        textAlign: align,
        fontSize: 10,
        fontWeight: 700,
        color: "#9CA3AF",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "#F8FAFC",
        borderBottom: "1px solid #E8ECF4",
        whiteSpace: "nowrap",
        position: "sticky",
        top: 0,
        zIndex: 2,
        cursor: onSort ? "pointer" : "default",
        userSelect: onSort ? "none" : "auto",
      }}
    >
      {onSort ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, lineHeight: 1 }}>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }}
              fill={sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}>
              <path d="M3 0L6 4H0L3 0Z" />
            </svg>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }}
              fill={sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}>
              <path d="M3 4L0 0H6L3 4Z" />
            </svg>
          </span>
        </span>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          {tooltip && (
            <span
              style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
            >
              {/* Info icon */}
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 14, height: 14, borderRadius: "50%",
                background: showTip ? "#1B6CA8" : "#DDE3EC",
                color: showTip ? "#fff" : "#6B7280",
                fontSize: 8, fontWeight: 800, fontFamily: "Inter",
                cursor: "help", lineHeight: 1, flexShrink: 0,
                textTransform: "none", letterSpacing: 0,
              }}>i</span>

              {showTip && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: right ? 0 : undefined,
                  left: right ? undefined : 0,
                  width: 270,
                  background: "#fff",
                  border: "1px solid #E8ECF4",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.13)",
                  zIndex: 500,
                  padding: "12px 14px",
                  textAlign: "left",
                  letterSpacing: 0,
                  textTransform: "none",
                  fontWeight: 400,
                  whiteSpace: "normal",
                  pointerEvents: "none",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", marginBottom: 5, letterSpacing: "0.07em", textTransform: "uppercase" }}>Formula</div>
                  <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", lineHeight: 1.65 }}>{tooltip.formula}</div>
                  {tooltip.example && (
                    <>
                      <div style={{ borderTop: "1px solid #EEF1F6", margin: "8px 0 6px" }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", marginBottom: 4, letterSpacing: "0.07em", textTransform: "uppercase" }}>Example</div>
                      <div style={{ fontSize: 11, fontFamily: "Inter", color: "#6B7280", lineHeight: 1.65 }}>{tooltip.example}</div>
                    </>
                  )}
                </div>
              )}
            </span>
          )}
        </span>
      )}
    </th>
  );
}
