export const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Paid: { bg: "#E8F5E9", color: "#2E7D32" },
  Partial: { bg: "#E3F2FD", color: "#1B6CA8" },
  Unpaid: { bg: "#FFEBEE", color: "#C62828" },
  Cancelled: { bg: "#F5F5F5", color: "#9E9E9E" },
  Posted: { bg: "#E8F5E9", color: "#2E7D32" },
  Draft: { bg: "#F5F5F5", color: "#9E9E9E" },
  Cleared: { bg: "#E8F5E9", color: "#2E7D32" },
  Approved: { bg: "#E3F2FD", color: "#1B6CA8" },
  Pending: { bg: "#FFF3E0", color: "#E65100" },
  Failed: { bg: "#FFEBEE", color: "#C62828" },
  "On Hold": { bg: "#FFF8E1", color: "#F57F17" },
};

export function Pill({ status }: { status: string }) {
  const s = STATUS_PILL[status] ?? { bg: "#F5F5F5", color: "#9E9E9E" };
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
      {status}
    </span>
  );
}
