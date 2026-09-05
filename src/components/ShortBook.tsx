import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Reason = "Low Stock" | "Out of Stock" | "Today's Sales" | "Manual" | "Customer Demand";
type SBStatus = "Ready" | "Pending" | "Ordered";

interface ShortBookItem {
  id: string;
  medicine: string;
  manufacturer: string;
  reason: Reason;
  currentStock: number;
  suggestedQty: number;
  orderQty: number;
  bestSupplier: string;
  status: SBStatus;
  addedOn: string;
}

interface SupplierOption {
  name: string;
  availability: "Available" | "Limited" | "Unavailable";
  purchaseRate: number;
  mrp: number;
  deliveryDays: number;
  expiryReturn: boolean;
  score: number;
  margin: number;
  scoreBreakdown: { margin: number; delivery: number; expiryReturn: number; availability: number };
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SHORT_BOOK: ShortBookItem[] = [
  { id: "SB-001", medicine: "Dolo 650", manufacturer: "Micro Labs", reason: "Low Stock", currentStock: 8, suggestedQty: 42, orderQty: 42, bestSupplier: "ABC Pharma", status: "Ready", addedOn: "2025-07-28" },
  { id: "SB-002", medicine: "Pantoprazole 40mg", manufacturer: "Sun Pharma", reason: "Today's Sales", currentStock: 12, suggestedQty: 30, orderQty: 30, bestSupplier: "XYZ Pharma", status: "Ready", addedOn: "2025-07-28" },
  { id: "SB-003", medicine: "Azithromycin 500mg", manufacturer: "Cipla", reason: "Out of Stock", currentStock: 0, suggestedQty: 50, orderQty: 50, bestSupplier: "Medico", status: "Ready", addedOn: "2025-07-27" },
  { id: "SB-004", medicine: "Metformin 500mg", manufacturer: "USV Ltd", reason: "Low Stock", currentStock: 15, suggestedQty: 100, orderQty: 80, bestSupplier: "ABC Pharma", status: "Ready", addedOn: "2025-07-27" },
  { id: "SB-005", medicine: "Cetirizine 10mg", manufacturer: "Lupin", reason: "Customer Demand", currentStock: 22, suggestedQty: 40, orderQty: 40, bestSupplier: "XYZ Pharma", status: "Pending", addedOn: "2025-07-26" },
  { id: "SB-006", medicine: "Atorvastatin 20mg", manufacturer: "Dr. Reddy's", reason: "Low Stock", currentStock: 18, suggestedQty: 60, orderQty: 60, bestSupplier: "ABC Pharma", status: "Ready", addedOn: "2025-07-26" },
  { id: "SB-007", medicine: "Omeprazole 20mg", manufacturer: "Cipla", reason: "Manual", currentStock: 45, suggestedQty: 50, orderQty: 50, bestSupplier: "Medico", status: "Pending", addedOn: "2025-07-25" },
  { id: "SB-008", medicine: "Amlodipine 5mg", manufacturer: "Torrent Pharma", reason: "Today's Sales", currentStock: 5, suggestedQty: 30, orderQty: 30, bestSupplier: "XYZ Pharma", status: "Ready", addedOn: "2025-07-25" },
];

const SUPPLIER_OPTIONS: Record<string, SupplierOption[]> = {
  default: [
    { name: "ABC Pharma", availability: "Available", purchaseRate: 22, mrp: 30, deliveryDays: 1, expiryReturn: true, score: 91, margin: 26.7, scoreBreakdown: { margin: 90, delivery: 100, expiryReturn: 100, availability: 100 } },
    { name: "XYZ Pharma", availability: "Available", purchaseRate: 21, mrp: 30, deliveryDays: 3, expiryReturn: false, score: 82, margin: 30.0, scoreBreakdown: { margin: 95, delivery: 60, expiryReturn: 0, availability: 100 } },
    { name: "Medico", availability: "Available", purchaseRate: 23, mrp: 30, deliveryDays: 0, expiryReturn: true, score: 88, margin: 23.3, scoreBreakdown: { margin: 80, delivery: 100, expiryReturn: 100, availability: 100 } },
  ],
};

const ALL_MEDICINES = [
  "Dolo 650", "Pantoprazole 40mg", "Azithromycin 500mg", "Metformin 500mg",
  "Cetirizine 10mg", "Atorvastatin 20mg", "Omeprazole 20mg", "Amlodipine 5mg",
  "Paracetamol 500mg", "Amoxicillin 500mg", "Ibuprofen 400mg", "Aspirin 75mg",
  "Ranitidine 150mg", "Ciprofloxacin 500mg", "Warfarin 5mg",
];

// ─── UI primitives ─────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: right ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD" }}>
      {children}
    </th>
  );
}

