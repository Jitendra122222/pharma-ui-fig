import { drugs } from "../../data/mockData";

export type SubTab = "overview" | "adjustments" | "batches" | "expiry" | "transfer" | "investigation" | "locations" | "narcotic" | "recall";

export const TABS: { id: SubTab; label: string; sub: string }[] = [
  { id: "overview",      label: "Stock Overview",    sub: "Current stock levels" },
  { id: "locations",     label: "Locations",          sub: "Bin layout & stock placement" },
  { id: "adjustments",   label: "Adjustments",        sub: "Write-offs & corrections" },
  { id: "batches",       label: "Batch Tracking",     sub: "Lot & batch tracking" },
  { id: "expiry",        label: "Expiry Management",  sub: "Near-expiry alerts" },
  { id: "transfer",      label: "Stock Transfer",     sub: "Inter-branch transfers" },
  { id: "investigation", label: "Investigation",      sub: "Stock difference investigation" },
  { id: "narcotic",      label: "Narcotic Register",  sub: "Schedule H1 running balance" },
  { id: "recall",        label: "Drug Recall",        sub: "Batch recall & patient traceability" },
];

export type StorageType = "alphabetical" | "company" | "category" | "custom";

export type RackType = "Shelf Rack" | "Drawer" | "Counter" | "Cold Unit" | "High Shelf";
export type TempZone = "Ambient" | "Refrigerated" | "Frozen";

