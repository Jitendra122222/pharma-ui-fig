@AGENTS.md

# PharmERP — project context

This is a **pharmacy ERP UI** (React + Vite + Tailwind v4) — a multi-module admin app for a pharmacy business. Not a public site.

Read this file first — it tells you what conventions are already established so you don't need to grep for them.

## Modules

`src/App.tsx` renders a fixed sidebar + topbar + a `<main>` area that swaps between 13 modules based on a `module` state:

| id | Component file | What it is |
|---|---|---|
| `dashboard` | [Dashboard.tsx](src/components/Dashboard.tsx) | KPI tiles + revenue chart (Recharts) |
| `sales` | [Sales.tsx](src/components/Sales.tsx) | Tabbed: Invoices · Counter Sales · Returns · Payments · New Invoice overlay |
| `prescriptions` | [Prescriptions.tsx](src/components/Prescriptions.tsx) | Rx queue + detail |
| `patients` | [Patients.tsx](src/components/Patients.tsx) | Patient list + Add Patient drawer |
| `inventory` | [Inventory.tsx](src/components/Inventory.tsx) | Medicine catalog |
| `stock` | [StockManagement.tsx](src/components/StockManagement.tsx) | Batch/stock movements |
| `purchases` | [Purchases.tsx](src/components/Purchases.tsx) | POs, GRN, purchase invoices, payments |
| `suppliers` | [Suppliers.tsx](src/components/Suppliers.tsx) | Supplier list + detail |
| `accounts` | [Accounts.tsx](src/components/Accounts.tsx) | Ledger, journal, receivables/payables |
| `insurance` | [Insurance.tsx](src/components/Insurance.tsx) | Claims |
| `reports` | [Reports.tsx](src/components/Reports.tsx) | Revenue analytics |
| `hr` | [HR.tsx](src/components/HR.tsx) | Staff, payroll |
| `settings` | [Settings.tsx](src/components/Settings.tsx) | App settings |

Shared drawer: [AddPatientDrawer.tsx](src/components/AddPatientDrawer.tsx) — 4-step drawer, opened from both Patients module and Sales → New Invoice patient search.

Mock data: [src/data/mockData.ts](src/data/mockData.ts). Sales mock data (medicines, invoices, returns, payments) lives inline at the top of `Sales.tsx`.

## Styling conventions — follow these, don't re-invent

- **Inline `style={{}}` objects**, not CSS classes. Every component in this repo does this. Only global rules live in `src/index.css` (fonts, scrollbar, `.app-shell`, media queries).
- **Pixel values everywhere** — `fontSize: 13`, `padding: "10px 16px"`. Do NOT convert to rem. Responsive scaling is handled by the `zoom` media queries described below.
- **Never write emojis into the codebase.** The user hasn't asked for them.
- **Double quotes for strings** with apostrophes (`"We're here"`), or escape (`'We\'re here'`). An unescaped apostrophe in a single-quoted JSX string breaks the build.
- **Currency is ₹ (Rupee)**, never `$`. Templates: `` `₹${n.toFixed(2)}` ``, JSX text: `₹{n.toFixed(2)}`. Negative amounts: `-₹...`. Do not introduce dollar signs.
- **Fonts** (loaded in `index.css`):
  - `Outfit` — page titles / h1-h6
  - `Inter` — body text and buttons (default)
  - `JetBrains Mono` — IDs, monetary amounts, dates, any tabular numeric data
- **Colors** (use these exact hex values; the CSS custom-property tokens in `@theme` mirror them but inline styles use the hex directly):

| Role | Hex |
|---|---|
| Text primary | `#0C1B33` / `#1A2436` |
| Text muted | `#6B7280` / `#9CA3AF` |
| Border | `#DDE3EC` / `#E8ECF4` / `#EEF1F6` |
| Background muted | `#F0F3F7` (page bg) / `#F8FAFC` / `#FAFBFD` |
| Sidebar | `#0C1B33` (bg), `#162544` (hover), `#1B6CA8` (active) |
| Primary / accent (buttons, active) | `#1B6CA8` (blue) |
| Accent 2 (active bar) | `#00ACC1` |
| Success | `#2E7D32`, `#E8F5E9` bg, `#A5D6A7` border |
| Warning | `#E65100`, `#FFF3E0` bg |
| Danger | `#C62828`, `#FFEBEE` bg |
| Info | `#1B6CA8`, `#EFF6FF` bg |

- **Status pill** — reuse `<Pill status="Paid" />` in Sales.tsx (`STATUS_PILL` map). Don't hand-roll new pills; extend that map.

## Layout invariants — don't break these

