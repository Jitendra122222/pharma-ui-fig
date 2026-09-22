import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { PurchaseLine } from "./purchasesData";
import { purchaseOrders } from "./purchasesData";
import { Svg, IconCheck, IconAlert, IconBarcode, IconChevRight, IconPhone, IconCamera, IconKeyboard } from "../shared/Icons";
import { OptionCard, MethodCard, CenteredModal } from "./purchasesShared";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FlowStep =
  | "decision"
  | "method-select"
  | "mobile-connect"
  | "workspace"
  | "skip-phys-confirm"
  | "skip-all-confirm";

type VerifyMode = "full" | "physical-only" | "skip-all";
type PhysMethod = "scanner" | "mobile" | "camera" | "manual";
type PhysStatus = "pending" | "matched" | "short" | "excess" | "batch-mismatch";
type POVStatus = "matched" | "warning" | "critical" | "missing" | "expired";

interface PhysItem {
  id: number;
  medicineName: string;
  batchNo: string;
  expDate: string;
  mrp: number;
  invoiceQty: number;
  physicalQty: number;
  status: PhysStatus;
  resolution?: "short-book" | "accept" | "supplier-followup" | "return-excess";
}

interface POItem {
  id: number;
  medicineName: string;
  poQty: number;
  confirmedQty: number;
  invoiceQty: number;
  poRate: number;
  invoiceRate: number;
  poMrp: number;
  invMrp: number;
  poDiscount: number;
  invDiscount: number;
  poBatchNo: string;
  invBatchNo: string;
  poExpDate: string;
  invExpDate: string;
  poFreeQty: number;
  invFreeQty: number;
  isExpired: boolean;
  status: POVStatus;
  action?: "short-book" | "return" | "accept";
}

export interface PurchaseVerifyFlowProps {
  supplier: string;
  invoiceNo: string;
  invoiceDate: string;
  poRef: string;
  items: PurchaseLine[];
  invoiceTotal: number;
  onClose: () => void;
  onPost: () => void;
}

// ─── Status maps ───────────────────────────────────────────────────────────────

const PHYS_S: Record<PhysStatus, { label: string; bg: string; color: string; border: string }> = {
  pending:          { label: "Pending",       bg: "#F8FAFC", color: "#9CA3AF", border: "#EEF1F6" },
  matched:          { label: "Matched",       bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  short:            { label: "Short",         bg: "#FFF3E0", color: "#E65100", border: "#FFCC80" },
  excess:           { label: "Excess",        bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
  "batch-mismatch": { label: "Batch Mismatch",bg: "#FFEBEE", color: "#C62828", border: "#FFCDD2" },
};

const POV_S: Record<POVStatus, { color: string; bg: string; border: string; label: string }> = {
  matched:  { color: "#2E7D32", bg: "#E8F5E9", border: "#A5D6A7", label: "Matched"  },
  warning:  { color: "#E65100", bg: "#FFF3E0", border: "#FFCC80", label: "Warning"  },
  critical: { color: "#C62828", bg: "#FFEBEE", border: "#FFCDD2", label: "Critical" },
  missing:  { color: "#C62828", bg: "#FFEBEE", border: "#FFCDD2", label: "Missing"  },
  expired:  { color: "#6B7280", bg: "#F3F4F6", border: "#DDE3EC", label: "Expired"  },
};

const SKIP_REASONS = [
  "Direct Purchase",
  "Emergency Purchase",
  "Small / Low-Value Purchase",
  "Supplier Already Verified",
  "Already Checked Manually",
  "Trusted Supplier",
  "Other",
];


// QR code SVG placeholder
function QRPlaceholder({ sessionId }: { sessionId: string }) {
  const v = sessionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const SIZE = 168;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: "block", border: "1px solid #E8ECF4" }}>
      <rect width={SIZE} height={SIZE} fill="#fff"/>
      {/* Top-left finder */}
      {[[0,0,56,56],[8,8,40,40],[16,16,24,24]].map(([x,y,w,h],i) => (
        <rect key={`tl${i}`} x={x} y={y} width={w} height={h} fill={i%2===0 ? "#1A2436" : "#fff"}/>
      ))}
      {/* Top-right finder */}
      {[[112,0,56,56],[120,8,40,40],[128,16,24,24]].map(([x,y,w,h],i) => (
        <rect key={`tr${i}`} x={x} y={y} width={w} height={h} fill={i%2===0 ? "#1A2436" : "#fff"}/>
      ))}
      {/* Bottom-left finder */}
      {[[0,112,56,56],[8,120,40,40],[16,128,24,24]].map(([x,y,w,h],i) => (
        <rect key={`bl${i}`} x={x} y={y} width={w} height={h} fill={i%2===0 ? "#1A2436" : "#fff"}/>
      ))}
      {/* Data cells */}
      {Array.from({ length: 10 * 10 }, (_, i) => {
        const row = Math.floor(i / 10);
        const col = i % 10;
        const x = 64 + col * 8;
        const y = 64 + row * 8;
        if ((x < 60 && y < 60) || (x > 110 && y < 60) || (x < 60 && y > 110)) return null;
        const on = ((v * (row + 3) * (col + 5) * 11) % 23) > 11;
        return on ? <rect key={i} x={x} y={y} width={8} height={8} fill="#1A2436"/> : null;
      })}
    </svg>
  );
}


// ─── Main component ────────────────────────────────────────────────────────────

