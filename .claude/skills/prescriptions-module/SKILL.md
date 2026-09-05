---
name: prescriptions-module
description: Use when editing the Prescriptions module — the Rx queue list, prescription detail panel, or dispensing actions.
---

# Prescriptions module

Single file: [Prescriptions.tsx](../../../src/components/Prescriptions.tsx) (~155 lines).

## Layout

- Grid: `1fr` alone, `1fr 380px` when a prescription is selected.
- Left: filterable/searchable table of Rx.
- Right: prescription detail panel with dispensing actions.

## State

- `search` — free-text over `patient` / `id` / `doctor`.
- `statusFilter` — `All | Dispensed | Pending | Partial | Cancelled`.
- `selected` — the row shown in the right panel.

## Mock data

`prescriptions` from [mockData.ts](../../../src/data/mockData.ts). Fields typically: `id`, `patient`, `doctor`, `date`, `items`, `total`, `status`.

## Status colors (local `STATUS_STYLE`)

| Status | Bg | Color |
|---|---|---|
| Dispensed | `#E8F5E9` | `#2E7D32` |
| Pending | `#FFF3E0` | `#E65100` |
| Partial | `#E3F2FD` | `#1B6CA8` |
| Cancelled | `#F5F5F5` | `#9E9E9E` |

## Common tasks

### Add a new status
Extend `STATUS_STYLE` map — no separate Pill component to touch.

### Add pagination
Import `usePagination` / `PaginationFooter` from [Sales.tsx](../../../src/components/Sales.tsx). Better: move them to a shared file if you're doing this across multiple modules.

### Wire dispense action
Currently the detail panel has action buttons but no persistence. Extend `selected` handling to update mock data (or lift state up if you add a backend).

## Gotchas

- **Rx symbol:** `℞` U+211E used in headers and icons. Don't swap for `Rx` — the codebase uses the Unicode glyph.
- Currency in totals: `₹`.
