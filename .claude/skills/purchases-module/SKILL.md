---
name: purchases-module
description: Use when editing the Purchases module — Purchase Orders, Goods Receipt Notes (GRN), Purchase Invoices, Invoice Entry, Purchase Returns, or Purchase Payments.
---

# Purchases module

Single file: [Purchases.tsx](../../../src/components/Purchases.tsx) (~800 lines). This module is the largest after Sales and has its own local UI primitive library at the top.

## Layout

`export default Purchases()` — 6-tab layout.

**Sub-tabs (`SubTab`):** `orders` · `grn` · `entry` · `invoices` · `returns` · `payments`

- Tab bar renders as a horizontal segmented control with dividers (`borderRight: 1px solid #EEF1F6` between tabs).
- Sales-style top KPI row with `KpiCard` (see helpers below).

## Mock data (inline in Purchases.tsx)

`purchaseOrders`, `grns`, `purchaseInvoices`, `purchaseReturns`, `purchasePayments`. Supplier list comes from `suppliers` in mockData.ts. Drug list comes from `drugs`.

## Reusable helpers in THIS file (use these — don't reinvent)

| Helper | Purpose |
|---|---|
| `Pill({ status })` | Status chip. `STATUS_PILL` map local to the file. |
| `Th`, `Td` | Table cells. `Td` has `mono`, `right`, `bold`, `color` props. |
| `TableRow` | `<tr>` with hover state built in. |
| `KpiCard({ label, value, sub, color })` | Top-of-tab KPI tile. |
| `FieldLabel`, `Input`, `Select` | Form fields for Invoice Entry. |
| `SectionHeader({ title, action })` | Section divider inside a page. |
| `PrimaryBtn`, `GhostBtn` | Buttons. `PrimaryBtn` supports `small` prop. |
| `Modal({ title, onClose, children, width=520 })` | Overlay dialog for confirmations / detail views. |

## Common tasks

### Add a row to a Purchase Invoice
The Invoice Entry tab (`entry`) has a form-based add flow. Extend `newEmptyRow(id)`-style helper if present, or add columns to the entry table.

### Wire a new status to Pill
Update the local `STATUS_PILL` map — don't create a second Pill component.

### Add a new tab
1. Extend `SubTab` union at line 6.
2. Add entry to `TABS` array.
3. Add a new function component (`function NewTab() { ... }`) and render it from the switch at the bottom of `Purchases()`.

## Gotchas

- **`Td` currency:** pass `mono right` and render as `` `₹${n.toFixed(2)}` `` — the earlier codebase had `$` here; if you see any, replace with `₹`.
- **Modal `zIndex`:** typical value 100+. Layer above pagination but below sidebar tooltips.
- **New Invoice-style overlay** — Purchases doesn't have a full-screen overlay flow (unlike Sales). Everything happens in-tab.
- Purchase Invoice Entry (`entry` tab) is the closest analog to Sales's New Invoice but stays inline — don't refactor it into a fixed overlay.
