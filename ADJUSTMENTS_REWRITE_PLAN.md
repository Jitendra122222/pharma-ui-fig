# Adjustments.tsx Rewrite Plan

## Goal
Redesign the Adjustments tab from 3 internal tabs into a cleaner 2-tab layout:
- **Work Queue** (Verification Queue + Count Sessions)
- **Adjustment Log** (filtered ledger)
- **Count Session** moves to a full-screen overlay

---

## Step 1 — Add new state & types (Edit only, no JSX change)

**File:** `src/components/stock/Adjustments.tsx`

Changes inside the component, after existing state declarations:

```ts
// NEW types (move AdjRow outside function, add CompletedSession)
type AdjRow = { id: string; date: string; drug: string; type: string; qtyBefore: number; qty: number; qtyAfter: number; reason: string; ref: string; by: string };
type CompletedSession = { id: string; startedAt: string; completedAt: string; scope: string; assignedTo: string; itemsCounted: number; variancesFound: number; adjustmentsCreated: number };

// NEW state
const [adjView, setAdjView] = useState<"workqueue" | "log">("workqueue");  // was "adjustments"|"verification"|"count"
const [logFilter, setLogFilter] = useState<"all"|"Pending"|"Approved"|"Rejected">("all");
const [countOverlayOpen, setCountOverlayOpen] = useState(false);
const [selectedVerIds, setSelectedVerIds] = useState<Set<number>>(new Set());
const [countPreselectedIds, setCountPreselectedIds] = useState<number[]>([]);
const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);

// CHANGE countScope to support "selected"
const [countScope, setCountScope] = useState<"full"|"location"|"supplier"|"selected">("full");
```

Also add `const TODAY = "2026-09-28";` near the top constants.

---

## Step 2 — Update 4 functions

### 2a. `adjFiltered` — add logFilter
```ts
const adjFiltered = rowsWithApproval.filter(a => {
  const matchSearch = !adjSearch || a.drug.toLowerCase().includes(adjSearch.toLowerCase()) || a.id.toLowerCase().includes(adjSearch.toLowerCase()) || a.reason.toLowerCase().includes(adjSearch.toLowerCase());
  const matchFilter = logFilter === "all" || a.approval === logFilter;
  return matchSearch && matchFilter;
});
```

### 2b. `allCountItems` — add "Selected Items" scope
```ts
const allCountItems = countSession ? drugs.filter(d => {
  if (countSession.scope === "By Location") return d.location === countScopeFilter;
  if (countSession.scope === "By Company") return d.category === countScopeFilter;
  if (countSession.scope === "Selected Items") return countPreselectedIds.includes(d.id);
  return true;
}) : [];
```

### 2c. `startCountSession` — handle "selected" scope
```ts
function startCountSession() {
  if (countScope === "location" && !countScopeFilter) return;
  if (countScope === "supplier" && !countScopeFilter) return;
  if (countScope === "selected" && countPreselectedIds.length === 0) return;
  const scope = countScope === "full" ? "Full Stock"
    : countScope === "location" ? "By Location"
    : countScope === "supplier" ? "By Company"
    : "Selected Items";
  setCountSession({ id: `CS-${Math.floor(Math.random()*900)+100}`, startedAt: TODAY + " 10:00", scope, assignedTo: countAssignTo || "Unassigned" });
  setCountEntries({}); setCountSearch(""); setCountReview(false);
}
```

### 2d. `submitCountSession` — push to history, close overlay, switch tab
```ts
// After creating newAdjs (same as before), add:
const completed: CompletedSession = {
  id: countSession!.id, startedAt: countSession!.startedAt,
  completedAt: TODAY + " " + new Date().toTimeString().slice(0,5),
  scope: countSession!.scope, assignedTo: countSession!.assignedTo,
  itemsCounted: countedCount, variancesFound: countVarianceItems.length,
  adjustmentsCreated: toCreate.length,
};
setCompletedSessions(prev => [completed, ...prev]);
setCountOverlayOpen(false);
setAdjView("log");
setLogFilter("Pending");
setSelectedVerIds(new Set());
setCountPreselectedIds([]);
// Remove: setAdjView("adjustments") from original
```

### 2e. Add new function `openCountOverlay`
```ts
function openCountOverlay(preselected?: number[]) {
  setCountPreselectedIds(preselected ?? []);
  setCountScope(preselected && preselected.length > 0 ? "selected" : "full");
  setCountScopeFilter(""); setCountBlind(false); setCountAssignTo("");
  setCountSession(null); setCountEntries({}); setCountReview(false);
  setSkippedCountIds(new Set()); setCountOverlayOpen(true);
}
```

---

## Step 3 — Replace the main JSX return

Replace everything inside the outer `<div style={{ display:"flex", flexDirection:"column", gap:16 }}>` up to (but NOT including) the `{/* New Adjustment */}` modal block.

