export function StatTile({
  label,
  value,
  color,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  align?: "left" | "center";
}) {
  return (
    <div style={{ padding: "10px 14px", border: "1px solid #E8ECF4", background: "#fff", textAlign: align }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: color ?? "#1A2436" }}>{value}</div>
    </div>
  );
}
