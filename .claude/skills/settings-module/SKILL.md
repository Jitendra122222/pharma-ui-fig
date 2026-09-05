---
name: settings-module
description: Use when editing the Settings module — General, Users & Roles, Billing, Notifications, Integrations, or Backup sections.
---

# Settings module

Single file: [Settings.tsx](../../../src/components/Settings.tsx) (~190 lines).

## Layout

- Two-column: 200px side nav on the left, section content on the right.
- Side nav lists: `General` · `Users & Roles` · `Billing` · `Notifications` · `Integrations` · `Backup`.
- Save button shows a transient success message (`saved` state auto-clears after 2s).

## State

- `activeSection` — currently rendered section.
- `saved` — boolean for the "Settings saved" flash.

## Local helper

`Toggle({ defaultOn })` — pill switch used in Notifications / Integrations sections.

## Common tasks

### Add a new settings section
1. Add label to `sections` array.
2. Add a matching branch in the section switch inside the right-column render.
3. Add fields — pattern is `<div>` groups with `<label>` + `<input>` / `<Toggle>`.

### Wire a real save
Replace the `setTimeout(..., 2000)` with an actual persistence call. Keep the toast pattern (green banner, 2s auto-hide) — it's the module's convention.

## Gotchas

- Section content is monolithic inside `Settings()` — not extracted into subcomponents. That's intentional (each section is small); don't refactor unless one grows.
- No global settings store — every field is a stub. Wire only if the user asks for persistence.
