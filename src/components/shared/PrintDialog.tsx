import { useState } from "react";
import { usePrinterSettings } from "./PrinterContext";
import type { PrinterType } from "./PrinterContext";

export type PrintJobType =
  | "Sales Invoice"
  | "Sales Return"
  | "Payment Receipt"
  | "Purchase Invoice"
  | "Purchase Return"
  | "Prescription Label";

interface Props {
  jobType: PrintJobType;
  docId?: string;
  onClose: () => void;
}

// ── Helper: printer type badge colour ─────────────────────────────────────────
function typeColor(t: PrinterType) {
  if (t === "Laser") return { bg: "#EFF6FF", color: "#1B6CA8" };
  if (t === "DOT") return { bg: "#F0FDF4", color: "#15803D" };
  return { bg: "#FFF7ED", color: "#C2410C" };
}

// ── Thermal receipt layout ─────────────────────────────────────────────────────
function ThermalPreview({ jobType, docId }: { jobType: PrintJobType; docId?: string }) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, width: 260, margin: "0 auto", border: "1px dashed #CBD5E1", padding: "16px 14px", background: "#fff", lineHeight: 1.7 }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, borderBottom: "1px dashed #CBD5E1", paddingBottom: 6, marginBottom: 8 }}>CITY CENTRAL PHARMACY</div>
      <div style={{ textAlign: "center", fontSize: 11, marginBottom: 8 }}>+1 (555) 800-4200 · Chicago, IL</div>
      <div style={{ textAlign: "center", fontSize: 11, borderBottom: "1px dashed #CBD5E1", paddingBottom: 6, marginBottom: 8 }}>{jobType}</div>
      {docId && <div>Ref: {docId}</div>}
      <div>Date: {new Date().toLocaleDateString()}</div>
      <div style={{ marginTop: 8, borderTop: "1px dashed #CBD5E1", paddingTop: 8 }}>
        <div>Item 1 .............. ₹0.00</div>
        <div>Item 2 .............. ₹0.00</div>
      </div>
      <div style={{ marginTop: 8, borderTop: "1px dashed #CBD5E1", paddingTop: 8, fontWeight: 700 }}>
        <div>Total ............... ₹0.00</div>
      </div>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, borderTop: "1px dashed #CBD5E1", paddingTop: 8 }}>
        Thank you for your visit!
      </div>
    </div>
  );
}

// ── Laser / DOT invoice layout ─────────────────────────────────────────────────
function InvoicePreview({ jobType, docId }: { jobType: PrintJobType; docId?: string }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, width: "100%", border: "1px solid #E2E8F0", padding: "20px 24px", background: "#fff", lineHeight: 1.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>CITY CENTRAL PHARMACY</div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>400 Main Street, Suite 100 · Chicago, IL 60601</div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>+1 (555) 800-4200 · admin@citycentralpharmacy.com</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1B6CA8" }}>{jobType}</div>
          {docId && <div style={{ fontSize: 11, color: "#6B7280" }}>Ref: {docId}</div>}
          <div style={{ fontSize: 11, color: "#6B7280" }}>Date: {new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["Item", "Qty", "Rate", "Amount"].map(h => (
              <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #E2E8F0", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9", color: "#374151" }}>Sample Item 1</td>
            <td style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9", color: "#374151" }}>1</td>
            <td style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9", color: "#374151" }}>₹0.00</td>
            <td style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9", color: "#374151" }}>₹0.00</td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <div style={{ minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
            <span style={{ color: "#6B7280" }}>Subtotal</span><span>₹0.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
            <span style={{ color: "#6B7280" }}>Tax</span><span>₹0.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0 0", fontSize: 13, fontWeight: 700, borderTop: "1px solid #E2E8F0" }}>
            <span>Total</span><span style={{ color: "#1B6CA8" }}>₹0.00</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #E2E8F0", fontSize: 10, color: "#9CA3AF", textAlign: "center" }}>
        Generated by PharmERP · {new Date().toLocaleString()}
      </div>
    </div>
  );
}

// ── Main dialog ─────────────────────────────────────────────────────────────────
export default function PrintDialog({ jobType, docId, onClose }: Props) {
  const { settings } = usePrinterSettings();
  const [printing, setPrinting] = useState(false);
  const [done, setDone] = useState(false);

  const { enabled, connected, printerType, printerName } = settings;
  const tc = typeColor(printerType);

  const canPrint = enabled && connected;

  const handlePrint = () => {
    setPrinting(true);
    // Simulate print spool then browser print
    setTimeout(() => {
      setPrinting(false);
      setDone(true);
      if (printerType === "Laser" || printerType === "DOT") {
        window.print();
      }
      setTimeout(onClose, 1200);
    }, 900);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(10,22,44,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
              Print {jobType}
            </div>
            {docId && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1, fontFamily: "JetBrains Mono" }}>{docId}</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "#9CA3AF", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        {/* Printer status strip */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0, background: "#FAFBFD" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>

            {/* Printer name + type */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span style={{ fontSize: 20 }}>🖨️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{printerName}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", ...tc, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {printerType} Printer
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px",
                    background: enabled ? "#E8F5E9" : "#FEF2F2",
                    color: enabled ? "#2E7D32" : "#C62828",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                  }}>
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px",
                    background: connected ? "#E8F5E9" : "#FEF2F2",
                    color: connected ? "#2E7D32" : "#C62828",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                  }}>
                    {connected ? "● Connected" : "○ Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Print mode badge */}
            <div style={{ fontSize: 11, color: "#6B7280", textAlign: "right", lineHeight: 1.5 }}>
              Mode:{" "}
              <strong style={{ color: "#1A2436" }}>
                {printerType === "Thermal" ? "Narrow Receipt (80mm)" : printerType === "DOT" ? "A4 Dot-Matrix" : "A4 Laser"}
              </strong>
            </div>
          </div>

          {/* Error banners */}
          {!enabled && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12, color: "#C62828", display: "flex", gap: 8, alignItems: "center" }}>
              <span>⚠</span>
              Printer is <strong>disabled</strong>. Enable it in Settings → Printer before printing.
            </div>
          )}
          {enabled && !connected && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12, color: "#C62828", display: "flex", gap: 8, alignItems: "center" }}>
              <span>⚠</span>
              Printer is <strong>not connected</strong>. Check cable / network and retry.
            </div>
          )}
          {canPrint && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 12, color: "#15803D", display: "flex", gap: 8, alignItems: "center" }}>
              <span>✓</span>
              Printer is ready. Click <strong>Print</strong> to send to <em>{printerName}</em>.
            </div>
          )}
        </div>

        {/* Preview pane */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#F8FAFC" }}>
          <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Print Preview</div>
          {printerType === "Thermal"
            ? <ThermalPreview jobType={jobType} docId={docId} />
            : <InvoicePreview jobType={jobType} docId={docId} />
          }
        </div>

        {/* Footer actions */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={!canPrint || printing || done}
            style={{
              padding: "8px 22px", border: "none",
              background: done ? "#2E7D32" : !canPrint ? "#CBD5E1" : "#1B6CA8",
              fontSize: 13, cursor: canPrint && !printing && !done ? "pointer" : "not-allowed",
              color: "#fff", fontFamily: "Inter", fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {done ? "✓ Sent to Printer" : printing ? "Printing…" : `Print (${printerType})`}
          </button>
        </div>
      </div>
    </div>
  );
}
