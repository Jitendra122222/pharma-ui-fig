import type React from "react"

export const PU = {
  pageTitle: {
    fontFamily: "Outfit",
    fontSize: 18,
    fontWeight: 700,
    color: "#1A2436",
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  tabContainer: {
    display: "flex",
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    flexShrink: 0,
  } as React.CSSProperties,

  tabBtn: (active: boolean, hasRight: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "14px 16px",
    border: "none",
    borderBottom: active ? "2px solid #1B6CA8" : "2px solid transparent",
    background: active ? "#F0F6FF" : "transparent",
    borderRight: hasRight ? "1px solid #EEF1F6" : undefined,
    cursor: "pointer",
    textAlign: "left",
  }),

  tabLabel: (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? "#1B6CA8" : "#6B7280",
    fontFamily: "Inter",
  }),

  tabSub: (active: boolean): React.CSSProperties => ({
    fontSize: 11,
    color: active ? "#5AA0D6" : "#C8CDD8",
    marginTop: 2,
    fontFamily: "Inter",
  }),

  backBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,

  statTile: {
    flex: 1,
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    padding: "10px 14px",
    minWidth: 0,
  } as React.CSSProperties,

  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#9CA3AF",
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    fontFamily: "Inter",
  } as React.CSSProperties,
}
