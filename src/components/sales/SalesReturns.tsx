import { useState, useEffect, useRef, useMemo } from "react";
import { patients } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import PrintDialog from "../shared/PrintDialog";
import type { PrintJobType } from "../shared/PrintDialog";
import {
  type Alloc, type LineItem,
  TODAY, RETURN_REASONS, RETURN_STATUSES,
  MEDICINES, salesInvoices, patientInvoiceHistory, patientPrevItems,
  salesReturns, returnPrevItems,
  newEmptyRow, pickBatch, calcAmount,
} from "./salesData";
import {
  ChevronDown,
  DateRangePicker,
  InvoiceRefSearch,
  MedicineSearchCell,
} from "./salesShared";
import { PatientSearch, PatientDrawer } from "./SalesInvoices";

// ─── Toggle switch (used in ReturnItemsTable) ─────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      style={{
        width: 30, height: 16, borderRadius: 8, border: "none",
        background: checked ? "#1B6CA8" : "#DDE3EC",
        position: "relative", cursor: disabled ? "default" : "pointer", padding: 0,
        opacity: disabled ? 0.5 : 1, transition: "background 0.15s",
      }}>
      <span style={{
        position: "absolute", top: 2, left: checked ? 16 : 2,
        width: 12, height: 12, borderRadius: "50%", background: "#fff",
        transition: "left 0.15s",
      }} />
    </button>
  );
}

// ─── Return Items Table ───────────────────────────────────────────────────────

