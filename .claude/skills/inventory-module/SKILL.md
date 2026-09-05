---
name: inventory-module
description: Use when editing the Inventory module — the drug catalog list, category filters, or add/import product actions.
---

# Inventory module

Single file: [Inventory.tsx](../../../src/components/Inventory.tsx) (~125 lines).

## Layout

- Header with Import CSV + `+ Add Product` buttons (both non-functional stubs).
- Filter row: search input + category dropdown.
- Table of drugs.

## State

- `search` — matches `name` or `supplier`.
- `filter` — category dropdown: `All | Antibiotics | Antidiabetics | Antihypertensives | Analgesics | Statins | Other`.

## Mock data

`drugs` from [mockData.ts](../../../src/data/mockData.ts). Fields: `id`, `name`, `category`, `supplier`, `stock`, `unit`, `price`, `cost`, `status`, `expiry`, etc.

## Status colors (local `STATUS_STYLE`)

| Status | Bg | Color |
|---|---|---|
| In Stock | `#E8F5E9` | `#2E7D32` |
| Low Stock | `#FFF3E0` | `#E65100` |
| Out of Stock | `#FFEBEE` | `#C62828` |

## Common tasks

### Add a column
Add to the `<thead>` header array and add a matching `<td>` in the row map. Money → `fontFamily: "JetBrains Mono", textAlign: "right"` with `₹` prefix.

### Add pagination
Reuse `usePagination` from Sales.tsx (or extract to a shared helper).

### Add a category
Just extend the `categories` array — filter logic already handles arbitrary values.

## Gotchas

- Currency is `₹`. Price/cost cells were fixed during the earlier $ → ₹ sweep.
- Stock quantities are plain integers, no currency.
- **Related module:** Stock Management ([stock-management-module](../stock-management-module/SKILL.md)) handles batches, adjustments, expiry, and transfers for these same drugs.