### 3a. KPI Tiles row
```tsx
<div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
  { [ {label:"Pending Approvals", val:pendingApprovals, color:pendingApprovals>0?"#E65100":"#1A2436"},
      {label:"High Risk Items",   val:verificationQueue.length, color:"#C62828"},
      {label:"Active Session",    val:countOverlayOpen&&countSession?1:0, color:"#1B6CA8"},
      {label:"Adjustments Today", val:rowsWithApproval.filter(a=>a.date===TODAY).length, color:"#2E7D32"} ]
    .map(t => (
      <div key={t.label} style={{background:"#fff",border:"1px solid #DDE3EC",borderRadius:6,padding:"14px 18px"}}>
        <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontFamily:"Inter"}}>{t.label}</div>
        <div style={{fontFamily:"JetBrains Mono",fontSize:26,fontWeight:800,color:t.color}}>{t.val}</div>
      </div>
  ))}
</div>
```

### 3b. 2-tab card shell
```tsx
<div style={{background:"#fff",borderRadius:6,border:"1px solid #DDE3EC",overflow:"hidden"}}>
  {/* Tab bar — 2 tabs */}
  <div style={{display:"flex",padding:"0 6px",borderBottom:"2px solid #EEF1F6"}}>
    { [{key:"workqueue",label:"Work Queue",badge:verificationQueue.length,bc:"#C62828",bb:"#FFEBEE"},
       {key:"log",label:"Adjustment Log",badge:pendingApprovals,bc:"#E65100",bb:"#FFF3E0"}]
      .map(t => (
        <button key={t.key} onClick={()=>setAdjView(t.key as any)} style={{
          padding:"12px 20px",border:"none",background:"transparent",cursor:"pointer",
          fontSize:13,fontFamily:"Inter",fontWeight:adjView===t.key?600:400,
          color:adjView===t.key?"#1B6CA8":"#6B7280",
          borderBottom:`2px solid ${adjView===t.key?"#1B6CA8":"transparent"}`,
          marginBottom:-2,display:"flex",alignItems:"center",gap:7}}>
          {t.label}
          {t.badge>0 && <span style={{fontSize:11,padding:"1px 7px",borderRadius:10,fontFamily:"JetBrains Mono",fontWeight:700,background:adjView===t.key?t.bb:"#F0F3F7",color:adjView===t.key?t.bc:"#9CA3AF"}}>{t.badge}</span>}
        </button>
    ))}
  </div>
  {adjView==="workqueue" && <WorkQueueContent />}
  {adjView==="log" && <AdjLogContent />}
</div>
```

### 3c. Work Queue tab content
Two sections stacked:

**Section A — Verification Queue:**
- Header: title + count badge + search input + "Quick Blind Count" button + (if selectedVerIds.size>0) "Start Count Session for N items" button
- Checkbox column added to table (select-all in header, per-row checkbox)
- Per-row actions: "Quick Count" (opens blind count modal) + "+Session" (calls openCountOverlay([d.id]))
- PaginationFooter

**Section B — Count Sessions:**
- Header: title + "+ New Count Session" button (calls openCountOverlay())
- If active session banner (countOverlayOpen && countSession): shows session ID, progress, Resume button
- History table: Session ID | Date | Scope | Assigned | Items | Variances | Adjustments

### 3d. Adjustment Log tab content
- Orange pending banner (if pendingApprovals > 0)
- Toolbar: filter pills [All | Pending | Approved | Rejected] + search input + "+ New Adjustment" button
- Same table as original "adjustments" tab (unchanged)
- PaginationFooter

---

## Step 4 — Add Count Session full-screen overlay

Add this BEFORE the `{/* New Adjustment */}` modal block:

```tsx
{countOverlayOpen && (
  <div style={{position:"fixed",top:50,left:"var(--sidebar-w,228px)",right:0,bottom:0,zIndex:50,background:"#F0F3F7",display:"flex",flexDirection:"column",overflow:"hidden"}}>
    {/* Header bar */}
    {/* MultiStepper */}
    {/* Scrollable body — same 3 steps as original count tab */}
    {/* Step 1 Configure: add "selected" scope option */}
    {/* Step 2 Count Sheet: unchanged */}
    {/* Step 3 Review: unchanged, submit button calls submitCountSession */}
  </div>
)}
```

Header bar has:
- Back button (closes overlay, sets countOverlayOpen(false))
- Breadcrumb: Adjustments > Count Session CS-XXX
- Right side: Abandon + Submit/Review buttons (only when countSession exists)

---

## Step 5 — Remove old count tab JSX

Delete the `{adjView === "count" && ...}` block entirely from the tabbed card.

---

## Execution order
1. Edit state + functions (Steps 1–2) — small targeted edits
2. Replace tab bar JSX (Step 3b)
3. Add Work Queue content (Step 3c)
4. Add Adjustment Log content (Step 3d)
5. Add overlay (Step 4)
6. Delete old count tab block (Step 5)
7. Verify in browser at localhost:8443

---

## What stays 100% unchanged
- New Adjustment modal (lines ~881–1178)
- Approval modal (lines ~1181–1231)
- Blind Count modal (lines ~1234–1325)
- verificationQueue scoring algorithm
- doApprove, handleScan functions
- PaginationFooter + useTableSort usage
