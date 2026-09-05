# Medicine Name Mapping — Implementation Plan

## Top-Level Overview

When a purchase invoice is imported (CSV / PDF / image), each line item's medicine
name is classified against the system drug master using a 3-layer algorithm
(exact → brand alias → Jaccard word-overlap). The goal of this plan is to:

1. **Add Levenshtein (edit-distance) matching** so that near-identical names that
   differ only by a typo or OCR error (`Dolo 650` → `Doolo 650`,
   `Amlodipine 5mg` → `Amlodippine 5mg`) are correctly classified as fuzzy
   instead of falling through to unmatched.

2. **Wire the Map Modal** — `MedicineMapModal` is defined but never rendered.
   Clicking "Map →" in the line items table currently sets `mappingItemId` state
   but nothing opens. The modal must be mounted and the item updated on confirm.

3. **Enhance the Map Modal search** so the pharmacist can find the right system
   medicine using multiple search dimensions: medicine name, composition/generic
   name, dosage strength, and pack/unit — derived from the drug master records.

4. **Handle the "Create New Medicine" path** from the Map Modal — opening the
   `AddMedicineDrawer` pre-filled with the imported name, and resolving the line
   item when the drawer saves.

All changes are confined to `src/components/Purchases.tsx`.

---

## Sub-Tasks

---

### Sub-Task 1 — Add Levenshtein Layer to `classifyImportedLine`

**Status:** `[ ] pending`

**Intent**
The current classification misses typo and OCR variants where a single token
differs by 1–2 characters (e.g. `dolo` vs `doolo`, `amlodipine` vs
`amlodippine`). A character-level edit-distance layer inserted between the
brand-alias lookup and the Jaccard fallback will catch these cases and surface
the correct system name as a fuzzy suggestion rather than "unmatched".

**Expected Outcomes**
- `classifyImportedLine("Doolo 650")` returns `{ status: "fuzzy", systemName: "Paracetamol 500mg" }` via Layer 2 alias (dolo token still matches after tolerance check) OR via Layer 2.5 if the token itself near-matches a drug token.
- `classifyImportedLine("Amlodippine 5mg")` returns `{ status: "fuzzy", systemName: "Amlodipine 5mg" }` — previously would have returned unmatched.
- `classifyImportedLine("Metfromin 500mg")` (transposition) returns fuzzy with correct suggestion.
- Exact matches still return `"matched"` (no regression).
- Brand alias matches still return `"fuzzy"` (no regression).

**Todo List**
1. Add `levenshtein(a: string, b: string): number` function directly after
   `wordOverlapScore` (~line 134). Standard 1-row DP implementation. Add a
   cheap early-exit: if `Math.abs(a.length - b.length) > 3` return that
   difference immediately (avoids full DP on clearly different lengths).
2. Add `fuzzyTokenScore(query: string, target: string): number` function after
   `levenshtein`. For each token in `query`, check if any token in `target`
   is within edit distance `Math.max(1, Math.ceil(token.length * 0.25))`.
   Return `matchedTokenCount / queryTokenCount`.
3. In `classifyImportedLine`, add **Layer 2.5** between the brand-alias block
   and the Jaccard block: iterate `drugs`, compute `fuzzyTokenScore` for each,
   track best score. If best score ≥ 0.6 return `{ status: "fuzzy", systemName: bestName }`.
4. Leave Layer 1 (exact), Layer 2 (alias), and Layer 3 (Jaccard) unchanged.

**Relevant Context**
- `tokenise()` — line 122. Splits on non-alphanumeric, returns lowercase tokens.
- `wordOverlapScore()` — line 127. Jaccard on whole tokens (exact token equality).
- `classifyImportedLine()` — lines 138–171. The 3-layer classifier to extend.
- `BRAND_ALIASES` — lines 53–86. 34 keyword → system name entries.
- Layer 3 threshold is `>= 0.3` on Jaccard. New Layer 2.5 threshold is `>= 0.6`
  on fuzzy token score (stricter, to avoid false positives on short names).

---

### Sub-Task 2 — Wire `MedicineMapModal` and "Accept" shortcut in `NewPurchaseInvoice`

**Status:** `[ ] pending`

**Intent**
The `MedicineMapModal` component is fully defined (lines 2143–2243) but is never
rendered. The state `mappingItemId` is set when the user clicks "Map →" on a
row, but nothing responds to it. This sub-task mounts the modal, handles the
"select system name" confirm action, and — for fuzzy rows where the auto-suggestion
is clearly correct — adds a one-click **"Accept ✓"** button directly in the row
so the pharmacist does not need to open the modal at all.

