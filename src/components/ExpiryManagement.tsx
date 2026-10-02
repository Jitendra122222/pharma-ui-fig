import { SK } from "../styles/stock";
import StockExpiry from "./stock/StockExpiry";

export default function ExpiryManagement() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={SK.pageTitle}>Expiry Management</h1>
          <div style={SK.subtitle}>Monitor near-expiry items, manage quarantine, supplier returns and write-offs</div>
        </div>
      </div>
      <StockExpiry />
    </div>
  );
}
