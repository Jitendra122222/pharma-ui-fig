---
name: patients-module
description: Use when editing the Patients module — the patient list, patient detail panel, or the shared 4-step Add Patient drawer.
---

# Patients module

Two files:

- [Patients.tsx](../../../src/components/Patients.tsx) — list + detail panel + Add Patient button
- [AddPatientDrawer.tsx](../../../src/components/AddPatientDrawer.tsx) — the shared multi-step drawer, also used by Sales → New Invoice → PatientSearch → "+ Add Patient"

## Layout

`Patients()`:
- Grid with dynamic columns: `1fr` when nothing selected, `1fr 360px` when a row is selected.
- Left: table of patients (columns: `Patient ID`, `Name`, `DOB`, `Gender`, `Blood Group`, `Phone`, `Allergies`, `Last Visit`, `Rx`, `Balance`).
- Right: detail card showing DOB, blood group, contact, allergies, outstanding balance, and quick-action buttons (Rx History, New Prescription).

Search box filters by name / id / phone.

## Add Patient drawer

Structure of [AddPatientDrawer.tsx](../../../src/components/AddPatientDrawer.tsx):

- Right-side aside, ~66vw (max 1000px), backdrop click / `Escape` closes.
- `zIndex`: 100 backdrop, 101 aside.
- 4 steps:
  1. **Identity** — Personal (name, DOB, gender, ref ID) + Government ID (Aadhaar / PAN / etc.)
  2. **Contact** — Mobile (with `+91` phone input + Verified pill), Alternate mobile, Email, WhatsApp/SMS/Email consent toggles, Address (line, apartment, landmark, city, state, PIN, country)
  3. **Account** — Branch, Assigned pharmacist, Source, Category, Verified date/by, Billing name, GSTIN, Price list, Credit limit, Payment terms, Tax-exempt toggle, Loyalty enrollment/ID, Account remarks, Credit policy notice
  4. **Safety & Review** — Allergies, Chronic conditions, Current medications, Preferred doctor, Emergency contact, Health notes consent, Documents upload, three summary cards, Audit trail preview, Review summary
- Footer: `Back` / `Save Draft` / `Next: <StepName>` (last step is `Create Patient`). Progress bar `Step X of 4`.

## Reusable atoms inside AddPatientDrawer

`SectionHeader`, `Row({ cols, children })`, `Field`, `Input`, `Select`, `PhoneInput`, `Textarea`, `ToggleField`, `InfoNote`, `StatusBanner`, `SummaryCard`, `Stepper`, `DrawerHeader`, `DrawerFooter`.

**These are private to the drawer.** Copy them (don't import) if you need a similar drawer elsewhere. This drawer is the reference template for future multi-step drawers.

## Common tasks

### Add a new field to a step
1. Add to the `PatientFormData` type and to `initialData`.
2. Add a `<Field>` in the step's JSX. Wire `value={data.xxx}` and `onChange={(v) => update("xxx", v)}`.

### Add a new step
1. Change `Step` type to `1 | 2 | 3 | 4 | 5`.
2. Extend `STEPS` array.
3. Write `StepFive({ data, update }: StepProps)` and add `{step === 5 && <StepFive ... />}`.
4. Update `goNext` for the new last-step check.
5. Update the `nextLabel` computation in `DrawerFooter`.

### Open the drawer from a new place
```tsx
const [open, setOpen] = useState(false);
<AddPatientDrawer open={open} onClose={() => setOpen(false)} onCreate={(data) => { /* ... */ }} />
```

## Gotchas

- **The drawer is shared.** Don't duplicate it for Sales — it's imported there already ([Sales.tsx PatientSearch](../../../src/components/Sales.tsx)).
- **Currency in preview:** the drawer's Review Summary uses `₹`, not `$`.
- **`onCreate` is optional.** If you don't pass it, the drawer just closes on Create Patient. Wire it if you need to persist / propagate the data.
- **`useEffect` reset on open:** re-mounting sets step back to 1. Form data is not reset unless the drawer unmounts.