**Expected Outcomes**
- **Fuzzy rows** show two inline actions:
  - **"Accept ✓"** button (green) — one click accepts the suggested system name
    without opening the modal. Row immediately turns green (✓ Matched).
  - **"Map →"** button (amber) — opens the Map Modal to search for a different
    system name when the suggestion is wrong.
- **Unmatched rows** show only **"Map →"** (red) — no suggestion to accept.
- Clicking "Map →" on any fuzzy or unmatched row opens `MedicineMapModal` with
  the correct `importedName` pre-filled in the search box.
- Clicking "Select →" on a suggestion in the modal:
  - Sets `medicineName` to the chosen system name on the item.
  - Sets `mappingStatus` to `"matched"`.
  - Closes the modal.
  - The row turns green (✓ Matched) immediately.
- Clicking "Cancel" closes the modal without changes.
- Clicking the backdrop closes the modal without changes.
- After all fuzzy/unmatched rows are resolved, "Post Invoice" button becomes enabled.

**Todo List**
1. Add `onAccept?: (id: number) => void` prop to `PurchaseLineItemsTable` alongside
   the existing `onMap` prop.
2. In `PurchaseLineItemsTable`, for fuzzy rows in the medicine `<td>`, show two
   buttons side by side:
   - **"Accept ✓"** (green border/bg `#F0FDF4`/`#166534`) calls `onAccept?.(item.id)`.
   - **"Map →"** (amber border/bg `#FFFBEB`/`#92400E`) calls `onMap?.(item.id)`.
   For unmatched rows show only **"Map →"** (red border/bg `#FEF2F2`/`#B91C1C`).
3. In `NewPurchaseInvoice`, pass `onAccept` to `PurchaseLineItemsTable`:
   ```
   onAccept={id => {
     const item = items.find(i => i.id === id);
     if (item?.medicineName) {
       updateItem(id, "mappingStatus", "matched");
     }
   }}
   ```
4. In `NewPurchaseInvoice`, after the `wizardFile` / `printJob` modal blocks
   (around line 3891), add a conditional render for the Map Modal:
   ```
   {mappingItemId !== null && (
     <MedicineMapModal
       importedName={item.importedName ?? item.medicineName}
       onMap={systemName => { updateItem(id, "medicineName", systemName); updateItem(id, "mappingStatus", "matched"); setMappingItemId(null); }}
       onCreateNew={() => setShowAddMedForMap(true)}
       onClose={() => setMappingItemId(null)}
     />
   )}
   ```
5. Below that, add the `AddMedicineDrawer` for the "create new" path:
   ```
   {showAddMedForMap && mappingItemId !== null && (
     <AddMedicineDrawer
       initialName={importedName of the active mappingItemId item}
       onClose={() => setShowAddMedForMap(false)}
       onSaved={name => {
         updateItem(mappingItemId, "medicineName", name);
         updateItem(mappingItemId, "mappingStatus", "matched");
         setShowAddMedForMap(false);
         setMappingItemId(null);
       }}
     />
   )}
   ```

**Relevant Context**
- `mappingItemId` state — line 3498. Set by `onMap={id => setMappingItemId(id)}` in `PurchaseLineItemsTable`.
- `showAddMedForMap` state — line 3499. Declared but unused.
- `MedicineMapModal` — lines 2143–2243. Already accepts `importedName`, `onMap`, `onCreateNew`, `onClose`.
- `AddMedicineDrawer` — line 1633. Accepts `initialName`, `onClose`, `onSaved(name)`.
- `updateItem(id, field, value)` — line 3553. Updates a single field on a `PurchaseLine`.
- `PurchaseLine.mappingStatus` — line 31. `"matched" | "fuzzy" | "unmatched"` — set to `"matched"` to resolve.
- `PurchaseLineItemsTable` props — lines 2245–2251. Add `onAccept` here alongside `onMap`.
- "Post Invoice" gating — lines 3629–3644. Already checks `items.some(i => i.mappingStatus === "fuzzy" || "unmatched")`.

---

### Sub-Task 3 — Enrich Drug Master with Derived Search Fields

**Status:** `[ ] pending`

**Intent**
The `drugs` array in `mockData.ts` only has `name`, `category`, `unit`, `stock`,
`price`, `cost`, `expiry`, `supplier`, `location`, `status`. The new rich search
in the Map Modal needs to match on composition/generic name, dosage strength, and
pack/unit as separate dimensions. Rather than modifying `mockData.ts` (which is
shared by other modules), we derive these fields locally inside `Purchases.tsx`
at the point of use.

