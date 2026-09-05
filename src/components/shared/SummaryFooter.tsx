import { EditableChip } from "./EditableChip";
import type { LineItem } from "./types";

export interface SummaryLabels {
  cashDiscount?: string;
  adjustment?: string;
  subtotal?: string;
  itemDiscount?: string;
  gst?: string;
  roundOff?: string;
  total?: string;
  paid?: string;
  balance?: string;
}

export function SummaryFooter({
  items,
  paid = 0,
  cashDiscount = 0,
  onCashDiscountChange,
  adjustment = 0,
  onAdjustmentChange,
  labels = {},
}: {
  items: LineItem[];
  paid?: number;
  cashDiscount?: number;
  onCashDiscountChange?: (v: number) => void;
  adjustment?: number;
  onAdjustmentChange?: (v: number) => void;
  labels?: SummaryLabels;
}) {
  const subtotal = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate : 0), 0);
  const discount = items.reduce((s, i) => s + (i.medicineName ? i.qty * i.saleRate * (i.disc / 100) : 0), 0);
  const tax = items.reduce((s, i) => s + (i.medicineName ? (i.qty * i.saleRate - i.qty * i.saleRate * (i.disc / 100)) * (i.gst / 100) : 0), 0);
  const roundOff = 0;
  const total = subtotal - discount - cashDiscount + tax + roundOff + adjustment;
  const balance = total - paid;

  const editableCashDisc = onCashDiscountChange !== undefined;
  const editableAdjust = onAdjustmentChange !== undefined;

  const readChips = [
    { label: labels.subtotal ?? "Subtotal", val: `₹${subtotal.toFixed(2)}`, muted: true },
    { label: labels.itemDiscount ?? "Item Discount", val: `-₹${discount.toFixed(2)}`, muted: true },
    { label: labels.gst ?? "GST / Tax", val: `₹${tax.toFixed(2)}`, muted: true },
    { label: labels.roundOff ?? "Round Off", val: `₹${roundOff.toFixed(2)}`, muted: true },
    { label: labels.total ?? "Total", val: `₹${total.toFixed(2)}`, bold: true, highlight: true },
    { label: labels.paid ?? "Paid", val: `₹${paid.toFixed(2)}`, muted: true, color: "#2E7D32" },
    { label: labels.balance ?? "Balance", val: `₹${balance.toFixed(2)}`, bold: true, color: balance > 0 ? "#C62828" : "#2E7D32" },
  ];

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: "2px solid #E8ECF4",
        background: "#fff",
        display: "flex",
        alignItems: "stretch",
        minHeight: 76,
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
        <EditableChip
          label={labels.cashDiscount ?? "Cash Discount"}
          value={cashDiscount}
          onChange={onCashDiscountChange}
          editable={editableCashDisc}
          color="#6B7280"
          prefix="-"
        />
        <EditableChip
          label={labels.adjustment ?? "Adjustment"}
          value={adjustment}
          onChange={onAdjustmentChange}
          editable={editableAdjust}
          color={adjustment < 0 ? "#C62828" : "#6B7280"}
          allowNegative
        />
        {readChips.map((s: any) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              borderLeft: "1px solid #EEF1F6",
              flex: "1 1 0",
              minWidth: 110,
            }}
          >
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: s.bold ? 15 : 13,
                  fontWeight: s.bold ? 700 : 500,
                  color: s.color ?? (s.muted ? "#6B7280" : "#1A2436"),
                  background: s.highlight ? "#EFF6FF" : undefined,
                  padding: s.highlight ? "2px 6px" : undefined,
                  display: "inline-block",
                  whiteSpace: "nowrap",
                }}
              >
                {s.val}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