function ReturnItemsTable({
  items, onChange, onDelete, alloc = "FEFO", readOnly = false,
}: {
  items: LineItem[];
  onChange: (id: number, field: keyof LineItem, value: any) => void;
  onDelete: (id: number) => void;
  alloc?: Alloc;
  readOnly?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1200, width: "100%" }}>
        <thead>
          <tr>
            <Th>Medicine Name</Th>
            <Th>Batch No</Th>
            <Th>Exp Date</Th>
            <Th right>Pack</Th>
            <Th right>Return Qty</Th>
            <Th right>MRP</Th>
            <Th right>Sale Rate</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Refund Amt</Th>
            <Th center>Restock</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
              <td style={{ padding: "4px 6px", minWidth: 220 }}>
                <MedicineSearchCell
                  value={item.medicineName}
                  alloc={alloc}
                  readOnly={readOnly}
                  onSelect={(med, batch) => {
                    onChange(item.id, "medicineName", med.name);
                    onChange(item.id, "barcode", med.barcode);
                    onChange(item.id, "batch", batch);
                    onChange(item.id, "mrp", batch.mrp);
                    onChange(item.id, "saleRate", batch.saleRate);
                    onChange(item.id, "packs", batch.packs);
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch ? "#1B6CA8" : "#C8CDD8", whiteSpace: "nowrap" }}>
                  {item.batch?.id ?? "—"}
                </div>
              </td>
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? "#E65100" : "#9CA3AF", whiteSpace: "nowrap", fontWeight: item.batch && new Date(item.batch.expDate) < new Date("2025-12-31") ? 700 : 400 }}>
                  {item.batch?.expDate ?? "—"}
                </span>
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.packs || ""} disabled={readOnly} onChange={e => onChange(item.id, "packs", parseFloat(e.target.value) || 0)}
                  style={{ width: 52, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.qty || ""} disabled={readOnly} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={{ width: 60, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 600, color: readOnly ? "#6B7280" : "#C62828", background: readOnly ? "#F8FAFC" : "#fff" }} />
              </td>
              <td style={{ padding: "4px 8px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#9CA3AF" }}>
                {item.mrp > 0 ? `₹${item.mrp.toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.saleRate || ""} disabled={readOnly} onChange={e => onChange(item.id, "saleRate", parseFloat(e.target.value) || 0)}
                  style={{ width: 64, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.disc || ""} disabled={readOnly} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input type="number" value={item.gst || ""} disabled={readOnly} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={{ width: 48, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
              </td>
              <td style={{ padding: "4px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#C62828", whiteSpace: "nowrap" }}>
                {item.medicineName ? `-₹${calcAmount(item).toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "4px 8px", textAlign: "center" }}>
                {item.medicineName && (
                  <ToggleSwitch
                    checked={item.restock ?? true}
                    disabled={readOnly}
                    onChange={v => onChange(item.id, "restock", v)}
                  />
                )}
              </td>
              <td style={{ padding: "4px 8px" }}>
                {item.medicineName && !readOnly && (
                  <button onClick={() => onDelete(item.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sales Returns List ───────────────────────────────────────────────────────

function SalesReturnsList({ onNew, onOpen }: { onNew: () => void; onOpen: (r: typeof salesReturns[0]) => void }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = salesReturns.filter(r => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || r.id.toLowerCase().includes(q)
      || r.invoice.toLowerCase().includes(q)
      || r.patient.toLowerCase().includes(q)
      || r.reason.toLowerCase().includes(q);
    const matchFrom = !fromDate || r.date >= fromDate;
    const matchTo = !toDate || r.date <= toDate;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchFrom && matchTo && matchStatus;
  });
  const { sortCol: sortColR, sortDir: sortDirR, handleSort: handleSortR, sorted: sortedR } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedR, 10);
  const anyFilter = search || fromDate || toDate || statusFilter !== "All";

  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Sales Return Notes</div>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input type="text" placeholder="Search return no, invoice no, patient..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
        </div>
        <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        <div style={{ position: "relative" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: statusFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
            {["All", "Posted", "Draft"].map(s => (
              <option key={s} value={s}>{s === "All" ? "All Return Status" : s}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
            <ChevronDown />
          </span>
        </div>
        {anyFilter && (
          <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setStatusFilter("All"); }}
            style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={onNew} style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>+ New Return</button>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th onSort={() => handleSortR("id")} sortDir={sortColR === "id" ? sortDirR : null}>Return #</Th>
            <Th onSort={() => handleSortR("invoice")} sortDir={sortColR === "invoice" ? sortDirR : null}>Invoice Ref</Th>
            <Th onSort={() => handleSortR("patient")} sortDir={sortColR === "patient" ? sortDirR : null}>Patient</Th>
            <Th onSort={() => handleSortR("date")} sortDir={sortColR === "date" ? sortDirR : null}>Date</Th>
            <Th onSort={() => handleSortR("reason")} sortDir={sortColR === "reason" ? sortDirR : null}>Reason</Th>
            <Th center onSort={() => handleSortR("items")} sortDir={sortColR === "items" ? sortDirR : null}>Items</Th>
            <Th right onSort={() => handleSortR("total")} sortDir={sortColR === "total" ? sortDirR : null}>Refund Amount</Th>
            <Th onSort={() => handleSortR("status")} sortDir={sortColR === "status" ? sortDirR : null}>Status</Th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(r => (
            <tr key={r.id} style={{ borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono" }}>
                <button onClick={() => onOpen(r)}
                  style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                  {r.id}
                </button>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.invoice}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.patient}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.date}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, color: "#6B7280" }}>{r.reason}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" }}>{r.items}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#C62828", textAlign: "right" }}>-₹{r.total.toFixed(2)}</td>
              <td style={{ padding: "12px 14px" }}><Pill status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationFooter {...footerProps} />
    </div>
  );
}

// ─── New Sales Return (full-screen overlay) ───────────────────────────────────

function NewSalesReturn({ onBack, returnRecord }: { onBack: () => void; returnRecord?: typeof salesReturns[0] }) {
  const isExisting = !!returnRecord;
  const [patient, setPatient] = useState<typeof patients[0] | null>(
    returnRecord ? (patients.find(p => p.id === returnRecord.patientId) ?? null) : null
  );
  const [showDrawer, setShowDrawer] = useState(false);
  const [returnDate, setReturnDate] = useState(returnRecord?.date ?? TODAY);
  const [origInvoiceId, setOrigInvoiceId] = useState<string>(returnRecord?.invoice ?? "");
  const [payMethod, setPayMethod] = useState(returnRecord?.method ?? "Cash");
  const [alloc, setAlloc] = useState<Alloc>("FEFO");
  const [returnReason, setReturnReason] = useState<string>(returnRecord?.reason ?? RETURN_REASONS[0]);
  const [note, setNote] = useState("");
  const [settlementRef, setSettlementRef] = useState(returnRecord?.settlementRef ?? "");
  const [settlementStatus, setSettlementStatus] = useState<string>(returnRecord?.status ?? RETURN_STATUSES[0]);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [readOnly, setReadOnly] = useState(isExisting);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const nextId = useRef(1);
  const [items, setItems] = useState<LineItem[]>(() => {
    if (returnRecord) {
      const seed = returnPrevItems[returnRecord.id] ?? [];
      const rows = seed.map(s => {
        const med = MEDICINES.find(m => m.name === s.name);
        const batch = med?.batches[0] ?? null;
        return {
          ...newEmptyRow(nextId.current++),
          medicineName: s.name,
          barcode: med?.barcode ?? "",
          packs: s.packs,
          qty: s.qty,
          batch,
          mrp: batch?.mrp ?? 0,
          saleRate: batch?.saleRate ?? 0,
          gst: 5,
          restock: s.restock,
        };
      });
      return [...rows, { ...newEmptyRow(nextId.current++), restock: true }];
    }
    return [{ ...newEmptyRow(nextId.current++), restock: true }];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  const invoiceOptions = useMemo(() => {
    if (patient) {
      const hist = patientInvoiceHistory[patient.id] ?? salesInvoices.filter(i => i.patientId === patient.id);
      return hist;
    }
    return salesInvoices;
  }, [patient]);

  useEffect(() => {
    if (isExisting) return;
    if (!origInvoiceId) return;
    const inv = salesInvoices.find(i => i.id === origInvoiceId);
    if (!inv) return;
    if (!patient) {
      const p = patients.find(pp => pp.id === inv.patientId);
      if (p) setPatient(p);
    }
    const seed = patientPrevItems[origInvoiceId] ?? [];
    if (seed.length === 0) return;
    const rows = seed.map(s => {
      const med = MEDICINES.find(m => m.name === s.name);
      const batch = med?.batches[0] ?? null;
      return {
        ...newEmptyRow(nextId.current++),
        medicineName: s.name,
        barcode: med?.barcode ?? "",
        packs: s.packs,
        qty: s.qty,
        batch,
        mrp: batch?.mrp ?? 0,
        saleRate: batch?.saleRate ?? 0,
        gst: 5,
        restock: true,
      };
    });
    setItems([...rows, { ...newEmptyRow(nextId.current++), restock: true }]);
  }, [origInvoiceId]);

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const last = updated[updated.length - 1];
      if (last.medicineName && field === "medicineName") {
        return [...updated, { ...newEmptyRow(nextId.current++), restock: true }];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[filtered.length - 1].medicineName) {
        return [...filtered, { ...newEmptyRow(nextId.current++), restock: true }];
      }
      return filtered;
    });
  };

  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const RAPID_MS = 50;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = performance.now();
      if (now - lastKey > RAPID_MS) buffer = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          const med = MEDICINES.find(m => m.barcode === buffer);
          const batch = med ? pickBatch(med.batches, alloc) : null;
          if (med && batch) {
            setItems(prev => {
              const filled = prev.filter(i => i.medicineName);
              return [...filled, {
                ...newEmptyRow(nextId.current++),
                medicineName: med.name, barcode: med.barcode, batch,
                mrp: batch.mrp, saleRate: batch.saleRate, packs: batch.packs,
                restock: true,
              }, { ...newEmptyRow(nextId.current++), restock: true }];
            });
          }
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alloc]);

  const viewItems = useMemo(() => {
    const empty = items.filter(i => !i.medicineName);
    const filled = items.filter(i => i.medicineName);
    filled.sort((a, b) => {
      const ad = a.batch?.expDate ?? "";
      const bd = b.batch?.expDate ?? "";
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return alloc === "FEFO" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    if (readOnly) return filled;
    return [...empty, ...filled];
  }, [items, alloc, readOnly]);

  const subtotal = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate : 0), 0);
  const discount = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate * (i.disc / 100) : 0), 0);
  const gstAdjustment = items.reduce((s, i) => s + (i.medicineName ? (i.qty * i.saleRate - i.qty * i.saleRate * (i.disc / 100)) * (i.gst / 100) : 0), 0);
  const refundAmount = subtotal - discount + gstAdjustment;

  const eligibility = useMemo(() => {
    if (!origInvoiceId) return { label: "Select invoice", color: "#9CA3AF", bg: "#F5F5F5" };
    const inv = salesInvoices.find(i => i.id === origInvoiceId);
    if (!inv) return { label: "Unknown", color: "#9CA3AF", bg: "#F5F5F5" };
    const diff = (new Date(returnDate).getTime() - new Date(inv.date).getTime()) / 86400000;
    if (diff <= 7 && diff >= 0) return { label: `Eligible · ${Math.round(7 - diff)}d left`, color: "#2E7D32", bg: "#E8F5E9" };
    return { label: "Not eligible · > 7 days", color: "#C62828", bg: "#FFEBEE" };
  }, [origInvoiceId, returnDate]);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={!isExisting ? () => setShowBackConfirm(true) : onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Sales</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {isExisting ? (readOnly ? "View Sales Return" : "Edit Sales Return") : "New Sales Return"}
          </span>
          {isExisting && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {returnRecord!.id}</span>
          )}
          {isExisting && readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExisting && readOnly && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Sales Return", docId: returnRecord?.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setReadOnly(false)}
                style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {isExisting && !readOnly && (
            <>
              <button onClick={() => setReadOnly(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!isExisting && (
            <>
              <button onClick={onBack} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => { setSaved("posted"); setPrintJob({ jobType: "Sales Return", docId: "SRN-2025-0010" }); }} style={{ padding: "7px 20px", border: "none", background: hasItems ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Save &amp; Print Return</button>
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>Save this return as a draft before going back?</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowBackConfirm(false)} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => { setSaved("draft"); setShowBackConfirm(false); }} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
              <button onClick={onBack} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 260px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Customer / Patient</div>
            <div style={{ display: "flex", gap: 6 }}>
              {readOnly ? (
                <div style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
                  {patient ? patient.name : (returnRecord?.patient ?? "—")}
                </div>
              ) : (
                <PatientSearch onSelect={setPatient} />
              )}
              {patient && (
                <button onClick={() => setShowDrawer(true)}
                  style={{ padding: "8px 10px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Details
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Date</div>
            <input type="date" value={returnDate} disabled={readOnly} onChange={e => setReturnDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
          </div>

          <div style={{ flex: "0 0 240px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice Ref</div>
            {readOnly ? (
              <div style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#F8FAFC", color: "#1B6CA8", boxSizing: "border-box" }}>
                {origInvoiceId || "—"}
              </div>
            ) : (
              <InvoiceRefSearch
                value={origInvoiceId}
                options={invoiceOptions}
                onSelect={(inv) => setOrigInvoiceId(inv.id)}
                onClear={() => setOrigInvoiceId("")}
              />
            )}
          </div>

          <div style={{ flex: "0 0 150px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Payment Type</div>
            <select value={payMethod} disabled={readOnly} onChange={e => setPayMethod(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
              {["Cash", "Card", "UPI", "Insurance", "Credit Note"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Stock Allocation</div>
            <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", opacity: readOnly ? 0.6 : 1 }}>
              {(["FEFO", "LEFO"] as const).map(opt => (
                <button key={opt} onClick={() => !readOnly && setAlloc(opt)} disabled={readOnly}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: readOnly ? "default" : "pointer", fontFamily: "Inter", background: alloc === opt ? "#1B6CA8" : "#fff", color: alloc === opt ? "#fff" : "#9CA3AF", letterSpacing: "0.04em" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Eligibility</div>
            <div style={{ padding: "8px 12px", background: eligibility.bg, border: `1px solid ${eligibility.color}33`, fontSize: 12, fontWeight: 700, color: eligibility.color, whiteSpace: "nowrap" }}>
              {eligibility.label}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0", minHeight: 0 }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 12 }}>
            <div>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Return Items</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                {origInvoiceId ? "Items pre-filled from original invoice — set Return Qty and Restock" : "Search or scan to add items"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Return Reason</label>
              <select value={returnReason} disabled={readOnly} onChange={e => setReturnReason(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", cursor: readOnly ? "default" : "pointer", minWidth: 220, color: readOnly ? "#6B7280" : "#1A2436" }}>
                {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <ReturnItemsTable items={viewItems} onChange={updateItem} onDelete={deleteItem} alloc={alloc} readOnly={readOnly} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "10px 20px 0", flexShrink: 0 }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Return Note</div>
          <div style={{ padding: "10px 14px" }}>
            <textarea value={note} disabled={readOnly} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={readOnly ? "" : "Notes, condition of returned items, additional remarks..."}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Return Settlement</div>
          <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Payment Reference No</div>
              <input value={settlementRef} disabled={readOnly} onChange={e => setSettlementRef(e.target.value)}
                placeholder={readOnly ? "" : "TXN / cheque / voucher #"}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Payment Type</div>
              <select value={payMethod} disabled={readOnly} onChange={e => setPayMethod(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
                {["Cash", "Card", "UPI", "Insurance", "Credit Note"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Refund Amount</div>
              <div style={{ padding: "7px 10px", border: "1px solid #E8ECF4", background: "#F8FAFC", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>
                -₹{refundAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
              <select value={settlementStatus} disabled={readOnly} onChange={e => setSettlementStatus(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
                {RETURN_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: "10px 20px 12px", flexShrink: 0, background: "#fff", borderTop: "2px solid #E8ECF4", display: "flex", minHeight: 68 }}>
        {[
          { label: "Return Subtotal", val: `₹${subtotal.toFixed(2)}`, color: "#6B7280" },
          { label: "GST Adjustment", val: `₹${gstAdjustment.toFixed(2)}`, color: "#6B7280" },
          { label: "Refund Amount", val: `-₹${refundAmount.toFixed(2)}`, color: "#C62828", bold: true, highlight: true },
        ].map(chip => (
          <div key={chip.label} style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{chip.label}</div>
              <div style={{
                fontFamily: "JetBrains Mono",
                fontSize: chip.bold ? 17 : 14,
                fontWeight: chip.bold ? 700 : 500,
                color: chip.color,
                background: chip.highlight ? "#FFEBEE" : undefined,
                padding: chip.highlight ? "3px 8px" : undefined,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>{chip.val}</div>
            </div>
          </div>
        ))}
      </div>

      {showDrawer && patient && (
        <PatientDrawer patient={patient} onClose={() => setShowDrawer(false)} onAddItems={() => {}} />
      )}

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Return {saved === "posted" ? "Saved & Printed" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>SRN-2025-0010 · Refund ₹{refundAmount.toFixed(2)}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onBack} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Back to Sales</button>
              <button onClick={() => setPrintJob({ jobType: "Sales Return", docId: "SRN-2025-0010" })} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Print Return</button>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── SalesReturns wrapper ─────────────────────────────────────────────────────

export default function SalesReturns() {
  const [view, setView] = useState<"list" | "new-return">("list");
  const [openReturn, setOpenReturn] = useState<typeof salesReturns[0] | null>(null);

  if (view === "new-return") {
    return (
      <NewSalesReturn
        returnRecord={openReturn ?? undefined}
        onBack={() => { setView("list"); setOpenReturn(null); }}
      />
    );
  }

  return (
    <SalesReturnsList
      onNew={() => setView("new-return")}
      onOpen={(r) => { setOpenReturn(r); setView("new-return"); }}
    />
  );
}