**Expected Outcomes**
- Each drug entry can be searched by:
  - `name` — full name string (e.g. `"Amoxicillin 500mg"`)
  - `generic` — first word(s) of the name before the strength (e.g. `"Amoxicillin"`)
  - `strength` — numeric+unit suffix (e.g. `"500mg"`, `"5mg"`, `"50mg"`)
  - `unit` — pack unit from the drug record (e.g. `"Tablets"`, `"Capsules"`, `"Inhaler"`)
  - `category` — therapeutic category (e.g. `"Antibiotics"`)
- A `parseDrug(d)` helper function returns `{ ...d, generic, strength }`.
- No changes to `mockData.ts`.

**Todo List**
1. Add a `parseDrug` helper function in `Purchases.tsx` in the
   "Medicine classification helpers" section (after the existing helpers, before
   mock data). It splits `d.name` on the last whitespace-separated token that
   matches `/^[0-9].*$/` to extract `strength`; everything before is `generic`.
   Example: `"Amoxicillin 500mg"` → `{ generic: "Amoxicillin", strength: "500mg" }`.
   Edge case: `"Salbutamol Inhaler"` — no numeric token → `generic = "Salbutamol Inhaler"`, `strength = ""`.
2. Define a `type DrugWithParsed` that extends the drug type with `generic: string` and `strength: string`.
3. Define a module-level constant `parsedDrugs` that maps `drugs.map(parseDrug)`.
   This is computed once, not on every render.

**Relevant Context**
- `drugs` array — `src/data/mockData.ts` line 1–14. Has `name`, `category`, `unit`.
- Current `MedicineMapModal` search — lines 2159–2165. Filters only on `d.name` and `d.category`. Will be replaced in Sub-Task 4.
- `tokenise()` helper can assist with splitting name into parts.

---

### Sub-Task 4 — Enhance `MedicineMapModal` Search UI

**Status:** `[ ] pending`

**Intent**
The current `MedicineMapModal` has a single text input that only filters on
`d.name` and `d.category`. This must be upgraded to a rich, multi-field search
that matches medicine name, composition/generic, dosage strength, and pack/unit —
so a pharmacist searching `"500"` or `"Tablets"` or `"Amoxicillin"` all surface
the right results. Results should show enough information per row that the right
match is obvious even when multiple entries look similar.

**Expected Outcomes**
- Search box is pre-populated with the imported name (existing behaviour, keep).
- Typing in the search box filters `parsedDrugs` across:
  - `name` (contains match)
  - `generic` (contains match)
  - `strength` (contains match)
  - `unit` (contains match)
  - `category` (contains match)
- Each result row shows:
  - **Medicine name** (bold, full name)
  - **Generic / Composition** (muted, below name)
  - **Strength** chip (e.g. `500mg`)
  - **Pack / Unit** (e.g. `Tablets`)
  - **Category** (muted right-side)
  - **"Select →"** button
- Results are sorted: exact-name-contains matches first, then generic matches,
  then strength/unit matches.
- Maximum 12 results shown.
- Empty state message when no results match.
- "Create New Medicine" footer button retains its position and behavior.

**Todo List**
1. Replace the `suggestions` memo inside `MedicineMapModal` to use `parsedDrugs`
   (from Sub-Task 3) and filter across all five fields: `name`, `generic`,
   `strength`, `unit`, `category`.
2. Add a sort step: score each result (name contains = 3pts, generic contains =
   2pts, strength/unit contains = 1pt each), sort descending by score.
3. Update each result `<button>` row JSX to show the richer layout:
   - Line 1: `d.name` (bold, `#1A2436`)
   - Line 2: `d.generic` + `·` + `d.category` (muted, `#9CA3AF`, smaller font)
   - Right side: strength chip (`#EFF6FF` bg, `#1B6CA8` text) + unit label + `Select →` button
4. Keep existing header (imported name badge) and footer ("+ Create New Medicine"
   / "Cancel") completely unchanged.
5. Keep `width: 520` modal. If the richer rows need more horizontal space, bump
   to `width: 600`.

**Relevant Context**
- `MedicineMapModal` full component — lines 2143–2243.
- `parsedDrugs` — introduced in Sub-Task 3.
- Existing result button styles already use `#F8FAFC` hover and `#EFF6FF`/`#1B6CA8`
  for the "Select →" chip — reuse these.
- `Pill` and `Th` are shared components but don't belong here — use inline styles
  consistent with the rest of the file.

---

## Execution Order

Sub-tasks must be done in order — each builds on the previous:

```
Sub-Task 1  →  Sub-Task 3  →  Sub-Task 4
                    ↓
              Sub-Task 2
```

Sub-Task 2 can be done in parallel with Sub-Tasks 3+4 since it only touches
the modal wiring, not the modal internals. However, implementing 3 before 4
is required since 4 depends on `parsedDrugs`.

Recommended order: **1 → 2 → 3 → 4**
