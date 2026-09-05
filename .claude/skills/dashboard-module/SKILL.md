---
name: dashboard-module
description: Use when editing the Dashboard module — top KPI tiles, revenue chart, category pie, or recent transactions list.
---

# Dashboard module

Single file: [Dashboard.tsx](../../../src/components/Dashboard.tsx) (~170 lines).

## Layout

- Header: title + `Export Report` + `New Sale` buttons.
- 4-column KPI row: Today's Revenue, Rx Filled, Low Stock, Patients.
- Two-column: Sales trend (AreaChart) + Categories (PieChart).
- Recent transactions list + Low stock alerts.

## Charts (Recharts)

`AreaChart`, `BarChart`, `PieChart`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`. `Cell` for pie slices.

## Palette

- `PIE_COLORS = ["#1B6CA8", "#00ACC1", "#2E7D32", "#E65100", "#7B1FA2", "#37474F"]`
- Y-axis tick formatter: `` (v) => `₹${(v/1000).toFixed(0)}k` ``.
- Tooltip formatter: `` (v: number) => [`₹${v.toLocaleString()}`, ""] ``.

## `KPI` helper

Local component:

```tsx
<KPI label="Today's Revenue" value="₹4,182" sub="↑ 8.4% vs yesterday" color="#1B6CA8" />
```

## Mock data

From [mockData.ts](../../../src/data/mockData.ts): `salesData`, `categoryData`, `recentTransactions`, `dailySalesData`, `drugs` (for low stock).

## Common tasks

### Add a KPI tile
Add another `<KPI ... />` inside the KPI row and switch the grid to `grid-cols-5`. Keep tile colors from the palette.

### Change the chart period
Wire a period-selector state that filters `salesData` / `dailySalesData`.

## Gotchas

- Currency: `₹`. Recent transactions and KPIs all fixed during $ → ₹ sweep.
- Dashboard uses larger KPI value size (`fontSize: 28`, `Outfit`, `700`) than other modules — keep this hierarchy consistent.
