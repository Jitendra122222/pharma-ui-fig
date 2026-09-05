---
name: stock-management-module
description: Use when editing the Stock Management module — Stock Overview, Adjustments, Batch Tracking, Expiry Management, or Stock Transfer.
---

# Stock Management module

Single file: [StockManagement.tsx](../../../src/components/StockManagement.tsx) (~410 lines).

## Sub-tabs (`SubTab`)

`overview` · `adjustments` · `batches` · `expiry` · `transfer`

Each has its own function component:

| Function | Purpose |
|---|---|
| `StockOverview()` | KPI tiles + drug stock levels table with search |
| `Adjustments()` | Recent stock adjustments (positive/negative), reason codes |
| `BatchTracking()` | Batch list with mfg/expiry dates |
| `ExpiryManagement()` | Near-expiry alerts, sorted by days-to-expiry |
| `StockTransfer()` | Inter-branch transfer requests |

Top-level `StockManagement()` renders the tab bar + switch.

## Local helpers in this file

- `Pill({ label, bg, color })` — plain pill, callers pass colors.
- `Th({ children })` — table header cell.

## Mock data

`drugs` from [mockData.ts](../../../src/data/mockData.ts). Batches, adjustments, transfers are computed / inline in the file.

## Common tasks

### Add a new sub-tab
1. Extend `SubTab` union (line 4).
2. Add entry to `TABS` array (line 6).
3. Write function component, render it from the switch at the bottom of `StockManagement()`.

### Colour cues for stock levels
- Low stock rows: red text `#C62828` or warning `#E65100`.
- OK: neutral text.
- Days-to-expiry: reuse the traffic-light scheme (`< 30` red, `< 90` amber, `> 90` green).

## Gotchas

- `Pill` here takes explicit `bg` and `color` (unlike Sales's status-driven `Pill`). Don't accidentally import Sales's version — they're incompatible.
- Currency (unit cost, batch value) uses `₹`.
- **Related:** Inventory ([inventory-module](../inventory-module/SKILL.md)) is the catalog view; Stock Management is the operational movement view of the same drugs.