function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td style={{ padding: "11px 14px", fontSize: 13, textAlign: right ? "right" : "left", fontFamily: mono ? "JetBrains Mono" : "Inter" }}>
      {children}
    </td>
  );
}

const REASON_STYLE: Record<string, { bg: string; color: string }> = {
  "Low Stock": { bg: "#FFF8E1", color: "#F57F17" },
  "Out of Stock": { bg: "#FFEBEE", color: "#C62828" },
  "Today's Sales": { bg: "#E3F2FD", color: "#1B6CA8" },
  "Manual": { bg: "#F3F4F6", color: "#4B5563" },
  "Customer Demand": { bg: "#F3E5F5", color: "#7B1FA2" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "Ready": { bg: "#E8F5E9", color: "#2E7D32" },
  "Pending": { bg: "#FFF8E1", color: "#F57F17" },
  "Ordered": { bg: "#E3F2FD", color: "#1B6CA8" },
};

function ReasonPill({ reason }: { reason: Reason }) {
  const s = REASON_STYLE[reason] || { bg: "#F3F4F6", color: "#4B5563" };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: s.bg, color: s.color, letterSpacing: "0.02em" }}>{reason}</span>;
}

function StatusPill({ status }: { status: SBStatus }) {
  const s = STATUS_STYLE[status] || { bg: "#F3F4F6", color: "#4B5563" };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: s.bg, color: s.color, letterSpacing: "0.02em" }}>{status}</span>;
}

// ─── Supplier Comparison Drawer ────────────────────────────────────────────────

