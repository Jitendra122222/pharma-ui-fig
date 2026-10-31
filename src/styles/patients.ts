import type React from "react"

export const PT = {
  tableCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
  } as React.CSSProperties,

  rowId: {
    padding: "11px 14px",
    fontSize: 12,
    fontFamily: "JetBrains Mono",
    color: "#1B6CA8",
  } as React.CSSProperties,

  rowName: {
    padding: "11px 14px",
    fontSize: 13,
    color: "#0C1B33",
    fontWeight: 500,
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  rowMono: {
    padding: "11px 14px",
    fontSize: 12,
    fontFamily: "JetBrains Mono",
    color: "#6B7280",
  } as React.CSSProperties,

  rowMuted: {
    padding: "11px 14px",
    fontSize: 12,
    color: "#6B7280",
  } as React.CSSProperties,

  detailCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  } as React.CSSProperties,

  detailName: {
    fontFamily: "Outfit",
    fontSize: 16,
    fontWeight: 700,
    color: "#0C1B33",
  } as React.CSSProperties,

  detailId: {
    fontSize: 12,
    fontFamily: "JetBrains Mono",
    color: "#1B6CA8",
    marginTop: 2,
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 2,
  } as React.CSSProperties,

  fieldValue: {
    fontSize: 13,
    color: "#0C1B33",
    fontWeight: 500,
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  } as React.CSSProperties,
}
