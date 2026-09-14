export const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  // Payment / invoice
  Paid: { bg: "#E8F5E9", color: "#2E7D32" },
  Partial: { bg: "#E3F2FD", color: "#1B6CA8" },
  Unpaid: { bg: "#FFEBEE", color: "#C62828" },
  Posted: { bg: "#E8F5E9", color: "#2E7D32" },
  Cleared: { bg: "#E8F5E9", color: "#2E7D32" },
  Draft: { bg: "#F5F5F5", color: "#9E9E9E" },
  Cancelled: { bg: "#F5F5F5", color: "#9E9E9E" },
  Void: { bg: "#F5F5F5", color: "#9E9E9E" },
  Failed: { bg: "#FFEBEE", color: "#C62828" },
  // Approval / workflow
  Approved: { bg: "#E3F2FD", color: "#1B6CA8" },
  Pending: { bg: "#FFF3E0", color: "#E65100" },
  "Pending Approval": { bg: "#FFF3E0", color: "#E65100" },
  "On Hold": { bg: "#FFF8E1", color: "#F57F17" },
  Rejected: { bg: "#FFEBEE", color: "#C62828" },
  Denied: { bg: "#FFEBEE", color: "#C62828" },
  // Delivery / order
  Sent: { bg: "#E3F2FD", color: "#1B6CA8" },
  "Partially Received": { bg: "#FFF3E0", color: "#E65100" },
  Completed: { bg: "#E8F5E9", color: "#2E7D32" },
  "In Transit": { bg: "#E3F2FD", color: "#1B6CA8" },
  Delivered: { bg: "#E8F5E9", color: "#2E7D32" },
  // HR
  Active: { bg: "#E8F5E9", color: "#2E7D32" },
  Inactive: { bg: "#F5F5F5", color: "#9E9E9E" },
  "On Leave": { bg: "#FFF8E1", color: "#F57F17" },
  // Prescriptions
  Dispensed: { bg: "#E8F5E9", color: "#2E7D32" },
  // Stock / inventory
  "In Stock": { bg: "#E8F5E9", color: "#2E7D32" },
  "Low Stock": { bg: "#FFF3E0", color: "#E65100" },
  "Out of Stock": { bg: "#FFEBEE", color: "#C62828" },
  Low: { bg: "#FFF3E0", color: "#E65100" },
  "Expiring Soon": { bg: "#FFF8E1", color: "#F57F17" },
  // Stock adjustment types
  "Write-off": { bg: "#FFEBEE", color: "#C62828" },
  "Stock Count": { bg: "#EFF6FF", color: "#1B6CA8" },
  Damage: { bg: "#FFF3E0", color: "#E65100" },
};

export function Pill({
  status,
  label,
  color,
  bg,
}: {
  status?: string;
  label?: string;
  color?: string;
  bg?: string;
}) {
  const text = label ?? status ?? "";
  const s =
    label && color && bg
      ? { color, bg }
      : STATUS_PILL[text] ?? { bg: "#F5F5F5", color: "#9E9E9E" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
        borderRadius: 2,
      }}
    >
      {text}
    </span>
  );
}