export default function PurchaseVerifyFlow({
  supplier, invoiceNo, invoiceDate, poRef, items, invoiceTotal, onClose, onPost,
}: PurchaseVerifyFlowProps) {
  const hasPO = poRef.trim().length > 0;
  const linkedPO = purchaseOrders.find(p => p.id === poRef);
  const medItems = useMemo(() => items.filter(i => i.medicineName.trim() !== ""), [items]);

  // ── Navigation ──
  const [step, setStep] = useState<FlowStep>("decision");
  const [mode, setMode] = useState<VerifyMode | null>(null);
  const [physMethod, setPhysMethod] = useState<PhysMethod | null>(null);
  const [wStep, setWStep] = useState(0);

  // ── Verification data ──
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [physItems, setPhysItems] = useState<PhysItem[]>([]);
  const [poEditing, setPoEditing] = useState<{ id: number; field: "qty" | "rate" | "mrp" | "discount" | "free" } | null>(null);
  const [poEditVal, setPoEditVal] = useState("");

  // ── Scanner ──
  const [scannerActive, setScannerActive] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanToast, setScanToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [manualEntry, setManualEntry] = useState("");
  const [exception, setException] = useState<PhysItem | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Mobile ──
  const [mobileConnected, setMobileConnected] = useState(false);
  const [mobileConnecting, setMobileConnecting] = useState(false);

  // ── Physical method choice (picked inline at end of PO step) ──
  const [physMethodChosen, setPhysMethodChosen] = useState<PhysMethod | "skip" | null>(null);
  const [physSkipped, setPhysSkipped] = useState(false);

  // ── Skip confirm ──
  const [skipReason, setSkipReason] = useState("");
  const [skipComment, setSkipComment] = useState("");

  const sessionId = useMemo(() => {
    const d = (invoiceDate || "2026-09-15").replace(/-/g, "").slice(2);
    return `PV-${d}-${String(10000 + Math.floor(Math.random() * 89999))}`;
  }, []);

  // ── Step arrays based on mode ──
  const steps = useMemo(() =>
    mode === "full"
      ? ["PO Verification", "Physical Verification", "Resolve Variances", "Final Verify & Post"]
      : ["Physical Verification", "Resolve Variances", "Final Verify & Post"],
    [mode]);

  const physWIdx = mode === "full" ? 1 : 0;
  const varWIdx  = mode === "full" ? 2 : 1;
  const finalWIdx = mode === "full" ? 3 : 2;

  // ── Derived counts ──
  const totalItems    = medItems.length;
  const verifiedCount = physItems.filter(i => i.status === "matched").length;
  const remainingCount = physItems.filter(i => i.status === "pending").length;
  const varianceCount = physItems.filter(i => i.status !== "pending" && i.status !== "matched").length;
  const unresolvedVar = physItems.filter(i =>
    (i.status === "short" || i.status === "excess" || i.status === "batch-mismatch") && !i.resolution
  ).length;

  const poSummary = {
    matched:  poItems.filter(i => i.status === "matched").length,
    warnings: poItems.filter(i => i.status === "warning").length,
    critical: poItems.filter(i => i.status === "critical").length,
    missing:  poItems.filter(i => i.status === "missing").length,
    expired:  poItems.filter(i => i.status === "expired").length,
  };

  const allScanned = totalItems > 0 && remainingCount === 0;

  // ── Effects ──
  useEffect(() => {
    if (!scanToast) return;
    const t = setTimeout(() => setScanToast(null), 2000);
    return () => clearTimeout(t);
  }, [scanToast]);

  useEffect(() => {
    if (scannerActive && scanRef.current) scanRef.current.focus();
  }, [scannerActive, wStep, step]);

  useEffect(() => {
    if (!mobileConnecting) return;
    const t = setTimeout(() => { setMobileConnected(true); setMobileConnecting(false); }, 3500);
    return () => clearTimeout(t);
  }, [mobileConnecting]);

  // ── Scan handler ──
  const handleScan = useCallback((code: string) => {
    const raw = code.trim();
    if (!raw) return;
    setScanInput("");
    setManualEntry("");

    setPhysItems(prev => {
      const idx = prev.findIndex(i =>
        (i.batchNo && i.batchNo.toLowerCase() === raw.toLowerCase()) ||
        i.medicineName.toLowerCase().includes(raw.toLowerCase())
      );
      if (idx === -1) {
        setScanToast({ ok: false, msg: `Not found: "${raw}"` });
        return prev;
      }
      const item = prev[idx];
      const newQty = item.physicalQty + 1;
      const newStatus: PhysStatus =
        newQty === item.invoiceQty ? "matched" :
        newQty < item.invoiceQty  ? "short"   : "excess";

      const updated = prev.map((it, i) =>
        i !== idx ? it : { ...it, physicalQty: newQty, status: newStatus }
      );
      if (newStatus === "excess") setException(updated[idx]);

      setScanToast({
        ok: newStatus !== "excess",
        msg: newStatus === "matched" ? `${item.medicineName} — Matched (${newQty})`
          : newStatus === "short"    ? `${item.medicineName} — ${newQty} / ${item.invoiceQty} scanned`
          :                            `${item.medicineName} — Excess! ${newQty} > ${item.invoiceQty}`,
      });
      return updated;
    });
  }, []);

  // ── Init helpers ──
  const initPoItems = useCallback(() => {
    const mapped = medItems.map((item, idx) => {
      // Mock variations per index to demonstrate all scenarios
      const rateOff    = idx === 1 ? 2 : 0;
      const qtyOff     = idx === 2 ? -10 : 0;
      const batchOff   = idx === 3;
      const isExpired  = idx === 4;
      const isMissing  = idx === 5;

      const poQ    = isMissing ? item.qty : Math.max(1, item.qty + qtyOff);
      const poR    = Math.max(0.01, item.purchaseRate + rateOff);
      const poBatch = batchOff ? `PO-${item.batchNo || "B001"}` : (item.batchNo || "B001");
      const invBatch = item.batchNo || "B001";

      const invExp  = item.expDate || "2027-06";
      const poExp   = isExpired ? "2026-06" : invExp;

      const invFree = item.free ?? 0;
      const poFree  = idx === 6 ? Math.max(0, invFree - 2) : invFree;

      const invMrp  = item.mrp;
      const poMrp   = idx === 7 ? parseFloat((item.mrp * 1.1).toFixed(2)) : item.mrp;
      const poDisc  = item.disc ?? 12;
      const invDisc = idx === 8 ? Math.max(0, poDisc - 2) : poDisc;

      let st: POVStatus =
        isMissing  ? "missing"  :
        isExpired  ? "expired"  :
        rateOff !== 0 ? "critical" :
        (qtyOff !== 0 || batchOff || poFree !== invFree || poMrp !== invMrp || poDisc !== invDisc) ? "warning" : "matched";

      return {
        id: item.id, medicineName: item.medicineName,
        poQty: poQ, confirmedQty: poQ, invoiceQty: isMissing ? 0 : item.qty,
        poRate: poR, invoiceRate: item.purchaseRate,
        poMrp, invMrp, poDiscount: poDisc, invDiscount: invDisc,
        poBatchNo: poBatch, invBatchNo: invBatch,
        poExpDate: poExp, invExpDate: invExp,
        poFreeQty: poFree, invFreeQty: invFree,
        isExpired, status: st,
      };
    });

    // Synthetic short-delivery row — PO ordered 150, invoice delivered only 110
    mapped.push({
      id: -1,
      medicineName: "Pantoprazole 40mg",
      poQty: 150, confirmedQty: 150, invoiceQty: 110,
      poRate: 3.80, invoiceRate: 3.80,
      poMrp: 7.50, invMrp: 7.50,
      poDiscount: 12, invDiscount: 12,
      poBatchNo: "PNT-2026-02", invBatchNo: "PNT-2026-02",
      poExpDate: "2028-06", invExpDate: "2028-06",
      poFreeQty: 15, invFreeQty: 15,
      isExpired: false, status: "warning" as POVStatus,
    });

    setPoItems(mapped);
  }, [medItems]);

  const initPhysItems = useCallback(() => {
    setPhysItems(medItems.map(item => ({
      id: item.id, medicineName: item.medicineName, batchNo: item.batchNo || "",
      expDate: item.expDate || "", mrp: item.mrp, invoiceQty: item.qty,
      physicalQty: 0, status: "pending" as PhysStatus,
    })));
  }, [medItems]);

  // ── Mode starters ──
  const startFull = () => {
    setMode("full");
    initPoItems();
    initPhysItems();
    setWStep(0);
    setStep("workspace");
  };

  const startPhysical = () => {
    setMode("physical-only");
    initPhysItems();
    setWStep(0);
    setStep("method-select");
  };

  const selectMethod = (m: PhysMethod) => {
    setPhysMethod(m);
    if (m === "mobile") {
      setStep("mobile-connect");
    } else {
      setScannerActive(m === "scanner");
      setStep("workspace");
      setWStep(mode === "full" ? physWIdx : 0);
    }
  };

  const afterMobileConnect = () => {
    setStep("workspace");
    setWStep(mode === "full" ? physWIdx : 0);
  };

  const resolveException = (action: PhysItem["resolution"]) => {
    if (!exception) return;
    setPhysItems(prev => prev.map(i => i.id === exception.id ? { ...i, resolution: action } : i));
    setException(null);
  };

  const savePoEdit = (id: number, field: "qty" | "rate" | "mrp" | "discount" | "free", raw: string) => {
    const num = parseFloat(raw);
    setPoEditing(null);
    if (isNaN(num) || num < 0) return;
    setPoItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const u: POItem = {
        ...item,
        ...(field === "qty"      ? { invoiceQty:  Math.round(Math.max(0, num)) } : {}),
        ...(field === "rate"     ? { invoiceRate: Math.max(0, num) }             : {}),
        ...(field === "mrp"      ? { invMrp:      Math.max(0, num) }             : {}),
        ...(field === "discount" ? { invDiscount: Math.min(100, Math.max(0, num)) } : {}),
        ...(field === "free"     ? { invFreeQty:  Math.round(Math.max(0, num)) } : {}),
      };
      if (u.status === "missing" || u.isExpired) return u;
      const rateBad = u.invoiceRate > u.poRate;
      const anyWarn = u.invoiceQty !== u.poQty || u.invBatchNo !== u.poBatchNo ||
                      u.invFreeQty !== u.poFreeQty || u.invMrp !== u.poMrp || u.invDiscount !== u.poDiscount;
      const newSt: POVStatus = rateBad ? "critical" : anyWarn ? "warning" : "matched";
      return { ...u, status: newSt, action: newSt === "matched" ? undefined : u.action };
    }));
  };

  const canProceed = () => {
    if (wStep === 0 && mode === "full") return physMethodChosen !== null;
    if (wStep === physWIdx) return allScanned;
    if (wStep === varWIdx) return unresolvedVar === 0;
    return true;
  };

  const goNext = () => {
    if (wStep === 0 && mode === "full") {
      if (physMethodChosen === "skip") {
        setPhysSkipped(true);
        setWStep(finalWIdx);
      } else if (physMethodChosen) {
        setPhysMethod(physMethodChosen);
        setScannerActive(physMethodChosen === "scanner");
        if (physMethodChosen === "mobile") {
          setStep("mobile-connect");
        } else {
          setWStep(physWIdx);
        }
      }
      return;
    }
    if (wStep < steps.length - 1) setWStep(w => w + 1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Decision modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "decision") return (
    <CenteredModal width={620}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436" }}>Purchase Verification</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3, fontFamily: "Inter" }}>Choose how you want to verify this purchase.</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 22px" }}>
        {/* Invoice context */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { label: "Supplier",  value: supplier || "—",  mono: false },
            { label: "Invoice",   value: invoiceNo || "—", mono: true  },
            { label: "Date",      value: invoiceDate || "—", mono: true },
            { label: "PO Ref",    value: poRef || "—",     mono: true  },
            { label: "Items",     value: String(totalItems), mono: true },
            { label: "Amount",    value: `₹${invoiceTotal.toFixed(2)}`, mono: true },
          ].map(c => (
            <div key={c.label} style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "7px 12px", flex: "1 1 90px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: c.mono ? "JetBrains Mono" : "Inter" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* PO status bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: hasPO ? "#E8F5E9" : "#FFF3E0", border: `1px solid ${hasPO ? "#A5D6A7" : "#FFCC80"}`, marginBottom: 18 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: hasPO ? "#2E7D32" : "#E65100", flexShrink: 0 }} />
          {hasPO ? (
            <span style={{ fontSize: 13, fontFamily: "Inter" }}>
              <strong style={{ color: "#2E7D32" }}>Purchase Order Found</strong>
              <span style={{ color: "#388E3C", marginLeft: 10 }}>
                {poRef} &middot; {linkedPO?.supplier || supplier} &middot; {linkedPO?.items || totalItems} Products
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 13, fontFamily: "Inter" }}>
              <strong style={{ color: "#E65100" }}>No Purchase Order Found</strong>
              <span style={{ color: "#EF6C00", marginLeft: 8 }}>This invoice was created without a Purchase Order.</span>
            </span>
          )}
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hasPO ? (
            <>
              <OptionCard
                icon={<IconCheck color="#2E7D32" size={20}/>}
                title="Full Verification"
                badge="Recommended"
                desc="Verify PO details and physically received products."
                subSteps={["PO Verification", "Physical Verification", "Variance Resolution", "Final Verify & Post"]}
                btnLabel="Start Full Verification"
                btnPrimary
                onSelect={startFull}
              />
              <OptionCard
                icon={<IconBarcode color="#1B6CA8" size={20}/>}
                title="Physical Verification Only"
                desc="Skip PO verification and verify the products physically received against the Purchase Invoice."
                btnLabel="Start Physical Verification"
                onSelect={startPhysical}
              />
              <OptionCard
                icon={<IconChevRight color="#6B7280" size={20}/>}
                title="Skip Verification"
                desc="Post the Purchase Invoice without PO or physical verification."
                btnLabel="Skip Verification"
                onSelect={() => setStep("skip-all-confirm")}
              />
            </>
          ) : (
            <>
              <OptionCard
                icon={<IconBarcode color="#1B6CA8" size={20}/>}
                title="Physical Verification"
                badge="Recommended"
                desc="Verify the products received against the Purchase Invoice using a scanner, mobile camera, web camera, or manual entry."
                btnLabel="Start Physical Verification"
                btnPrimary
                onSelect={startPhysical}
              />
              <OptionCard
                icon={<IconChevRight color="#6B7280" size={20}/>}
                title="Skip Physical Verification"
                desc="Accept the Purchase Invoice without physically scanning or checking the received products."
                btnLabel="Skip & Continue"
                onSelect={() => setStep("skip-phys-confirm")}
              />
              <OptionCard
                icon={<Svg d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" w={20} h={20} stroke="#C62828"/>}
                title="Skip Entire Verification"
                desc="Post the Purchase Invoice without any form of verification. Stock will be updated using invoice quantities."
                btnLabel="Skip & Post"
                onSelect={() => setStep("skip-all-confirm")}
              />
            </>
          )}
        </div>
      </div>
    </CenteredModal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Method select modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "method-select") return (
    <CenteredModal width={660}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436" }}>Select Verification Method</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3, fontFamily: "Inter" }}>How would you like to verify the received products?</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ padding: "18px 22px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <MethodCard
          icon={<IconBarcode/>}
          title="Barcode Scanner"
          badge="Recommended"
          desc="Use a USB or Bluetooth barcode scanner connected to this computer."
          btnLabel="Use Scanner"
          onSelect={() => selectMethod("scanner")}
        />
        <MethodCard
          icon={<IconPhone/>}
          title="Mobile Camera"
          desc="Use the MedTec mobile app to scan products using the phone camera."
          btnLabel="Connect Mobile"
          onSelect={() => selectMethod("mobile")}
        />
        <MethodCard
          icon={<IconCamera/>}
          title="Web Camera"
          desc="Use the computer's built-in or external camera to scan product barcodes."
          btnLabel="Use Camera"
          onSelect={() => selectMethod("camera")}
        />
        <MethodCard
          icon={<IconKeyboard/>}
          title="Manual Entry"
          desc="Enter product, batch, expiry, MRP, and quantity manually."
          btnLabel="Enter Manually"
          onSelect={() => selectMethod("manual")}
        />
      </div>

      <div style={{ borderTop: "1px solid #EEF1F6", padding: "12px 22px", display: "flex", justifyContent: "flex-start", flexShrink: 0 }}>
        <button onClick={() => setStep("decision")} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280", fontFamily: "Inter" }}>← Back</button>
      </div>
    </CenteredModal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Mobile connect modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "mobile-connect") return (
    <CenteredModal width={460}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436" }}>Connect MedTec Mobile</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3, fontFamily: "Inter" }}>Scan the QR code with the MedTec mobile app.</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <QRPlaceholder sessionId={sessionId}/>

        <div style={{ width: "100%", background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Session", value: sessionId },
            { label: "Invoice", value: invoiceNo || "—" },
            { label: "Supplier", value: supplier || "—" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter" }}>{r.label}</span>
              <span style={{ fontSize: 12, color: "#1A2436", fontFamily: "JetBrains Mono" }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Connection status */}
        {!mobileConnected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFCC80", width: "100%" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: mobileConnecting ? "#FFA000" : "#E65100", animation: mobileConnecting ? "pulse 1s infinite" : "none" }}/>
            <span style={{ fontSize: 13, color: "#E65100", fontFamily: "Inter" }}>{mobileConnecting ? "Connecting..." : "Waiting for mobile connection..."}</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#E8F5E9", border: "1px solid #A5D6A7", width: "100%" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2E7D32" }}/>
            <span style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600, fontFamily: "Inter" }}>Mobile Connected — MedTec Mobile</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #EEF1F6", padding: "12px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setStep("method-select")} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280", fontFamily: "Inter" }}>← Back</button>
        <div style={{ display: "flex", gap: 8 }}>
          {!mobileConnected && !mobileConnecting && (
            <button onClick={() => setMobileConnecting(true)} style={{ padding: "7px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
              Simulate Connection
            </button>
          )}
          <button
            disabled={!mobileConnected}
            onClick={afterMobileConnect}
            style={{ padding: "7px 18px", border: "none", background: mobileConnected ? "#1B6CA8" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: mobileConnected ? "pointer" : "not-allowed", color: mobileConnected ? "#fff" : "#8FA3B1", fontFamily: "Inter" }}>
            Start Scanning
          </button>
        </div>
      </div>
    </CenteredModal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Skip physical confirmation
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "skip-phys-confirm") return (
    <CenteredModal width={480}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436" }}>Skip Physical Verification?</div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: "#FFF3E0", border: "1px solid #FFCC80" }}>
          <IconAlert color="#E65100" size={16}/>
          <span style={{ fontSize: 13, color: "#E65100", fontFamily: "Inter", lineHeight: 1.5 }}>
            You are about to accept this Purchase Invoice without physically verifying the received products.
          </span>
        </div>

        <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {[{ l: "Invoice", v: invoiceNo || "—" }, { l: "Supplier", v: supplier || "—" }, { l: "Items", v: String(totalItems) }].map(r => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter" }}>{r.l}</span>
              <span style={{ fontSize: 12, color: "#1A2436", fontFamily: "JetBrains Mono" }}>{r.v}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, fontFamily: "Inter" }}>Reason <span style={{ color: "#C62828" }}>*</span></div>
          <select value={skipReason} onChange={e => setSkipReason(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", background: "#fff" }}>
            <option value="">— Select Reason —</option>
            {SKIP_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, fontFamily: "Inter" }}>Comment</div>
          <textarea value={skipComment} onChange={e => setSkipComment(e.target.value)}
            placeholder="Optional additional notes..."
            rows={2}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", resize: "vertical", boxSizing: "border-box" as const }}/>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setStep("decision")} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button
            disabled={!skipReason}
            onClick={onPost}
            style={{ padding: "7px 20px", border: "none", background: skipReason ? "#1B6CA8" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: skipReason ? "pointer" : "not-allowed", color: skipReason ? "#fff" : "#8FA3B1", fontFamily: "Inter" }}>
            Confirm Skip
          </button>
        </div>
      </div>
    </CenteredModal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Skip entire verification confirmation
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "skip-all-confirm") return (
    <CenteredModal width={500}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436" }}>Skip Entire Verification?</div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "12px 14px" }}>
          {[
            { label: "PO Verification", value: "Skipped" },
            { label: "Physical Verification", value: "Skipped" },
            { label: "Variance Resolution", value: "Skipped" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#C62828", background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "1px 8px", fontFamily: "Inter" }}>Skipped</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#FFEBEE", border: "1px solid #FFCDD2" }}>
          <IconAlert color="#C62828" size={15}/>
          <span style={{ fontSize: 12, color: "#C62828", fontFamily: "Inter", lineHeight: 1.5 }}>
            This Purchase Invoice will be posted without verification. Stock will be updated using the invoice quantities.
          </span>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, fontFamily: "Inter" }}>Reason <span style={{ color: "#C62828" }}>*</span></div>
          <select value={skipReason} onChange={e => setSkipReason(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", background: "#fff" }}>
            <option value="">— Select Reason —</option>
            {SKIP_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, fontFamily: "Inter" }}>Comment</div>
          <textarea value={skipComment} onChange={e => setSkipComment(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", resize: "vertical", boxSizing: "border-box" as const }}/>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setStep("decision")} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button
            disabled={!skipReason}
            onClick={onPost}
            style={{ padding: "7px 20px", border: "none", background: skipReason ? "#C62828" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: skipReason ? "pointer" : "not-allowed", color: skipReason ? "#fff" : "#8FA3B1", fontFamily: "Inter" }}>
            Confirm & Post
          </button>
        </div>
      </div>
    </CenteredModal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Full-screen verification workspace
  // ─────────────────────────────────────────────────────────────────────────────
  if (step !== "workspace") return null;

  const currentStepLabel = steps[wStep] ?? "";
  const isPoStep     = mode === "full" && wStep === 0;
  const isPhysStep   = wStep === physWIdx;
  const isVarStep    = wStep === varWIdx;
  const isFinalStep  = wStep === finalWIdx;
  const canGoNext    = canProceed();

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, zIndex: 50, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, borderBottom: "1px solid #E8ECF4", flexShrink: 0, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 18, lineHeight: 1, padding: "0 4px", display: "flex", alignItems: "center" }}>←</button>
          <div>
            <span style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Purchase Verification</span>
            <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 10, fontFamily: "JetBrains Mono" }}>{invoiceNo}</span>
            <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 6, fontFamily: "Inter" }}>&middot; {supplier}</span>
            {poRef && <span style={{ fontSize: 11, color: "#6B7280", marginLeft: 6, fontFamily: "JetBrains Mono" }}>&middot; {poRef}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>Session: {sessionId}</div>
          {isPhysStep && physMethod && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: scannerActive || physMethod === "scanner" ? "#E8F5E9" : mobileConnected ? "#E8F5E9" : "#F8FAFC", border: `1px solid ${scannerActive || mobileConnected ? "#A5D6A7" : "#EEF1F6"}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: scannerActive || mobileConnected ? "#2E7D32" : "#9CA3AF" }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: scannerActive || mobileConnected ? "#2E7D32" : "#6B7280", fontFamily: "Inter" }}>
                {physMethod === "scanner" ? "Scanner" : physMethod === "mobile" ? "Mobile" : physMethod === "camera" ? "Camera" : "Manual"}
                {(scannerActive || mobileConnected) ? " Connected" : " Ready"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0, background: "#FAFBFD", padding: "0 20px" }}>
        {steps.map((s, i) => {
          const done = i < wStep;
          const active = i === wStep;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: active ? "2px solid #1B6CA8" : "2px solid transparent" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: done ? "#2E7D32" : active ? "#1B6CA8" : "#EEF1F6",
                  border: "none",
                }}>
                  {done
                    ? <IconCheck color="#fff" size={11}/>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "#9CA3AF", fontFamily: "Inter" }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: done ? "#2E7D32" : active ? "#1B6CA8" : "#9CA3AF", fontFamily: "Inter", whiteSpace: "nowrap" }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ color: "#DDE3EC", fontSize: 12, padding: "0 4px" }}>→</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── PO Verification step ── */}
        {isPoStep && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                { label: "PO Reference", value: poRef || "—" },
                { label: "Supplier on PO", value: linkedPO?.supplier || (poRef ? "—" : "No PO") },
                { label: "PO Date", value: linkedPO?.date || "—" },
                { label: "PO Order Value", value: linkedPO ? `₹${linkedPO.orderValue.toFixed(2)}` : "—" },
                { label: "PO Items", value: linkedPO ? String(linkedPO.items) : "—" },
              ].map(f => (
                <div key={f.label} style={{ flex: "1 1 130px", background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: f.label.includes("Value") || f.label.includes("Reference") ? "JetBrains Mono" : "Inter" }}>{f.value}</div>
                </div>
              ))}
            </div>

            {linkedPO && (
              <div style={{ marginBottom: 16, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, background: linkedPO.supplier === supplier ? "#E8F5E9" : "#FFEBEE", border: `1px solid ${linkedPO.supplier === supplier ? "#A5D6A7" : "#FFCDD2"}` }}>
                {linkedPO.supplier === supplier
                  ? <IconCheck color="#2E7D32" size={14}/>
                  : <IconAlert color="#C62828" size={14}/>}
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter", color: linkedPO.supplier === supplier ? "#2E7D32" : "#C62828" }}>
                  {linkedPO.supplier === supplier
                    ? "Supplier matches PO"
                    : `Supplier mismatch — PO: "${linkedPO.supplier}" · Invoice: "${supplier}"`}
                </span>
              </div>
            )}

            {/* PO vs Invoice table */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 8 }}>PO vs Invoice Comparison</div>
            {/* Summary chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: `${poSummary.matched} Matched`,   bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7",  show: true },
                { label: `${poSummary.warnings} Warnings`, bg: "#FFF3E0", color: "#E65100", border: "#FFCC80",  show: true },
                { label: `${poSummary.critical} Critical`, bg: "#FFEBEE", color: "#C62828", border: "#FFCDD2",  show: true },
                { label: `${poSummary.missing} Missing`,   bg: "#FFEBEE", color: "#C62828", border: "#FFCDD2",  show: poSummary.missing > 0 },
                { label: `${poSummary.expired} Expired`,   bg: "#F3F4F6", color: "#6B7280", border: "#DDE3EC",  show: poSummary.expired > 0 },
              ].filter(c => c.show).map(c => (
                <div key={c.label} style={{ padding: "5px 14px", background: c.bg, border: `1px solid ${c.border}`, fontSize: 12, fontWeight: 600, color: c.color, fontFamily: "Inter" }}>{c.label}</div>
              ))}
            </div>
            <div style={{ border: "1px solid #E8ECF4", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {[
                      { h: "Product",  w: 152, a: "left"  },
                      { h: "Batch",    w: 92,  a: "left"  },
                      { h: "Expiry",   w: 80,  a: "left"  },
                      { h: "Scheme",   w: 76,  a: "right" },
                      { h: "Disc %",   w: 70,  a: "right" },
                      { h: "MRP",      w: 88,  a: "right" },
                      { h: "Qty",      w: 84,  a: "right" },
                      { h: "Rate",     w: 96,  a: "right" },
                      { h: "Status",   w: 78,  a: "left"  },
                      { h: "Action",   w: 130, a: "left"  },
                    ].map(({ h, w, a }) => (
                      <th key={h} style={{ padding: "7px 8px", textAlign: a as "left" | "right", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase" as const, borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap", minWidth: w }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poItems.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No items to compare</td></tr>
                  ) : poItems.map((item, idx) => {
                    const batchOk  = item.poBatchNo === item.invBatchNo;
                    const expOk    = item.poExpDate === item.invExpDate;
                    const isMissing = item.status === "missing";
                    const isExcess  = !isMissing && item.invoiceQty > item.poQty;
                    const rowBg    = isMissing ? "#FFF5F5" : item.status === "expired" ? "#FAFAFA" : idx % 2 === 0 ? "#fff" : "#FAFBFD";
                    const P = "5px 8px";

                    const ec = (
                      field: "qty" | "rate" | "mrp" | "discount" | "free",
                      poVal: number, invVal: number,
                      fmt: (n: number) => string,
                      warnColor: string,
                      align: "left" | "right" = "right",
                    ) => {
                      const isEd     = poEditing?.id === item.id && poEditing.field === field;
                      const mismatch = poVal !== invVal;
                      return (
                        <td style={{ padding: P, textAlign: align }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "JetBrains Mono", marginBottom: 1, textAlign: align }}>PO: {fmt(poVal)}</div>
                          {isMissing ? (
                            <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: align }}>—</div>
                          ) : isEd ? (
                            <input
                              autoFocus
                              value={poEditVal}
                              onChange={e => setPoEditVal(e.target.value)}
                              onBlur={() => savePoEdit(item.id, field, poEditVal)}
                              onKeyDown={e => { if (e.key === "Enter") savePoEdit(item.id, field, poEditVal); if (e.key === "Escape") setPoEditing(null); }}
                              style={{ width: 66, fontSize: 11, padding: "2px 4px", border: "1px solid #1B6CA8", outline: "none", fontFamily: "JetBrains Mono", textAlign: align }}
                            />
                          ) : (
                            <div
                              onClick={() => { setPoEditing({ id: item.id, field }); setPoEditVal(String(invVal)); }}
                              title="Click to correct"
                              style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: mismatch ? 700 : 400, color: mismatch ? warnColor : "#1A2436", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
                              {fmt(invVal)}
                              {mismatch && <span style={{ fontSize: 9, opacity: 0.55 }}>✎</span>}
                            </div>
                          )}
                        </td>
                      );
                    };

                    return (
                      <tr key={item.id} style={{ background: rowBg, borderBottom: "1px solid #EEF1F6" }}>
                        {/* Product */}
                        <td style={{ padding: P, fontSize: 12, color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
                          {item.medicineName}
                          {isMissing    && <div style={{ fontSize: 9, color: "#C62828", fontWeight: 700, marginTop: 1 }}>NOT IN INVOICE</div>}
                          {item.isExpired && <div style={{ fontSize: 9, color: "#6B7280", fontWeight: 700, marginTop: 1 }}>EXPIRED</div>}
                          {isExcess      && <div style={{ fontSize: 9, color: "#1B6CA8", fontWeight: 700, marginTop: 1 }}>EXCESS +{item.invoiceQty - item.poQty}</div>}
                        </td>
                        {/* Batch */}
                        <td style={{ padding: P }}>
                          <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: batchOk ? "#6B7280" : "#C62828", fontWeight: batchOk ? 400 : 700 }}>{item.invBatchNo || "—"}</div>
                          {!batchOk && <div style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "JetBrains Mono", marginTop: 1 }}>PO: {item.poBatchNo}</div>}
                        </td>
                        {/* Expiry */}
                        <td style={{ padding: P }}>
                          <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: item.isExpired ? "#C62828" : expOk ? "#6B7280" : "#E65100", fontWeight: (item.isExpired || !expOk) ? 700 : 400 }}>{item.invExpDate || "—"}</div>
                          {!expOk && !item.isExpired && <div style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "JetBrains Mono", marginTop: 1 }}>PO: {item.poExpDate}</div>}
                          {item.isExpired && <div style={{ fontSize: 9, color: "#C62828", fontWeight: 700, marginTop: 1 }}>EXPIRED</div>}
                        </td>
                        {/* Scheme */}
                        {ec("free",     item.poFreeQty,  item.invFreeQty,  n => String(Math.round(n)),             "#E65100", "right")}
                        {/* Disc % */}
                        {ec("discount", item.poDiscount, item.invDiscount, n => `${n.toFixed(1)}%`,                "#E65100", "right")}
                        {/* MRP */}
                        {ec("mrp",      item.poMrp,      item.invMrp,      n => `₹${n.toFixed(2)}`,               "#E65100", "right")}
                        {/* Qty */}
                        {ec("qty",      item.poQty,      item.invoiceQty,  n => String(Math.round(n)),             isExcess ? "#1B6CA8" : "#E65100", "right")}
                        {/* Rate */}
                        {ec("rate",     item.poRate,     item.invoiceRate, n => `₹${n.toFixed(2)}`,               item.invoiceRate > item.poRate ? "#C62828" : "#E65100", "right")}
                        {/* Status */}
                        <td style={{ padding: P }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: POV_S[item.status].color, background: POV_S[item.status].bg, border: `1px solid ${POV_S[item.status].border}`, padding: "2px 6px", fontFamily: "Inter", whiteSpace: "nowrap" as const }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: POV_S[item.status].color, flexShrink: 0 }}/>
                            {POV_S[item.status].label}
                          </span>
                        </td>
                        {/* Action */}
                        <td style={{ padding: "4px 6px" }}>
                          {item.action ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", fontFamily: "Inter",
                                color: item.action === "short-book" ? "#E65100" : item.action === "return" ? "#C62828" : "#2E7D32",
                                background: item.action === "short-book" ? "#FFF3E0" : item.action === "return" ? "#FFEBEE" : "#E8F5E9",
                                border: `1px solid ${item.action === "short-book" ? "#FFCC80" : item.action === "return" ? "#FFCDD2" : "#A5D6A7"}` }}>
                                {item.action === "short-book" ? "Short Book" : item.action === "return" ? "Return" : "Accepted"}
                              </span>
                              <button onClick={() => setPoItems(p => p.map(i => i.id === item.id ? { ...i, action: undefined } : i))}
                                style={{ fontSize: 10, color: "#9CA3AF", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: "Inter", textDecoration: "underline" }}>
                                Undo
                              </button>
                            </div>
                          ) : item.status === "matched" ? (
                            <IconCheck color="#A5D6A7" size={13}/>
                          ) : (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                              <button onClick={() => setPoItems(p => p.map(i => i.id === item.id ? { ...i, action: "accept" } : i))}
                                style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", border: "1px solid #A5D6A7", background: "#E8F5E9", color: "#2E7D32", cursor: "pointer", fontFamily: "Inter" }}>
                                Accept
                              </button>
                              {(isMissing || item.invoiceQty < item.poQty) && (
                                <button onClick={() => setPoItems(p => p.map(i => i.id === item.id ? { ...i, action: "short-book" } : i))}
                                  style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", border: "1px solid #FFCC80", background: "#FFF3E0", color: "#E65100", cursor: "pointer", fontFamily: "Inter" }}>
                                  Short Book
                                </button>
                              )}
                              <button onClick={() => setPoItems(p => p.map(i => i.id === item.id ? { ...i, action: "return" } : i))}
                                style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", border: "1px solid #FFCDD2", background: "#FFEBEE", color: "#C62828", cursor: "pointer", fontFamily: "Inter" }}>
                                {isExcess ? `Return (+${item.invoiceQty - item.poQty})` : "Return"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Physical verification method picker ── */}
            <div style={{ marginTop: 28, borderTop: "1px solid #EEF1F6", paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12, fontFamily: "Inter" }}>
                Next: How would you like to do Physical Verification?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {([
                  { key: "scanner", icon: <IconBarcode color="#1B6CA8" size={20}/>, title: "Barcode Scanner", desc: "USB or Bluetooth scanner connected to this device.", badge: "Recommended" },
                  { key: "mobile",  icon: <IconPhone   color="#1B6CA8" size={20}/>, title: "Mobile Camera",  desc: "Use the MedTec app on a phone to scan product barcodes." },
                  { key: "camera",  icon: <IconCamera  color="#1B6CA8" size={20}/>, title: "Web Camera",     desc: "Use the computer's built-in or USB camera." },
                  { key: "manual",  icon: <IconKeyboard color="#1B6CA8" size={20}/>, title: "Manual Entry",  desc: "Type product name or batch number to count each item." },
                ] as { key: PhysMethod; icon: React.ReactNode; title: string; desc: string; badge?: string }[]).map(opt => {
                  const chosen = physMethodChosen === opt.key;
                  return (
                    <div
                      key={opt.key}
                      onClick={() => setPhysMethodChosen(opt.key)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                        border: `1.5px solid ${chosen ? "#1B6CA8" : "#E8ECF4"}`,
                        background: chosen ? "#F0F6FF" : "#fff",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => { if (!chosen) { e.currentTarget.style.borderColor = "#BFDBFE"; e.currentTarget.style.background = "#F8FBFF"; } }}
                      onMouseLeave={e => { if (!chosen) { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.background = "#fff"; } }}>
                      <div style={{ width: 32, height: 32, border: "1px solid #EEF1F6", background: chosen ? "#E0EFFF" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {opt.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: chosen ? "#1B6CA8" : "#1A2436", fontFamily: "Inter" }}>{opt.title}</span>
                          {opt.badge && <span style={{ fontSize: 10, fontWeight: 700, color: "#1B6CA8", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "1px 6px", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: "Inter" }}>{opt.badge}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4, fontFamily: "Inter" }}>{opt.desc}</div>
                      </div>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${chosen ? "#1B6CA8" : "#DDE3EC"}`, background: chosen ? "#1B6CA8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        {chosen && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Skip physical option */}
              <div
                onClick={() => setPhysMethodChosen("skip")}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  border: `1.5px solid ${physMethodChosen === "skip" ? "#E65100" : "#E8ECF4"}`,
                  background: physMethodChosen === "skip" ? "#FFF8F5" : "#fff",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (physMethodChosen !== "skip") { e.currentTarget.style.borderColor = "#FFCC80"; e.currentTarget.style.background = "#FFFBF5"; } }}
                onMouseLeave={e => { if (physMethodChosen !== "skip") { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.background = "#fff"; } }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${physMethodChosen === "skip" ? "#E65100" : "#DDE3EC"}`, background: physMethodChosen === "skip" ? "#E65100" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {physMethodChosen === "skip" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: physMethodChosen === "skip" ? "#E65100" : "#1A2436", fontFamily: "Inter" }}>Skip Physical Verification</span>
                  <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 10, fontFamily: "Inter" }}>Post the invoice using PO-verified quantities only. Physical count will be skipped.</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Physical Verification step ── */}
        {isPhysStep && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Summary cards */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
              {[
                { label: "Invoice Items", value: totalItems,    color: "#1A2436" },
                { label: "Verified",      value: verifiedCount, color: "#2E7D32" },
                { label: "Remaining",     value: remainingCount,color: "#E65100" },
                { label: "Variances",     value: varianceCount, color: varianceCount > 0 ? "#C62828" : "#6B7280" },
              ].map((c, i) => (
                <div key={c.label} style={{ flex: 1, padding: "12px 20px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "JetBrains Mono" }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Scanner controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0, background: "#fff", flexWrap: "wrap" }}>
              {/* Scanner button */}
              {physMethod === "scanner" && (
                <button
                  onClick={() => { setScannerActive(v => !v); if (!scannerActive && scanRef.current) scanRef.current.focus(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `1px solid ${scannerActive ? "#2E7D32" : "#DDE3EC"}`, background: scannerActive ? "#E8F5E9" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: scannerActive ? "#2E7D32" : "#1A2436", fontFamily: "Inter" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: scannerActive ? "#2E7D32" : "#9CA3AF" }}/>
                  {scannerActive ? "Scanner Active" : "Start Scanner"}
                </button>
              )}
              {physMethod === "mobile" && mobileConnected && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #A5D6A7", background: "#E8F5E9" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2E7D32" }}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32", fontFamily: "Inter" }}>Mobile Connected</span>
                </div>
              )}
              {physMethod === "camera" && (
                <button
                  onClick={() => setScannerActive(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `1px solid ${scannerActive ? "#2E7D32" : "#DDE3EC"}`, background: scannerActive ? "#E8F5E9" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: scannerActive ? "#2E7D32" : "#1A2436", fontFamily: "Inter" }}>
                  <IconCamera color={scannerActive ? "#2E7D32" : "#1B6CA8"} size={14}/>
                  {scannerActive ? "Camera Active" : "Use Camera"}
                </button>
              )}

              {/* Manual / barcode input */}
              {physMethod === "manual" ? (
                <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 360 }}>
                  <input
                    ref={scanRef}
                    value={manualEntry}
                    onChange={e => setManualEntry(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleScan(manualEntry)}
                    placeholder="Type medicine name or batch, press Enter"
                    style={{ flex: 1, padding: "7px 12px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none" }}/>
                  <button onClick={() => handleScan(manualEntry)} style={{ padding: "7px 14px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>Add</button>
                </div>
              ) : (
                <>
                  {/* Hidden scanner capture input */}
                  <input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleScan(scanInput); }}
                    style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
                    tabIndex={-1}/>
                  {/* Test scan input for dev */}
                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <input
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleScan(scanInput)}
                      placeholder="Scan or type barcode..."
                      style={{ width: 200, padding: "6px 10px", border: "1px solid #DDE3EC", fontSize: 12, fontFamily: "Inter", outline: "none" }}/>
                    <button onClick={() => handleScan(scanInput)} style={{ padding: "6px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", color: "#1A2436" }}>Scan</button>
                  </div>
                </>
              )}

              {/* Scan toast */}
              {scanToast && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: scanToast.ok ? "#E8F5E9" : "#FFEBEE", border: `1px solid ${scanToast.ok ? "#A5D6A7" : "#FFCDD2"}`, marginLeft: "auto" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: scanToast.ok ? "#2E7D32" : "#C62828" }}/>
                  <span style={{ fontSize: 12, color: scanToast.ok ? "#2E7D32" : "#C62828", fontFamily: "Inter", fontWeight: 600 }}>{scanToast.msg}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Product", "Batch", "Expiry", "Invoice Qty", "Physical Qty", "MRP (₹)", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: h === "Invoice Qty" || h === "Physical Qty" || h === "MRP (₹)" ? "right" as const : "left" as const, fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase" as const, borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {physItems.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No items on this invoice</td></tr>
                  ) : physItems.map((item, idx) => {
                    const s = PHYS_S[item.status];
                    return (
                      <tr key={item.id} style={{ background: item.status === "matched" ? "#F0FFF4" : idx % 2 === 0 ? "#fff" : "#FAFBFD", borderBottom: "1px solid #EEF1F6" }}>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>{item.medicineName}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{item.batchNo || "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{item.expDate || "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#1A2436", fontFamily: "JetBrains Mono", textAlign: "right" as const }}>{item.invoiceQty}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" as const }}>
                          <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: item.physicalQty === item.invoiceQty ? "#2E7D32" : item.physicalQty > 0 ? "#E65100" : "#9CA3AF" }}>
                            {item.physicalQty > 0 ? item.physicalQty : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#1A2436", fontFamily: "JetBrains Mono", textAlign: "right" as const }}>₹{item.mrp.toFixed(2)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: "2px 8px", fontFamily: "Inter", whiteSpace: "nowrap" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}/>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {(item.status === "short" || item.status === "excess") && !item.resolution && (
                            <button onClick={() => setException(item)} style={{ fontSize: 11, fontWeight: 600, color: "#E65100", border: "1px solid #FFCC80", background: "#FFF3E0", padding: "3px 8px", cursor: "pointer", fontFamily: "Inter", whiteSpace: "nowrap" }}>Resolve</button>
                          )}
                          {item.resolution && (
                            <span style={{ fontSize: 11, color: "#2E7D32", fontFamily: "Inter" }}>✓ Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Resolve Variances step ── */}
        {isVarStep && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>
                {unresolvedVar === 0 ? "All variances resolved." : `${unresolvedVar} variance${unresolvedVar !== 1 ? "s" : ""} need resolution before posting.`}
              </div>
              {unresolvedVar === 0 && <IconCheck color="#2E7D32" size={16}/>}
            </div>

            {physItems.filter(i => i.status !== "pending" && i.status !== "matched").length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#2E7D32", fontSize: 13, fontFamily: "Inter", background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
                <IconCheck color="#2E7D32" size={24}/>
                <div style={{ marginTop: 8, fontWeight: 600 }}>No variances detected — all items matched.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {physItems.filter(i => i.status !== "pending" && i.status !== "matched").map(item => {
                  const s = PHYS_S[item.status];
                  return (
                    <div key={item.id} style={{ border: `1px solid ${s.border}`, background: s.bg, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{item.medicineName}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: "#fff", border: `1px solid ${s.border}`, padding: "1px 8px", fontFamily: "Inter" }}>{s.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                            <span>Invoice: <strong style={{ color: "#1A2436", fontFamily: "JetBrains Mono" }}>{item.invoiceQty}</strong></span>
                            <span>Physical: <strong style={{ color: s.color, fontFamily: "JetBrains Mono" }}>{item.physicalQty}</strong></span>
                            <span>Diff: <strong style={{ color: s.color, fontFamily: "JetBrains Mono" }}>{item.physicalQty - item.invoiceQty > 0 ? "+" : ""}{item.physicalQty - item.invoiceQty}</strong></span>
                          </div>
                        </div>
                        {item.resolution ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
                            <IconCheck color="#2E7D32" size={12}/>
                            <span style={{ fontSize: 12, color: "#2E7D32", fontFamily: "Inter", fontWeight: 600 }}>Resolved</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {item.status === "short" && (
                              <>
                                <button onClick={() => setPhysItems(prev => prev.map(i => i.id === item.id ? { ...i, resolution: "short-book" } : i))} style={{ padding: "6px 12px", border: "1px solid #FFCC80", background: "#FFF3E0", fontSize: 12, cursor: "pointer", color: "#E65100", fontFamily: "Inter", fontWeight: 600 }}>Short Book</button>
                                <button onClick={() => setPhysItems(prev => prev.map(i => i.id === item.id ? { ...i, resolution: "accept" } : i))} style={{ padding: "6px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Accept</button>
                                <button onClick={() => setPhysItems(prev => prev.map(i => i.id === item.id ? { ...i, resolution: "supplier-followup" } : i))} style={{ padding: "6px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Supplier Follow-up</button>
                              </>
                            )}
                            {item.status === "excess" && (
                              <>
                                <button onClick={() => setPhysItems(prev => prev.map(i => i.id === item.id ? { ...i, resolution: "return-excess" } : i))} style={{ padding: "6px 12px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Return Excess</button>
                                <button onClick={() => setPhysItems(prev => prev.map(i => i.id === item.id ? { ...i, resolution: "accept" } : i))} style={{ padding: "6px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Accept</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Final Verify & Post step ── */}
        {isFinalStep && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Verification Summary</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {mode === "full" && (
                <div style={{ flex: "1 1 200px", background: "#E8F5E9", border: "1px solid #A5D6A7", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <IconCheck color="#2E7D32" size={14}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#2E7D32", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter" }}>PO Verification</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32", fontFamily: "Inter" }}>Complete</div>
                  <div style={{ fontSize: 11, color: "#388E3C", marginTop: 3, fontFamily: "Inter" }}>
                    {poSummary.matched} Matched · {poSummary.warnings} Warnings · {poSummary.critical} Critical
                  </div>
                </div>
              )}
              <div style={{ flex: "1 1 200px", background: physSkipped ? "#FFF3E0" : "#E8F5E9", border: `1px solid ${physSkipped ? "#FFCC80" : "#A5D6A7"}`, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {physSkipped ? <IconAlert color="#E65100" size={14}/> : <IconCheck color="#2E7D32" size={14}/>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: physSkipped ? "#E65100" : "#2E7D32", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter" }}>Physical Verification</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: physSkipped ? "#E65100" : "#2E7D32", fontFamily: "Inter" }}>{physSkipped ? "Skipped" : "Complete"}</div>
                <div style={{ fontSize: 11, color: physSkipped ? "#EF6C00" : "#388E3C", marginTop: 3, fontFamily: "Inter" }}>
                  {physSkipped ? "Stock will be updated using PO-verified quantities." : `${verifiedCount} Matched · ${varianceCount} Variances Resolved`}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #E8ECF4", padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Products",  value: String(totalItems) },
                  { label: "Matched",   value: String(verifiedCount) },
                  { label: "Variances", value: String(varianceCount) },
                  { label: "Short Book",value: String(physItems.filter(i => i.resolution === "short-book").length) },
                  { label: "Returns",   value: String(physItems.filter(i => i.resolution === "return-excess").length) },
                  { label: "Accepted",  value: String(physItems.filter(i => i.resolution === "accept").length) },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #EEF1F6" }}>
                    <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "JetBrains Mono" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <IconCheck color="#2E7D32" size={16}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32", fontFamily: "Inter" }}>All required verification issues have been resolved.</span>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>
              Inventory will be updated after final posting. This action cannot be undone.
            </div>
          </div>
        )}
      </div>

      {/* Workspace footer */}
      <div style={{ borderTop: "1px solid #E8ECF4", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#FAFBFD" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          {wStep > 0 && (
            <button onClick={() => {
              const prev = wStep - 1;
              if (mode === "full" && prev === 0) {
                setPhysMethodChosen(null);
                setPhysMethod(null);
                setPhysSkipped(false);
                setScannerActive(false);
              }
              setWStep(prev);
            }} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>← Back</button>
          )}
        </div>
        {!isFinalStep ? (
          <button
            disabled={!canGoNext}
            onClick={goNext}
            title={
              !canGoNext && isPoStep ? "Choose a physical verification method above" :
              !canGoNext && isPhysStep ? "Scan all items before proceeding" :
              !canGoNext && isVarStep ? "Resolve all variances first" : undefined
            }
            style={{ padding: "8px 22px", border: "none", background: canGoNext ? "#1B6CA8" : "#C8D6E5", fontSize: 13, fontWeight: 600, cursor: canGoNext ? "pointer" : "not-allowed", color: canGoNext ? "#fff" : "#8FA3B1", fontFamily: "Inter" }}>
            {isPoStep && physMethodChosen === "skip"
              ? "Skip Physical & Continue →"
              : isPoStep
              ? `Start ${physMethodChosen ? ({ scanner: "Scanner", mobile: "Mobile", camera: "Camera", manual: "Manual" }[physMethodChosen]) : "Physical"} Verification →`
              : `Next: ${steps[wStep + 1]} →`}
          </button>
        ) : (
          <button
            onClick={onPost}
            style={{ padding: "9px 28px", border: "none", background: "#2E7D32", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "Inter", letterSpacing: "0.01em" }}>
            Final Verify & Post
          </button>
        )}
      </div>

      {/* Exception drawer */}
      {exception && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 380, background: "#fff", borderLeft: "1px solid #E8ECF4", boxShadow: "-4px 0 24px rgba(0,0,0,0.10)", zIndex: 10, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
              {exception.status === "short" ? "Quantity Shortage" : exception.status === "excess" ? "Excess Quantity" : "Batch Mismatch"}
            </div>
            <button onClick={() => setException(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <div style={{ fontFamily: "Inter", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 14 }}>{exception.medicineName}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Invoice Qty",  value: String(exception.invoiceQty),  color: "#1A2436" },
                { label: "Physical Qty", value: String(exception.physicalQty), color: exception.status === "short" ? "#E65100" : "#1B6CA8" },
                { label: "Difference",   value: `${exception.physicalQty - exception.invoiceQty > 0 ? "+" : ""}${exception.physicalQty - exception.invoiceQty}`, color: exception.status === "short" ? "#E65100" : "#1B6CA8" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #EEF1F6" }}>
                  <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: r.color, fontFamily: "JetBrains Mono" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, fontFamily: "Inter" }}>Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exception.status === "short" && (
                <>
                  <button onClick={() => resolveException("short-book")} style={{ padding: "10px 14px", border: "1px solid #FFCC80", background: "#FFF3E0", fontSize: 13, cursor: "pointer", color: "#E65100", fontFamily: "Inter", fontWeight: 600, textAlign: "left" as const }}>Add to Short Book</button>
                  <button onClick={() => resolveException("accept")} style={{ padding: "10px 14px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", textAlign: "left" as const }}>Accept Shortage</button>
                  <button onClick={() => resolveException("supplier-followup")} style={{ padding: "10px 14px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", textAlign: "left" as const }}>Supplier Follow-up</button>
                </>
              )}
              {exception.status === "excess" && (
                <>
                  <button onClick={() => resolveException("return-excess")} style={{ padding: "10px 14px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, textAlign: "left" as const }}>Return Excess</button>
                  <button onClick={() => resolveException("accept")} style={{ padding: "10px 14px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", textAlign: "left" as const }}>Accept Excess</button>
                </>
              )}
              <button onClick={() => setException(null)} style={{ padding: "10px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", textAlign: "left" as const }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
