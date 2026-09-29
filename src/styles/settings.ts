import type React from "react"

export const ST = {
  sideNav: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    padding: "8px 0",
    height: "fit-content",
  } as React.CSSProperties,

  navBtn: (active: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 18px",
    textAlign: "left",
    border: "none",
    background: active ? "#EFF6FF" : "transparent",
    color: active ? "#1B6CA8" : "#6B7280",
    fontSize: 13,
    fontFamily: "Inter",
    cursor: "pointer",
    borderLeft: active ? "2px solid #1B6CA8" : "2px solid transparent",
    fontWeight: active ? 500 : 400,
  }),

  contentCard: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    padding: 24,
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily: "Outfit",
    fontSize: 16,
    fontWeight: 600,
    color: "#0C1B33",
    marginBottom: 16,
  } as React.CSSProperties,

  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 20,
  } as React.CSSProperties,

  formLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 5,
  } as React.CSSProperties,

  formInput: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    fontSize: 13,
    outline: "none",
    fontFamily: "Inter",
    boxSizing: "border-box",
  } as React.CSSProperties,

  prefRow: {
    padding: "12px 16px",
    background: "#F8FAFC",
  } as React.CSSProperties,

  prefLabel: {
    fontSize: 13,
    color: "#0C1B33",
  } as React.CSSProperties,

  divider: {
    borderTop: "1px solid #DDE3EC",
    paddingTop: 20,
  } as React.CSSProperties,

  saveBar: {
    borderTop: "1px solid #DDE3EC",
    paddingTop: 20,
  } as React.CSSProperties,

  tdName: {
    padding: "11px 14px",
    fontSize: 13,
    color: "#0C1B33",
    fontWeight: 500,
  } as React.CSSProperties,

  tdMuted: {
    padding: "11px 14px",
    fontSize: 12,
    color: "#6B7280",
  } as React.CSSProperties,

  tdEdit: {
    padding: "11px 14px",
    fontSize: 12,
    color: "#1B6CA8",
    cursor: "pointer",
  } as React.CSSProperties,

  printerToggleRow: {
    padding: "14px 16px",
    background: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #EEF1F6",
  } as React.CSSProperties,

  printerToggleTitle: {
    fontSize: 13,
    color: "#0C1B33",
    fontWeight: 500,
  } as React.CSSProperties,

  printerToggleSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  } as React.CSSProperties,

  statusBox: {
    padding: "12px 16px",
    borderRadius: 6,
    border: "1px solid #DDE3EC",
    background: "#fff",
    marginBottom: 20,
  } as React.CSSProperties,

  statusBoxLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 10,
  } as React.CSSProperties,
}
