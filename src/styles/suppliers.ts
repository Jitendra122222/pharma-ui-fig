import type React from "react"

// Suppliers/Purchases use a slightly different color dialect from Dashboard:
// text primary: #1A2436, border: #E8ECF4, muted text: #9CA3AF

export const SP = {
  // Page title
  pageTitle: {
    fontFamily: "Outfit",
    fontSize: 22,
    fontWeight: 800,
    color: "#0C1B33",
    lineHeight: 1.2,
  } as React.CSSProperties,

  pageSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    fontFamily: "Inter",
  } as React.CSSProperties,

  // KPI strip card (list screen)
  kpiCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    padding: "14px 16px",
  } as React.CSSProperties,

  kpiValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0C1B33",
    fontFamily: "Outfit",
    lineHeight: 1,
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 5,
    fontFamily: "Inter",
    fontWeight: 600,
    letterSpacing: "0.04em",
  } as React.CSSProperties,

  // Table container
  tableCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
  } as React.CSSProperties,

  // Distributor name in table
  distName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1A2436",
    fontFamily: "Inter",
  } as React.CSSProperties,

  distCode: {
    fontSize: 11,
    fontFamily: "JetBrains Mono",
    color: "#1B6CA8",
    marginTop: 2,
  } as React.CSSProperties,

  distType: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
    fontFamily: "Inter",
  } as React.CSSProperties,

  // Contact cell
  contactName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1A2436",
    fontFamily: "Inter",
  } as React.CSSProperties,

  contactMobile: {
    fontSize: 12,
    fontFamily: "JetBrains Mono",
    color: "#6B7280",
    marginTop: 2,
  } as React.CSSProperties,

  // Location cell
  locationCity: {
    fontSize: 13,
    color: "#1A2436",
    fontFamily: "Inter",
    fontWeight: 500,
  } as React.CSSProperties,

  locationState: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
    fontFamily: "Inter",
  } as React.CSSProperties,

  // Table action buttons
  btnView: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    background: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: "#1A2436",
    fontFamily: "Inter",
  } as React.CSSProperties,

  btnEdit: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #1B6CA8",
    background: "#EFF6FF",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: "#1B6CA8",
    fontFamily: "Inter",
  } as React.CSSProperties,

  btnMenu: {
    padding: "4px 7px",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    background: "#fff",
    color: "#6B7280",
    fontSize: 17,
    cursor: "pointer",
    lineHeight: 1,
    fontFamily: "Inter",
  } as React.CSSProperties,

  // Context menu dropdown
  contextMenu: {
    position: "absolute",
    right: 0,
    top: "100%",
    marginTop: 2,
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    zIndex: 50,
    minWidth: 190,
    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  } as React.CSSProperties,

  // Full-screen overlay (Add/Edit distributor)
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

  // Overlay header bar
  overlayHeader: {
    background: "#fff",
    borderBottom: "1px solid #E8ECF4",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  } as React.CSSProperties,

  overlayBody: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
  } as React.CSSProperties,
}