export const LOCATION_META: Record<string, {
  maxCapacity: number;
  zone: string;
  label: string;
  rackType: RackType;
  tempZone: TempZone;
  lastAudit: string;
}> = {
  "A1-02":   { maxCapacity: 500,  zone: "Rack A",       label: "Rack A · Shelf 1 · Bin 2",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-10" },
  "A1-06":   { maxCapacity: 300,  zone: "Rack A",       label: "Rack A · Shelf 1 · Bin 6",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-05" },
  "A2-08":   { maxCapacity: 400,  zone: "Rack A",       label: "Rack A · Shelf 2 · Bin 8",  rackType: "Drawer",     tempZone: "Ambient",      lastAudit: "2026-08-28" },
  "A3-01":   { maxCapacity: 2000, zone: "Rack A",       label: "Rack A · Shelf 3 · Bin 1",  rackType: "High Shelf", tempZone: "Ambient",      lastAudit: "2026-09-01" },
  "B2-01":   { maxCapacity: 300,  zone: "Rack B",       label: "Rack B · Shelf 2 · Bin 1",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-12" },
  "B2-03":   { maxCapacity: 500,  zone: "Rack B",       label: "Rack B · Shelf 2 · Bin 3",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-08" },
  "B3-05":   { maxCapacity: 200,  zone: "Rack B",       label: "Rack B · Shelf 3 · Bin 5",  rackType: "Drawer",     tempZone: "Ambient",      lastAudit: "2026-08-15" },
  "B4-02":   { maxCapacity: 150,  zone: "Rack B",       label: "Rack B · Shelf 4 · Bin 2",  rackType: "Drawer",     tempZone: "Ambient",      lastAudit: "2026-09-03" },
  "C1-04":   { maxCapacity: 800,  zone: "Rack C",       label: "Rack C · Shelf 1 · Bin 4",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-14" },
  "C2-07":   { maxCapacity: 400,  zone: "Rack C",       label: "Rack C · Shelf 2 · Bin 7",  rackType: "Shelf Rack", tempZone: "Ambient",      lastAudit: "2026-09-07" },
  "COLD-01": { maxCapacity: 100,  zone: "Cold Storage", label: "Cold Storage · Unit 1",      rackType: "Cold Unit",  tempZone: "Refrigerated", lastAudit: "2026-09-20" },
  "D1-01":   { maxCapacity: 60,   zone: "Rack D",       label: "Rack D · Shelf 1 · Bin 1",  rackType: "Counter",    tempZone: "Ambient",      lastAudit: "2026-09-18" },
};

export const adjustments = [
  { id: "ADJ-2025-0041", date: "2025-07-25", drug: "Paracetamol 500mg", type: "Write-off", qtyBefore: 1250, qty: -50, qtyAfter: 1200, reason: "Expired stock disposal", ref: "ADJ-REF-041", by: "Jane Doe" },
  { id: "ADJ-2025-0040", date: "2025-07-22", drug: "Amoxicillin 500mg", type: "Stock Count", qtyBefore: 218, qty: +22, qtyAfter: 240, reason: "Physical stock count variance", ref: "COUNT-JUL22", by: "Mark Stevens" },
  { id: "ADJ-2025-0039", date: "2025-07-18", drug: "Metformin 1000mg", type: "Damage", qtyBefore: 30, qty: -12, qtyAfter: 18, reason: "Damaged in storage (moisture)", ref: "DMG-039", by: "Anna Kowalski" },
  { id: "ADJ-2025-0038", date: "2025-07-15", drug: "Ciprofloxacin 500mg", type: "Write-off", qtyBefore: 20, qty: -8, qtyAfter: 12, reason: "Near-expiry disposal", ref: "WO-038", by: "Jane Doe" },
  { id: "ADJ-2025-0037", date: "2025-07-10", drug: "Warfarin 5mg", type: "Stock Count", qtyBefore: 10, qty: -4, qtyAfter: 6, reason: "Physical count — missing units", ref: "COUNT-JUL10", by: "Mark Stevens" },
];

export const batches = [
  { id: "BT-2025-0118", drug: "Amoxicillin 500mg",  manufacturer: "Cipla",               category: "Antibiotics",       supplier: "MedLine Pharma",  received: "2025-07-29", expiry: "2026-08-15", qtyReceived: 500,  qtyCurrent: 240,  unit: "Capsules", location: "A1-02",   status: "Active"       },
  { id: "BT-2025-0117", drug: "Metformin 1000mg",   manufacturer: "Sun Pharma",          category: "Antidiabetics",     supplier: "GenPharm Ltd",    received: "2025-07-15", expiry: "2025-12-31", qtyReceived: 200,  qtyCurrent: 18,   unit: "Tablets",  location: "B3-05",   status: "Low"          },
  { id: "BT-2025-0116", drug: "Insulin Glargine",   manufacturer: "Novo Nordisk",        category: "Hormones",          supplier: "BioPharm AG",     received: "2025-07-10", expiry: "2025-10-15", qtyReceived: 60,   qtyCurrent: 45,   unit: "Vial",     location: "COLD-01", status: "Expiring Soon"},
  { id: "BT-2025-0115", drug: "Atorvastatin 20mg",  manufacturer: "Pfizer",              category: "Statins",           supplier: "MedLine Pharma",  received: "2025-07-01", expiry: "2027-01-10", qtyReceived: 600,  qtyCurrent: 312,  unit: "Tablets",  location: "C1-04",   status: "Active"       },
  { id: "BT-2025-0114", drug: "Warfarin 5mg",       manufacturer: "Bristol-Myers Squibb",category: "Anticoagulants",    supplier: "PharmaCo Inc",    received: "2025-06-20", expiry: "2026-04-01", qtyReceived: 100,  qtyCurrent: 6,    unit: "Tablets",  location: "B4-02",   status: "Low"          },
  { id: "BT-2025-0113", drug: "Ciprofloxacin 500mg",manufacturer: "Bayer",               category: "Antibiotics",       supplier: "PharmaCo Inc",    received: "2025-06-15", expiry: "2025-11-20", qtyReceived: 120,  qtyCurrent: 12,   unit: "Tablets",  location: "A1-06",   status: "Expiring Soon"},
  { id: "BT-2025-0112", drug: "Lisinopril 10mg",    manufacturer: "Abbott",              category: "Antihypertensives", supplier: "PharmaCo Inc",    received: "2025-06-01", expiry: "2026-03-20", qtyReceived: 200,  qtyCurrent: 0,    unit: "Tablets",  location: "B2-01",   status: "Out of Stock" },
  { id: "BT-2025-0111", drug: "Omeprazole 20mg",    manufacturer: "AstraZeneca",         category: "Antacids",          supplier: "BioPharm AG",     received: "2025-05-20", expiry: "2026-09-05", qtyReceived: 300,  qtyCurrent: 145,  unit: "Capsules", location: "A3-01",   status: "Active"       },
  { id: "BT-2025-0110", drug: "Salbutamol Inhaler", manufacturer: "GSK",                 category: "Bronchodilators",   supplier: "RespiCare Ltd",   received: "2025-05-10", expiry: "2026-06-30", qtyReceived: 50,   qtyCurrent: 28,   unit: "Inhaler",  location: "D1-01",   status: "Active"       },
  { id: "BT-2025-0109", drug: "Paracetamol 500mg",  manufacturer: "GSK",                 category: "Analgesics",        supplier: "GenPharm Ltd",    received: "2025-05-01", expiry: "2027-05-15", qtyReceived: 2000, qtyCurrent: 1200, unit: "Tablets",  location: "A3-01",   status: "Active"       },
  { id: "BT-2025-0108", drug: "Amlodipine 5mg",     manufacturer: "Abbott",              category: "Antihypertensives", supplier: "MedLine Pharma",  received: "2025-04-20", expiry: "2026-11-30", qtyReceived: 500,  qtyCurrent: 380,  unit: "Tablets",  location: "B2-03",   status: "Active"       },
  { id: "BT-2025-0107", drug: "Sertraline 50mg",    manufacturer: "Pfizer",              category: "Antidepressants",   supplier: "MedLine Pharma",  received: "2025-04-10", expiry: "2027-02-20", qtyReceived: 300,  qtyCurrent: 220,  unit: "Tablets",  location: "C1-04",   status: "Active"       },
];

export const expiryItems = [...drugs]
  .map(d => ({ ...d, daysLeft: Math.round((new Date(d.expiry).getTime() - Date.now()) / 86400000) }))
  .sort((a, b) => a.daysLeft - b.daysLeft);

export type MovementType = "GRN" | "Sale" | "Adjustment" | "Transfer In" | "Transfer Out" | "Return";

export interface StockMovement {
  id: string;
  date: string;
  type: MovementType;
  ref: string;
  qty: number;
  user: string;
  reason?: string;
  batch?: string;
  fromLocation?: string;
  toLocation?: string;
  qtyBefore?: number;
  qtyAfter?: number;
}

export const MOVEMENTS: Record<string, StockMovement[]> = {
  "Amoxicillin 500mg": [
    { id: "GRN-2025-0118", date: "2025-07-29", type: "GRN", ref: "GRN-2025-0118", qty: 500, user: "Store Manager", batch: "BT-2025-0118", toLocation: "A1-02" },
    { id: "SALE-2025-2341", date: "2025-07-26", type: "Sale", ref: "INV-2025-2341", qty: -4, user: "Cashier A" },
    { id: "ADJ-2025-0040", date: "2025-07-22", type: "Adjustment", ref: "COUNT-JUL22", qty: 22, user: "Mark Stevens", reason: "Physical stock count variance", qtyBefore: 218, qtyAfter: 240 },
    { id: "TR-OUT-2025-0038", date: "2025-07-19", type: "Transfer Out", ref: "TR-2025-0038", qty: -60, user: "Admin", fromLocation: "A1-02", toLocation: "Dispensary Counter" },
    { id: "SALE-2025-2318", date: "2025-07-16", type: "Sale", ref: "INV-2025-2318", qty: -8, user: "Cashier B" },
  ],
  "Paracetamol 500mg": [
    { id: "ADJ-2025-0041", date: "2025-07-25", type: "Adjustment", ref: "ADJ-REF-041", qty: -50, user: "Jane Doe", reason: "Expired stock disposal", qtyBefore: 1250, qtyAfter: 1200 },
    { id: "SALE-2025-2301", date: "2025-07-23", type: "Sale", ref: "INV-2025-2301", qty: -15, user: "Cashier A" },
    { id: "GRN-2025-0112", date: "2025-07-20", type: "GRN", ref: "GRN-2025-0112", qty: 200, user: "Store Manager", batch: "BT-2025-0120", toLocation: "C2-01" },
    { id: "SALE-2025-2278", date: "2025-07-17", type: "Sale", ref: "INV-2025-2278", qty: -22, user: "Cashier B" },
    { id: "RETURN-2025-0018", date: "2025-07-14", type: "Return", ref: "RET-2025-0018", qty: 5, user: "Cashier A", reason: "Patient return — unused quantity" },
  ],
  "Metformin 1000mg": [
    { id: "SALE-2025-2310", date: "2025-07-24", type: "Sale", ref: "INV-2025-2310", qty: -2, user: "Cashier A" },
    { id: "ADJ-2025-0039", date: "2025-07-18", type: "Adjustment", ref: "DMG-039", qty: -12, user: "Anna Kowalski", reason: "Damaged in storage (moisture)", qtyBefore: 30, qtyAfter: 18 },
    { id: "GRN-2025-0109", date: "2025-07-15", type: "GRN", ref: "GRN-2025-0109", qty: 200, user: "Store Manager", batch: "BT-2025-0117", toLocation: "B3-05" },
    { id: "SALE-2025-2230", date: "2025-07-12", type: "Sale", ref: "INV-2025-2230", qty: -8, user: "Cashier B" },
  ],
  "Atorvastatin 20mg": [
    { id: "SALE-2025-2200", date: "2025-07-22", type: "Sale", ref: "INV-2025-2200", qty: -18, user: "Cashier A" },
    { id: "SALE-2025-2185", date: "2025-07-19", type: "Sale", ref: "INV-2025-2185", qty: -12, user: "Cashier B" },
    { id: "TR-IN-2025-0041", date: "2025-07-10", type: "Transfer In", ref: "TR-2025-0041", qty: 30, user: "Admin", fromLocation: "Warehouse", toLocation: "C1-04" },
    { id: "SALE-2025-2162", date: "2025-07-07", type: "Sale", ref: "INV-2025-2162", qty: -9, user: "Cashier A" },
    { id: "GRN-2025-0115", date: "2025-07-01", type: "GRN", ref: "GRN-2025-0115", qty: 600, user: "Store Manager", batch: "BT-2025-0115", toLocation: "C1-04" },
  ],
  "Lisinopril 10mg": [
    { id: "SALE-2025-2290", date: "2025-07-25", type: "Sale", ref: "INV-2025-2290", qty: -14, user: "Cashier B" },
    { id: "SALE-2025-2265", date: "2025-07-20", type: "Sale", ref: "INV-2025-2265", qty: -20, user: "Cashier A" },
    { id: "GRN-2025-0116", date: "2025-07-05", type: "GRN", ref: "GRN-2025-0116", qty: 500, user: "Store Manager", batch: "BT-2025-0116", toLocation: "B1-03" },
  ],
  "Pantoprazole 40mg": [
    { id: "SALE-2025-2311", date: "2025-07-26", type: "Sale", ref: "INV-2025-2311", qty: -10, user: "Cashier A" },
    { id: "SALE-2025-2288", date: "2025-07-22", type: "Sale", ref: "INV-2025-2288", qty: -8, user: "Cashier B" },
    { id: "RETURN-2025-0017", date: "2025-07-18", type: "Return", ref: "RET-2025-0017", qty: 2, user: "Cashier A", reason: "Patient return — wrong product dispensed" },
    { id: "GRN-2025-0114", date: "2025-06-28", type: "GRN", ref: "GRN-2025-0114", qty: 300, user: "Store Manager", batch: "BT-2025-0114", toLocation: "A2-04" },
  ],
  "Ciprofloxacin 500mg": [
    { id: "SALE-2025-2315", date: "2025-07-24", type: "Sale", ref: "INV-2025-2315", qty: -3, user: "Cashier A" },
    { id: "ADJ-2025-0038", date: "2025-07-15", type: "Adjustment", ref: "WO-038", qty: -8, user: "Jane Doe", reason: "Near-expiry disposal", qtyBefore: 20, qtyAfter: 12 },
    { id: "SALE-2025-2280", date: "2025-07-14", type: "Sale", ref: "INV-2025-2280", qty: -4, user: "Cashier B" },
    { id: "GRN-2025-0107", date: "2025-06-15", type: "GRN", ref: "GRN-2025-0107", qty: 120, user: "Store Manager", batch: "BT-2025-0113", toLocation: "A1-06" },
  ],
  "Salbutamol 100mcg": [
    { id: "SALE-2025-2291", date: "2025-07-22", type: "Sale", ref: "INV-2025-2291", qty: -6, user: "Cashier A" },
    { id: "SALE-2025-2263", date: "2025-07-18", type: "Sale", ref: "INV-2025-2263", qty: -4, user: "Cashier B" },
    { id: "GRN-2025-0113", date: "2025-07-10", type: "GRN", ref: "GRN-2025-0113", qty: 100, user: "Store Manager", batch: "BT-2025-0119", toLocation: "B2-01" },
  ],
  "Insulin Glargine": [
    { id: "SALE-2025-2305", date: "2025-07-25", type: "Sale", ref: "INV-2025-2305", qty: -3, user: "Cashier A" },
    { id: "SALE-2025-2282", date: "2025-07-20", type: "Sale", ref: "INV-2025-2282", qty: -2, user: "Cashier B" },
    { id: "TR-OUT-2025-0039", date: "2025-07-15", type: "Transfer Out", ref: "TR-2025-0039", qty: -10, user: "Admin", fromLocation: "COLD-01", toLocation: "Dispensary Counter" },
    { id: "GRN-2025-0116b", date: "2025-07-10", type: "GRN", ref: "GRN-2025-0116", qty: 60, user: "Store Manager", batch: "BT-2025-0116", toLocation: "COLD-01" },
  ],
  "Escitalopram 10mg": [
    { id: "SALE-2025-2295", date: "2025-07-24", type: "Sale", ref: "INV-2025-2295", qty: -5, user: "Cashier A" },
    { id: "SALE-2025-2271", date: "2025-07-19", type: "Sale", ref: "INV-2025-2271", qty: -3, user: "Cashier B" },
    { id: "GRN-2025-0111", date: "2025-07-08", type: "GRN", ref: "GRN-2025-0111", qty: 200, user: "Store Manager", batch: "BT-2025-0121", toLocation: "D1-02" },
  ],
  "Warfarin 5mg": [
    { id: "ADJ-2025-0037", date: "2025-07-10", type: "Adjustment", ref: "COUNT-JUL10", qty: -4, user: "Mark Stevens", reason: "Physical count — missing units", qtyBefore: 10, qtyAfter: 6 },
    { id: "SALE-2025-2260", date: "2025-07-08", type: "Sale", ref: "INV-2025-2260", qty: -2, user: "Cashier A" },
    { id: "GRN-2025-0103", date: "2025-06-20", type: "GRN", ref: "GRN-2025-0103", qty: 100, user: "Store Manager", batch: "BT-2025-0114", toLocation: "B4-02" },
  ],
  "Ibuprofen 400mg": [
    { id: "SALE-2025-2320", date: "2025-07-26", type: "Sale", ref: "INV-2025-2320", qty: -12, user: "Cashier B" },
    { id: "RETURN-2025-0019", date: "2025-07-16", type: "Return", ref: "RET-2025-0019", qty: 3, user: "Cashier B", reason: "Prescription cancelled" },
    { id: "SALE-2025-2298", date: "2025-07-22", type: "Sale", ref: "INV-2025-2298", qty: -8, user: "Cashier A" },
    { id: "GRN-2025-0119", date: "2025-07-12", type: "GRN", ref: "GRN-2025-0119", qty: 400, user: "Store Manager", batch: "BT-2025-0122", toLocation: "A3-01" },
  ],
};

export const COLD_LOG: { ts: string; tempC: number }[] = [
  { ts: "2026-09-27 06:00", tempC: 4.2 },
  { ts: "2026-09-27 10:00", tempC: 4.8 },
  { ts: "2026-09-27 14:00", tempC: 5.1 },
  { ts: "2026-09-27 18:00", tempC: 4.6 },
  { ts: "2026-09-27 22:00", tempC: 3.9 },
  { ts: "2026-09-28 06:00", tempC: 4.1 },
  { ts: "2026-09-28 10:00", tempC: 9.1 },
  { ts: "2026-09-28 14:00", tempC: 5.3 },
  { ts: "2026-09-28 18:00", tempC: 4.7 },
  { ts: "2026-09-28 22:00", tempC: 4.0 },
  { ts: "2026-09-29 06:00", tempC: 3.8 },
  { ts: "2026-09-29 10:00", tempC: 4.4 },
  { ts: "2026-09-29 14:00", tempC: 4.9 },
  { ts: "2026-09-29 18:00", tempC: 5.0 },
];
