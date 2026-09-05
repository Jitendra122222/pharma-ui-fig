---
name: hr-module
description: Use when editing the HR & Payroll module — Staff Directory, Attendance, Payroll, or Leave management.
---

# HR module

Single file: [HR.tsx](../../../src/components/HR.tsx) (~350 lines).

## Sub-tabs (`SubTab`)

`staff` · `attendance` · `payroll` · `leave`

Sub-components:

| Function | Purpose |
|---|---|
| `StaffDirectory()` | Staff list + KPI tiles (Active, On Leave, Monthly Payroll) |
| `Attendance()` | Daily attendance grid (present/absent/late per employee) |
| `Payroll()` | Salary breakdown table with gross/deductions/net + totals row |
| `Leave()` | Leave requests with type / dates / status |

Local helpers: `Th`, `Pill({ label, color, bg })`.

## Mock data (inline)

`staff` array — each employee has `salary`, `status: "Active" | "On Leave" | "Inactive"`, etc. Attendance/leave/payroll data derived or inline per component.

## Common tasks

### Add a staff role / department
Update the `staff` mock array. Filter dropdowns re-derive their options from the array.

### Add a deduction column to Payroll
Payroll table has a totals row at the bottom (`totalGross`, `totalNet`). Compute the new deduction and add it to the total.

### Add a leave type
Extend the color map used in `Leave()` for the new type's `Pill`.

## Gotchas

- Currency = `₹`. Salary/gross/net cells all fixed during $ → ₹ sweep. `.toLocaleString()` (no decimals) is used for larger amounts, `.toFixed(2)` for smaller.
- Local `Pill` here has `{ label, color, bg }` signature — same as Insurance / StockManagement, different from Sales.
- Payroll totals row lives inside the same `<tbody>` — style with `borderTop: "2px solid ..."` and bold font.
