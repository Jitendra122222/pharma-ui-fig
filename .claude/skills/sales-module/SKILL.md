---
name: sales-module
description: Use when editing the Sales module — Sales Invoices list, Counter Sales, Sales Returns, Sales Payments, or the full-screen New Invoice flow. Also covers the shared InvoiceSummaryFooter and PatientSearch used across Sales.
---

# Sales module

Everything in this module lives in one file: [Sales.tsx](../../../src/components/Sales.tsx) (~1300 lines). Sub-tab types (`Tab`, `View`, `Alloc`) are at the top.

## Layout

`export default Sales()` — page shell with 4 tabs. `view: "list" | "new-invoice"` switches between the tab list and the full-screen NewInvoice overlay.

- **Tabs (`Tab`):** `invoices` · `counter` · `returns` · `payments`
- The Sales page wrapper is `flex: 1, minHeight: 0` — it fills `<main>` (which is flex-column). Header row + tab bar are `flexShrink: 0`; the tab content div is `flex: 1, minHeight: 0`.
- Counter Sales specifically wraps in `flex: 1, minHeight: 0, display: flex, flexDirection: column, overflow: hidden` — its own line items area then scrolls internally.

## Mock data (inline in Sales.tsx)

- `MEDICINES` — drug catalog with batches (id, qty, packs, mfgDate, expDate, mrp, saleRate). New Invoice looks up batch/mrp/saleRate from here when a medicine is chosen.
- `salesInvoices`, `patientInvoiceHistory`, `patientPrevItems`, `salesReturns`, `salesPayments`.
- Patient list comes from `patients` in [mockData.ts](../../../src/data/mockData.ts).

## Reusable helpers in this file (use these, don't reinvent)

| Helper | Purpose |
|---|---|
| `Pill` + `STATUS_PILL` map | Status chips (`Paid`, `Partial`, `Unpaid`, `Cancelled`, `Posted`, `Draft`, `Cleared`). Extend the map to add a new status. |
| `Th` | Table header cell. |
| `usePagination(rows, initialPageSize=10)` | Returns `{ pageRows, footerProps }`. |
| `<PaginationFooter {...footerProps} />` | Bottom-of-table pager, `5/10/25/50` rows-per-page. |
| `PatientSearch` | Autocomplete dropdown for patients. Bottom row is `+ Add Patient` which opens `AddPatientDrawer`. |
| `LineItemsTable` | The shared line-items grid, used by both New Invoice and Counter Sales. Supports optional checkbox column. |
| `InvoiceSummaryFooter` | Bottom-of-invoice bar. Editable chips: `cashDiscount`, `adjustment`. Read chips: Subtotal, Item Discount, GST / Tax, Round Off, Total, Paid, Balance. Total formula: `subtotal − discount − cashDiscount + tax + roundOff + adjustment`. |
| `EditableChip` | Numeric input chip in the footer. |

## New Invoice flow

`NewInvoice({ onBack, preloadItems? })`:

- Full-screen overlay: `position: fixed, top: 50, left: var(--sidebar-w, 228px), right: 0, bottom: 0, zIndex: 50`.
- `preloadItems: { name, qty, packs }[]` seeds the line items array on mount by looking up batches from `MEDICINES`.
- Notes textarea sits **above** the InvoiceSummaryFooter, not inside it. Don't move it back into the footer.
- Save Draft → success screen; Post Invoice → success screen; both reachable via `saved` state.

## Counter Sales → New Invoice

`CounterSales({ onGenerate })` — no local `generated` success screen. Clicking `Generate Invoice (N)` calls `onGenerate(selected)`. The parent `Sales` stashes items in `preloadItems` state and switches `view` to `"new-invoice"`. `NewInvoice`'s `onBack` clears preload so the next New Invoice starts empty.

## Common tasks

### Add a new column to the invoice list
1. Add header string to the `["Invoice #", ...]` array in `InvoiceList`.
2. Add `<td>` in the row map. Use `fontFamily: "JetBrains Mono"` for numeric columns, `textAlign: "right"` for money.

### Add a new filter to Sales Invoices / Returns / Payments
State goes in the component (`useState`). Filter is applied before `usePagination(filtered, 10)` so pages respect filters.

### Add a new field to the invoice summary
Add to the `readChips` array in `InvoiceSummaryFooter`. For editable, follow the `EditableChip` pattern for Cash Discount / Adjustment and thread props through `NewInvoice` + `CounterSales` state.

### Extend LineItemsTable
It's shared — every change hits both flows. Test both.

## Gotchas

- **Currency is ₹.** Never `$` in this file (or anywhere).
- **Don't hardcode `left: 228`** on the New Invoice overlay — always `var(--sidebar-w, 228px)` because the sidebar collapses.
- **`nextId.current`** starts at 1 for NewInvoice (was 2 originally — kept as 1 for clean IDs when preloading). Don't revert.
- The `preloadItems` param is `{ name, qty, packs }[]` — not full `LineItem`. Hydration to LineItem happens inside `NewInvoice`.
- `Counter Sales` uses `LineItemsTable` with `showCheckbox` — checked rows go into `filledItems.filter(i => checked[i.id])`.
