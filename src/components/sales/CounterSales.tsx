import { useState, useRef } from "react";
import { type LineItem, newEmptyRow } from "./salesData";
import { InvoiceSummaryFooter, LineItemsTable } from "./salesShared";

type AttachedRx = { rxNo: string; imageName: string | null };

export default function CounterSales({
  onGenerate,
}: {
  onGenerate: (items: { name: string; qty: number; packs: number }[]) => void;
}) {
  const nextId = useRef(2);
  const [items, setItems] = useState<LineItem[]>([newEmptyRow(1)]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [showRxPanel, setShowRxPanel] = useState(false);
  const [rxDraft, setRxDraft] = useState({ rxNo: "", imageName: "" });
  const [attachedRx, setAttachedRx] = useState<AttachedRx | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      if (field === "productName" && value && updated[0]?.id === id) {
        return [newEmptyRow(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[0].productName) {
        return [newEmptyRow(nextId.current++), ...filtered];
      }
      return filtered;
    });
  };

  const filledItems = items.filter(i => i.productName);
  const allChecked = filledItems.length > 0 && filledItems.every(i => checked[i.id]);
  const selectedCount = Object.values(checked).filter(Boolean).length;

  const handleCheckAll = () => {
    const next: Record<number, boolean> = {};
    filledItems.forEach(i => { next[i.id] = !allChecked; });
    setChecked(next);
  };

  const handleGenerate = () => {
    const selected = filledItems
      .filter(i => checked[i.id])
      .map(i => ({ name: i.productName, qty: i.qty, packs: i.packs }));
    if (selected.length === 0) return;
    onGenerate(selected);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
            <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>Scan or search products · Select rows · Generate Invoice</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {attachedRx ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 6, padding: "5px 10px" }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#2E7D32" opacity="0.15"/><path d="M6 10l3 3 5-5" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 12, color: "#2E7D32", fontWeight: 600, fontFamily: "Inter" }}>
                  Rx {attachedRx.rxNo || "attached"}{attachedRx.imageName ? ` · ${attachedRx.imageName}` : ""}
                </span>
                <button onClick={() => setAttachedRx(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "#2E7D32" }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              </div>
            ) : (
              <button onClick={() => { setRxDraft({ rxNo: "", imageName: "" }); setShowRxPanel(true); }}
                style={{ padding: "7px 14px", border: "1px solid #DDE3EC", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                Attach Rx
              </button>
            )}
            <button
              disabled={selectedCount === 0}
              onClick={handleGenerate}
              style={{
                padding: "8px 20px", border: "none", fontSize: 13, fontWeight: 600, cursor: selectedCount > 0 ? "pointer" : "default",
                background: selectedCount > 0 ? "#1B6CA8" : "#E8ECF4",
                color: selectedCount > 0 ? "#fff" : "#9CA3AF", fontFamily: "Inter",
              }}>
              {selectedCount > 0 ? `Generate Invoice (${selectedCount})` : "Generate Invoice"}
            </button>
          </div>
        </div>

        {/* Attach Rx panel */}
        {showRxPanel && (
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7280", marginBottom: 12 }}>Attach Prescription</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Rx / Prescription No.</label>
                <input
                  type="text"
                  placeholder="e.g. RX-2026-0042"
                  value={rxDraft.rxNo}
                  onChange={e => setRxDraft(d => ({ ...d, rxNo: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", width: 200, background: "#fff" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Hard Copy Image</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setRxDraft(d => ({ ...d, imageName: f.name }));
                }} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: "7px 12px", borderRadius: 6, border: "1px dashed #B0BEC5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {rxDraft.imageName || "Upload photo / scan"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowRxPanel(false)}
                  style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
                  Cancel
                </button>
                <button
                  disabled={!rxDraft.rxNo && !rxDraft.imageName}
                  onClick={() => { setAttachedRx({ rxNo: rxDraft.rxNo, imageName: rxDraft.imageName || null }); setShowRxPanel(false); }}
                  style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: rxDraft.rxNo || rxDraft.imageName ? "#1B6CA8" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: rxDraft.rxNo || rxDraft.imageName ? "pointer" : "default", color: "#fff", fontFamily: "Inter" }}>
                  Attach
                </button>
              </div>
            </div>
          </div>
        )}
        <LineItemsTable
          items={items} onChange={updateItem} onDelete={deleteItem}
          showCheckbox checked={checked}
          onCheck={id => setChecked(s => ({ ...s, [id]: !s[id] }))}
          onCheckAll={handleCheckAll}
          stickySearch
        />
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder="Add notes, special instructions or remarks..."
        style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box", marginTop: 8, flexShrink: 0 }} />

      <InvoiceSummaryFooter
        items={items.filter(i => checked[i.id] && i.productName)}
        paid={0}
        cashDiscount={cashDiscount}
        onCashDiscountChange={setCashDiscount}
        adjustment={adjustment}
        onAdjustmentChange={setAdjustment}
      />
    </div>
  );
}
