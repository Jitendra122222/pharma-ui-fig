---
name: suppliers-module
description: Use when editing the Suppliers module — the supplier list, supplier detail panel, or add-supplier action.
---

# Suppliers module

Single file: [Suppliers.tsx](../../../src/components/Suppliers.tsx) (~98 lines). Smallest module.

## Layout

- Grid: `1fr` alone, `1fr 340px` when a supplier is selected.
- Left: table (columns: `Supplier ID`, `Name`, `Contact`, `Products`, `Last Order`, `Balance`, `Rating`).
- Right: supplier detail card with outstanding balance emphasized in red if positive.

## State

- `selected` — currently opened supplier.

## Mock data

`suppliers` from [mockData.ts](../../../src/data/mockData.ts). Fields typically: `id`, `name`, `contact`, `phone`, `email`, `products`, `lastOrder`, `balance`, `rating`.

## Common tasks

### Add pagination
Import `usePagination` / `PaginationFooter` from Sales.tsx.

### Wire the Add Supplier button
Currently unwired. Follow the Add Patient drawer pattern from [patients-module](../patients-module/SKILL.md) if a multi-step form is needed.

## Gotchas

- Balance in mock data may be negative (supplier owes us) — the panel shows `₹Math.abs(...)` and colors positive amounts red.
- **Related:** Purchases ([purchases-module](../purchases-module/SKILL.md)) uses this same `suppliers` list for POs and invoices.
