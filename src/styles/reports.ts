import type React from "react"
import { S } from "./common"

export const RP = {
  kpiCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    padding: "16px 18px",
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  } as React.CSSProperties,

  kpiValue: {
    fontFamily: "Outfit",
    fontSize: 20,
    fontWeight: 700,
    color: "#0C1B33",
    marginBottom: 4,
  } as React.CSSProperties,

  chartCard: {
    ...S.card,
  } as React.CSSProperties,

  chartTitle: {
    ...S.sectionTitle,
    marginBottom: 4,
  } as React.CSSProperties,

  chartSubtitle: {
    ...S.mutedText,
    marginBottom: 16,
  } as React.CSSProperties,

  tableCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
  } as React.CSSProperties,

  tableTitle: {
    padding: "16px 20px",
    borderBottom: "1px solid #DDE3EC",
    fontFamily: "Outfit",
    fontSize: 15,
    fontWeight: 600,
    color: "#0C1B33",
  } as React.CSSProperties,

  thSortable: {
    padding: "8px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderBottom: "1px solid #DDE3EC",
    cursor: "pointer",
    userSelect: "none",
  } as React.CSSProperties,

  drugRank: {
    fontSize: 10,
    fontFamily: "JetBrains Mono",
    color: "#9CA3AF",
    width: 16,
  } as React.CSSProperties,

  drugName: {
    fontSize: 13,
    color: "#0C1B33",
    fontWeight: 500,
  } as React.CSSProperties,

  drugUnits: {
    padding: "11px 16px",
    fontSize: 13,
    fontFamily: "JetBrains Mono",
    color: "#6B7280",
  } as React.CSSProperties,

  drugRevenue: {
    padding: "11px 16px",
    fontSize: 13,
    fontFamily: "JetBrains Mono",
    fontWeight: 600,
    color: "#1B6CA8",
  } as React.CSSProperties,

  categoryName: {
    fontSize: 12,
    color: "#0C1B33",
  } as React.CSSProperties,

  categoryPct: {
    fontFamily: "JetBrains Mono",
    color: "#6B7280",
    fontSize: 12,
  } as React.CSSProperties,

  categoryBarBg: {
    height: 6,
    background: "#F0F3F7",
  } as React.CSSProperties,

  tooltipStyle: {
    borderRadius: 0,
    border: "1px solid #DDE3EC",
    fontSize: 12,
  } as React.CSSProperties,
}