function SupplierComparisonDrawer({
  item,
  onClose,
  onSelect,
}: {
  item: ShortBookItem;
  onClose: () => void;
  onSelect: (supplier: string) => void;
}) {
  const suppliers = SUPPLIER_OPTIONS.default;
  const [selected, setSelected] = useState<string | null>(item.bestSupplier);
  const best = suppliers.reduce((a, b) => (a.score > b.score ? a : b));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 540, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Supplier Comparison</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>{item.medicine}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Required Quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{item.orderQty} units</span></div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Recommended banner */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>&#9733;</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>Recommended: {best.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#1B6CA8", color: "#fff", marginLeft: "auto" }}>{best.score}/100</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                best.margin > 25 ? "Good margin" : null,
                best.deliveryDays <= 1 ? "Faster delivery" : null,
                best.expiryReturn ? "Expiry return available" : null,
                best.availability === "Available" ? "Product available" : null,
              ].filter(Boolean).map(r => (
                <span key={r} style={{ fontSize: 11, color: "#2E7D32", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>&#10003;</span> {r}
                </span>
              ))}
            </div>
          </div>

          {/* Supplier cards */}
          {suppliers.map(sup => {
            const isSelected = selected === sup.name;
            const isBest = sup.name === best.name;
            return (
              <div key={sup.name} onClick={() => setSelected(sup.name)}
                style={{ border: `1.5px solid ${isSelected ? "#1B6CA8" : "#E8ECF4"}`, background: isSelected ? "#EFF6FF" : "#fff", cursor: "pointer", transition: "border-color 0.12s" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0C1B33", fontFamily: "Inter" }}>{sup.name}</div>
                    {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", background: "#1B6CA8", color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>Best</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", background: sup.availability === "Available" ? "#E8F5E9" : "#FFF8E1", color: sup.availability === "Available" ? "#2E7D32" : "#F57F17", fontWeight: 700 }}>
                      {sup.availability}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>{sup.score}</div>
                      <div style={{ fontSize: 9, color: "#9CA3AF" }}>/ 100</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "12px 16px", gap: 8 }}>
                  {[
                    { label: "Purchase Rate", value: `₹${sup.purchaseRate}`, color: "#0C1B33" },
                    { label: "Margin", value: `${sup.margin.toFixed(1)}%`, color: "#2E7D32" },
                    { label: "Delivery", value: sup.deliveryDays === 0 ? "Same Day" : `${sup.deliveryDays} Day${sup.deliveryDays > 1 ? "s" : ""}`, color: "#1A2436" },
                    { label: "Expiry Return", value: sup.expiryReturn ? "Allowed" : "Not Allowed", color: sup.expiryReturn ? "#2E7D32" : "#C62828" },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{f.label}</div>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: f.color }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {/* Score breakdown */}
                <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
                  {Object.entries(sup.scoreBreakdown).map(([k, v]) => (
                    <div key={k} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "capitalize", marginBottom: 3 }}>{k}</div>
                      <div style={{ height: 4, background: "#EEF1F6" }}>
                        <div style={{ height: "100%", width: `${v}%`, background: v >= 80 ? "#2E7D32" : v >= 50 ? "#F57F17" : "#C62828" }} />
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: "#6B7280", marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button
            onClick={() => { if (selected) { onSelect(selected); onClose(); } }}
            disabled={!selected}
            style={{ flex: 2, padding: "9px 0", border: "none", background: selected ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: selected ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            {selected ? `Select ${selected}` : "Select Supplier"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Add Medicine Drawer ───────────────────────────────────────────────────────

function AddMedicineDrawer({
  onClose,
  onAdd,
  onUpdateQty,
  existingItems,
}: {
  onClose: () => void;
  onAdd: (item: ShortBookItem) => void;
  onUpdateQty: (id: string, qty: number) => void;
  existingItems: ShortBookItem[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState<Reason>("Customer Demand");
  const [orderQty, setOrderQty] = useState("40");
  const [supplier, setSupplier] = useState("ABC Pharma");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updateQtyMode, setUpdateQtyMode] = useState(false);
  const [updateQtyInput, setUpdateQtyInput] = useState("");

  const matches = search.length >= 1 ? ALL_MEDICINES.filter(m => m.toLowerCase().includes(search.toLowerCase())) : [];
  const isDuplicate = existingItems.some(i => i.medicine.toLowerCase() === selected.toLowerCase());
  const existingItem = existingItems.find(i => i.medicine.toLowerCase() === selected.toLowerCase());

  const canAdd = selected.length > 0 && !isDuplicate && Number(orderQty) > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const newItem: ShortBookItem = {
      id: `SB-${String(existingItems.length + 9).padStart(3, "0")}`,
      medicine: selected,
      manufacturer: "Various",
      reason,
      currentStock: Math.floor(Math.random() * 20),
      suggestedQty: Number(orderQty),
      orderQty: Number(orderQty),
      bestSupplier: supplier,
      status: "Ready",
      addedOn: "2025-07-28",
    };
    onAdd(newItem);
    setSaved(true);
  };

  if (saved) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>{updateQtyMode ? `${selected} quantity updated` : `${selected} added to Short Book`}</div>
            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>Order quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{updateQtyMode ? updateQtyInput : orderQty} units</span></div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Close</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Short Book</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Add to Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Medicine search */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Medicine <span style={{ color: "#C62828" }}>*</span></div>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search medicine..." value={search}
                onChange={e => { setSearch(e.target.value); setSelected(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onBlur={e => setTimeout(() => setShowDropdown(false), 150)} />
              {showDropdown && matches.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
                  {matches.map(m => (
                    <button key={m} onMouseDown={() => { setSelected(m); setSearch(m); setShowDropdown(false); }}
                      style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isDuplicate && existingItem && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 12, color: "#F57F17" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected} is already in your Short Book.</div>
                <div style={{ color: "#6B7280" }}>Current Order Quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{existingItem.orderQty}</span></div>
              </div>
            )}
          </div>

          {selected && !isDuplicate && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div>
                <select value={reason} onChange={e => setReason(e.target.value as Reason)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                  {(["Low Stock", "Out of Stock", "Today's Sales", "Manual", "Customer Demand"] as Reason[]).map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Order Quantity <span style={{ color: "#C62828" }}>*</span></div>
                <input type="number" value={orderQty} min={1}
                  onChange={e => setOrderQty(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Preferred Supplier</div>
                <select value={supplier} onChange={e => setSupplier(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
                  {["ABC Pharma", "XYZ Pharma", "Medico", "PharmaCo Inc", "MedLine Pharma"].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {isDuplicate && existingItem && (
            updateQtyMode ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>New Order Quantity</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={updateQtyInput} min={1}
                    onChange={e => setUpdateQtyInput(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: "9px 12px", border: "1px solid #1B6CA8", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
                  <button
                    onClick={() => { if (Number(updateQtyInput) > 0) { onUpdateQty(existingItem.id, Number(updateQtyInput)); setSaved(true); } }}
                    disabled={!updateQtyInput || Number(updateQtyInput) <= 0}
                    style={{ padding: "9px 16px", border: "none", background: Number(updateQtyInput) > 0 ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: Number(updateQtyInput) > 0 ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600, flexShrink: 0 }}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setUpdateQtyMode(true); setUpdateQtyInput(String(existingItem.orderQty)); }}
                  style={{ flex: 1, padding: "9px 0", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                  Update Quantity
                </button>
                <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Go to Short Book
                </button>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {!isDuplicate && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
            <button onClick={handleAdd} disabled={!canAdd}
              style={{ flex: 2, padding: "9px 0", border: "none", background: canAdd ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canAdd ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Add to Short Book
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Edit Qty inline ───────────────────────────────────────────────────────────

function EditQtyCell({ item, onSave }: { item: ShortBookItem; onSave: (qty: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.orderQty));

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" value={val} min={1} onChange={e => setVal(e.target.value)} autoFocus
          style={{ width: 72, padding: "5px 8px", border: "1px solid #1B6CA8", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono" }}
          onKeyDown={e => { if (e.key === "Enter") { onSave(Number(val)); setEditing(false); } if (e.key === "Escape") { setEditing(false); setVal(String(item.orderQty)); } }} />
        <button onClick={() => { onSave(Number(val)); setEditing(false); }}
          style={{ padding: "4px 8px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "Inter" }}>Save</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setEditing(true)}>
      <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#1A2436" }}>{item.orderQty}</span>
      <span style={{ fontSize: 10, color: "#1B6CA8" }}>&#9998;</span>
    </div>
  );
}

// ─── Purchase Plan Drawer ──────────────────────────────────────────────────────

function PurchasePlanDrawer({ items, onClose }: { items: ShortBookItem[]; onClose: () => void }) {
  const bySupplier = items.reduce<Record<string, ShortBookItem[]>>((acc, item) => {
    if (!acc[item.bestSupplier]) acc[item.bestSupplier] = [];
    acc[item.bestSupplier].push(item);
    return acc;
  }, {});

  const total = items.reduce((s, i) => s + i.orderQty * 22, 0);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 500, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Purchase Plan</div>
              <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33" }}>Create Purchase Orders</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(bySupplier).map(([supplier, sitems]) => {
            const subtotal = sitems.reduce((s, i) => s + i.orderQty * 22, 0);
            return (
              <div key={supplier} style={{ border: "1px solid #E8ECF4", background: "#fff" }}>
                <div style={{ padding: "12px 16px", background: "#FAFBFD", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0C1B33", fontFamily: "Inter" }}>{supplier}</div>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>₹{subtotal.toFixed(0)}</span>
                </div>
                {sitems.map((item, i, arr) => (
                  <div key={item.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{item.medicine}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.orderQty} units</div>
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>₹{(item.orderQty * 22).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>Suppliers</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700 }}>{Object.keys(bySupplier).length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>Purchase Orders</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700 }}>{Object.keys(bySupplier).length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #E8ECF4" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>Total</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={onClose}
            style={{ flex: 2, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Create Purchase Orders
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ShortBook() {
  const [items, setItems] = useState<ShortBookItem[]>(MOCK_SHORT_BOOK);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Low Stock" | "Out of Stock" | "Today's Sales" | "Manual">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [compareItem, setCompareItem] = useState<ShortBookItem | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const filtered = items.filter(item => {
    const matchSearch = search === "" ||
      item.medicine.toLowerCase().includes(search.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "All" || item.reason === activeTab;
    return matchSearch && matchTab;
  });

  const summary = {
    total: items.length,
    estimated: items.reduce((s, i) => s + i.orderQty * 22, 0),
    lowStock: items.filter(i => i.reason === "Low Stock").length,
    todaySales: items.filter(i => i.reason === "Today's Sales").length,
    manual: items.filter(i => i.reason === "Manual").length,
  };

  const handleQtyChange = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, orderQty: qty } : i));
  };

  const handleSupplierChange = (id: string, supplier: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, bestSupplier: supplier } : i));
  };

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const TABS = ["All", "Low Stock", "Out of Stock", "Today's Sales", "Manual"] as const;
  const TAB_COUNTS: Record<string, number> = {
    "All": items.length,
    "Low Stock": items.filter(i => i.reason === "Low Stock").length,
    "Out of Stock": items.filter(i => i.reason === "Out of Stock").length,
    "Today's Sales": items.filter(i => i.reason === "Today's Sales").length,
    "Manual": items.filter(i => i.reason === "Manual").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>
            PharmERP <span style={{ color: "#C8CDD8" }}>›</span> Inventory <span style={{ color: "#C8CDD8" }}>›</span>
            <span style={{ color: "#1A2436", fontWeight: 600 }}> Short Book</span>
          </div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.01em" }}>Short Book</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Medicines pending purchase</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowPlan(true)}
            style={{ padding: "8px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
            Purchase Plan
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            + Add Medicine
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Items", value: summary.total, color: "#1B6CA8" },
          { label: "Estimated Purchase", value: `₹${summary.estimated.toLocaleString()}`, color: "#0C1B33", mono: true },
          { label: "Low Stock", value: summary.lowStock, color: "#F57F17" },
          { label: "Today's Sales", value: summary.todaySales, color: "#1B6CA8" },
          { label: "Manual", value: summary.manual, color: "#4B5563" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "14px 18px", borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: (c as { mono?: boolean }).mono ? "JetBrains Mono" : "Outfit", fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        {/* Tabs + search bar */}
        <div style={{ borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid #EEF1F6" }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "#1B6CA8" : "#6B7280", borderBottom: activeTab === tab ? "2px solid #1B6CA8" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                {tab}
                {TAB_COUNTS[tab] > 0 && (
                  <span style={{ fontSize: 10, padding: "1px 6px", background: activeTab === tab ? "#1B6CA8" : "#F3F4F6", color: activeTab === tab ? "#fff" : "#6B7280", fontWeight: 700, fontFamily: "JetBrains Mono", borderRadius: 10 }}>
                    {TAB_COUNTS[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <input type="text" placeholder="Search medicine, barcode..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter" }} />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: "#D1D5DB" }}>&#9776;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>Your Short Book is empty</div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Add medicines from Inventory or Today's Sales.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Medicine</Th>
                  <Th>Reason</Th>
                  <Th right>Current Stock</Th>
                  <Th right>Suggested Qty</Th>
                  <Th right>Order Qty</Th>
                  <Th>Best Supplier</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}
                    style={{ borderBottom: "1px solid #F4F6FA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Td>
                      <div style={{ fontWeight: 600, color: "#1A2436", fontSize: 13 }}>{item.medicine}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.manufacturer}</div>
                    </Td>
                    <Td><ReasonPill reason={item.reason} /></Td>
                    <Td right mono>
                      <span style={{ color: item.currentStock === 0 ? "#C62828" : item.currentStock < 10 ? "#F57F17" : "#1A2436" }}>
                        {item.currentStock}
                      </span>
                    </Td>
                    <Td right mono>{item.suggestedQty}</Td>
                    <Td right>
                      <EditQtyCell item={item} onSave={qty => handleQtyChange(item.id, qty)} />
                    </Td>
                    <Td>
                      <div style={{ fontSize: 13, color: "#1A2436" }}>{item.bestSupplier}</div>
                    </Td>
                    <Td><StatusPill status={item.status} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setCompareItem(item)}
                          style={{ padding: "5px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                          Compare
                        </button>
                        <button onClick={() => handleRemove(item.id)}
                          style={{ padding: "5px 10px", border: "1px solid #FFCDD2", background: "#FFEBEE", fontSize: 11, cursor: "pointer", color: "#C62828", fontFamily: "Inter", whiteSpace: "nowrap" }}>
                          Remove
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer row */}
        {filtered.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                Est. Purchase: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33" }}>
                  ₹{filtered.reduce((s, i) => s + i.orderQty * 22, 0).toLocaleString()}
                </span>
              </span>
              <button onClick={() => setShowPlan(true)}
                style={{ padding: "5px 14px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Create Purchase Orders
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawers */}
      {showAdd && (
        <AddMedicineDrawer
          onClose={() => setShowAdd(false)}
          onAdd={item => setItems(prev => [...prev, item])}
          onUpdateQty={(id, qty) => setItems(prev => prev.map(i => i.id === id ? { ...i, orderQty: qty } : i))}
          existingItems={items}
        />
      )}
      {compareItem && (
        <SupplierComparisonDrawer
          item={compareItem}
          onClose={() => setCompareItem(null)}
          onSelect={supplier => handleSupplierChange(compareItem.id, supplier)}
        />
      )}
      {showPlan && (
        <PurchasePlanDrawer
          items={filtered}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  );
}
