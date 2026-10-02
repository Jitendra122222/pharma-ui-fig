import { useState, useMemo, type ReactNode } from "react";
import { drugs } from "../../data/mockData";
import { LOCATION_META, COLD_LOG } from "./stockData";
import type { StorageType } from "./stockData";
import { usePagination, PaginationFooter } from "../shared/usePagination";

interface Props {
  storageType: StorageType;
}

const STORAGE_LABEL: Record<StorageType, string> = {
  alphabetical: "Alphabetical (A–Z)",
  company:      "By Company",
  category:     "By Category",
  custom:       "Custom / Manual",
};

const ALL_ZONES = [...new Set(Object.values(LOCATION_META).map(m => m.zone))].sort();
const TODAY = new Date("2026-09-28");

const UNIT_ABBR: Record<string, string> = {
  Capsules: "Cap", Tablets: "Tab", Inhaler: "Inh", Vial: "Vial", Syrup: "Syr", Injection: "Inj", Drops: "Drp",
};
function abbr(unit: string) { return UNIT_ABBR[unit] ?? unit; }

function daysToExpiry(expiry: string): number {
  return Math.round((new Date(expiry).getTime() - TODAY.getTime()) / 86400000);
}

function fillColor(pct: number) {
  if (pct >= 90) return "#C62828";
  if (pct >= 70) return "#E65100";
  return "#2E7D32";
}

function getTempReq(category: string): { label: string; bg: string; color: string } {
  if (category === "Hormones") return { label: "Refrigerated", bg: "#EFF6FF", color: "#1B6CA8" };
  return { label: "Ambient", bg: "#F0FDF4", color: "#2E7D32" };
}

function getSmartSuggestions(drug: typeof drugs[0], storageType: StorageType, excludeLocation: string): string[] {
  const all = Object.keys(LOCATION_META);
  if (storageType === "alphabetical") {
    const first = drug.name[0].toUpperCase();
    const matched = all.filter(k => k.startsWith(first) && k !== excludeLocation);
    return matched.length ? matched : all.filter(k => k !== excludeLocation).slice(0, 3);
  }
  if (storageType === "company") {
    const sameMfr = drugs.filter(d => d.manufacturer === drug.manufacturer && d.location !== excludeLocation).map(d => d.location);
    const unique = [...new Set(sameMfr)];
    return unique.length ? unique : all.filter(k => k !== excludeLocation).slice(0, 3);
  }
  if (storageType === "category") {
    const sameCat = drugs.filter(d => d.category === drug.category && d.location !== excludeLocation).map(d => d.location);
    const unique = [...new Set(sameCat)];
    return unique.length ? unique : all.filter(k => k !== excludeLocation).slice(0, 3);
  }
  const byCapacity = all
    .filter(k => k !== excludeLocation)
    .map(k => {
      const meta = LOCATION_META[k];
      const used = drugs.filter(d => d.location === k).reduce((s, d) => s + d.stock, 0);
      return { k, avail: meta.maxCapacity - used };
    })
    .sort((a, b) => b.avail - a.avail);
  return byCapacity.slice(0, 3).map(x => x.k);
}

