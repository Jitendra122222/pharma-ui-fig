---
name: insurance-module
description: Use when editing the Insurance & Claims module — Claims list, Submit Claim form, Providers list, or Eligibility check.
---

# Insurance module

Single file: [Insurance.tsx](../../../src/components/Insurance.tsx) (~312 lines).

## Sub-tabs (`SubTab`)

`claims` · `submit` · `providers` · `eligibility`

Sub-components:

| Function | Purpose |
|---|---|
| `Claims()` | List of insurance claims with status and reimbursement amount |
| `SubmitClaim()` | Form to submit a new claim (patient, provider, NDC, drug, quantity, days supply, DAW code, prices) |
| `Providers()` | List of insurance providers (aetna, blue cross, etc.) with copay/deductible |
| `Eligibility()` | Real-time eligibility check UI with member info + coverage details |

Local helpers: `Th`, `Pill({ label, color, bg })`.

## Mock data (inline)

`claims`, `providers`, plus form-scoped defaults inside `SubmitClaim`.

## Common tasks

### Add a claim status
Extend the local `Pill` calls (this file's `Pill` takes explicit colors, unlike Sales's status-driven one).

### Add a form field to Submit Claim
Inline inside `SubmitClaim()` — the whole form is one function. Follow the existing field pattern: label + input in a grid cell.

### NDC display
NDC codes appear in JetBrains Mono, e.g. `0093-0058-01`.

## Gotchas

- Currency: `₹`. The Providers copay/deductible strings were fixed during the $ → ₹ sweep.
- Local `Pill` signature differs from Sales's `Pill` — don't cross-import.
- Eligibility uses static mock data for coverage details.
