import type React from "react"

export const SK = {
  pageTitle: {
    fontFamily: "Outfit",
    fontSize: 22,
    fontWeight: 700,
    color: "#1A2436",
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 3,
    fontFamily: "Inter",
  } as React.CSSProperties,

  exportBtn: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#0C1B33",
    fontFamily: "Inter",
  } as React.CSSProperties,

  tabBar: {
    display: "flex",
    borderBottom: "2px solid #EEF1F6",
  } as React.CSSProperties,

  tabBtn: (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: active ? 600 : 400,
    color: active ? "#1B6CA8" : "#6B7280",
    borderBottom: `2px solid ${active ? "#1B6CA8" : "transparent"}`,
    marginBottom: -2,
    whiteSpace: "nowrap",
  }),

  overlay: {
    position: "fixed",
    top: 50,
    left: "var(--sidebar-w, 228px)",
    right: 0,
    bottom: 0,
    zIndex: 50,
    background: "#F0F3F7",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  } as React.CSSProperties,

  overlayHeader: {
    background: "#fff",
    borderBottom: "1px solid #DDE3EC",
    padding: "0 24px",
    height: 52,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
  } as React.CSSProperties,

  breadcrumbParent: {
    fontSize: 12,
    color: "#9CA3AF",
  } as React.CSSProperties,

  breadcrumbCurrent: {
    fontSize: 13,
    color: "#1A2436",
    fontWeight: 700,
  } as React.CSSProperties,

  sectionHeaderCard: {
    background: "#fff",
    border: "1px solid #DDE3EC",
    borderRadius: 8,
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily: "Outfit",
    fontSize: 18,
    fontWeight: 700,
    color: "#0C1B33",
  } as React.CSSProperties,

  overlayBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 24px 20px 24px",
  } as React.CSSProperties,
}
