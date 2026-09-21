import { useState, useEffect, useRef, useMemo } from "react";
import { patients } from "../../data/mockData";
import AddPatientDrawer from "../AddPatientDrawer";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import PrintDialog from "../shared/PrintDialog";
import type { PrintJobType } from "../shared/PrintDialog";
import {
  type Alloc, type LineItem,
  MEDICINES, DOCTORS,
  salesInvoices, patientInvoiceHistory, patientPrevItems,
  newEmptyRow, pickBatch,
} from "./salesData";
import {
  ChevronDown,
  DateRangePicker,
  InvoiceSummaryFooter,
  LineItemsTable,
} from "./salesShared";

// ─── Patient search autocomplete ──────────────────────────────────────────────

export function PatientSearch({
  onSelect,
}: {
  onSelect: (p: typeof patients[0] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof patients[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = query.length > 0
    ? patients.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase()) || p.phone.includes(query))
    : patients.slice(0, 5);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const choose = (p: typeof patients[0]) => {
    setSelected(p); setQuery(p.name); setOpen(false); onSelect(p);
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search patient or customer..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 340 }}>
          {results.map(p => {
            const outstanding = p.balance;
            return (
              <button key={p.id} onClick={() => choose(p)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                      <span style={{ fontFamily: "JetBrains Mono" }}>{p.id}</span>
                      {" · "}{p.phone}
                    </div>
                  </div>
                  {outstanding > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#C62828", background: "#FFEBEE", padding: "2px 8px" }}>
                      Due ₹{outstanding.toFixed(2)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => { setOpen(false); setDrawerOpen(true); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Patient
          </button>
        </div>
      )}

      <AddPatientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

// ─── Doctor search autocomplete ───────────────────────────────────────────────

function DoctorSearch({
  onSelect,
  readOnly = false,
  displayValue = "",
}: {
  onSelect: (d: typeof DOCTORS[0] | null) => void;
  readOnly?: boolean;
  displayValue?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof DOCTORS[0] | null>(null);
  const [extras, setExtras] = useState<typeof DOCTORS>([]);
  const ref = useRef<HTMLDivElement>(null);

  const allDocs = [...DOCTORS, ...extras];
  const results = query.length > 0
    ? allDocs.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.specialty.toLowerCase().includes(query.toLowerCase()))
    : allDocs.slice(0, 6);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const choose = (d: typeof DOCTORS[0]) => {
    setSelected(d); setQuery(d.name); setOpen(false); onSelect(d);
  };

  if (readOnly) {
    return (
      <div style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
        {displayValue || "—"}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search doctor..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: selected ? "#F0F6FF" : "#fff" }}
      />
      {selected && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>
      )}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 300 }}>
          {results.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}>
              No doctor found{query ? ` for "${query}"` : ""}
            </div>
          )}
          {results.map(d => (
            <button key={d.id} onClick={() => choose(d)}
              style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                <span>{d.specialty}</span>
                <span style={{ fontFamily: "JetBrains Mono", marginLeft: 8 }}>{d.phone}</span>
              </div>
            </button>
          ))}
          <button
            onClick={() => {
              if (!query.trim()) return;
              const newDoc = { id: `DR-NEW-${extras.length + 1}`, name: query.trim(), specialty: "—", phone: "—" };
              setExtras(prev => [...prev, newDoc]);
              choose(newDoc);
            }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Doctor
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Patient Details Drawer ───────────────────────────────────────────────────

export function PatientDrawer({
  patient, onClose, onAddItems,
}: {
  patient: typeof patients[0];
  onClose: () => void;
  onAddItems: (items: { name: string; qty: number; packs: number }[]) => void;
}) {
  const [expandedInv, setExpandedInv] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const history = patientInvoiceHistory[patient.id] ?? [];
  const prevItems = expandedInv ? (patientPrevItems[expandedInv] ?? []) : [];

  const handleToggleItem = (name: string) => setSelected(s => ({ ...s, [name]: !s[name] }));
  const handleSelectAll = () => {
    const allSelected = prevItems.every(i => selected[i.name]);
    const next: Record<string, boolean> = {};
    prevItems.forEach(i => { next[i.name] = !allSelected; });
    setSelected(next);
  };

  const handleAdd = () => {
    const items = prevItems.filter(i => selected[i.name]);
    if (items.length > 0) { onAddItems(items); onClose(); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.3)", zIndex: 299 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 460, background: "#fff", borderLeft: "1px solid #E8ECF4", zIndex: 300, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8ECF4", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Patient Details</div>
            <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#9CA3AF", marginTop: 1 }}>{patient.id}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              {[
                { label: "Name", value: patient.name },
                { label: "Phone", value: patient.phone },
                { label: "Date of Birth", value: patient.dob },
                { label: "Blood Group", value: patient.bloodGroup },
                { label: "Last Visit", value: patient.lastVisit },
                { label: "Total Prescriptions", value: patient.prescriptions.toString() },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#1A2436", fontWeight: 500 }}>{r.value}</div>
                </div>
              ))}
            </div>

            {patient.allergies.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Allergies</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {patient.allergies.map(a => <span key={a} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#FFEBEE", color: "#C62828" }}>⚠ {a}</span>)}
                </div>
              </div>
            )}

            {patient.balance > 0 && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#C62828", fontWeight: 600 }}>Outstanding Balance</span>
                <span style={{ fontSize: 18, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>₹{patient.balance.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Invoice History</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>No invoice history</div>
            ) : (
              history.map(inv => {
                const isExpanded = expandedInv === inv.id;
                const items = patientPrevItems[inv.id] ?? [];
                const allSel = items.length > 0 && items.every(i => selected[i.name]);
                return (
                  <div key={inv.id} style={{ border: "1px solid #E8ECF4", marginBottom: 8 }}>
                    <button onClick={() => setExpandedInv(isExpanded ? null : inv.id)}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: isExpanded ? "#F0F6FF" : "#FAFBFD", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{inv.id}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{inv.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>₹{inv.total.toFixed(2)}</div>
                        {(inv.total - inv.paid) > 0 ? (
                          <div style={{ fontSize: 11, color: "#C62828", fontWeight: 600 }}>Due ₹{(inv.total - inv.paid).toFixed(2)}</div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#2E7D32" }}>Paid</div>
                        )}
                      </div>
                    </button>

                    {isExpanded && items.length > 0 && (
                      <div style={{ padding: "10px 14px", borderTop: "1px solid #E8ECF4" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Items</span>
                          <button onClick={handleSelectAll} style={{ fontSize: 11, color: "#1B6CA8", border: "none", background: "transparent", cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                            {allSel ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        {items.map(item => (
                          <label key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!selected[item.name]} onChange={() => handleToggleItem(item.name)}
                              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#1B6CA8" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#1A2436" }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Qty: {item.qty} · {item.packs} Packs</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {Object.values(selected).some(Boolean) && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #E8ECF4", flexShrink: 0 }}>
            <button onClick={handleAdd} style={{ width: "100%", padding: "11px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter" }}>
              Add {Object.values(selected).filter(Boolean).length} Item{Object.values(selected).filter(Boolean).length !== 1 ? "s" : ""} to Sales Invoice
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Invoice List ─────────────────────────────────────────────────────────────

function InvoiceList({ onNew, onOpen }: { onNew: () => void; onOpen: (inv: typeof salesInvoices[0]) => void }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = salesInvoices.filter(i => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || i.id.toLowerCase().includes(q) || i.patient.toLowerCase().includes(q);
    const matchFrom = !fromDate || i.date >= fromDate;
    const matchTo = !toDate || i.date <= toDate;
    const matchMethod = methodFilter === "All" || i.method === methodFilter;
    const matchStatus = statusFilter === "All" || i.status === statusFilter;
    return matchSearch && matchFrom && matchTo && matchMethod && matchStatus;
  });
  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || methodFilter !== "All" || statusFilter !== "All";

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Sales Invoices</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input type="text" placeholder="Search invoice no, patient..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
          </div>
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div style={{ position: "relative" }}>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: methodFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Cash", "Card", "UPI", "Insurance", "Credit"].map(m => (
                <option key={m} value={m}>{m === "All" ? "All Payment Methods" : m}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: statusFilter === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" }}>
              {["All", "Paid", "Partial", "Unpaid", "Cancelled"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Invoice Status" : s}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </div>
          {anyFilter && (
            <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setMethodFilter("All"); setStatusFilter("All"); }}
              style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={onNew} style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>+ New Invoice</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Invoice #</Th>
                <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due</Th>
                <Th center onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("subtotal")} sortDir={sortCol === "subtotal" ? sortDir : null}>Subtotal</Th>
                <Th right onSort={() => handleSort("tax")} sortDir={sortCol === "tax" ? sortDir : null}>Tax</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th right onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
                <Th right>Balance</Th>
                <Th onSort={() => handleSort("method")} sortDir={sortCol === "method" ? sortDir : null}>Method</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(inv => {
                const balance = inv.total - inv.paid;
                return (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono" }}>
                      <button onClick={() => onOpen(inv)}
                        style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                        {inv.id}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436", whiteSpace: "nowrap" }}>{inv.patient}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.date}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.due}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "center" }}>{inv.items}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{inv.subtotal.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" }}>₹{inv.tax.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right" }}>₹{inv.total.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#2E7D32", textAlign: "right" }}>₹{inv.paid.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: balance > 0 ? 600 : 400, color: balance > 0 ? "#C62828" : "#9CA3AF", textAlign: "right" }}>
                      {balance > 0 ? `₹${balance.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#6B7280" }}>{inv.method}</td>
                    <td style={{ padding: "12px 14px" }}><Pill status={inv.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── New Invoice View (full-screen overlay) ───────────────────────────────────

function NewInvoice({
  onBack,
  preloadItems,
  invoice,
}: {
  onBack: () => void;
  preloadItems?: { name: string; qty: number; packs: number }[];
  invoice?: typeof salesInvoices[0];
}) {
  const isExisting = !!invoice;
  const seedItems = invoice ? (patientPrevItems[invoice.id] ?? []) : preloadItems;

  const [patient, setPatient] = useState<typeof patients[0] | null>(
    invoice ? (patients.find(p => p.id === invoice.patientId) ?? null) : null
  );
  const [doctor, setDoctor] = useState<typeof DOCTORS[0] | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [alloc, setAlloc] = useState<Alloc>("FEFO");
  const [payMethod, setPayMethod] = useState(invoice?.method ?? "Cash");
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [readOnly, setReadOnly] = useState(isExisting);
  const [printJob, setPrintJob] = useState<{ jobType: PrintJobType; docId?: string } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const nextId = useRef(1);

  const [items, setItems] = useState<LineItem[]>(() => {
    if (seedItems && seedItems.length > 0) {
      const rows = seedItems.map(item => {
        const med = MEDICINES.find(m => m.name === item.name);
        const batch = med?.batches[0] ?? null;
        const row = newEmptyRow(nextId.current++);
        return {
          ...row,
          medicineName: item.name,
          barcode: med?.barcode ?? "",
          qty: item.qty,
          packs: item.packs,
          batch,
          mrp: batch?.mrp ?? 0,
          saleRate: batch?.saleRate ?? 0,
        };
      });
      return [...rows, newEmptyRow(nextId.current++)];
    }
    return [newEmptyRow(nextId.current++)];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const last = updated[updated.length - 1];
      if (last.medicineName && field === "medicineName") {
        return [...updated, newEmptyRow(nextId.current++)];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[filtered.length - 1].medicineName) {
        return [...filtered, newEmptyRow(nextId.current++)];
      }
      return filtered;
    });
  };

  const addScannedBarcode = (barcode: string) => {
    const med = MEDICINES.find(m => m.barcode === barcode);
    if (!med) return false;
    const batch = pickBatch(med.batches, alloc);
    if (!batch) return false;
    setItems(prev => {
      const filled = prev.filter(i => i.medicineName);
      const newRow: LineItem = {
        ...newEmptyRow(nextId.current++),
        medicineName: med.name,
        barcode: med.barcode,
        batch,
        mrp: batch.mrp,
        saleRate: batch.saleRate,
        packs: batch.packs,
      };
      return [...filled, newRow, newEmptyRow(nextId.current++)];
    });
    return true;
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
        if (buffer.length >= 4) { addScannedBarcode(buffer); }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alloc]);

  const addFromDrawer = (incoming: { name: string; qty: number; packs: number }[]) => {
    setItems(prev => {
      const filled = prev.filter(i => i.medicineName);
      const newRows = incoming.map(item => {
        const med = MEDICINES.find(m => m.name === item.name);
        const batch = med?.batches[0] ?? null;
        const row = newEmptyRow(nextId.current++);
        return { ...row, medicineName: item.name, qty: item.qty, packs: item.packs, batch, mrp: batch?.mrp ?? 0, saleRate: batch?.saleRate ?? 0 };
      });
      return [...filled, ...newRows, newEmptyRow(nextId.current++)];
    });
  };

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
            {isExisting ? (readOnly ? "View Invoice" : "Edit Invoice") : "New Invoice"}
          </span>
          {isExisting && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {invoice!.id}</span>
          )}
          {isExisting && readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExisting && readOnly && (
            <>
              <button onClick={() => setPrintJob({ jobType: "Sales Invoice", docId: invoice?.id })} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Print</button>
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
              <button disabled={!hasItems} onClick={() => setSaved("draft")} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
              <button disabled={!hasItems} onClick={() => setPrintJob({ jobType: "Sales Invoice" })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Print</button>
              <button disabled={!hasItems} onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: hasItems ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>Post Invoice</button>
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>Save this invoice as a draft before going back?</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowBackConfirm(false)} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => { setSaved("draft"); setShowBackConfirm(false); }} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
              <button onClick={onBack} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "nowrap" }}>
          <div style={{ flex: "0 0 280px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Patient / Customer</div>
            <div style={{ display: "flex", gap: 6 }}>
              {readOnly ? (
                <div style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#1A2436", boxSizing: "border-box" }}>
                  {patient ? patient.name : (invoice?.patient ?? "—")}
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

          <div style={{ flex: "0 0 220px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Doctor</div>
            {readOnly ? (
              <DoctorSearch readOnly displayValue={doctor?.name ?? ""} onSelect={() => {}} />
            ) : (
              <DoctorSearch onSelect={setDoctor} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice Date</div>
            <input type="date" defaultValue={invoice?.date ?? "2026-08-14"} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
          </div>

          <div style={{ flex: "0 0 130px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Payment Type</div>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: readOnly ? "#F8FAFC" : "#fff", boxSizing: "border-box", cursor: readOnly ? "default" : "pointer", color: readOnly ? "#6B7280" : "#1A2436" }}>
              {["Cash", "Card", "UPI", "Insurance", "Credit"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Due Date</div>
            <input type="date" defaultValue={invoice?.due ?? "2026-09-14"} disabled={readOnly}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436" }} />
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
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                {readOnly ? "Read-only view — click Edit to modify" : "Search and add medicines to this invoice"}
              </span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>Allocation: {alloc}</span>
          </div>
          <LineItemsTable items={viewItems} onChange={updateItem} onDelete={deleteItem} alloc={alloc} readOnly={readOnly} />
        </div>
      </div>

      <div style={{ margin: "8px 20px 0", flexShrink: 0 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={readOnly}
          placeholder={readOnly ? "" : "Add notes, special instructions or remarks..."}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: readOnly ? "#F8FAFC" : "#fff", color: readOnly ? "#6B7280" : "#1A2436", boxSizing: "border-box" }} />
      </div>

      <div style={{ margin: "0 20px 0", flexShrink: 0 }}>
        <InvoiceSummaryFooter
          items={items}
          paid={invoice?.paid ?? 0}
          cashDiscount={cashDiscount}
          onCashDiscountChange={readOnly ? undefined : setCashDiscount}
          adjustment={adjustment}
          onAdjustmentChange={readOnly ? undefined : setAdjustment}
        />
      </div>

      {showDrawer && patient && (
        <PatientDrawer patient={patient} onClose={() => setShowDrawer(false)} onAddItems={addFromDrawer} />
      )}

      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Invoice {saved === "posted" ? "Posted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>SINV-2025-0222 · {saved === "posted" ? `Posted · ${payMethod}` : "Draft — not yet posted"}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onBack} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Back to Sales</button>
              <button onClick={() => setPrintJob({ jobType: "Sales Invoice", docId: "SINV-2025-0222" })} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}

      {printJob && <PrintDialog {...printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}

// ─── SalesInvoices wrapper ────────────────────────────────────────────────────

export default function SalesInvoices({
  preloadItems,
  onPreloadConsumed,
}: {
  preloadItems?: { name: string; qty: number; packs: number }[] | undefined;
  onPreloadConsumed?: () => void;
}) {
  const [view, setView] = useState<"list" | "new-invoice">("list");
  const [openInvoice, setOpenInvoice] = useState<typeof salesInvoices[0] | null>(null);
  const pendingPreload = useRef<{ name: string; qty: number; packs: number }[] | undefined>(undefined);

  useEffect(() => {
    if (preloadItems && preloadItems.length > 0) {
      pendingPreload.current = preloadItems;
      setView("new-invoice");
      onPreloadConsumed?.();
    }
  }, [preloadItems]);

  if (view === "new-invoice") {
    const preload = pendingPreload.current;
    return (
      <NewInvoice
        preloadItems={preload}
        invoice={openInvoice ?? undefined}
        onBack={() => {
          setView("list");
          setOpenInvoice(null);
          pendingPreload.current = undefined;
        }}
      />
    );
  }

  return (
    <InvoiceList
      onNew={() => setView("new-invoice")}
      onOpen={(inv) => { setOpenInvoice(inv); setView("new-invoice"); }}
    />
  );
}