export default function StockLocations({ storageType }: Props) {
  const [search, setSearch] = useState("");
  const [detailMode, setDetailMode] = useState(false);
  const [expandedLocs, setExpandedLocs] = useState<Set<string>>(new Set());
  const [moveModal, setMoveModal] = useState<{ drug: typeof drugs[0] } | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [moveToSearch, setMoveToSearch] = useState("");
  const [moveToOpen, setMoveToOpen] = useState(false);
  const [moveQty, setMoveQty] = useState("1");
  const [moveReason, setMoveReason] = useState("");
  const [moveConfirmed, setMoveConfirmed] = useState(false);

  const [filter, setFilter] = useState("All");
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [fZones, setFZones] = useState<string[]>([]);
  const [fBins, setFBins] = useState<string[]>([]);
  const [fFillStatus, setFFillStatus] = useState<string[]>([]);
  const [fFillRange, setFFillRange] = useState<[number, number]>([0, 100]);

  const [selectedDrugIds, setSelectedDrugIds] = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; id: number; type: "success" | "error" } | null>(null);
  const [bulkMoveModal, setBulkMoveModal] = useState(false);
  const [bulkMoveTo, setBulkMoveTo] = useState("");
  const [bulkMoveConfirmed, setBulkMoveConfirmed] = useState(false);

  const [createLocOpenDrop, setCreateLocOpenDrop] = useState<"rackType" | "tempZone" | null>(null);
  const EMPTY_LOC_FORM = { locId: "", label: "", zone: "", rackType: "", tempZone: "", maxCapacity: "", notes: "" };
  const [createLocModal, setCreateLocModal] = useState(false);
  const [createLocForm, setCreateLocForm] = useState(EMPTY_LOC_FORM);
  const [createLocErrors, setCreateLocErrors] = useState<Partial<typeof EMPTY_LOC_FORM>>({});

  const [editLocOpenDrop, setEditLocOpenDrop] = useState<"rackType" | "tempZone" | null>(null);
  const [editLocModal, setEditLocModal] = useState<string | null>(null);
  const [editLocForm, setEditLocForm] = useState(EMPTY_LOC_FORM);
  const [editLocErrors, setEditLocErrors] = useState<Partial<typeof EMPTY_LOC_FORM>>({});

  const [moveHistoryModal, setMoveHistoryModal] = useState<{ drug: typeof drugs[0] } | null>(null);
  const [mhDateFilter, setMhDateFilter] = useState("all");

  const STAFF = ["Priya Sharma", "Rahul Mehta", "Anjali Singh", "Kiran Patel", "Deepak Rao"];
  const EMPTY_AUDIT = { auditType: "", priority: "", scheduledDate: "", assignTo: "", notes: "" };
  const [auditModal, setAuditModal] = useState<{ locId: string } | null>(null);
  const [auditForm, setAuditForm] = useState(EMPTY_AUDIT);
  const [auditErrors, setAuditErrors] = useState<Partial<typeof EMPTY_AUDIT>>({});
  const [auditOpenDrop, setAuditOpenDrop] = useState<"auditType" | "priority" | "assignTo" | null>(null);

  function openAuditModal(locId: string) {
    setAuditForm(EMPTY_AUDIT); setAuditErrors({}); setAuditOpenDrop(null);
    setAuditModal({ locId });
  }
  function setAuditField(field: keyof typeof EMPTY_AUDIT, value: string) {
    setAuditForm(prev => ({ ...prev, [field]: value }));
    if (value) setAuditErrors(prev => ({ ...prev, [field]: "" }));
  }
  function submitAudit() {
    const errs: Partial<typeof EMPTY_AUDIT> = {};
    if (!auditForm.auditType)      errs.auditType     = "Select an audit type";
    if (!auditForm.priority)       errs.priority      = "Select a priority";
    if (!auditForm.scheduledDate)  errs.scheduledDate = "Select a scheduled date";
    if (!auditForm.assignTo)       errs.assignTo      = "Assign to a staff member";
    if (Object.keys(errs).length > 0) { setAuditErrors(errs); return; }
    const locId = auditModal!.locId;
    setAuditModal(null);
    showToast(`Bin ${locId} marked for audit on ${auditForm.scheduledDate}.`, "success");
  }

  function getMoveHistory(drug: typeof drugs[0]) {
    const locs = Object.keys(LOCATION_META);
    const staff = ["Priya Sharma", "Rahul Mehta", "Anjali Singh", "Kiran Patel", "Deepak Rao"];
    const reasons = ["Capacity overflow", "Reorganising rack", "Temperature mismatch", "Batch separation", "Routine restocking", "Expiry segregation", "New stock arrival"];
    const statuses: ("Completed" | "Pending" | "Cancelled")[] = ["Completed", "Completed", "Completed", "Completed", "Pending", "Cancelled"];
    const seed = drug.id * 7;
    return Array.from({ length: 6 }, (_, i) => {
      const daysAgo = [2, 18, 45, 72, 110, 160][i];
      const d = new Date("2026-09-28");
      d.setDate(d.getDate() - daysAgo);
      const fromIdx = (seed + i * 3) % locs.length;
      const toIdx   = (seed + i * 3 + 2) % locs.length;
      return {
        date: d.toISOString().slice(0, 10),
        time: `${String(9 + (seed + i) % 9).padStart(2, "0")}:${String((seed * i + 15) % 60).padStart(2, "0")}`,
        from: locs[fromIdx],
        to:   locs[toIdx] === locs[fromIdx] ? locs[(toIdx + 1) % locs.length] : locs[toIdx],
        qty:  20 + ((seed + i * 13) % 80),
        unit: drug.unit,
        reason: reasons[(seed + i) % reasons.length],
        movedBy: staff[(seed + i) % staff.length],
        status: statuses[(seed + i) % statuses.length],
      };
    });
  }

  function openCreateLoc() { setCreateLocForm(EMPTY_LOC_FORM); setCreateLocErrors({}); setCreateLocModal(true); }
  function setLocField(field: keyof typeof EMPTY_LOC_FORM, value: string) {
    setCreateLocForm(prev => ({ ...prev, [field]: value }));
    if (value) setCreateLocErrors(prev => ({ ...prev, [field]: "" }));
  }
  function submitCreateLoc() {
    const errs: Partial<typeof EMPTY_LOC_FORM> = {};
    if (!createLocForm.locId.trim())       errs.locId       = "Location ID is required";
    if (!createLocForm.label.trim())       errs.label       = "Label is required";
    if (!createLocForm.zone.trim())        errs.zone        = "Zone is required";
    if (!createLocForm.rackType)           errs.rackType    = "Rack type is required";
    if (!createLocForm.tempZone)           errs.tempZone    = "Temperature zone is required";
    if (!createLocForm.maxCapacity || isNaN(Number(createLocForm.maxCapacity)) || Number(createLocForm.maxCapacity) <= 0)
                                           errs.maxCapacity = "Enter a valid capacity";
    if (Object.keys(errs).length > 0) { setCreateLocErrors(errs); return; }
    setCreateLocModal(false);
    showToast(`Location ${createLocForm.locId} created successfully.`, "success");
  }

  function openEditLoc(locId: string) {
    const m = LOCATION_META[locId];
    setEditLocForm({
      locId,
      label:       m?.label        ?? "",
      zone:        m?.zone         ?? "",
      rackType:    (m as any)?.rackType  ?? "",
      tempZone:    (m as any)?.tempZone  ?? "",
      maxCapacity: String((m as any)?.maxCapacity ?? ""),
      notes:       "",
    });
    setEditLocErrors({});
    setEditLocOpenDrop(null);
    setEditLocModal(locId);
  }
  function setEditLocField(field: keyof typeof EMPTY_LOC_FORM, value: string) {
    setEditLocForm(prev => ({ ...prev, [field]: value }));
    if (value) setEditLocErrors(prev => ({ ...prev, [field]: "" }));
  }
  function submitEditLoc() {
    const errs: Partial<typeof EMPTY_LOC_FORM> = {};
    if (!editLocForm.label.trim())    errs.label       = "Label is required";
    if (!editLocForm.zone.trim())     errs.zone        = "Zone is required";
    if (!editLocForm.rackType)        errs.rackType    = "Rack type is required";
    if (!editLocForm.tempZone)        errs.tempZone    = "Temperature zone is required";
    if (!editLocForm.maxCapacity || isNaN(Number(editLocForm.maxCapacity)) || Number(editLocForm.maxCapacity) <= 0)
                                      errs.maxCapacity = "Enter a valid capacity";
    if (Object.keys(errs).length > 0) { setEditLocErrors(errs); return; }
    setEditLocModal(null);
    showToast(`Location ${editLocForm.locId} updated successfully.`, "success");
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    const id = Date.now();
    setToast({ msg, id, type });
    setTimeout(() => setToast(t => (t?.id === id ? null : t)), 3000);
  }

  const activeFilterCount =
    fZones.length + fBins.length + fFillStatus.length +
    (fFillRange[0] > 0 || fFillRange[1] < 100 ? 1 : 0) +
    (filter !== "All" ? 1 : 0);

  function locFillPct(locId: string): number {
    const meta = LOCATION_META[locId];
    if (!meta) return 0;
    const used = drugs.filter(d => d.location === locId).reduce((s, d) => s + d.stock, 0);
    return Math.min(100, Math.round((used / meta.maxCapacity) * 100));
  }

  function locFillStatus(locId: string): "ok" | "low" | "critical" {
    const items = drugs.filter(d => d.location === locId);
    const pct = locFillPct(locId);
    if (pct >= 90) return "critical";
    if (items.some(d => d.stock === 0 || d.stock < d.minStock)) return "low";
    return "ok";
  }

  function locPassesDrawerFilters(locId: string): boolean {
    const meta = LOCATION_META[locId];
    if (!meta) return false;
    if (fZones.length && !fZones.includes(meta.zone)) return false;
    if (fBins.length && !fBins.includes(locId)) return false;
    const pct = locFillPct(locId);
    if (fFillRange[0] > 0 && pct < fFillRange[0]) return false;
    if (fFillRange[1] < 100 && pct > fFillRange[1]) return false;
    if (fFillStatus.length && !fFillStatus.includes(locFillStatus(locId))) return false;
    return true;
  }

  function drugPassesFilters(d: typeof drugs[0], locId: string): boolean {
    if (filter === "Low Stock" && d.status !== "Low Stock") return false;
    if (filter === "Out of Stock" && d.status !== "Out of Stock") return false;
    return locPassesDrawerFilters(locId);
  }

  const locationRows = useMemo(() => {
    return Object.entries(LOCATION_META).map(([locId, meta]) => {
      const items = drugs.filter(d => d.location === locId);
      const totalStock = items.reduce((s, d) => s + d.stock, 0);
      const fillPct = Math.min(100, Math.round((totalStock / meta.maxCapacity) * 100));
      const hasProblems = items.some(d => d.stock === 0 || d.stock < d.minStock);
      const status: "critical" | "low" | "ok" =
        fillPct >= 90 ? "critical" : hasProblems ? "low" : "ok";
      return { locId, meta, items, totalStock, fillPct, status };
    });
  }, []);

  const drugRows = useMemo(() => {
    return drugs
      .filter(d => d.location in LOCATION_META)
      .map(d => ({ drug: d, locId: d.location, meta: LOCATION_META[d.location] }));
  }, []);

  const filteredDrugs = useMemo(() => {
    const q = search.toLowerCase();
    return drugRows.filter(row => {
      if (q &&
        !row.drug.name.toLowerCase().includes(q) &&
        !row.drug.category.toLowerCase().includes(q) &&
        !row.drug.manufacturer.toLowerCase().includes(q) &&
        !row.locId.toLowerCase().includes(q) &&
        !row.meta.zone.toLowerCase().includes(q) &&
        !row.meta.label.toLowerCase().includes(q) &&
        !((row.drug as any).batchId ?? "").toLowerCase().includes(q)
      ) return false;
      return drugPassesFilters(row.drug, row.locId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drugRows, search, filter, fZones, fBins, fFillStatus, fFillRange]);

  const filteredLocs = useMemo(() => {
    const q = search.toLowerCase();
    return locationRows.filter(r => {
      const locMatch = !q || r.locId.toLowerCase().includes(q) || r.meta.zone.toLowerCase().includes(q) || r.meta.label.toLowerCase().includes(q);
      return r.items.some(d => {
        const drugMatch = !q || locMatch || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
        return drugMatch && drugPassesFilters(d, r.locId);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRows, search, filter, fZones, fBins, fFillStatus, fFillRange]);

  const { pageRows: drugPageRows, footerProps: drugFooterProps } = usePagination(filteredDrugs, 10);
  const { pageRows: locPageRows, footerProps: locFooterProps } = usePagination(filteredLocs, 10);

  const problems = locationRows.filter(r => r.status !== "ok");
  const criticalCount = locationRows.filter(r => r.status === "critical").length;

  function resetFilters() {
    setFilter("All"); setFZones([]); setFBins([]); setFFillStatus([]); setFFillRange([0, 100]);
  }

  function toggleExpand(locId: string) {
    setExpandedLocs(prev => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId); else next.add(locId);
      return next;
    });
  }

  function openMove(drug: typeof drugs[0]) {
    setMoveModal({ drug }); setMoveTo(""); setMoveToSearch(""); setMoveToOpen(false); setMoveQty("1"); setMoveReason(""); setMoveConfirmed(false);
  }

  function handleMoveConfirm() {
    if (!moveModal || !moveTo || !moveQty) {
      showToast("Please fill in all required fields before confirming.", "error");
      return;
    }
    const drugName = moveModal.drug.name;
    const to = moveTo;
    setMoveModal(null);
    showToast(`${drugName} moved to ${to} successfully.`, "success");
  }

  function toggleDrugSelect(id: number) {
    setSelectedDrugIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllDrugs(pageRows: typeof drugPageRows) {
    const allSel = pageRows.every(r => selectedDrugIds.has(r.drug.id));
    setSelectedDrugIds(prev => {
      const next = new Set(prev);
      if (allSel) pageRows.forEach(r => next.delete(r.drug.id));
      else pageRows.forEach(r => next.add(r.drug.id));
      return next;
    });
  }

  function toggleLocDrugs(items: typeof locationRows[0]["items"]) {
    const allSel = items.every(d => selectedDrugIds.has(d.id));
    setSelectedDrugIds(prev => {
      const next = new Set(prev);
      if (allSel) items.forEach(d => next.delete(d.id));
      else items.forEach(d => next.add(d.id));
      return next;
    });
  }

  function toggleAllLocDrugs(pageRows: typeof locPageRows) {
    const allDrugIds = pageRows.flatMap(r => r.items.map(d => d.id));
    const allSel = allDrugIds.every(id => selectedDrugIds.has(id));
    setSelectedDrugIds(prev => {
      const next = new Set(prev);
      if (allSel) allDrugIds.forEach(id => next.delete(id));
      else allDrugIds.forEach(id => next.add(id));
      return next;
    });
  }

  function handleBulkMoveConfirm() {
    setBulkMoveConfirmed(true);
    const count = selectedDrugIds.size;
    setTimeout(() => {
      setBulkMoveModal(false);
      setSelectedDrugIds(new Set());
      showToast(`${count} medicine${count !== 1 ? "s" : ""} moved to ${bulkMoveTo}`);
    }, 1200);
  }

  const ThCell = ({ children, w }: { children: React.ReactNode; w?: number }) => (
    <th style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const, width: w ?? "auto" }}>
      {children}
    </th>
  );

  const StatusPill = ({ status }: { status: "critical" | "low" | "ok" }) => {
    const map = {
      critical: { bg: "#FFEBEE", color: "#C62828", label: "Critical" },
      low:      { bg: "#FFF3E0", color: "#E65100", label: "Attention" },
      ok:       { bg: "#E8F5E9", color: "#2E7D32", label: "OK" },
    };
    const s = map[status];
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, fontFamily: "Inter" }}>{s.label}</span>;
  };

  const DrugStatusPill = ({ drug: d }: { drug: typeof drugs[0] }) => {
    if (d.stock === 0) return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#FFEBEE", color: "#C62828", fontFamily: "Inter" }}>Out of Stock</span>;
    if (d.stock < d.minStock) return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#FFF3E0", color: "#E65100", fontFamily: "Inter" }}>Low Stock</span>;
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#E8F5E9", color: "#2E7D32", fontFamily: "Inter" }}>In Stock</span>;
  };

  const ExpiryBadge = ({ expiry }: { expiry: string }) => {
    const days = daysToExpiry(expiry);
    let badgeBg = "#F0F3F7", badgeColor = "#9CA3AF";
    if (days < 0) { badgeBg = "#FFEBEE"; badgeColor = "#C62828"; }
    else if (days < 30) { badgeBg = "#FFEBEE"; badgeColor = "#C62828"; }
    else if (days < 90) { badgeBg = "#FFF3E0"; badgeColor = "#E65100"; }
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{expiry}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: badgeBg, color: badgeColor, fontFamily: "Inter", display: "inline-block", alignSelf: "flex-start" as const }}>
          {days < 0 ? "Expired" : `${days}d`}
        </span>
      </div>
    );
  };

  const TempReqPill = ({ category }: { category: string }) => {
    const t = getTempReq(category);
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: t.bg, color: t.color, fontFamily: "Inter", whiteSpace: "nowrap" as const }}>{t.label}</span>;
  };

  const TempZonePill = ({ zone }: { zone: string }) => {
    if (zone === "Refrigerated") return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#EFF6FF", color: "#1B6CA8", fontFamily: "Inter" }}>Refrigerated</span>;
    if (zone === "Frozen") return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#F0F4FF", color: "#5B21B6", fontFamily: "Inter" }}>Frozen</span>;
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#F0FDF4", color: "#2E7D32", fontFamily: "Inter" }}>Ambient</span>;
  };

  const totalLocs = Object.keys(LOCATION_META).length;
  const totalSKUs = drugs.filter(d => d.location in LOCATION_META).length;
  const locsWithIssues = locationRows.filter(r => r.status !== "ok").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Tab header card */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>Storage Locations</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3, fontFamily: "Inter" }}>
            Bin assignments &mdash; {totalLocs} locations
          </div>
        </div>
        <button onClick={openCreateLoc} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 6, border: "none", background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Location
        </button>
      </div>

      {/* Problem alerts bar */}
      {problems.length > 0 && (
        <div style={{ background: criticalCount > 0 ? "#FFEBEE" : "#FFF3E0", border: `1px solid ${criticalCount > 0 ? "#FFCDD2" : "#FFCC80"}`, borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: criticalCount > 0 ? "#C62828" : "#E65100" }}>&#9888;</span>
          <div style={{ fontSize: 12, color: criticalCount > 0 ? "#C62828" : "#E65100", fontFamily: "Inter", fontWeight: 600 }}>
            {criticalCount > 0 ? `${criticalCount} location${criticalCount > 1 ? "s" : ""} at critical capacity` : ""}
            {criticalCount > 0 && problems.length - criticalCount > 0 ? " · " : ""}
            {problems.length - criticalCount > 0 ? `${problems.length - criticalCount} location${problems.length - criticalCount > 1 ? "s" : ""} need attention` : ""}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>
            Storage type: {STORAGE_LABEL[storageType]}
          </div>
        </div>
      )}

      {/* Main card */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
          <div style={{ position: "relative", flex: "0 0 280px" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Medicine / Location / Batch..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", paddingTop: 9, paddingBottom: 9, paddingLeft: 36, paddingRight: 12, borderRadius: 8, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", outline: "none", boxSizing: "border-box" as const }} />
          </div>

          {["All", "Low Stock", "Out of Stock"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontSize: 12, fontFamily: "Inter", fontWeight: filter === f ? 600 : 400, padding: "0 14px", borderRadius: 999, border: filter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: filter === f ? "#EFF6FF" : "#fff", color: filter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, minHeight: 40, boxSizing: "border-box" as const, flexShrink: 0 }}>
              {f}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button onClick={() => { setDetailMode(v => !v); setSelectedDrugIds(new Set()); }}
            style={{ fontSize: 12, fontFamily: "Inter", fontWeight: detailMode ? 600 : 400, padding: "0 14px", borderRadius: 999, border: detailMode ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: detailMode ? "#EFF6FF" : "#fff", color: detailMode ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, minHeight: 40, boxSizing: "border-box" as const, flexShrink: 0 }}>
            Group Detail
          </button>

          <button onClick={() => setFilterDrawer(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", minHeight: 40, borderRadius: 8, border: activeFilterCount > 0 ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: activeFilterCount > 0 ? "#EFF6FF" : "#fff", color: activeFilterCount > 0 ? "#1B6CA8" : "#1A2436", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: "#1B6CA8", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Bulk action bar — flat view */}
        {!detailMode && selectedDrugIds.size > 0 && (
          <div style={{ padding: "8px 14px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter" }}>{selectedDrugIds.size} selected</span>
            <button onClick={() => { setBulkMoveTo(""); setBulkMoveConfirmed(false); setBulkMoveModal(true); }}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid #1B6CA8", background: "#fff", color: "#1B6CA8", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Move to Location
            </button>
            <button onClick={() => showToast(`Labels queued for ${selectedDrugIds.size} medicine${selectedDrugIds.size !== 1 ? "s" : ""}`)}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1A2436", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Print Labels
            </button>
            <button onClick={() => { showToast(`${selectedDrugIds.size} medicine${selectedDrugIds.size !== 1 ? "s" : ""} marked for audit`); setSelectedDrugIds(new Set()); }}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1A2436", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Mark for Audit
            </button>
            <button onClick={() => setSelectedDrugIds(new Set())}
              style={{ marginLeft: "auto", fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none", background: "none", color: "#6B7280", cursor: "pointer", fontFamily: "Inter" }}>
              &times; Clear
            </button>
          </div>
        )}

        {/* Bulk action bar — details view */}
        {detailMode && selectedDrugIds.size > 0 && (
          <div style={{ padding: "8px 14px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter" }}>{selectedDrugIds.size} medicine{selectedDrugIds.size !== 1 ? "s" : ""} selected</span>
            <button onClick={() => { showToast(`Audit scheduled for ${selectedDrugIds.size} medicine${selectedDrugIds.size !== 1 ? "s" : ""}`); setSelectedDrugIds(new Set()); }}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid #1B6CA8", background: "#fff", color: "#1B6CA8", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Audit Selected
            </button>
            <button onClick={() => showToast(`Bin labels queued for ${selectedDrugIds.size} medicine${selectedDrugIds.size !== 1 ? "s" : ""}`)}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1A2436", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
              Print Bin Labels
            </button>
            <button onClick={() => setSelectedDrugIds(new Set())}
              style={{ marginLeft: "auto", fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none", background: "none", color: "#6B7280", cursor: "pointer", fontFamily: "Inter" }}>
              &times; Clear
            </button>
          </div>
        )}

        {/* Flat medicine-wise table (toggle OFF) */}
        {!detailMode && (
          <div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                    <th style={{ width: 40, padding: "9px 0 9px 14px" }}>
                      <input type="checkbox"
                        checked={drugPageRows.length > 0 && drugPageRows.every(r => selectedDrugIds.has(r.drug.id))}
                        onChange={() => toggleAllDrugs(drugPageRows)}
                        style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                    </th>
                    <ThCell>Location</ThCell>
                    <ThCell>Product Name</ThCell>
                    <ThCell>Batch</ThCell>
                    <ThCell>Expiry</ThCell>
                    <ThCell>Temp Req.</ThCell>
                    <ThCell>Stock</ThCell>
                    <ThCell>Max Stock</ThCell>
                    <ThCell w={140}>Capacity</ThCell>
                    <ThCell>Status</ThCell>
                    <ThCell>Actions</ThCell>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let groupIdx = -1;
                    let lastLoc = "";
                    return drugPageRows.map(row => {
                      if (row.locId !== lastLoc) { groupIdx++; lastLoc = row.locId; }
                      const isSelected = selectedDrugIds.has(row.drug.id);
                      const bg = isSelected ? "#EFF6FF" : groupIdx % 2 === 0 ? "#fff" : "#FAFBFD";
                      const menuKey = `drug-${row.drug.id}`;
                      const da = row.drug as any;
                      return (
                        <tr key={`${row.locId}-${row.drug.id}`} style={{ borderBottom: "1px solid #EEF1F6", background: bg }}>
                          <td style={{ padding: "10px 0 10px 14px" }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleDrugSelect(row.drug.id)}
                              style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                          </td>
                          <td style={{ padding: "11px 12px", whiteSpace: "nowrap" as const }}>
                            <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{row.locId}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{row.meta.zone}</div>
                          </td>
                          <td style={{ padding: "11px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{row.drug.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{row.drug.category} · {row.drug.manufacturer}</div>
                          </td>
                          <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>
                            {da.batchId ?? "—"}
                          </td>
                          <td style={{ padding: "11px 12px" }}>
                            <ExpiryBadge expiry={row.drug.expiry} />
                          </td>
                          <td style={{ padding: "11px 12px" }}>
                            <TempReqPill category={row.drug.category} />
                          </td>
                          <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 13, color: row.drug.stock === 0 ? "#C62828" : row.drug.stock < row.drug.minStock ? "#E65100" : "#1A2436", whiteSpace: "nowrap" as const }}>
                            {row.drug.stock.toLocaleString()} {abbr(row.drug.unit)}
                          </td>
                          <td style={{ padding: "11px 12px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" as const }}>
                            {row.meta.maxCapacity.toLocaleString()} {abbr(row.drug.unit)}
                          </td>
                          <td style={{ padding: "11px 12px" }}>
                            {(() => {
                              const pct = locFillPct(row.locId);
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: fillColor(pct), borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: fillColor(pct), fontWeight: 600, minWidth: 32 }}>{pct}%</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "11px 12px", whiteSpace: "nowrap" as const }}>
                            <DrugStatusPill drug={row.drug} />
                          </td>
                          <td style={{ padding: "11px 12px" }}>
                            <div style={{ position: "relative" }}>
                              <button onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                                style={{ fontSize: 16, padding: "2px 8px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#6B7280", cursor: "pointer", fontFamily: "Inter", lineHeight: 1 }}>
                                &#x22EE;
                              </button>
                              {openMenu === menuKey && (
                                <>
                                  <div onClick={() => setOpenMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
                                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, boxShadow: "0 4px 16px rgba(12,27,51,0.12)", zIndex: 300, minWidth: 180, overflow: "hidden" }}>
                                    {[
                                      { label: "Move",            color: "#1B6CA8", fw: 600, onClick: () => openMove(row.drug) },
                                      { label: "Edit Location",   color: "#1A2436", fw: 400, onClick: () => openEditLoc(row.locId) },
                                      { label: "Move History",    color: "#1A2436", fw: 400, onClick: () => { setMhDateFilter("all"); setMoveHistoryModal({ drug: row.drug }); } },
                                      { label: "Mark for Audit",  color: "#1A2436", fw: 400, onClick: () => openAuditModal(row.locId) },
                                      { label: "Clear Bin",       color: "#E65100", fw: 400, onClick: () => showToast(`Bin ${row.locId} cleared`) },
                                      { label: "Deactivate Bin",  color: "#C62828", fw: 400, onClick: () => showToast(`Bin ${row.locId} deactivated`) },
                                    ].map((item, i, arr) => (
                                      <button key={item.label} onClick={() => { setOpenMenu(null); item.onClick(); }}
                                        style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left" as const, fontSize: 13, fontFamily: "Inter", color: item.color, fontWeight: item.fw, background: "none", border: "none", borderBottom: i < arr.length - 1 ? "1px solid #F0F3F7" : "none", cursor: "pointer" }}>
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {filteredDrugs.length === 0
              ? <div style={{ padding: "48px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No medicines match your search.</div>
              : <PaginationFooter {...drugFooterProps} />
            }
          </div>
        )}

        {/* Grouped / collapsible location table (toggle ON) */}
        {detailMode && (
          <div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                    <th style={{ width: 40, padding: "9px 0 9px 14px" }}>
                      {(() => {
                        const allDrugIds = locPageRows.flatMap(r => r.items.map(d => d.id));
                        const allSel = allDrugIds.length > 0 && allDrugIds.every(id => selectedDrugIds.has(id));
                        const someSel = allDrugIds.some(id => selectedDrugIds.has(id));
                        return (
                          <input type="checkbox" checked={allSel}
                            ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                            onChange={() => toggleAllLocDrugs(locPageRows)}
                            style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                        );
                      })()}
                    </th>
                    <ThCell w={32}></ThCell>
                    <ThCell>Location</ThCell>
                    <ThCell>Zone / Label</ThCell>
                    <ThCell>Rack Type</ThCell>
                    <ThCell>Temp Zone</ThCell>
                    <ThCell>SKUs</ThCell>
                    <ThCell w={160}>Capacity</ThCell>
                    <ThCell>Last Audit</ThCell>
                    <ThCell>Status</ThCell>
                    <ThCell>Actions</ThCell>
                  </tr>
                </thead>
                <tbody>
                  {locPageRows.map((row, idx) => {
                    const isExpanded = expandedLocs.has(row.locId);
                    const allChildSel = row.items.length > 0 && row.items.every(d => selectedDrugIds.has(d.id));
                    const someChildSel = row.items.some(d => selectedDrugIds.has(d.id));
                    const rowBg = (allChildSel || someChildSel) ? "#EFF6FF" : idx % 2 === 0 ? "#fff" : "#FAFBFD";
                    const menuKey = `loc-${row.locId}`;
                    return (
                      <>
                        <tr key={row.locId} style={{ borderBottom: isExpanded ? "none" : "1px solid #EEF1F6", background: rowBg }}>
                          <td style={{ padding: "10px 0 10px 14px" }}>
                            {(() => {
                              const allSel = row.items.length > 0 && row.items.every(d => selectedDrugIds.has(d.id));
                              const someSel = row.items.some(d => selectedDrugIds.has(d.id));
                              return (
                                <input type="checkbox" checked={allSel}
                                  ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                                  onChange={() => toggleLocDrugs(row.items)}
                                  style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer" }} />
                              );
                            })()}
                          </td>
                          <td style={{ padding: "10px 0 10px 12px" }}>
                            <button onClick={() => toggleExpand(row.locId)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>
                              {isExpanded
                                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                              }
                            </button>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{row.locId}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{row.meta.label}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{row.meta.zone}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436", whiteSpace: "nowrap" as const }}>
                            {row.meta.rackType}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <TempZonePill zone={row.meta.tempZone} />
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#1A2436" }}>
                            {row.items.length}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "#EEF1F6", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${row.fillPct}%`, background: fillColor(row.fillPct), borderRadius: 3, transition: "width 0.3s" }} />
                              </div>
                              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: fillColor(row.fillPct), fontWeight: 600, minWidth: 32 }}>{row.fillPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>
                            {row.meta.lastAudit}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <StatusPill status={row.status} />
                          </td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button onClick={() => showToast(`Audit scheduled for ${row.locId}`)}
                                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                                Audit
                              </button>
                              <div style={{ position: "relative" }}>
                                <button onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                                  style={{ fontSize: 16, padding: "2px 8px", borderRadius: 5, border: "1px solid #DDE3EC", background: "#fff", color: "#6B7280", cursor: "pointer", fontFamily: "Inter", lineHeight: 1 }}>
                                  &#x22EE;
                                </button>
                                {openMenu === menuKey && (
                                  <>
                                    <div onClick={() => setOpenMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
                                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, boxShadow: "0 4px 16px rgba(12,27,51,0.12)", zIndex: 300, minWidth: 160, overflow: "hidden" }}>
                                      <button onClick={() => { setOpenMenu(null); openEditLoc(row.locId); }}
                                        style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", fontSize: 13, fontFamily: "Inter", color: "#1A2436", background: "none", border: "none", borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}>
                                        Edit Bin
                                      </button>
                                      <button onClick={() => { setOpenMenu(null); showToast(`Bin ${row.locId} cleared`); }}
                                        style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", fontSize: 13, fontFamily: "Inter", color: "#C62828", background: "none", border: "none", borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}>
                                        Clear Bin
                                      </button>
                                      <button onClick={() => { setOpenMenu(null); showToast(`Viewing history for ${row.locId}`); }}
                                        style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", fontSize: 13, fontFamily: "Inter", color: "#1A2436", background: "none", border: "none", cursor: "pointer" }}>
                                        View History
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: "#F0F3F7", borderBottom: "1px solid #E8ECF4" }}>
                            <th style={{ width: 40 }} />
                            <th />
                            <th />
                            {[["Product", 20], ["Batch", 12], ["Temp Req.", 12], ["—", 12], ["Stock", 12], ["Last Move", 12], ["Status", 12]].map(([label, pl], i) => (
                              <th key={i} style={{ padding: `6px 12px 6px ${pl}px`, textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>
                                {label}
                              </th>
                            ))}
                            <th />
                          </tr>
                        )}
                        {isExpanded && row.items.map((drug, di) => {
                          const da = drug as any;
                          const isDrugSelected = selectedDrugIds.has(drug.id);
                          return (
                            <tr key={`${row.locId}-exp-${drug.id}`} style={{ background: isDrugSelected ? "#EFF6FF" : "#F8FAFC", borderBottom: di === row.items.length - 1 ? "1px solid #EEF1F6" : "1px solid #F0F3F7" }}>
                              <td />
                              <td />
                              <td />
                              <td style={{ padding: "8px 12px", paddingLeft: 20 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                  <input type="checkbox" checked={isDrugSelected} onChange={() => toggleDrugSelect(drug.id)}
                                    style={{ width: 14, height: 14, accentColor: "#1B6CA8", cursor: "pointer", marginTop: 2, flexShrink: 0 }} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{drug.name}</div>
                                    <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{drug.category} · {drug.manufacturer}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>
                                {da.batchId ?? "—"}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <TempReqPill category={drug.category} />
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>—</td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: drug.stock === 0 ? "#C62828" : drug.stock < drug.minStock ? "#E65100" : "#1A2436", whiteSpace: "nowrap" as const }}>
                                {drug.stock.toLocaleString()} {abbr(drug.unit)}
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" as const }}>
                                {da.lastMove ?? "—"}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                {drug.stock === 0
                                  ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#FFEBEE", color: "#C62828", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>Out of Stock</span>
                                  : drug.stock < drug.minStock
                                    ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#FFF3E0", color: "#E65100", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>Low Stock</span>
                                    : <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#E8F5E9", color: "#2E7D32", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>In Stock</span>
                                }
                              </td>
                              <td />
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredLocs.length === 0
              ? <div style={{ padding: "48px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No locations match your search.</div>
              : <PaginationFooter {...locFooterProps} />
            }
          </div>
        )}
      </div>

      {/* ── Cold Chain Temperature Log (shown when COLD-01 is expanded) ── */}
      {expandedLocs.has("COLD-01") && (() => {
        const last = COLD_LOG[COLD_LOG.length - 1];
        const inRange = last.tempC >= 2 && last.tempC <= 8;
        const excursions = COLD_LOG.filter(r => r.tempC < 2 || r.tempC > 8);
        const display = COLD_LOG.slice(-8);

        // SVG sparkline (120×40)
        const minT = 0; const maxT = 12;
        const W = 120; const H = 40;
        const pts = COLD_LOG.slice(-12).map((r, i, arr) => {
          const x = Math.round(i / (arr.length - 1) * W);
          const y = Math.round(H - (r.tempC - minT) / (maxT - minT) * H);
          return `${x},${y}`;
        }).join(" ");
        const safeY1 = Math.round(H - (8 - minT) / (maxT - minT) * H);
        const safeY2 = Math.round(H - (2 - minT) / (maxT - minT) * H);

        return (
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Temperature Log — COLD-01</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#EFF6FF", color: "#1B6CA8" }}>Range: 2°C – 8°C</span>
              <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{COLD_LOG[0].ts.slice(0, 10)} – {COLD_LOG[COLD_LOG.length - 1].ts.slice(0, 10)}</span>
            </div>

            {excursions.length > 0 && (
              <div style={{ background: "#FFEBEE", borderBottom: "1px solid #FFCDD2", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#C62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#C62828" }}>Temperature excursion detected</span>
                <span style={{ fontSize: 12, color: "#9B1C1C" }}>{excursions.map(e => `${e.ts} (${e.tempC}°C)`).join(", ")}</span>
              </div>
            )}

            <div style={{ padding: "16px 20px", display: "flex", gap: 24, alignItems: "flex-start" }}>
              {/* Latest reading */}
              <div style={{ flexShrink: 0, textAlign: "center" as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Latest Reading</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 32, fontWeight: 800, color: inRange ? "#2E7D32" : "#C62828" }}>{last.tempC}°C</div>
                <div style={{ fontSize: 11, color: inRange ? "#2E7D32" : "#C62828", marginTop: 2 }}>{inRange ? "In Range" : "Excursion"}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, fontFamily: "JetBrains Mono" }}>{last.ts}</div>
              </div>

              {/* Sparkline */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Last 12 Readings</div>
                <svg width={W} height={H} style={{ display: "block" }}>
                  <rect x={0} y={safeY1} width={W} height={safeY2 - safeY1} fill="#2E7D32" opacity={0.12} />
                  <polyline points={pts} fill="none" stroke="#1B6CA8" strokeWidth={1.5} />
                  {COLD_LOG.slice(-12).map((r, i, arr) => {
                    const x = Math.round(i / (arr.length - 1) * W);
                    const y = Math.round(H - (r.tempC - minT) / (maxT - minT) * H);
                    const bad = r.tempC < 2 || r.tempC > 8;
                    return bad ? <circle key={i} cx={x} cy={y} r={3} fill="#C62828" /> : null;
                  })}
                </svg>
              </div>

              {/* Last 8 readings table */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Recent Readings</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Timestamp", "Temp", "Status"].map(h => (
                        <th key={h} style={{ padding: "4px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, textAlign: "left" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {display.map((r, i) => {
                      const ok = r.tempC >= 2 && r.tempC <= 8;
                      return (
                        <tr key={i} style={{ background: !ok ? "#FFEBEE" : "transparent" }}>
                          <td style={{ padding: "3px 8px", fontFamily: "JetBrains Mono", fontSize: 11, color: "#6B7280" }}>{r.ts}</td>
                          <td style={{ padding: "3px 8px", fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 12, color: ok ? "#1A2436" : "#C62828" }}>{r.tempC}°C</td>
                          <td style={{ padding: "3px 8px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: ok ? "#E8F5E9" : "#FFEBEE", color: ok ? "#2E7D32" : "#C62828" }}>{ok ? "In Range" : "Excursion"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter Drawer */}
      {filterDrawer && (
        <>
          <div onClick={() => setFilterDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 200 }} />
          <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 360, background: "#fff", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(12,27,51,0.12)" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Filters</div>
                {activeFilterCount > 0 && (
                  <div style={{ fontSize: 12, color: "#1B6CA8", marginTop: 2, fontFamily: "Inter" }}>
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active · {filteredDrugs.length} result{filteredDrugs.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} style={{ fontSize: 12, color: "#C62828", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>Clear all</button>
                )}
                <button onClick={() => setFilterDrawer(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              <div style={{ paddingTop: 20, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Medicine Stock Status</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {["All", "Low Stock", "Out of Stock"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: "Inter", fontWeight: filter === f ? 600 : 400, cursor: "pointer", border: filter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: filter === f ? "#EFF6FF" : "#fff", color: filter === f ? "#1B6CA8" : "#6B7280" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Zone / Rack</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {ALL_ZONES.map(zone => {
                    const on = fZones.includes(zone);
                    const binCount = Object.entries(LOCATION_META).filter(([, m]) => m.zone === zone).length;
                    return (
                      <label key={zone} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={() => setFZones(prev => on ? prev.filter(z => z !== zone) : [...prev, zone])}
                          style={{ width: 15, height: 15, accentColor: "#1B6CA8", cursor: "pointer" }} />
                        <span style={{ flex: 1, fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{zone}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{binCount} bin{binCount !== 1 ? "s" : ""}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Bin / Location</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {Object.entries(LOCATION_META).sort(([a], [b]) => a.localeCompare(b)).map(([loc, meta]) => {
                    const on = fBins.includes(loc);
                    return (
                      <button key={loc} onClick={() => setFBins(prev => on ? prev.filter(l => l !== loc) : [...prev, loc])} title={meta.label}
                        style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontFamily: "JetBrains Mono", cursor: "pointer", border: on ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: on ? "#EFF6FF" : "#F8FAFC", color: on ? "#1B6CA8" : "#6B7280", fontWeight: on ? 600 : 400 }}>
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid #F0F3F7" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Location Fill Status</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {([
                    ["ok",       "OK",       "#E8F5E9", "#2E7D32"],
                    ["low",      "Attention","#FFF3E0", "#E65100"],
                    ["critical", "Critical", "#FFEBEE", "#C62828"],
                  ] as const).map(([val, label, bg, color]) => {
                    const on = fFillStatus.includes(val);
                    return (
                      <button key={val} onClick={() => setFFillStatus(prev => on ? prev.filter(s => s !== val) : [...prev, val])}
                        style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: "Inter", fontWeight: on ? 600 : 400, cursor: "pointer", border: on ? `1.5px solid ${color}` : "1px solid #DDE3EC", background: on ? bg : "#fff", color: on ? color : "#6B7280" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Capacity Fill %</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontFamily: "Inter" }}>Min %</div>
                    <input type="number" value={fFillRange[0]} min={0} max={fFillRange[1]} onChange={e => setFFillRange([Number(e.target.value), fFillRange[1]])}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ color: "#9CA3AF", marginTop: 16, fontFamily: "Inter" }}>—</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontFamily: "Inter" }}>Max %</div>
                    <input type="number" value={fFillRange[1]} min={fFillRange[0]} max={100} onChange={e => setFFillRange([fFillRange[0], Number(e.target.value)])}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={resetFilters} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", fontWeight: 600 }}>Reset</button>
              <button onClick={() => setFilterDrawer(false)} style={{ flex: 2, padding: "10px 0", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Apply · {detailMode ? filteredLocs.length : filteredDrugs.length} result{(detailMode ? filteredLocs.length : filteredDrugs.length) !== 1 ? "s" : ""}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Single Move Modal */}
      {moveModal && (
        <>
          <div onClick={() => setMoveModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width: 480, zIndex: 201, boxShadow: "0 8px 32px rgba(12,27,51,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Move Stock</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Inter" }}>{moveModal.drug.name}</div>
              </div>
              <button onClick={() => setMoveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>From</div>
                  <div style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#F8FAFC", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{moveModal.drug.location}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{LOCATION_META[moveModal.drug.location]?.label ?? moveModal.drug.location}</div>
                </div>
                <div style={{ flex: 1, position: "relative" as const }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>To</div>
                  {/* Search input */}
                  <div style={{ position: "relative" as const }}>
                    <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={moveTo ? moveTo : moveToSearch}
                      placeholder="Search location..."
                      onFocus={() => { setMoveToOpen(true); if (moveTo) { setMoveTo(""); setMoveToSearch(""); } }}
                      onChange={e => { setMoveToSearch(e.target.value); setMoveTo(""); setMoveToOpen(true); }}
                      style={{ width: "100%", padding: "9px 12px 9px 30px", borderRadius: 6, border: `1px solid ${moveToOpen ? "#1B6CA8" : "#DDE3EC"}`, fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", boxSizing: "border-box" as const, background: "#fff" }}
                    />
                    {moveTo && (
                      <button onClick={() => { setMoveTo(""); setMoveToSearch(""); setMoveToOpen(true); }}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 14, lineHeight: 1, padding: 2 }}>
                        &times;
                      </button>
                    )}
                  </div>
                  {/* Selected label */}
                  {moveTo && LOCATION_META[moveTo] && (
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{LOCATION_META[moveTo].label}</div>
                  )}
                  {/* Results dropdown */}
                  {moveToOpen && !moveTo && (() => {
                    const q = moveToSearch.toLowerCase();
                    const suggested = getSmartSuggestions(moveModal.drug, storageType, moveModal.drug.location);
                    const allLocs = Object.keys(LOCATION_META).filter(k => k !== moveModal.drug.location);
                    const filtered = allLocs.filter(k =>
                      !q || k.toLowerCase().includes(q) ||
                      (LOCATION_META[k]?.zone ?? "").toLowerCase().includes(q) ||
                      (LOCATION_META[k]?.label ?? "").toLowerCase().includes(q)
                    );
                    const suggestedFiltered = suggested.filter(k => filtered.includes(k));
                    const otherFiltered = filtered.filter(k => !suggested.includes(k));
                    if (filtered.length === 0) return (
                      <div style={{ position: "absolute" as const, top: "calc(100% + 2px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, zIndex: 310, padding: "12px", textAlign: "center" as const, fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>
                        No locations found
                      </div>
                    );
                    const renderItem = (loc: string, isSuggested: boolean) => (
                      <div key={loc} onMouseDown={() => { setMoveTo(loc); setMoveToSearch(""); setMoveToOpen(false); }}
                        style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{loc}</span>
                          <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{LOCATION_META[loc]?.zone}</span>
                        </div>
                        {isSuggested && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#EFF6FF", color: "#1B6CA8", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>Suggested</span>}
                      </div>
                    );
                    return (
                      <div style={{ position: "absolute" as const, top: "calc(100% + 2px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, zIndex: 310, maxHeight: 200, overflowY: "auto" as const, boxShadow: "0 4px 12px rgba(12,27,51,0.10)" }}>
                        {suggestedFiltered.length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Suggested</div>
                            {suggestedFiltered.map(loc => renderItem(loc, true))}
                          </>
                        )}
                        {otherFiltered.length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.06em", borderTop: suggestedFiltered.length > 0 ? "1px solid #EEF1F6" : "none" }}>All Locations</div>
                            {otherFiltered.map(loc => renderItem(loc, false))}
                          </>
                        )}
                      </div>
                    );
                  })()}
                  {/* Backdrop to close dropdown */}
                  {moveToOpen && !moveTo && (
                    <div onClick={() => setMoveToOpen(false)} style={{ position: "fixed" as const, inset: 0, zIndex: 309 }} />
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Quantity <span style={{ fontFamily: "JetBrains Mono", color: "#9CA3AF", textTransform: "none", fontSize: 11 }}>(available: {moveModal.drug.stock} {moveModal.drug.unit})</span>
                </div>
                <input type="number" min={1} max={moveModal.drug.stock} value={moveQty} onChange={e => setMoveQty(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason</div>
                <textarea value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="e.g. Reorganising rack, capacity overflow..." rows={2}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", color: "#1A2436", resize: "none", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #EEF1F6", paddingTop: 16 }}>
                <button onClick={() => setMoveModal(null)} style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={handleMoveConfirm} disabled={!moveTo || !moveQty || moveConfirmed}
                  style={{ padding: "9px 22px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: !moveTo || !moveQty ? "default" : "pointer", color: "#fff", fontFamily: "Inter", transition: "background 0.2s", background: moveConfirmed ? "#2E7D32" : !moveTo || !moveQty ? "#A0AEC0" : "#1B6CA8" }}>
                  {moveConfirmed ? "Moved!" : "Confirm Move"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Move Modal */}
      {bulkMoveModal && (
        <>
          <div onClick={() => setBulkMoveModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width: 480, zIndex: 201, boxShadow: "0 8px 32px rgba(12,27,51,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Bulk Move Medicines</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Inter" }}>{selectedDrugIds.size} medicine{selectedDrugIds.size !== 1 ? "s" : ""} selected</div>
              </div>
              <button onClick={() => setBulkMoveModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 8, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>Selected Medicines</div>
                <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #EEF1F6", borderRadius: 6, padding: "4px 12px" }}>
                  {drugs.filter(d => selectedDrugIds.has(d.id)).map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F8FAFC", fontSize: 13, fontFamily: "Inter", color: "#1A2436" }}>
                      <span>{d.name}</span>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{d.location}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>Move All To</div>
                <select value={bulkMoveTo} onChange={e => setBulkMoveTo(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", background: "#fff", outline: "none" }}>
                  <option value="">Select target location...</option>
                  {Object.entries(LOCATION_META).map(([loc, meta]) => (
                    <option key={loc} value={loc}>{loc} — {meta.zone}</option>
                  ))}
                </select>
                {bulkMoveTo && LOCATION_META[bulkMoveTo] && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>{LOCATION_META[bulkMoveTo].label}</div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #EEF1F6", paddingTop: 16 }}>
                <button onClick={() => setBulkMoveModal(false)} style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Cancel</button>
                <button onClick={handleBulkMoveConfirm} disabled={!bulkMoveTo || bulkMoveConfirmed}
                  style={{ padding: "9px 22px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: !bulkMoveTo ? "default" : "pointer", color: "#fff", fontFamily: "Inter", transition: "background 0.2s", background: bulkMoveConfirmed ? "#2E7D32" : !bulkMoveTo ? "#A0AEC0" : "#1B6CA8" }}>
                  {bulkMoveConfirmed ? "Moved!" : `Move ${selectedDrugIds.size} Medicine${selectedDrugIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mark for Audit Modal */}
      {auditModal && (() => {
        const locId = auditModal.locId;
        const meta = LOCATION_META[locId];
        const locationLabel = meta ? `${locId} — ${meta.label}` : locId;
        const AUDIT_TYPES = ["Full Count", "Spot Check", "Expiry Check"];
        const PRIORITIES  = ["High", "Medium", "Low"];
        const priorityColors: Record<string, { bg: string; color: string }> = {
          High:   { bg: "#FFEBEE", color: "#C62828" },
          Medium: { bg: "#FFF3E0", color: "#E65100" },
          Low:    { bg: "#E8F5E9", color: "#2E7D32" },
        };
        function AuditDrop({ field, options, placeholder, renderOption }: {
          field: "auditType" | "priority" | "assignTo";
          options: string[];
          placeholder: string;
          renderOption?: (o: string) => ReactNode;
        }) {
          const val = auditForm[field];
          const hasErr = !!(auditErrors as any)[field];
          const isOpen = auditOpenDrop === field;
          return (
            <div style={{ position: "relative" }}>
              {isOpen && <div style={{ position: "fixed", inset: 0, zIndex: 309 }} onMouseDown={() => setAuditOpenDrop(null)} />}
              <button
                type="button"
                onClick={() => setAuditOpenDrop(isOpen ? null : field)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px",
                  borderLeft: val ? `3px solid ${hasErr ? "#C62828" : "#DDE3EC"}` : `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
                  borderTop: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
                  borderRight: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
                  borderBottom: `1px solid ${hasErr ? "#C62828" : "#DDE3EC"}`,
                  borderRadius: 6, background: "#fff", cursor: "pointer",
                  fontFamily: "Inter", fontSize: 13, color: val ? "#0C1B33" : "#9CA3AF",
                }}
              >
                <span>{val || placeholder}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {isOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                  background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 310, overflow: "hidden",
                }}>
                  {options.map(o => {
                    const selected = val === o;
                    return (
                      <div
                        key={o}
                        onMouseDown={() => { setAuditField(field, o); setAuditOpenDrop(null); }}
                        style={{
                          padding: "10px 14px",
                          paddingLeft: selected ? 11 : 14,
                          borderLeft: selected ? "3px solid #1B6CA8" : "3px solid transparent",
                          cursor: "pointer", fontFamily: "Inter", fontSize: 13,
                          color: selected ? "#1B6CA8" : "#1A2436",
                          fontWeight: selected ? 700 : 400,
                          background: "#fff",
                        }}
                        onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                      >
                        {renderOption ? renderOption(o) : o}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        return (
          <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 }} onClick={() => setAuditModal(null)} />
            <div style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              zIndex: 201, background: "#fff", borderRadius: 10,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)", width: 480, maxWidth: "calc(100vw - 32px)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#E65100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 12h6M9 16h4" stroke="#E65100" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Mark for Audit</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginTop: 1 }}>Schedule an audit for this bin location</div>
                </div>
                <button onClick={() => setAuditModal(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "65vh" }}>
                {/* Location (read-only) */}
                <div>
                  <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#F8FAFC", border: "1px solid #DDE3EC", borderRadius: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#6B7280" strokeWidth="1.8" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{locationLabel}</span>
                  </div>
                </div>

                {/* Two columns: Audit Type + Priority */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Audit Type <span style={{ color: "#C62828" }}>*</span>
                    </label>
                    <AuditDrop field="auditType" options={AUDIT_TYPES} placeholder="Select type" />
                    {auditErrors.auditType && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{auditErrors.auditType}</div>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Priority <span style={{ color: "#C62828" }}>*</span>
                    </label>
                    <AuditDrop
                      field="priority"
                      options={PRIORITIES}
                      placeholder="Select priority"
                      renderOption={o => (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColors[o]?.color, flexShrink: 0 }} />
                          {o}
                        </span>
                      )}
                    />
                    {auditErrors.priority && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{auditErrors.priority}</div>}
                  </div>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Scheduled Date <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={auditForm.scheduledDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setAuditField("scheduledDate", e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      borderLeft: auditForm.scheduledDate ? `3px solid ${auditErrors.scheduledDate ? "#C62828" : "#DDE3EC"}` : `1px solid ${auditErrors.scheduledDate ? "#C62828" : "#DDE3EC"}`,
                      borderTop: `1px solid ${auditErrors.scheduledDate ? "#C62828" : "#DDE3EC"}`,
                      borderRight: `1px solid ${auditErrors.scheduledDate ? "#C62828" : "#DDE3EC"}`,
                      borderBottom: `1px solid ${auditErrors.scheduledDate ? "#C62828" : "#DDE3EC"}`,
                      borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 13, color: "#0C1B33", outline: "none",
                    }}
                  />
                  {auditErrors.scheduledDate && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{auditErrors.scheduledDate}</div>}
                </div>

                {/* Assign To */}
                <div>
                  <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Assign To <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <AuditDrop field="assignTo" options={STAFF} placeholder="Select staff member" />
                  {auditErrors.assignTo && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{auditErrors.assignTo}</div>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes <span style={{ fontSize: 11, fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <textarea
                    value={auditForm.notes}
                    onChange={e => setAuditField("notes", e.target.value)}
                    placeholder="Any specific instructions or observations for the auditor..."
                    rows={3}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      border: "1px solid #DDE3EC", borderRadius: 6, resize: "vertical",
                      fontFamily: "Inter", fontSize: 13, color: "#0C1B33", outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setAuditModal(null)} style={{ padding: "8px 18px", border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", fontFamily: "Inter", fontSize: 13, fontWeight: 500, color: "#1A2436", cursor: "pointer" }}>Cancel</button>
                <button onClick={submitAudit} style={{ padding: "8px 20px", border: "none", borderRadius: 6, background: "#1B6CA8", fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                  Schedule Audit
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Move History Modal */}
      {moveHistoryModal && (() => {
        const drug = moveHistoryModal.drug;
        const allHistory = getMoveHistory(drug);
        const now = new Date("2026-09-28");
        const filtered = allHistory.filter(h => {
          if (mhDateFilter === "7d")  return (now.getTime() - new Date(h.date).getTime()) / 86400000 <= 7;
          if (mhDateFilter === "30d") return (now.getTime() - new Date(h.date).getTime()) / 86400000 <= 30;
          if (mhDateFilter === "90d") return (now.getTime() - new Date(h.date).getTime()) / 86400000 <= 90;
          return true;
        });
        const statusStyle = (s: string) => {
          if (s === "Completed") return { bg: "#E8F5E9", color: "#2E7D32" };
          if (s === "Pending")   return { bg: "#FFF3E0", color: "#E65100" };
          return                        { bg: "#FFEBEE", color: "#C62828" };
        };
        return (
          <>
            <div onClick={() => setMoveHistoryModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width: 700, maxWidth: "95vw", zIndex: 201, boxShadow: "0 8px 32px rgba(12,27,51,0.18)", overflow: "hidden", display: "flex", flexDirection: "column" as const, maxHeight: "85vh" }}>

              {/* Header */}
              <div style={{ padding: "18px 22px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Move History</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Inter", color: "#1A2436", fontWeight: 500 }}>{drug.name}</span>
                    <span style={{ color: "#DDE3EC" }}>·</span>
                    <span>Current location:</span>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#1B6CA8", background: "#EFF6FF", padding: "1px 7px", borderRadius: 4 }}>{drug.location}</span>
                  </div>
                </div>
                <button onClick={() => setMoveHistoryModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>&times;</button>
              </div>

              {/* Filters + summary bar */}
              <div style={{ padding: "12px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" as const }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>Date range:</span>
                {[["all","All time"],["7d","Last 7 days"],["30d","Last 30 days"],["90d","Last 90 days"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setMhDateFilter(val)}
                    style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, border: `1px solid ${mhDateFilter === val ? "#1B6CA8" : "#DDE3EC"}`, background: mhDateFilter === val ? "#EFF6FF" : "#fff", color: mhDateFilter === val ? "#1B6CA8" : "#6B7280", fontWeight: mhDateFilter === val ? 600 : 400, cursor: "pointer", fontFamily: "Inter" }}>
                    {lbl}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Table */}
              <div style={{ overflowY: "auto" as const, overflowX: "auto" as const, flex: 1 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "56px 0", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>&#128197;</div>
                    No move records found for this period.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>
                        {["Date & Time", "From", "To", "Qty", "Reason", "Moved By", "Status"].map(h => (
                          <th key={h} style={{ padding: "9px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((h, i) => {
                        const ss = statusStyle(h.status);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #F0F3F7", background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                            <td style={{ padding: "11px 16px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{h.date}</div>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{h.time}</div>
                            </td>
                            <td style={{ padding: "11px 16px", whiteSpace: "nowrap" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#E65100", background: "#FFF3E0", padding: "2px 7px", borderRadius: 4 }}>{h.from}</span>
                            </td>
                            <td style={{ padding: "11px 16px", whiteSpace: "nowrap" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: "#2E7D32", background: "#E8F5E9", padding: "2px 7px", borderRadius: 4 }}>{h.to}</span>
                            </td>
                            <td style={{ padding: "11px 16px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436", whiteSpace: "nowrap" as const }}>{h.qty} {abbr(h.unit)}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12, color: "#6B7280", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>{h.reason}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12, color: "#1A2436", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>{h.movedBy}</td>
                            <td style={{ padding: "11px 16px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: ss.bg, color: ss.color, fontFamily: "Inter", whiteSpace: "nowrap" as const }}>{h.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                <button onClick={() => setMoveHistoryModal(null)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Close</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Edit Location Modal */}
      {editLocModal && (
        <>
          <div onClick={() => setEditLocModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width: 520, zIndex: 201, boxShadow: "0 8px 32px rgba(12,27,51,0.18)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Edit Location</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>Update settings for bin <span style={{ fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{editLocModal}</span></div>
              </div>
              <button onClick={() => setEditLocModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>&times;</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" as const }}>

              {/* Location ID — read only */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Location ID
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: "#9CA3AF", textTransform: "none" as const }}>read-only</span>
                </label>
                <div style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #EEF1F6", background: "#F8FAFC", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {editLocForm.locId}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>

              {/* Row 1: Label + Zone */}
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Label / Name <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input value={editLocForm.label} onChange={e => setEditLocField("label", e.target.value)}
                    placeholder="e.g. Front Shelf A"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${editLocErrors.label ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {editLocErrors.label && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{editLocErrors.label}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Zone <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input value={editLocForm.zone} onChange={e => setEditLocField("zone", e.target.value)}
                    placeholder="e.g. Zone A"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${editLocErrors.zone ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {editLocErrors.zone && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{editLocErrors.zone}</div>}
                </div>
              </div>

              {/* Row 2: Max Capacity */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Max Capacity (units) <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input type="number" min={1} value={editLocForm.maxCapacity} onChange={e => setEditLocField("maxCapacity", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${editLocErrors.maxCapacity ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                {editLocErrors.maxCapacity && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{editLocErrors.maxCapacity}</div>}
              </div>

              {/* Row 3: Rack Type + Temp Zone */}
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Rack Type <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <div style={{ position: "relative" as const }}>
                    <button type="button" onClick={() => setEditLocOpenDrop(editLocOpenDrop === "rackType" ? null : "rackType")}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${editLocErrors.rackType ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: editLocForm.rackType ? "#1A2436" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const }}>
                      <span>{editLocForm.rackType || "Select rack type..."}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: editLocOpenDrop === "rackType" ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {editLocOpenDrop === "rackType" && (
                      <>
                        <div onClick={() => setEditLocOpenDrop(null)} style={{ position: "fixed", inset: 0, zIndex: 309 }} />
                        <div style={{ position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 6px 20px rgba(12,27,51,0.12)", zIndex: 310, overflow: "hidden" }}>
                          {["Shelf Rack", "Drawer", "Counter", "Cold Unit", "High Shelf"].map(t => (
                            <div key={t} onMouseDown={() => { setEditLocField("rackType", t); setEditLocOpenDrop(null); }}
                              style={{ padding: "10px 14px", paddingLeft: editLocForm.rackType === t ? 11 : 14, fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: editLocForm.rackType === t ? "#1B6CA8" : "#1A2436", fontWeight: editLocForm.rackType === t ? 700 : 400, background: "transparent", borderLeft: editLocForm.rackType === t ? "3px solid #1B6CA8" : "3px solid transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {t}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {editLocErrors.rackType && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{editLocErrors.rackType}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Temperature Zone <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <div style={{ position: "relative" as const }}>
                    <button type="button" onClick={() => setEditLocOpenDrop(editLocOpenDrop === "tempZone" ? null : "tempZone")}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${editLocErrors.tempZone ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: editLocForm.tempZone ? "#1A2436" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const }}>
                      <span>{editLocForm.tempZone || "Select temperature zone..."}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: editLocOpenDrop === "tempZone" ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {editLocOpenDrop === "tempZone" && (
                      <>
                        <div onClick={() => setEditLocOpenDrop(null)} style={{ position: "fixed", inset: 0, zIndex: 309 }} />
                        <div style={{ position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 6px 20px rgba(12,27,51,0.12)", zIndex: 310, overflow: "hidden" }}>
                          {["Ambient", "Refrigerated", "Frozen"].map(t => (
                            <div key={t} onMouseDown={() => { setEditLocField("tempZone", t); setEditLocOpenDrop(null); }}
                              style={{ padding: "10px 14px", paddingLeft: editLocForm.tempZone === t ? 11 : 14, fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: editLocForm.tempZone === t ? "#1B6CA8" : "#1A2436", fontWeight: editLocForm.tempZone === t ? 700 : 400, background: "transparent", borderLeft: editLocForm.tempZone === t ? "3px solid #1B6CA8" : "3px solid transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {t}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {editLocErrors.tempZone && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{editLocErrors.tempZone}</div>}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Notes <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF", textTransform: "none" as const }}>optional</span>
                </label>
                <textarea value={editLocForm.notes} onChange={e => setEditLocField("notes", e.target.value)}
                  placeholder="Special instructions, access restrictions, etc."
                  rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", color: "#1A2436", resize: "none", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setEditLocModal(null)} style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={submitEditLoc} style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "Inter" }}>
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Location Modal */}
      {createLocModal && (
        <>
          <div onClick={() => setCreateLocModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.45)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 10, width: 520, zIndex: 201, boxShadow: "0 8px 32px rgba(12,27,51,0.18)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #DDE3EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Create Location</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>Add a new storage bin to the warehouse</div>
              </div>
              <button onClick={() => setCreateLocModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>&times;</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" as const }}>

              {/* Row 1: Location ID + Label */}
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Location ID <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input value={createLocForm.locId} onChange={e => setLocField("locId", e.target.value)}
                    placeholder="e.g. A1-02, COLD-01"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${createLocErrors.locId ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {createLocErrors.locId && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.locId}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Label / Name <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input value={createLocForm.label} onChange={e => setLocField("label", e.target.value)}
                    placeholder="e.g. Front Shelf A"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${createLocErrors.label ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {createLocErrors.label && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.label}</div>}
                </div>
              </div>

              {/* Row 2: Zone + Max Capacity */}
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Zone <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input value={createLocForm.zone} onChange={e => setLocField("zone", e.target.value)}
                    placeholder="e.g. Zone A, Cold Storage"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${createLocErrors.zone ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {createLocErrors.zone && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.zone}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Max Capacity (units) <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input type="number" min={1} value={createLocForm.maxCapacity} onChange={e => setLocField("maxCapacity", e.target.value)}
                    placeholder="e.g. 500"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${createLocErrors.maxCapacity ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", outline: "none", boxSizing: "border-box" as const }} />
                  {createLocErrors.maxCapacity && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.maxCapacity}</div>}
                </div>
              </div>

              {/* Row 3: Rack Type + Temp Zone */}
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Rack Type <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <div style={{ position: "relative" as const }}>
                    <button type="button" onClick={() => setCreateLocOpenDrop(createLocOpenDrop === "rackType" ? null : "rackType")}
                      style={{ width: "100%", padding: "9px 12px", paddingLeft: createLocForm.rackType ? 10 : 12, borderRadius: 6, border: `1px solid ${createLocErrors.rackType ? "#C62828" : "#DDE3EC"}`, borderLeft: createLocForm.rackType ? `3px solid ${createLocErrors.rackType ? "#C62828" : "#DDE3EC"}` : `1px solid ${createLocErrors.rackType ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: createLocForm.rackType ? "#1A2436" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const }}>
                      <span>{createLocForm.rackType || "Select rack type..."}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.15s", transform: createLocOpenDrop === "rackType" ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {createLocOpenDrop === "rackType" && (
                      <>
                        <div onClick={() => setCreateLocOpenDrop(null)} style={{ position: "fixed", inset: 0, zIndex: 309 }} />
                        <div style={{ position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 6px 20px rgba(12,27,51,0.12)", zIndex: 310, overflow: "hidden" }}>
                          {["Shelf Rack", "Drawer", "Counter", "Cold Unit", "High Shelf"].map(t => (
                            <div key={t} onMouseDown={() => { setLocField("rackType", t); setCreateLocOpenDrop(null); }}
                              style={{ padding: "10px 14px", paddingLeft: createLocForm.rackType === t ? 11 : 14, fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: createLocForm.rackType === t ? "#1B6CA8" : "#1A2436", fontWeight: createLocForm.rackType === t ? 700 : 400, background: "transparent", borderLeft: createLocForm.rackType === t ? "3px solid #1B6CA8" : "3px solid transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {t}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {createLocErrors.rackType && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.rackType}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    Temperature Zone <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <div style={{ position: "relative" as const }}>
                    <button type="button" onClick={() => setCreateLocOpenDrop(createLocOpenDrop === "tempZone" ? null : "tempZone")}
                      style={{ width: "100%", padding: "9px 12px", paddingLeft: createLocForm.tempZone ? 10 : 12, borderRadius: 6, border: `1px solid ${createLocErrors.tempZone ? "#C62828" : "#DDE3EC"}`, borderLeft: createLocForm.tempZone ? `3px solid ${createLocErrors.tempZone ? "#C62828" : "#DDE3EC"}` : `1px solid ${createLocErrors.tempZone ? "#C62828" : "#DDE3EC"}`, fontSize: 13, fontFamily: "Inter", color: createLocForm.tempZone ? "#1A2436" : "#9CA3AF", background: "#fff", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const }}>
                      <span>{createLocForm.tempZone || "Select temperature zone..."}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.15s", transform: createLocOpenDrop === "tempZone" ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {createLocOpenDrop === "tempZone" && (
                      <>
                        <div onClick={() => setCreateLocOpenDrop(null)} style={{ position: "fixed", inset: 0, zIndex: 309 }} />
                        <div style={{ position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 6px 20px rgba(12,27,51,0.12)", zIndex: 310, overflow: "hidden" }}>
                          {["Ambient", "Refrigerated", "Frozen"].map(t => (
                            <div key={t} onMouseDown={() => { setLocField("tempZone", t); setCreateLocOpenDrop(null); }}
                              style={{ padding: "10px 14px", paddingLeft: createLocForm.tempZone === t ? 11 : 14, fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: createLocForm.tempZone === t ? "#1B6CA8" : "#1A2436", fontWeight: createLocForm.tempZone === t ? 700 : 400, background: "transparent", borderLeft: createLocForm.tempZone === t ? "3px solid #1B6CA8" : "3px solid transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {t}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {createLocErrors.tempZone && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4, fontFamily: "Inter" }}>{createLocErrors.tempZone}</div>}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "Inter", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Notes <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF", textTransform: "none" as const }}>optional</span>
                </label>
                <textarea value={createLocForm.notes} onChange={e => setLocField("notes", e.target.value)}
                  placeholder="Special instructions, access restrictions, etc."
                  rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", color: "#1A2436", resize: "none", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setCreateLocModal(false)} style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={submitCreateLoc} style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "Inter" }}>
                Create Location
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <>
          <style>{`
            @keyframes toastBar {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 400, borderRadius: 0, overflow: "hidden",
            background: toast.type === "success" ? "#388E3C" : "#C62828",
            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
            whiteSpace: "nowrap" as const, minWidth: 320,
          }}>
            {/* Message row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", color: "#fff", fontFamily: "Inter", fontSize: 14, fontWeight: 600 }}>
              {toast.type === "success"
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              }
              <span style={{ flex: 1 }}>{toast.msg}</span>
              <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.65)", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0, marginLeft: 8 }}>&times;</button>
            </div>
            {/* Progress bar */}
            <div style={{ height: 3, background: "rgba(255,255,255,0.25)" }}>
              <div style={{
                height: "100%", background: "rgba(255,255,255,0.7)",
                animationName: "toastBar", animationDuration: "3s",
                animationTimingFunction: "linear", animationFillMode: "forwards",
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