- `.app-shell` (outer flex row in [App.tsx:42](src/App.tsx#L42)) owns the viewport height. Its height is set in `index.css` with **zoom compensation** — do NOT put `height: "100vh"` on children.
- **Sidebar publishes its width** to `--sidebar-w` on `documentElement`. Any `position: fixed` overlay covering the main content area must use `left: "var(--sidebar-w, 228px)"`, never `left: 228`. Sidebar collapses to 56px.
- **`<main>` is `display: flex, flexDirection: column, minHeight: 0, overflowY: auto`.** Pages should either grow naturally (main scrolls them) or use `flex: 1, minHeight: 0` if they need a fixed-height inner layout with their own internal scroll (e.g. Counter Sales, New Invoice).
- **Responsive zoom** (index.css):
  - `≤1440px → body { zoom: 0.9 }` + `.app-shell { height: calc(100vh / 0.9) }`
  - `≤1280px → 0.82`
  - `≤1100px → 0.75`
  If you add new full-viewport layouts, they must be percentage-based (not `100vh`) or use the same compensation.

## Reusable patterns already in the codebase

- **Multi-step drawer** — copy [AddPatientDrawer.tsx](src/components/AddPatientDrawer.tsx) as the template: right-side aside, backdrop with `Escape` close, header, stepper, scrollable body, footer with Back / Save Draft / Next. Uses `zIndex: 100` (backdrop) / `101` (aside).
- **Pagination** — `usePagination(rows, initialPageSize)` + `<PaginationFooter {...footerProps} />` in [Sales.tsx](src/components/Sales.tsx). Sits at the bottom of a table container with `borderTop`. Rows-per-page: `5 / 10 / 25 / 50`. Reuse it for any new list view; don't re-implement.
- **Invoice summary footer** — [`InvoiceSummaryFooter`](src/components/Sales.tsx) in Sales.tsx: read-only chip row (Subtotal / Item Discount / GST / Round Off / Total / Paid / Balance) plus editable chips (Cash Discount, Adjustment). Total formula: `Subtotal − Item Discount − Cash Discount + GST + Round Off + Adjustment`. Notes textarea sits **above** the footer as a separate section, not inside it.
- **Full-screen overlay pattern** (New Invoice): `position: fixed, top: 50, left: var(--sidebar-w, 228px), right: 0, bottom: 0, zIndex: 50`. `top: 50` matches the topbar height.

## Behavior wiring already in place

- **Counter Sales → Generate Invoice** — CounterSales takes an `onGenerate(items)` prop; the parent `Sales` catches it, stashes items in `preloadItems`, and switches to `view: "new-invoice"`. `NewInvoice` seeds its line items from `preloadItems` on mount (looks up batch/mrp/saleRate from `MEDICINES`).
- **Add Patient** — button in the Patients page header AND in the Sales → New Invoice patient search dropdown. Both open the same `AddPatientDrawer`.
- **Sidebar collapse** — internal state in Sidebar. `«` button in the header collapses; a floating `›` handle expands. Publishes `--sidebar-w`.

## Dev server

Already running on port `$PORT` (default 8443) via Figma Make. Never `npm run dev` yourself — Vite is live. To verify a change compiles, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8443/src/components/<file>.tsx` and tail the dev log at `%TEMP%/claude/.../<taskId>.output`.

## Per-module skills

Each module has a `SKILL.md` with focused context. Load it via the Skill tool (or read directly) when you're about to edit that module — saves re-discovery:

- [sales-module](.claude/skills/sales-module/SKILL.md) — Invoices, Counter Sales, Returns, Payments, New Invoice overlay, footer/pagination helpers
- [purchases-module](.claude/skills/purchases-module/SKILL.md) — POs, GRN, Invoices, Entry, Returns, Payments (has its own UI primitive library at the top)
- [patients-module](.claude/skills/patients-module/SKILL.md) — patient list + the shared 4-step Add Patient drawer (also used by Sales)
- [prescriptions-module](.claude/skills/prescriptions-module/SKILL.md) — Rx queue + detail
- [inventory-module](.claude/skills/inventory-module/SKILL.md) — drug catalog list
- [stock-management-module](.claude/skills/stock-management-module/SKILL.md) — Overview, Adjustments, Batches, Expiry, Transfer
- [suppliers-module](.claude/skills/suppliers-module/SKILL.md) — supplier list + detail
- [accounts-module](.claude/skills/accounts-module/SKILL.md) — Overview, Ledger, Journal, Receivables, Payables
- [insurance-module](.claude/skills/insurance-module/SKILL.md) — Claims, Submit, Providers, Eligibility
- [hr-module](.claude/skills/hr-module/SKILL.md) — Staff, Attendance, Payroll, Leave
- [reports-module](.claude/skills/reports-module/SKILL.md) — Revenue analytics + Rx trends
- [dashboard-module](.claude/skills/dashboard-module/SKILL.md) — home KPI tiles + charts
- [settings-module](.claude/skills/settings-module/SKILL.md) — section-based settings

## Things NOT to do

- Don't create new documentation files (README, DESIGN.md, etc.) unless explicitly asked.
- Don't add Tailwind config or PostCSS config — v4 doesn't need them.
- Don't refactor inline styles to CSS modules / styled-components / classes.
- Don't add form libraries (react-hook-form, zod). All forms so far use plain `useState`.
- Don't add a router. Navigation is `module` state in App and internal `view` state within a module (e.g. Sales).
- Don't add error handling / validation for scenarios that can't happen with the mock data.
- Don't convert hardcoded `#hex` to CSS variables in inline styles — the codebase is uniform on hex literals.
- Don't add `overflow: auto` to `<main>` alone — it already has it. Do add `overflow: hidden` to inner containers that manage their own scroll.
