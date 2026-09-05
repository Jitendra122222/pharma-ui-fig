---
name: reports-module
description: Use when editing the Reports & Analytics module — revenue charts, top drugs, or Rx trends.
---

# Reports module

Single file: [Reports.tsx](../../../src/components/Reports.tsx) (~145 lines).

## Layout

- Header: title + period selector dropdown + export button.
- KPI row: `6M Revenue`, `6M Profit`, avg ticket, etc.
- Two-column charts: Revenue trend (BarChart), Category share.
- Table: Top drugs by revenue.
- Line chart: Prescriptions filled/cancelled per month.

## Charts (Recharts)

Uses `BarChart`, `LineChart`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `CartesianGrid`, `Legend` from `recharts`. Chart color palette matches the app palette (`#1B6CA8`, `#00ACC1`, `#2E7D32`, `#E65100`).

## Mock data

- Inline: `monthlyRx`, `topDrugs`.
- From [mockData.ts](../../../src/data/mockData.ts): `salesData`, `categoryData`.

## Common tasks

### Add a new chart
Wrap in `<ResponsiveContainer width="100%" height={280}>`. Chart body uses the palette above. Tick formatter for money: `` (v) => `₹${(v/1000).toFixed(0)}k` `` (matches Dashboard).

### Add a Top-N table row
Extend `topDrugs` array — same shape (`name`, `units`, `revenue`).

## Gotchas

- Currency in tick formatters and tooltip formatters uses ₹.
- Recharts is already a dependency (`recharts: ^3.10.1` in package.json).
- No `dataviz` skill invocation needed for these charts — the palette and conventions are already set.
