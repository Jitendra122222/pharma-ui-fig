import type React from "react"

export const SK = {
  // ── Page chrome ────────────────────────────────────────────────────────────
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

  // ── Search input ───────────────────────────────────────────────────────────
  // Flex-wrapper pattern: put this on the outer div, searchInput on the <input>
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#F8FAFC",
    borderRadius: 6,
    border: "1px solid #E8ECF4",
    padding: "9px 12px",
    flex: "0 0 260px",
    minHeight: 40,
    boxSizing: "border-box",
  } as React.CSSProperties,

  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: "#0C1B33",
    fontFamily: "Inter",
    width: "100%",
  } as React.CSSProperties,

  // ── Buttons ─────────────────────────────────────────────────────────────────
  btnPrimary: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#1B6CA8",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  btnSecondary: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    background: "#fff",
    color: "#1A2436",
    fontSize: 13,
    fontWeight: 400,
    cursor: "pointer",
    fontFamily: "Inter",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  btnDanger: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#C62828",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  // ── Filter pills ───────────────────────────────────────────────────────────
  filterPill: (active: boolean): React.CSSProperties => ({
    padding: "5px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    border: active ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC",
    background: active ? "#EFF6FF" : "#fff",
    color: active ? "#1B6CA8" : "#6B7280",
  }),

  // ── Table primitives ───────────────────────────────────────────────────────
  theadTr: {
    background: "#FAFBFD",
  } as React.CSSProperties,

  th: {
    padding: "8px 14px",
    fontSize: 10,
    fontWeight: 700,
    color: "#9CA3AF",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: "1px solid #EEF1F6",
    textAlign: "left",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  // Primary data rows
  td: {
    padding: "11px 14px",
  } as React.CSSProperties,

  // Nested / secondary table rows (step sub-tables, etc.)
  tdSm: {
    padding: "9px 12px",
  } as React.CSSProperties,

  // ── Card primitives ────────────────────────────────────────────────────────
  card: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    overflow: "hidden",
  } as React.CSSProperties,

  cardHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #EEF1F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as React.CSSProperties,

  cardHeaderTitle: {
    fontFamily: "Outfit",
    fontSize: 13,
    fontWeight: 700,
    color: "#1A2436",
  } as React.CSSProperties,

  cardHeaderSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
    fontFamily: "Inter",
  } as React.CSSProperties,

  // ── Toolbar (card top bar with search + actions) ───────────────────────────
  toolbar: {
    padding: "10px 14px",
    borderBottom: "1px solid #EEF1F6",
    display: "flex",
    gap: 8,
    alignItems: "center",
  } as React.CSSProperties,

  // ── KPI tile ──────────────────────────────────────────────────────────────
  kpiTile: {
    background: "#fff",
    border: "1px solid #DDE3EC",
    borderRadius: 6,
    padding: "14px 18px",
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Inter",
  } as React.CSSProperties,

  kpiValue: (color: string): React.CSSProperties => ({
    fontFamily: "JetBrains Mono",
    fontSize: 26,
    fontWeight: 800,
    color,
  }),

  // ── Full-screen overlay (Adjustments) ─────────────────────────────────────
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
