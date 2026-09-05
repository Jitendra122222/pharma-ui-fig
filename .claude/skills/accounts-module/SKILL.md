---
name: accounts-module
description: Use when editing the Accounts & Finance module — Chart of Accounts overview, Ledger, Journal, Receivables, or Payables.
---

# Accounts module

Single file: [Accounts.tsx](../../../src/components/Accounts.tsx) (~220 lines).

## Sub-tabs (`SubTab`)

`overview` · `ledger` · `journal` · `receivables` · `payables`

Sub-components:

| Function | Purpose |
|---|---|
| `AccountsOverview()` | KPIs (Total Assets, Liabilities, Net Income) + chart-of-accounts grouped by type |
| `Journal()` | Journal entries table |
| `AgingTable({ data, type })` | Shared component for Receivables and Payables |

`type: "receivable" \| "payable"` toggles headings/labels in `AgingTable`.

Local helper: `Th`.

## Mock data (inline)

`accounts` (chart of accounts), `journalEntries`, `receivables`, `payables`.

## Common tasks

### Add a new account
Push into the `accounts` inline array with `type` = `Asset | Liability | Equity | Revenue | Expense`.

### Add a new aging bucket
Extend the KPI array in the aging view (`Current`, `1-30d`, `31-60d`, `61-90d`, `>90d`).

### Ledger view
The `ledger` tab currently reuses the overview or is a stub — check the switch at the bottom of `Accounts()`.

## Gotchas

- Currency = `₹`. Debit/credit/balance cells use `fontFamily: "JetBrains Mono", textAlign: "right"`.
- `Math.abs(a.balance)` for display when the sign is encoded in the account type.
- Colour: Assets `#1B6CA8`, Liabilities `#E65100`, Net Income `#2E7D32`.
