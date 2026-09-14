import { useState, useRef } from "react";
import { type LineItem, newEmptyRow } from "./salesData";
import { InvoiceSummaryFooter, LineItemsTable } from "./salesShared";

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

  const updateItem = (id: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      if (field === "medicineName" && value && updated[0]?.id === id) {
        return [newEmptyRow(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0 || filtered[0].medicineName) {
        return [newEmptyRow(nextId.current++), ...filtered];
      }
      return filtered;
    });
  };

  const filledItems = items.filter(i => i.medicineName);
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
      .map(i => ({ name: i.medicineName, qty: i.qty, packs: i.packs }));
    if (selected.length === 0) return;
    onGenerate(selected);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
            <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>Scan or search medicines · Select rows · Generate Invoice</span>
          </div>
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
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box", marginTop: 8, flexShrink: 0 }} />

      <InvoiceSummaryFooter
        items={items.filter(i => checked[i.id] && i.medicineName)}
        paid={0}
        cashDiscount={cashDiscount}
        onCashDiscountChange={setCashDiscount}
        adjustment={adjustment}
        onAdjustmentChange={setAdjustment}
      />
    </div>
  );
}
