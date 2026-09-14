import { useState, useMemo, useRef, useEffect } from "react";
import { suppliers } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";
import PrintDialog from "../shared/PrintDialog";
import type { PrintJobType } from "../shared/PrintDialog";
import {
  type ReturnLine, type ReturnInitialData, type DistributorFormData,
  purchaseReturns, formatDMY, money, newEmptyReturnLine,
  MOCK_RETURN_LINES, DISPOSITION_OPTIONS, RETURN_TYPES, RETURN_REASONS, TODAY,
} from "./purchasesData";
import {
  Td, TableRow, PrimaryBtn, GhostBtn,
  FilterSearch, FilterDropdown, ClearFiltersButton, NewButton,
  BackConfirmDialog, EmptyTableRow,
  MedicineNameCell, DistributorSearch, AddDistributorDrawer, DistributorDrawer,
} from "./purchasesShared";

function PurchaseReturnList({ onNew, onView, returns }: { onNew: () => void; onView: (id: string) => void; returns: typeof purchaseReturns }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => returns.filter(r => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || r.id.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q) || r.invoiceRef.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || r.supplier === supplierFilter;
    const mReason = reasonFilter === "All" || r.reason === reasonFilter;
    const mStatus = statusFilter === "All" || r.status === statusFilter;
    const mFrom = !fromDate || r.date >= fromDate;
    const mTo = !toDate || r.date <= toDate;
    return mSearch && mSupplier && mReason && mStatus && mFrom && mTo;
  }), [search, supplierFilter, reasonFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || reasonFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setReasonFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Returns</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search return no, distributor, invoice..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={reasonFilter} onChange={setReasonFilter} options={RETURN_REASONS} allLabel="All Reasons" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Draft", "Posted"]} allLabel="All Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <div style={{ marginLeft: "auto" }}>
            <NewButton label="+ New Return" onClick={onNew} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Return #</Th>
                <Th onSort={() => handleSort("invoiceRef")} sortDir={sortCol === "invoiceRef" ? sortDir : null}>Invoice Ref</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Return Date</Th>
                <Th onSort={() => handleSort("reason")} sortDir={sortCol === "reason" ? sortDir : null}>Reason</Th>
                <Th right onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("qty")} sortDir={sortCol === "qty" ? sortDir : null}>Qty</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th onSort={() => handleSort("creditNote")} sortDir={sortCol === "creditNote" ? sortDir : null}>Credit Note</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <TableRow key={r.id}>
                  <Td mono color="#1B6CA8" bold><span onClick={() => onView(r.id)} style={{ cursor: "pointer", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>{r.id}</span></Td>
                  <Td mono color="#9CA3AF">{r.invoiceRef}</Td>
                  <Td bold>{r.supplier}</Td>
                  <Td mono>{formatDMY(r.date)}</Td>
                  <Td>{r.reason}</Td>
                  <Td mono right>{r.items}</Td>
                  <Td mono right>{r.qty}</Td>
                  <Td mono right bold color="#1A2436">{money(r.total)}</Td>
                  <Td mono color={r.creditNote ? "#2E7D32" : "#C8CDD8"}>{r.creditNote ?? "—"}</Td>
                  <Td><Pill status={r.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <EmptyTableRow colSpan={10} message="No returns match your filters." />
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

type ReturnFormData = { supplier: string; originalInvoice: string; originalInvoiceDate: string; reason: string; returnType: string; items: ReturnLine[] };

function NewPurchaseReturn({ onBack, onSaveDraft, onSubmit, initialData, defaultViewMode = false }: {
  onBack: () => void;
  onSaveDraft?: (data: ReturnFormData) => void;
  onSubmit?: (data: ReturnFormData) => void;
  initialData?: ReturnInitialData;
  defaultViewMode?: boolean;
}) {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);

  const [distributor, setDistributor] = useState(initialData?.supplier ?? "");
  const [supplierList, setSupplierList] = useState(suppliers.map(s => s.name));
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditDistributor, setShowEditDistributor] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [originalInvoice, setOriginalInvoice] = useState(initialData?.invoiceRef ?? "");
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState("");
  const [returnType, setReturnType] = useState("Replacement");

  const nextId = useRef(100);
  const [items, setItems] = useState<ReturnLine[]>(() => {
    if (initialData && MOCK_RETURN_LINES[initialData.id]) {
      return MOCK_RETURN_LINES[initialData.id].map((l, i) => ({ ...l, id: i + 1 }));
    }
    return [newEmptyReturnLine(nextId.current++)];
  });

  const [reason, setReason] = useState(initialData?.reason ?? "Wrong item supplied");
  const [creditNoteRef, setCreditNoteRef] = useState("");
  const [notes, setNotes] = useState("");

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof ReturnLine, value: string | number) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const hasEmpty = updated.some(i => !i.medicineName);
      if (!hasEmpty && field === "medicineName") {
        return [newEmptyReturnLine(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0) return [newEmptyReturnLine(nextId.current++)];
      const hasEmpty = filtered.some(i => !i.medicineName);
      if (!hasEmpty) return [newEmptyReturnLine(nextId.current++), ...filtered];
      return filtered;
    });
  };

  const filledItems = items.filter(i => i.medicineName);
  const totalUnits = filledItems.reduce((s, i) => s + i.returnQty, 0);
  const supplierCredit = filledItems.reduce((s, i) => s + (i.purchaseRate * i.returnQty), 0);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={() => viewMode ? onBack() : setShowBackConfirm(true)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#1A2436", fontSize: 20, fontWeight: 700, padding: "0 4px", display: "flex", alignItems: "center" }}
              onMouseEnter={e => { (e.currentTarget.style.color = "#1B6CA8"); const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "1"; }}
              onMouseLeave={e => { (e.currentTarget.style.color = "#1A2436"); const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "0"; }}
            >←</button>
            <span style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1A2436", color: "#fff", fontSize: 11, fontFamily: "Inter", fontWeight: 600, padding: "3px 8px", whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", zIndex: 10 }}>
              Back
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Purchase returns</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {initialData ? (viewMode ? "View Return" : "Edit Return") : "New Purchase Return"}
          </span>
          {initialData && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {initialData.id}</span>
          )}
          {initialData && viewMode && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {initialData && viewMode && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Purchase Return", docId: initialData.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
              <button onClick={() => setViewMode(false)} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {initialData && !viewMode && (
            <>
              <button onClick={() => setViewMode(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!initialData && (
            <>
              <button disabled={!hasItems} onClick={() => setShowDraftConfirm(true)} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => setPrintJob({ jobType: "Purchase Return" })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Print</button>
              <button disabled={!hasItems || !distributor} onClick={() => onSubmit?.({ supplier: distributor, originalInvoice, originalInvoiceDate, reason, returnType, items })} style={{ padding: "7px 20px", border: "none", background: hasItems && distributor ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems && distributor ? "pointer" : "not-allowed", color: hasItems && distributor ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Submit</button>
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <BackConfirmDialog
          message="Save this return as a draft before going back?"
          onCancel={() => setShowBackConfirm(false)}
          onSave={() => { setSaved("draft"); setShowBackConfirm(false); }}
          onDiscard={onBack}
        />
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Distributor <span style={{ color: "#C62828" }}>*</span></div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{distributor || "—"}</div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <DistributorSearch
                  selected={distributor}
                  onSelect={setDistributor}
                  distributors={supplierList}
                  onAdd={() => setShowAddSupplier(true)}
                />
                {distributor && (
                  <button onClick={() => setShowDetails(true)} style={{ padding: "8px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>Details</button>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: "0 0 160px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice #</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{originalInvoice || "—"}</div>
            ) : (
              <input value={originalInvoice} onChange={e => setOriginalInvoice(e.target.value)} placeholder="PINV-2026-0073"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const, background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 150px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Original Invoice Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{originalInvoiceDate ? formatDMY(originalInvoiceDate) : "—"}</div>
            ) : (
              <input type="date" value={originalInvoiceDate} onChange={e => setOriginalInvoiceDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const, background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Return Type</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{returnType}</div>
            ) : (
              <select value={returnType} onChange={e => setReturnType(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none" as const, cursor: "pointer" }}>
                {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>

        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Return Items</span>
            <span style={{ padding: "3px 12px", background: "#E0F7FA", color: "#00838F", fontSize: 12, fontWeight: 700, borderRadius: 999, fontFamily: "Inter" }}>
              {filledItems.length} items
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 1200, width: "100%" }}>
              <thead>
                <tr>
                  <Th>Medicine</Th>
                  <Th>Batch #</Th>
                  <Th>Exp Date</Th>
                  <Th right>Pack/Unit</Th>
                  <Th right>Return Qty</Th>
                  <Th right>Free Qty</Th>
                  <Th right>Rate</Th>
                  <Th right>MRP</Th>
                  <Th right>Return Value</Th>
                  <Th>Disposition</Th>
                  {!viewMode && <Th center>Action</Th>}
                </tr>
              </thead>
              <tbody>
                {items.filter(item => viewMode ? item.medicineName !== "" : true).map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      {viewMode ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{item.medicineName}</span>
                      ) : (
                        <MedicineNameCell
                          value={item.medicineName}
                          alloc="FEFO"
                          onSelect={(name, batch) => {
                            updateItem(item.id, "medicineName", name);
                            updateItem(item.id, "batchNo", batch.id);
                            updateItem(item.id, "expiryDate", batch.expDate);
                            updateItem(item.id, "mrp", batch.mrp);
                            updateItem(item.id, "purchaseRate", batch.rate);
                          }}
                        />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{item.batchNo || "—"}</span>
                      ) : (
                        <input value={item.batchNo} onChange={e => updateItem(item.id, "batchNo", e.target.value)} placeholder="BATCH-#"
                          style={{ width: 100, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: item.expiryDate && item.expiryDate < "2026-12-31" ? "#E65100" : "#1A2436" }}>{item.expiryDate ? formatDMY(item.expiryDate) : "—"}</span>
                      ) : (
                        <input type="date" value={item.expiryDate} onChange={e => updateItem(item.id, "expiryDate", e.target.value)}
                          style={{ width: 130, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: item.expiryDate && item.expiryDate < "2026-12-31" ? "#E65100" : "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{item.packUnit || "—"}</span>
                      ) : (
                        <input value={item.packUnit} onChange={e => updateItem(item.id, "packUnit", e.target.value)}
                          style={{ width: 58, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{item.returnQty || "—"}</span>
                      ) : (
                        <input type="number" value={item.returnQty || ""} onChange={e => updateItem(item.id, "returnQty", parseFloat(e.target.value) || 0)}
                          style={{ width: 62, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{item.freeQty || "—"}</span>
                      ) : (
                        <input type="number" value={item.freeQty || ""} onChange={e => updateItem(item.id, "freeQty", parseFloat(e.target.value) || 0)}
                          style={{ width: 50, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>₹{item.purchaseRate.toFixed(2)}</span>
                      ) : (
                        <input type="number" value={item.purchaseRate || ""} onChange={e => updateItem(item.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                          style={{ width: 74, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {viewMode ? (
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>₹{item.mrp.toFixed(2)}</span>
                      ) : (
                        <input type="number" value={item.mrp || ""} onChange={e => updateItem(item.id, "mrp", parseFloat(e.target.value) || 0)}
                          style={{ width: 70, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436" }} />
                      )}
                    </td>
                    <td style={{ padding: "6px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                      {item.medicineName ? `₹${(item.purchaseRate * item.returnQty).toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {viewMode ? (
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{item.disposition}</span>
                      ) : (
                        <select value={item.disposition} onChange={e => updateItem(item.id, "disposition", e.target.value)}
                          style={{ width: "100%", padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", minWidth: 110 }}>
                          {DISPOSITION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      )}
                    </td>
                    {!viewMode && (
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        {item.medicineName && (
                          <button onClick={() => deleteItem(item.id)} title="Remove"
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: "1px solid #EEF1F6", padding: "12px 16px", flexShrink: 0, display: "flex", gap: 12, background: "#fff" }}>
            <div style={{ flex: "0 0 260px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Reason</div>
              {viewMode ? (
                <div style={{ padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{reason || "—"}</div>
              ) : (
                <select value={reason} onChange={e => setReason(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                  {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              )}
            </div>
            <div style={{ flex: "0 0 220px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Credit Note / RMA Reference</div>
              {viewMode ? (
                <div style={{ padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: creditNoteRef ? "#1A2436" : "#9CA3AF" }}>{creditNoteRef || "—"}</div>
              ) : (
                <input value={creditNoteRef} onChange={e => setCreditNoteRef(e.target.value)} placeholder="Optional supplier reference"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" }}>Notes</div>
              {viewMode ? (
                <div style={{ padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "Inter", background: "#FAFBFD", color: notes ? "#1A2436" : "#9CA3AF", minHeight: 54 }}>{notes || "—"}</div>
              ) : (
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional notes about this return..."
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box" as const }} />
              )}
            </div>
          </div>

        </div>
      </div>

      {showDraftConfirm && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "36px 40px", textAlign: "center", minWidth: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ width: 44, height: 44, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 7v5M11 15h.01" stroke="#E65100" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.27 3.26a2 2 0 0 1 3.46 0l7.28 12.6A2 2 0 0 1 18.28 19H3.72a2 2 0 0 1-1.73-3.14l7.28-12.6Z" stroke="#E65100" strokeWidth="1.5"/></svg>
            </div>
            <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>Save as Draft?</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 28, fontFamily: "Inter", lineHeight: 1.5 }}>
              This return will be saved as a draft.<br />You can submit it later.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowDraftConfirm(false)} style={{ padding: "9px 24px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => { setShowDraftConfirm(false); onSaveDraft?.({ supplier: distributor, originalInvoice, originalInvoiceDate, reason, returnType, items }); }} style={{ padding: "9px 24px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddSupplier && (
        <AddDistributorDrawer
          onClose={() => setShowAddSupplier(false)}
          onSaved={name => { setSupplierList(prev => [...prev, name]); setDistributor(name); }}
        />
      )}

      {showDetails && distributor && (
        <DistributorDrawer
          supplierName={distributor}
          onClose={() => setShowDetails(false)}
          onEdit={() => { setShowDetails(false); setShowEditDistributor(true); }}
        />
      )}

      {showEditDistributor && (() => {
        const distInfo = suppliers.find(s => s.name === distributor);
        const prefill: Partial<DistributorFormData> = distInfo ? {
          name: distInfo.name,
          contactPerson: distInfo.contact,
          email: distInfo.email,
          phone: distInfo.phone,
          addressLine1: distInfo.address,
        } : { name: distributor };
        return (
          <AddDistributorDrawer
            initialData={prefill}
            onClose={() => setShowEditDistributor(false)}
            onSaved={name => { setSupplierList(prev => prev.includes(name) ? prev : [...prev, name]); setShowEditDistributor(false); }}
          />
        );
      })()}

      <div style={{ margin: "0 20px 0", flexShrink: 0, borderTop: "2px solid #E8ECF4", background: "#fff", display: "flex", alignItems: "stretch", minHeight: 72 }}>
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, flexWrap: "nowrap", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 120 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Items selected</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{filledItems.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 120 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Units to return</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{totalUnits}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Distributor credit</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: "#1B6CA8", background: "#EFF6FF", padding: "2px 6px", display: "inline-block" }}>₹{supplierCredit.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 140 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Return type</div>
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{returnType}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "2 1 0", minWidth: 180 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Distributor</div>
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: distributor ? "#1A2436" : "#C8CDD8" }}>{distributor || "Not selected"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "1px solid #EEF1F6", flex: "2 1 0", minWidth: 180 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, fontFamily: "Inter" }}>Original invoice</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: originalInvoice ? "#1A2436" : "#C8CDD8" }}>{originalInvoice || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Purchase Return {saved === "posted" ? "Submitted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
              {saved === "posted" ? "Stock updated · Distributor credit raised" : "Draft — not yet submitted"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Purchases</GhostBtn>
              <PrimaryBtn onClick={() => setPrintJob({ jobType: "Purchase Return", docId: initialData?.id ?? "PRN-NEW" })}>Print Return</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

export default function PurchaseReturns() {
  const [view, setView] = useState<"list" | "new-return" | "view-return">("list");
  const [openReturn, setOpenReturn] = useState<typeof purchaseReturns[0] | null>(null);
  const [returns, setReturns] = useState([...purchaseReturns]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const addReturn = (data: ReturnFormData, status: "Draft" | "Posted") => {
    const filledItems = data.items.filter(i => i.medicineName);
    const newReturn = {
      id: `PRN-2026-${String(returns.length + 1).padStart(4, "0")}`,
      invoiceRef: data.originalInvoice || "—",
      supplier: data.supplier,
      date: TODAY,
      reason: data.reason,
      items: filledItems.length,
      qty: filledItems.reduce((s, i) => s + i.returnQty, 0),
      total: filledItems.reduce((s, i) => s + i.purchaseRate * i.returnQty, 0),
      creditNote: null as string | null,
      status,
    };
    setReturns(prev => [newReturn, ...prev]);
    setView("list");
    setOpenReturn(null);
  };

  const handleSaveDraft = (data: ReturnFormData) => {
    addReturn(data, "Draft");
    setToast({ type: "success", message: "Purchase Return saved as Draft successfully." });
  };

  const handleSubmit = (data: ReturnFormData) => {
    addReturn(data, "Posted");
    setToast({ type: "success", message: "Purchase Return submitted successfully." });
  };

  const Toast = toast && (
    <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
      <div style={{
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        minWidth: 320,
        maxWidth: 480,
        overflow: "hidden",
        background: toast.type === "success" ? "#2E7D32" : "#C62828",
        boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
        animation: "toast-slide-up 0.22s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          {toast.type === "success" ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
              <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
              <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 5s linear forwards" }} />
        </div>
      </div>
    </div>
  );

  if (view === "new-return" || view === "view-return") {
    return (
      <>
        <NewPurchaseReturn
          onBack={() => { setView("list"); setOpenReturn(null); }}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          initialData={openReturn ?? undefined}
          defaultViewMode={view === "view-return"}
        />
        {Toast}
      </>
    );
  }
  return (
    <>
      <PurchaseReturnList
        returns={returns}
        onNew={() => setView("new-return")}
        onView={(id) => {
          const ret = returns.find(r => r.id === id) ?? null;
          setOpenReturn(ret);
          setView("view-return");
        }}
      />
      {Toast}
    </>
  );
}
