import InventoryDashboard from "./inventory/InventoryDashboard";
import StockScreen from "./inventory/StockScreen";
import ShortBookScreen from "./inventory/ShortBookScreen";
import VerificationScreen from "./inventory/VerificationScreen";
import ExpiryRiskScreen from "./inventory/ExpiryRiskScreen";
import MovementControlScreen from "./inventory/MovementControlScreen";
import ReportsScreen from "./inventory/ReportsScreen";

type InvSection = "dashboard" | "stock" | "shortbook" | "verification" | "expiry" | "movement" | "reports";

interface InventoryProps {
  section: string;
  onSectionChange: (s: string) => void;
}

export default function Inventory({ section, onSectionChange }: InventoryProps) {
  const s = section as InvSection;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
      {s === "dashboard"    && <InventoryDashboard onNavigate={onSectionChange} />}
      {s === "stock"        && <StockScreen />}
      {s === "shortbook"    && <ShortBookScreen />}
      {s === "verification" && <VerificationScreen />}
      {s === "expiry"       && <ExpiryRiskScreen />}
      {s === "movement"     && <MovementControlScreen />}
      {s === "reports"      && <ReportsScreen />}
    </div>
  );
}
