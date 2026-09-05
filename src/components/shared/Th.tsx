export function Th({
  children, right, center, sortDir, onSort,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  sortDir?: "asc" | "desc" | null;
  onSort?: () => void;
}) {
  const align = right ? "right" : center ? "center" : "left";
  return (
    <th
      onClick={onSort}
      style={{
        padding: "9px 10px",
        textAlign: align,
        fontSize: 10,
        fontWeight: 700,
        color: "#9CA3AF",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "#F8FAFC",
        borderBottom: "1px solid #E8ECF4",
        whiteSpace: "nowrap",
        position: "sticky",
        top: 0,
        zIndex: 2,
        cursor: onSort ? "pointer" : "default",
        userSelect: onSort ? "none" : "auto",
      }}
    >
      {onSort ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, lineHeight: 1 }}>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }}
              fill={sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}>
              <path d="M3 0L6 4H0L3 0Z" />
            </svg>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }}
              fill={sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}>
              <path d="M3 4L0 0H6L3 4Z" />
            </svg>
          </span>
        </span>
      ) : children}
    </th>
  );
}
