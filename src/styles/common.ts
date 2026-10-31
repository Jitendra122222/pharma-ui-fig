import type React from "react"

export const S = {
  // Cards
  card: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    padding: "20px 22px",
  } as React.CSSProperties,

  // Table
  tableHeader: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "10px 14px",
    borderBottom: "1px solid #EEF1F6",
  } as React.CSSProperties,

  tableRow: {
    fontSize: 13,
    padding: "10px 14px",
    borderBottom: "1px solid #F0F3F7",
    color: "#0C1B33",
  } as React.CSSProperties,

  // Buttons
  btnPrimary: {
    padding: "8px 16px",
    border: "none",
    borderRadius: 6,
    background: "#1B6CA8",
    fontSize: 13,
    cursor: "pointer",
    color: "#fff",
    fontFamily: "Inter",
    fontWeight: 500,
  } as React.CSSProperties,

  btnSecondary: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#0C1B33",
  } as React.CSSProperties,

  // Inputs
  input: {
    border: "1px solid #DDE3EC",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    color: "#0C1B33",
    outline: "none",
    background: "#fff",
  } as React.CSSProperties,

  // Typography
  pageTitle: {
    fontFamily: "Outfit",
    fontSize: 22,
    fontWeight: 700,
    color: "#0C1B33",
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily: "Outfit",
    fontSize: 15,
    fontWeight: 600,
    color: "#0C1B33",
  } as React.CSSProperties,

  mutedText: {
    fontSize: 12,
    color: "#6B7280",
  } as React.CSSProperties,

  mutedTextSm: {
    fontSize: 11,
    color: "#6B7280",
  } as React.CSSProperties,

  // Monospace (IDs, amounts, dates)
  mono: {
    fontFamily: "JetBrains Mono",
    fontSize: 13,
    color: "#0C1B33",
  } as React.CSSProperties,

  monoSm: {
    fontFamily: "JetBrains Mono",
    fontSize: 11,
    color: "#6B7280",
  } as React.CSSProperties,

  // Alternative page title for the purchases/HR/Accounts dialect (#1A2436)
  pageTitleAlt: {
    fontFamily: "Outfit",
    fontSize: 22,
    fontWeight: 700,
    color: "#1A2436",
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  // Subtitle for modules using the purchases dialect
  subtitleMuted: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 3,
    fontFamily: "Inter",
  } as React.CSSProperties,
}

// Status pill style — extend as needed
export const statusPill = (status: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    Paid:      { background: "#E8F5E9", color: "#2E7D32", border: "1px solid #A5D6A7" },
    Pending:   { background: "#FFF3E0", color: "#E65100" },
    Overdue:   { background: "#FFEBEE", color: "#C62828" },
    Active:    { background: "#EFF6FF", color: "#1B6CA8" },
    Inactive:  { background: "#F0F3F7", color: "#6B7280" },
    Cancelled: { background: "#FFEBEE", color: "#C62828" },
    "Low Stock":     { background: "#FFF3E0", color: "#E65100" },
    "Out of Stock":  { background: "#FFEBEE", color: "#C62828" },
  }
  return {
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Inter",
    ...map[status] ?? {},
  }
}

// Stock alert badge (used in Dashboard + Inventory)
export const stockBadge = (status: string): React.CSSProperties => ({
  fontSize: 11,
  fontFamily: "JetBrains Mono",
  fontWeight: 600,
  padding: "2px 8px",
  color: status === "Out of Stock" ? "#C62828" : "#E65100",
  background: status === "Out of Stock" ? "#FFEBEE" : "#FFF3E0",
})
