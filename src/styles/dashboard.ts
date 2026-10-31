import type React from "react"
import { S } from "./common"

export const D = {
  // KPI tile
  kpiCard: {
    ...S.card,
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  } as React.CSSProperties,

  kpiValue: {
    fontFamily: "Outfit",
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  kpiSub: {
    fontSize: 12,
    color: "#6B7280",
  } as React.CSSProperties,

  // Chart cards
  chartCard: {
    ...S.card,
  } as React.CSSProperties,

  chartTitle: {
    ...S.sectionTitle,
    marginBottom: 4,
  } as React.CSSProperties,

  chartSubtitle: {
    ...S.mutedText,
    marginBottom: 12,
  } as React.CSSProperties,

  // Chart legend
  legendDot: (color: string): React.CSSProperties => ({
    color,
    fontSize: 12,
  }),

  // Category legend item
  legendItem: {
    fontSize: 11,
    color: "#6B7280",
  } as React.CSSProperties,

  legendDotBox: (color: string): React.CSSProperties => ({
    width: 8,
    height: 8,
    background: color,
    display: "inline-block",
  }),

  // Recent transactions
  txPatient: {
    fontSize: 12,
    color: "#0C1B33",
    fontWeight: 500,
  } as React.CSSProperties,

  txMeta: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "JetBrains Mono",
  } as React.CSSProperties,

  txAmount: {
    fontSize: 13,
    fontFamily: "JetBrains Mono",
    fontWeight: 500,
    color: "#0C1B33",
  } as React.CSSProperties,

  txMethod: {
    fontSize: 10,
    color: "#6B7280",
  } as React.CSSProperties,

  // Tooltip style for all charts
  chartTooltip: {
    borderRadius: 0,
    border: "1px solid #DDE3EC",
    fontSize: 12,
  } as React.CSSProperties,

  chartTooltipSm: {
    borderRadius: 0,
    border: "1px solid #DDE3EC",
    fontSize: 11,
  } as React.CSSProperties,
}
