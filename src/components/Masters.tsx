import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowData = Record<string, string | number>;

interface ColDef {
  key: string; label: string;
  w?: number | string; mono?: boolean; status?: true; align?: "right";
}

interface FieldDef {
  key: string; label: string;
  type?: "text" | "select" | "number" | "email" | "tel" | "textarea" | "date";
  options?: string[]; required?: boolean; span?: true;
}

interface MasterDef {
  id: string; label: string; navLabel: string; addLabel: string; group: string;
  cols: ColDef[]; fields: FieldDef[]; rows: RowData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Active:   { bg: "#E8F5E9", color: "#2E7D32" },
  Inactive: { bg: "#FFF3E0", color: "#E65100" },
  Draft:    { bg: "#EFF6FF", color: "#1B6CA8" },
  Yes:      { bg: "#E8F5E9", color: "#2E7D32" },
  No:       { bg: "#FFF3E0", color: "#E65100" },
};

function Pill({ v }: { v: string }) {
  const s = STATUS_PILL[v] ?? { bg: "#F0F3F7", color: "#6B7280" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, fontFamily: "Inter", borderRadius: 3 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {v}
    </span>
  );
}

const STATES = ["Maharashtra","Gujarat","Delhi","Karnataka","Telangana","Tamil Nadu","West Bengal","Rajasthan","Uttar Pradesh","Kerala","Goa","Punjab","Haryana","Madhya Pradesh","Other"];

// ─── All 34 Master Definitions ────────────────────────────────────────────────

const MASTERS: MasterDef[] = [

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 1 — CLINICAL
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "doctor", label: "Doctor Master", navLabel: "Doctor", addLabel: "Doctor", group: "Clinical",
    cols: [
      { key: "name", label: "Doctor Name", w: 180 },
      { key: "specialization", label: "Specialization", w: 160 },
      { key: "regNo", label: "Reg. No.", w: 120, mono: true },
      { key: "hospital", label: "Hospital / Clinic", w: 180 },
      { key: "phone", label: "Phone", w: 130, mono: true },
      { key: "city", label: "City", w: 110 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Doctor Name", required: true },
      { key: "specialization", label: "Specialization", type: "select", options: ["Cardiologist","Diabetologist","General Physician","Oncologist","Neurologist","Orthopedic","ENT Specialist","Gynecologist","Dermatologist","Pediatrician","Psychiatrist","Urologist","Other"] },
      { key: "regNo", label: "Registration No.", required: true },
      { key: "hospital", label: "Hospital / Clinic" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "city", label: "City" },
      { key: "state", label: "State", type: "select", options: STATES },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
      { key: "notes", label: "Notes", type: "textarea", span: true },
    ],
    rows: [
      { id: "D001", name: "Dr. Priya Sharma", specialization: "Cardiologist", regNo: "MH-12345", hospital: "Apollo Hospital", phone: "9800001111", city: "Mumbai", status: "Active" },
      { id: "D002", name: "Dr. Raj Patel", specialization: "Diabetologist", regNo: "GJ-67890", hospital: "Fortis Hospital", phone: "9800002222", city: "Ahmedabad", status: "Active" },
      { id: "D003", name: "Dr. Anita Singh", specialization: "General Physician", regNo: "DL-11111", hospital: "AIIMS Delhi", phone: "9800003333", city: "Delhi", status: "Active" },
      { id: "D004", name: "Dr. Suresh Kumar", specialization: "Oncologist", regNo: "KA-22222", hospital: "Manipal Hospital", phone: "9800004444", city: "Bangalore", status: "Active" },
      { id: "D005", name: "Dr. Meena Iyer", specialization: "Gynecologist", regNo: "TN-33333", hospital: "Apollo Madurai", phone: "9800005555", city: "Madurai", status: "Inactive" },
    ],
  },

  {
    id: "composition", label: "Composition / Drug Master", navLabel: "Composition / Drug", addLabel: "Composition", group: "Clinical",
    cols: [
      { key: "name", label: "Salt / Molecule", w: 200 },
      { key: "strength", label: "Strength", w: 100, mono: true },
      { key: "schedule", label: "Schedule", w: 90, mono: true },
      { key: "drugClass", label: "Drug Class", w: 160 },
      { key: "action", label: "Pharmacological Action", w: 230 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Salt / Molecule Name", required: true },
      { key: "strength", label: "Strength (e.g., 500mg)" },
      { key: "schedule", label: "Drug Schedule", type: "select", options: ["None","G","H","H1","J","X"] },
      { key: "drugClass", label: "Drug Class / Category" },
      { key: "action", label: "Pharmacological Action", span: true },
      { key: "contraindications", label: "Key Contraindications", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "C001", name: "Azithromycin", strength: "500mg", schedule: "H", drugClass: "Macrolide", action: "Bactericidal — inhibits protein synthesis", status: "Active" },
      { id: "C002", name: "Metformin HCl", strength: "500mg", schedule: "None", drugClass: "Biguanide", action: "Antidiabetic — reduces hepatic glucose output", status: "Active" },
      { id: "C003", name: "Paracetamol", strength: "500mg", schedule: "None", drugClass: "Analgesic", action: "Inhibits COX; central pain and fever relief", status: "Active" },
      { id: "C004", name: "Atorvastatin", strength: "10mg", schedule: "H", drugClass: "Statin", action: "HMG-CoA inhibitor — lowers LDL cholesterol", status: "Active" },
      { id: "C005", name: "Amlodipine", strength: "5mg", schedule: "H", drugClass: "CCB", action: "Calcium channel blocker — reduces BP", status: "Active" },
    ],
  },

  {
    id: "route", label: "Route of Administration Master", navLabel: "Route of Administration", addLabel: "Route", group: "Clinical",
    cols: [
      { key: "name", label: "Route Name", w: 200 },
      { key: "shortCode", label: "Code", w: 80, mono: true },
      { key: "type", label: "Type", w: 130 },
      { key: "examples", label: "Examples", w: 280 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Route Name", required: true },
      { key: "shortCode", label: "Short Code", required: true },
      { key: "type", label: "Type", type: "select", options: ["Enteral","Parenteral","Topical","Inhalation","Transdermal","Other"] },
      { key: "examples", label: "Examples / Notes", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "RO001", name: "Oral", shortCode: "PO", type: "Enteral", examples: "Tablets, Capsules, Syrups, Suspensions", status: "Active" },
      { id: "RO002", name: "Intravenous", shortCode: "IV", type: "Parenteral", examples: "IV Infusion, IV Push", status: "Active" },
      { id: "RO003", name: "Intramuscular", shortCode: "IM", type: "Parenteral", examples: "Vitamin B12 injection, Vaccines", status: "Active" },
      { id: "RO004", name: "Topical", shortCode: "TOP", type: "Topical", examples: "Creams, Ointments, Gels, Patches", status: "Active" },
      { id: "RO005", name: "Inhalation", shortCode: "INH", type: "Inhalation", examples: "Inhalers, Nebulisers", status: "Active" },
      { id: "RO006", name: "Sublingual", shortCode: "SL", type: "Enteral", examples: "Nitroglycerine tablets", status: "Active" },
    ],
  },

  {
    id: "rxtemplate", label: "Prescription Template Master", navLabel: "Prescription Template", addLabel: "Template", group: "Clinical",
    cols: [
      { key: "name", label: "Template Name", w: 200 },
      { key: "category", label: "Category", w: 140 },
      { key: "drugs", label: "Drugs Included", w: 300 },
      { key: "usedCount", label: "Used", w: 70, align: "right", mono: true },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Template Name", required: true },
      { key: "category", label: "Category / Condition" },
      { key: "drugs", label: "Drugs / Medicines", type: "textarea", span: true },
      { key: "dosageInstructions", label: "Dosage Instructions", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "RT001", name: "Fever & Infection Pack", category: "General", drugs: "Paracetamol 500mg, Azithromycin 500mg, B-Complex", usedCount: 142, status: "Active" },
      { id: "RT002", name: "Diabetic Starter Pack", category: "Diabetes", drugs: "Metformin 500mg, Glimepiride 1mg, Vitamin D3", usedCount: 87, status: "Active" },
      { id: "RT003", name: "Cardiac Maintenance", category: "Cardiology", drugs: "Atorvastatin 10mg, Amlodipine 5mg, Aspirin 75mg", usedCount: 65, status: "Active" },
      { id: "RT004", name: "Paediatric Cough & Cold", category: "Paediatric", drugs: "Amoxicillin 125mg Susp, Cetrizine Syrup, Zinc Drops", usedCount: 39, status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 2 — PRODUCT
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "product", label: "Product / Medicine Master", navLabel: "Product / Medicine", addLabel: "Product", group: "Product",
    cols: [
      { key: "name", label: "Brand Name", w: 190 },
      { key: "company", label: "Company", w: 120 },
      { key: "composition", label: "Composition", w: 160 },
      { key: "category", label: "Category", w: 130 },
      { key: "hsnCode", label: "HSN Code", w: 100, mono: true },
      { key: "uom", label: "UOM", w: 70 },
      { key: "schedule", label: "Sched.", w: 70, mono: true },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Brand Name", required: true },
      { key: "genericName", label: "Generic Name" },
      { key: "company", label: "Manufacturer", type: "select", options: ["Sun Pharma","Cipla","Dr. Reddys","Abbott","Lupin","Pfizer","GSK","Mankind","Alkem","Torrent","Other"] },
      { key: "composition", label: "Composition / Salt", type: "select", options: ["Azithromycin","Metformin HCl","Paracetamol","Atorvastatin","Amlodipine","Ascorbic Acid","Amoxicillin","Cetirizine","Pantoprazole","Other"] },
      { key: "category", label: "Category", type: "select", options: ["Antibiotics","Analgesics","Antidiabetics","Cardiovascular","Vitamins & Supplements","Antifungals","Antihistamines","GI Agents"] },
      { key: "hsnCode", label: "HSN Code" },
      { key: "dosageForm", label: "Dosage Form", type: "select", options: ["Tablet","Capsule","Syrup","Injection","Cream","Ointment","Drops","Suspension","Sachet"] },
      { key: "strength", label: "Strength (e.g., 500mg)" },
      { key: "uom", label: "Unit of Measure", type: "select", options: ["Strip","Box","Bottle","Vial","Tube","Sachet"] },
      { key: "packSize", label: "Pack Size (e.g., 1×10)" },
      { key: "mrp", label: "MRP (₹)", type: "number" },
      { key: "schedule", label: "Drug Schedule", type: "select", options: ["None","G","H","H1","J","X"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "P001", name: "Azithral 500", company: "Alkem", composition: "Azithromycin", category: "Antibiotics", hsnCode: "30049019", uom: "Strip", schedule: "H", status: "Active" },
      { id: "P002", name: "Glycomet 500", company: "Sun Pharma", composition: "Metformin HCl", category: "Antidiabetics", hsnCode: "30049039", uom: "Strip", schedule: "None", status: "Active" },
      { id: "P003", name: "Crocin 500", company: "Abbott", composition: "Paracetamol", category: "Analgesics", hsnCode: "30049099", uom: "Strip", schedule: "None", status: "Active" },
      { id: "P004", name: "Tonact 10", company: "Lupin", composition: "Atorvastatin", category: "Cardiovascular", hsnCode: "30049039", uom: "Strip", schedule: "H", status: "Active" },
      { id: "P005", name: "Limcee 500", company: "Abbott", composition: "Ascorbic Acid", category: "Vitamins & Supplements", hsnCode: "29362700", uom: "Strip", schedule: "None", status: "Active" },
    ],
  },

  {
    id: "category", label: "Category Master", navLabel: "Category", addLabel: "Category", group: "Product",
    cols: [
      { key: "name", label: "Category Name", w: 200 },
      { key: "type", label: "Type", w: 100 },
      { key: "description", label: "Description", w: 280 },
      { key: "productCount", label: "Products", w: 80, align: "right", mono: true },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Category Name", required: true },
      { key: "type", label: "Type", type: "select", options: ["Rx","OTC","OTC-Branded","Controlled"] },
      { key: "description", label: "Description", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "CAT001", name: "Antibiotics", type: "Rx", description: "Prescription-only antimicrobials", productCount: 28, status: "Active" },
      { id: "CAT002", name: "Analgesics", type: "OTC", description: "Pain relief and antipyretic medications", productCount: 42, status: "Active" },
      { id: "CAT003", name: "Antidiabetics", type: "Rx", description: "Blood sugar control medications", productCount: 35, status: "Active" },
      { id: "CAT004", name: "Cardiovascular", type: "Rx", description: "Heart and blood pressure medications", productCount: 51, status: "Active" },
      { id: "CAT005", name: "Vitamins & Supplements", type: "OTC", description: "Nutritional supplements and nutraceuticals", productCount: 64, status: "Active" },
      { id: "CAT006", name: "Antifungals", type: "Rx", description: "Fungal infection treatments", productCount: 18, status: "Active" },
    ],
  },

  {
    id: "company", label: "Company / Manufacturer Master", navLabel: "Company / Manufacturer", addLabel: "Company", group: "Product",
    cols: [
      { key: "name", label: "Company Name", w: 220 },
      { key: "shortName", label: "Short Name", w: 110, mono: true },
      { key: "gstNo", label: "GSTIN", w: 170, mono: true },
      { key: "state", label: "State", w: 120 },
      { key: "city", label: "City", w: 120 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Company Name", required: true },
      { key: "shortName", label: "Short Name", required: true },
      { key: "gstNo", label: "GSTIN", required: true },
      { key: "pan", label: "PAN" },
      { key: "drugLicenseNo", label: "Drug License No." },
      { key: "city", label: "City" },
      { key: "state", label: "State", type: "select", options: STATES },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "website", label: "Website" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "CO001", name: "Sun Pharmaceutical Industries Ltd", shortName: "Sun Pharma", gstNo: "27AAACS1680H1ZW", state: "Maharashtra", city: "Mumbai", status: "Active" },
      { id: "CO002", name: "Cipla Limited", shortName: "Cipla", gstNo: "27AAACC4923J1ZU", state: "Maharashtra", city: "Mumbai", status: "Active" },
      { id: "CO003", name: "Dr. Reddy's Laboratories Ltd", shortName: "Dr. Reddys", gstNo: "36AAACR0553A1ZM", state: "Telangana", city: "Hyderabad", status: "Active" },
      { id: "CO004", name: "Abbott India Limited", shortName: "Abbott", gstNo: "27AAACA9975B1ZK", state: "Maharashtra", city: "Mumbai", status: "Active" },
      { id: "CO005", name: "Lupin Limited", shortName: "Lupin", gstNo: "27AAACL0062E1ZC", state: "Maharashtra", city: "Mumbai", status: "Active" },
    ],
  },

  {
    id: "dosageform", label: "Dosage Form Master", navLabel: "Dosage Form", addLabel: "Dosage Form", group: "Product",
    cols: [
      { key: "name", label: "Dosage Form", w: 160 },
      { key: "shortCode", label: "Code", w: 80, mono: true },
      { key: "type", label: "Type", w: 120 },
      { key: "adminRoute", label: "Administration Route", w: 200 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Dosage Form Name", required: true },
      { key: "shortCode", label: "Short Code (e.g., Tab)", required: true },
      { key: "type", label: "Type", type: "select", options: ["Solid","Liquid","Semi-solid","Parenteral","Gaseous","Other"] },
      { key: "adminRoute", label: "Administration Route", type: "select", options: ["Oral","Parenteral (IV/IM/SC)","Topical","Inhalation","Ophthalmic","Otic","Nasal","Rectal","Sublingual","Transdermal"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "DF001", name: "Tablet", shortCode: "Tab", type: "Solid", adminRoute: "Oral", status: "Active" },
      { id: "DF002", name: "Capsule", shortCode: "Cap", type: "Solid", adminRoute: "Oral", status: "Active" },
      { id: "DF003", name: "Syrup", shortCode: "Syr", type: "Liquid", adminRoute: "Oral", status: "Active" },
      { id: "DF004", name: "Injection", shortCode: "Inj", type: "Parenteral", adminRoute: "Parenteral (IV/IM/SC)", status: "Active" },
      { id: "DF005", name: "Cream", shortCode: "Cr", type: "Semi-solid", adminRoute: "Topical", status: "Active" },
      { id: "DF006", name: "Ointment", shortCode: "Oint", type: "Semi-solid", adminRoute: "Topical", status: "Active" },
      { id: "DF007", name: "Drops", shortCode: "Drp", type: "Liquid", adminRoute: "Ophthalmic", status: "Active" },
      { id: "DF008", name: "Suspension", shortCode: "Susp", type: "Liquid", adminRoute: "Oral", status: "Active" },
    ],
  },

  {
    id: "packsize", label: "Pack Size Master", navLabel: "Pack Size", addLabel: "Pack Size", group: "Product",
    cols: [
      { key: "name", label: "Pack Description", w: 180 },
      { key: "uom", label: "Base UOM", w: 100 },
      { key: "quantity", label: "Qty", w: 80, mono: true, align: "right" },
      { key: "altPack", label: "Alt. Pack", w: 130 },
      { key: "description", label: "Notes", w: 200 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Pack Description", required: true },
      { key: "uom", label: "Base UOM", type: "select", options: ["Strip","Tablet","Capsule","ml","g","vial","ampoule"] },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "altPack", label: "Alternate Pack Name" },
      { key: "description", label: "Notes" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "PS001", name: "1×10 Strip", uom: "Tablet", quantity: 10, altPack: "Single Strip", description: "10 tablets per strip", status: "Active" },
      { id: "PS002", name: "1×30 Strip", uom: "Tablet", quantity: 30, altPack: "Monthly Pack", description: "30 tablets / 1 month supply", status: "Active" },
      { id: "PS003", name: "100ml Bottle", uom: "ml", quantity: 100, altPack: "Small Bottle", description: "Syrup / liquid — 100ml", status: "Active" },
      { id: "PS004", name: "200ml Bottle", uom: "ml", quantity: 200, altPack: "Large Bottle", description: "Syrup / liquid — 200ml", status: "Active" },
      { id: "PS005", name: "10ml Vial", uom: "ml", quantity: 10, altPack: "Injection Vial", description: "Injectable solution vial", status: "Active" },
    ],
  },

  {
    id: "drugschedule", label: "Drug Schedule Master", navLabel: "Drug Schedule", addLabel: "Drug Schedule", group: "Product",
    cols: [
      { key: "code", label: "Schedule", w: 90, mono: true },
      { key: "name", label: "Name", w: 180 },
      { key: "description", label: "Description", w: 260 },
      { key: "restrictions", label: "Key Restrictions", w: 220 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "code", label: "Schedule Code (e.g., H)", required: true },
      { key: "name", label: "Schedule Name", required: true },
      { key: "description", label: "Description", type: "textarea", span: true },
      { key: "restrictions", label: "Key Restrictions", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "DS001", code: "H", name: "Prescription Drug", description: "Medicines requiring a valid doctor prescription", restrictions: "Cannot be sold without Rx; maintain prescription records", status: "Active" },
      { id: "DS002", code: "H1", name: "Psychotropic / Narcotic", description: "Controlled substances under NDPS Act", restrictions: "Special license required; strict record-keeping and quantity limits", status: "Active" },
      { id: "DS003", code: "G", name: "Cautionary Label Drug", description: "Caution advised — professional guidance recommended", restrictions: "No prescription mandatory but guidance label required", status: "Active" },
      { id: "DS004", code: "X", name: "Banned / Prohibited", description: "Drugs banned for manufacture/sale in India", restrictions: "Sale strictly prohibited under Drugs & Cosmetics Act", status: "Active" },
      { id: "DS005", code: "None", name: "Over-the-Counter (OTC)", description: "Freely sold without prescription", restrictions: "No special restrictions; safe for self-medication", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 3 — SUPPLY CHAIN
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "distributor", label: "Distributor / Supplier Master", navLabel: "Distributor / Supplier", addLabel: "Distributor", group: "Supply Chain",
    cols: [
      { key: "name", label: "Distributor Name", w: 210 },
      { key: "code", label: "Code", w: 80, mono: true },
      { key: "gstNo", label: "GSTIN", w: 170, mono: true },
      { key: "city", label: "City", w: 120 },
      { key: "creditLimit", label: "Credit Limit", w: 130, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Distributor Name", required: true },
      { key: "code", label: "Distributor Code" },
      { key: "gstNo", label: "GSTIN", required: true },
      { key: "drugLicenseNo", label: "Drug License No." },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "city", label: "City" },
      { key: "state", label: "State", type: "select", options: STATES },
      { key: "area", label: "Area / Territory" },
      { key: "creditLimit", label: "Credit Limit (₹)", type: "number" },
      { key: "creditDays", label: "Credit Days", type: "number" },
      { key: "paymentTerms", label: "Payment Terms", type: "select", options: ["Cash","7 Days","15 Days","30 Days","45 Days","60 Days"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive","Draft"] },
    ],
    rows: [
      { id: "DIS001", name: "Healthy Pharma Distributors", code: "HP-001", gstNo: "27AAAAH1234H1ZW", city: "Mumbai", creditLimit: "₹5,00,000", status: "Active" },
      { id: "DIS002", name: "MedLine Distributors", code: "ML-002", gstNo: "29AAAAM5678M1ZU", city: "Bangalore", creditLimit: "₹3,00,000", status: "Active" },
      { id: "DIS003", name: "Gujarat Pharma Wholesale", code: "GP-003", gstNo: "24AAAAG9012G1ZA", city: "Ahmedabad", creditLimit: "₹4,00,000", status: "Active" },
      { id: "DIS004", name: "Delhi Med Supplies Pvt Ltd", code: "DM-004", gstNo: "07AAAAD3456D1ZK", city: "Delhi", creditLimit: "₹6,00,000", status: "Active" },
      { id: "DIS005", name: "South India Pharma Co.", code: "SI-005", gstNo: "33AAAAS7890S1ZB", city: "Chennai", creditLimit: "₹2,50,000", status: "Inactive" },
    ],
  },

  {
    id: "area", label: "Area / Territory Master", navLabel: "Area / Territory", addLabel: "Area", group: "Supply Chain",
    cols: [
      { key: "name", label: "Area Name", w: 180 },
      { key: "district", label: "District", w: 150 },
      { key: "state", label: "State", w: 130 },
      { key: "pincode", label: "Pincode", w: 90, mono: true },
      { key: "manager", label: "Area Manager", w: 150 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Area Name", required: true },
      { key: "district", label: "District" },
      { key: "state", label: "State", type: "select", options: STATES },
      { key: "pincode", label: "Pincode" },
      { key: "manager", label: "Area Manager" },
      { key: "phone", label: "Manager Phone", type: "tel" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "AR001", name: "Andheri East", district: "Mumbai Suburban", state: "Maharashtra", pincode: "400069", manager: "Ravi Desai", status: "Active" },
      { id: "AR002", name: "Koramangala", district: "Bangalore Urban", state: "Karnataka", pincode: "560034", manager: "Sunil Nair", status: "Active" },
      { id: "AR003", name: "Navrangpura", district: "Ahmedabad", state: "Gujarat", pincode: "380009", manager: "Kiran Shah", status: "Active" },
      { id: "AR004", name: "Connaught Place", district: "New Delhi", state: "Delhi", pincode: "110001", manager: "Priya Mehta", status: "Active" },
      { id: "AR005", name: "Banjara Hills", district: "Hyderabad", state: "Telangana", pincode: "500034", manager: "Anil Reddy", status: "Active" },
    ],
  },

  {
    id: "transport", label: "Transport / Courier Master", navLabel: "Transport / Courier", addLabel: "Transporter", group: "Supply Chain",
    cols: [
      { key: "name", label: "Transporter Name", w: 200 },
      { key: "contact", label: "Contact", w: 130, mono: true },
      { key: "mode", label: "Mode", w: 110 },
      { key: "serviceArea", label: "Service Area", w: 180 },
      { key: "gstNo", label: "GSTIN", w: 160, mono: true },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Transporter Name", required: true },
      { key: "contact", label: "Contact Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "mode", label: "Transport Mode", type: "select", options: ["Road","Air","Rail","Courier","Hand Delivery"] },
      { key: "serviceArea", label: "Service Area / Zones" },
      { key: "gstNo", label: "GSTIN" },
      { key: "trackingUrl", label: "Tracking URL" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "TR001", name: "Blue Dart Express Ltd", contact: "1860-233-1234", mode: "Air", serviceArea: "Pan India", gstNo: "27AAAAB0101B1ZX", status: "Active" },
      { id: "TR002", name: "DTDC Courier & Cargo", contact: "1800-103-3832", mode: "Road", serviceArea: "Pan India", gstNo: "29AAAAD0202D1ZY", status: "Active" },
      { id: "TR003", name: "Local Pharma Rider", contact: "9800007777", mode: "Road", serviceArea: "Mumbai Local", gstNo: "—", status: "Active" },
      { id: "TR004", name: "Delhivery Ltd", contact: "1800-123-8000", mode: "Courier", serviceArea: "Pan India", gstNo: "06AAAAD0303D1ZZ", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 4 — GST & COMPLIANCE
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "hsn", label: "HSN Code Master", navLabel: "HSN Codes", addLabel: "HSN Code", group: "GST & Compliance",
    cols: [
      { key: "code", label: "HSN Code", w: 110, mono: true },
      { key: "description", label: "Description", w: 300 },
      { key: "gstRate", label: "GST %", w: 80, mono: true, align: "right" },
      { key: "category", label: "Category", w: 130 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "code", label: "HSN Code", required: true },
      { key: "description", label: "Description", required: true, span: true },
      { key: "category", label: "Category", type: "select", options: ["Medicine","Bulk Drug","Surgical","Vitamin","Nutraceutical","Medical Device","Other"] },
      { key: "gstRate", label: "GST Rate (%)", type: "select", options: ["0","5","12","18","28"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "HSN001", code: "30049019", description: "Medicaments containing antibiotics — formulated for retail sale", gstRate: "12%", category: "Medicine", status: "Active" },
      { id: "HSN002", code: "30049099", description: "Other medicaments n.e.s. — formulated for retail sale", gstRate: "12%", category: "Medicine", status: "Active" },
      { id: "HSN003", code: "30049039", description: "Medicaments containing hormones — formulated for retail sale", gstRate: "12%", category: "Medicine", status: "Active" },
      { id: "HSN004", code: "30061090", description: "Sterile surgical catgut and similar suture materials", gstRate: "5%", category: "Surgical", status: "Active" },
      { id: "HSN005", code: "29362700", description: "Vitamin C and its derivatives — bulk pharmaceutical", gstRate: "5%", category: "Vitamin", status: "Active" },
      { id: "HSN006", code: "30039990", description: "Bulk drugs — other unmixed products for therapeutic use", gstRate: "12%", category: "Bulk Drug", status: "Active" },
    ],
  },

  {
    id: "gstrate", label: "Tax / GST Rate Master", navLabel: "Tax / GST Rates", addLabel: "Tax Rate", group: "GST & Compliance",
    cols: [
      { key: "description", label: "Description", w: 200 },
      { key: "rate", label: "Total GST%", w: 90, mono: true, align: "right" },
      { key: "cgst", label: "CGST%", w: 75, mono: true, align: "right" },
      { key: "sgst", label: "SGST%", w: 75, mono: true, align: "right" },
      { key: "igst", label: "IGST%", w: 75, mono: true, align: "right" },
      { key: "applicability", label: "Applicable On", w: 220 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "description", label: "Rate Description", required: true },
      { key: "rate", label: "Total GST Rate (%)", type: "select", options: ["0","5","12","18","28"] },
      { key: "cgst", label: "CGST (%)", type: "number" },
      { key: "sgst", label: "SGST (%)", type: "number" },
      { key: "igst", label: "IGST (%)", type: "number" },
      { key: "applicability", label: "Applicable On", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "TAX001", description: "Exempt", rate: "0%", cgst: "0%", sgst: "0%", igst: "0%", applicability: "Exempt goods, essential life-saving medicines", status: "Active" },
      { id: "TAX002", description: "Essential Medicines / Surgical", rate: "5%", cgst: "2.5%", sgst: "2.5%", igst: "5%", applicability: "Life-saving drugs, diagnostic kits, surgical items", status: "Active" },
      { id: "TAX003", description: "General Medicines", rate: "12%", cgst: "6%", sgst: "6%", igst: "12%", applicability: "Most Rx & OTC branded medicines", status: "Active" },
      { id: "TAX004", description: "Nutraceuticals / Wellness", rate: "18%", cgst: "9%", sgst: "9%", igst: "18%", applicability: "Health supplements, cosmetics, wellness products", status: "Active" },
      { id: "TAX005", description: "Luxury / Tobacco", rate: "28%", cgst: "14%", sgst: "14%", igst: "28%", applicability: "Tobacco products and luxury health items", status: "Active" },
    ],
  },

  {
    id: "druglicense", label: "Drug License Type Master", navLabel: "Drug License Type", addLabel: "License Type", group: "GST & Compliance",
    cols: [
      { key: "name", label: "License Type", w: 220 },
      { key: "code", label: "Code", w: 90, mono: true },
      { key: "authority", label: "Issuing Authority", w: 200 },
      { key: "validity", label: "Validity", w: 100 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "License Type Name", required: true },
      { key: "code", label: "Code", required: true },
      { key: "authority", label: "Issuing Authority" },
      { key: "validity", label: "Validity Period" },
      { key: "description", label: "Description / Scope", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "DL001", name: "Retail Drug License", code: "RDL", authority: "State Drug Controller", validity: "5 years", status: "Active" },
      { id: "DL002", name: "Wholesale Drug License", code: "WDL", authority: "State Drug Controller", validity: "5 years", status: "Active" },
      { id: "DL003", name: "Manufacturing License", code: "MFG", authority: "Central Drugs Standard Control Organisation", validity: "5 years", status: "Active" },
      { id: "DL004", name: "C&F Agent License", code: "CFA", authority: "State Drug Controller", validity: "3 years", status: "Active" },
      { id: "DL005", name: "Hospital Pharmacy License", code: "HPL", authority: "State Drug Controller", validity: "5 years", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 5 — INVENTORY & OPERATIONS
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "uom", label: "Unit of Measurement Master", navLabel: "Unit of Measurement", addLabel: "UOM", group: "Inventory & Operations",
    cols: [
      { key: "name", label: "Unit Name", w: 160 },
      { key: "shortCode", label: "Code", w: 80, mono: true },
      { key: "type", label: "Type", w: 100 },
      { key: "altUnit", label: "Alt. Unit", w: 100 },
      { key: "convFactor", label: "Conv. Factor", w: 110, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Unit Name", required: true },
      { key: "shortCode", label: "Short Code", required: true },
      { key: "type", label: "Type", type: "select", options: ["Pack","Weight","Volume","Piece","Length"] },
      { key: "altUnit", label: "Alternate Unit" },
      { key: "convFactor", label: "Conversion Factor", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "UOM001", name: "Strip", shortCode: "STR", type: "Pack", altUnit: "Tablet", convFactor: "10", status: "Active" },
      { id: "UOM002", name: "Box", shortCode: "BOX", type: "Pack", altUnit: "Strip", convFactor: "10", status: "Active" },
      { id: "UOM003", name: "Bottle", shortCode: "BTL", type: "Volume", altUnit: "ml", convFactor: "100", status: "Active" },
      { id: "UOM004", name: "Vial", shortCode: "VIA", type: "Piece", altUnit: "ml", convFactor: "10", status: "Active" },
      { id: "UOM005", name: "Sachet", shortCode: "SCH", type: "Pack", altUnit: "g", convFactor: "5", status: "Active" },
      { id: "UOM006", name: "Tube", shortCode: "TBE", type: "Piece", altUnit: "g", convFactor: "30", status: "Active" },
    ],
  },

  {
    id: "storage", label: "Storage Location / Rack Master", navLabel: "Storage Location / Rack", addLabel: "Location", group: "Inventory & Operations",
    cols: [
      { key: "code", label: "Location Code", w: 120, mono: true },
      { key: "name", label: "Location Name", w: 190 },
      { key: "rack", label: "Rack / Zone", w: 90 },
      { key: "floor", label: "Floor", w: 90 },
      { key: "type", label: "Storage Type", w: 140 },
      { key: "capacity", label: "Capacity", w: 90, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "code", label: "Location Code", required: true },
      { key: "name", label: "Location Name", required: true },
      { key: "rack", label: "Rack / Zone" },
      { key: "floor", label: "Floor / Level" },
      { key: "type", label: "Storage Type", type: "select", options: ["Regular","Cold Chain","Controlled","Secured / Narcotic","Hazardous"] },
      { key: "capacity", label: "Capacity (units)", type: "number" },
      { key: "tempRange", label: "Temperature Range (e.g., 2–8°C)" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "SL001", code: "RACK-A1", name: "Antibiotics Shelf A", rack: "A", floor: "Ground", type: "Regular", capacity: "100", status: "Active" },
      { id: "SL002", code: "RACK-B2", name: "Cardiovascular Shelf B", rack: "B", floor: "Ground", type: "Regular", capacity: "80", status: "Active" },
      { id: "SL003", code: "COLD-01", name: "Cold Storage Unit 1", rack: "Cold", floor: "Special", type: "Cold Chain", capacity: "50", status: "Active" },
      { id: "SL004", code: "RACK-C3", name: "OTC Products Shelf C", rack: "C", floor: "Ground", type: "Regular", capacity: "150", status: "Active" },
      { id: "SL005", code: "NARC-01", name: "Narcotics Cabinet", rack: "Secured", floor: "Ground", type: "Secured / Narcotic", capacity: "30", status: "Active" },
    ],
  },

  {
    id: "branch", label: "Store / Branch Master", navLabel: "Store / Branch", addLabel: "Branch", group: "Inventory & Operations",
    cols: [
      { key: "name", label: "Branch Name", w: 200 },
      { key: "code", label: "Code", w: 80, mono: true },
      { key: "city", label: "City", w: 120 },
      { key: "gstNo", label: "GSTIN", w: 170, mono: true },
      { key: "type", label: "Type", w: 120 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Branch Name", required: true },
      { key: "code", label: "Branch Code", required: true },
      { key: "type", label: "Type", type: "select", options: ["Main Store","Branch","Counter","Warehouse","Hospital Outlet"] },
      { key: "address", label: "Address", type: "textarea", span: true },
      { key: "city", label: "City" },
      { key: "state", label: "State", type: "select", options: STATES },
      { key: "pincode", label: "Pincode" },
      { key: "gstNo", label: "GSTIN" },
      { key: "drugLicenseNo", label: "Drug License No." },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "manager", label: "Branch Manager" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "BR001", name: "City Central Pharmacy — Main", code: "CCP-MAIN", city: "Mumbai", gstNo: "27AAACS1680H1ZW", type: "Main Store", status: "Active" },
      { id: "BR002", name: "City Central Pharmacy — Andheri", code: "CCP-AND", city: "Mumbai", gstNo: "27AAACS1680H1ZX", type: "Branch", status: "Active" },
      { id: "BR003", name: "City Central Pharmacy — Thane", code: "CCP-THN", city: "Thane", gstNo: "27AAACS1680H1ZY", type: "Branch", status: "Active" },
    ],
  },

  {
    id: "bin", label: "Bin / Slot Master", navLabel: "Bin / Slot", addLabel: "Bin", group: "Inventory & Operations",
    cols: [
      { key: "code", label: "Bin Code", w: 110, mono: true },
      { key: "rack", label: "Rack", w: 90, mono: true },
      { key: "row", label: "Row", w: 70, mono: true },
      { key: "column", label: "Column", w: 80, mono: true },
      { key: "capacity", label: "Capacity", w: 90, mono: true, align: "right" },
      { key: "location", label: "Parent Location", w: 160 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "code", label: "Bin Code", required: true },
      { key: "rack", label: "Rack / Zone", required: true },
      { key: "row", label: "Row" },
      { key: "column", label: "Column" },
      { key: "capacity", label: "Capacity (units)", type: "number" },
      { key: "location", label: "Parent Location", type: "select", options: ["RACK-A1","RACK-B2","RACK-C3","COLD-01","NARC-01"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "BN001", code: "A1-R1-C1", rack: "A1", row: "R1", column: "C1", capacity: "25", location: "RACK-A1", status: "Active" },
      { id: "BN002", code: "A1-R1-C2", rack: "A1", row: "R1", column: "C2", capacity: "25", location: "RACK-A1", status: "Active" },
      { id: "BN003", code: "B2-R1-C1", rack: "B2", row: "R1", column: "C1", capacity: "20", location: "RACK-B2", status: "Active" },
      { id: "BN004", code: "C3-R2-C1", rack: "C3", row: "R2", column: "C1", capacity: "30", location: "RACK-C3", status: "Active" },
      { id: "BN005", code: "COLD-S1", rack: "Cold", row: "S1", column: "—", capacity: "50", location: "COLD-01", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 6 — FINANCE
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "bank", label: "Bank Account Master", navLabel: "Bank Account", addLabel: "Bank Account", group: "Finance",
    cols: [
      { key: "bank", label: "Bank Name", w: 180 },
      { key: "branch", label: "Branch", w: 150 },
      { key: "accountNo", label: "Account No.", w: 160, mono: true },
      { key: "ifsc", label: "IFSC Code", w: 120, mono: true },
      { key: "type", label: "Type", w: 120 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "bank", label: "Bank Name", required: true },
      { key: "branch", label: "Branch Name" },
      { key: "accountNo", label: "Account Number", required: true },
      { key: "ifsc", label: "IFSC Code", required: true },
      { key: "type", label: "Account Type", type: "select", options: ["Current","Savings","Overdraft","CC","EEFC"] },
      { key: "openingBalance", label: "Opening Balance (₹)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "BA001", bank: "HDFC Bank", branch: "Andheri West", accountNo: "50100XXXXXXXXXX", ifsc: "HDFC0001234", type: "Current", status: "Active" },
      { id: "BA002", bank: "ICICI Bank", branch: "Bandra", accountNo: "000305XXXXXXXXXX", ifsc: "ICIC0000567", type: "Current", status: "Active" },
      { id: "BA003", bank: "State Bank of India", branch: "Fort", accountNo: "31234XXXXXXXXXX", ifsc: "SBIN0000891", type: "Savings", status: "Active" },
      { id: "BA004", bank: "Axis Bank", branch: "Juhu", accountNo: "91234XXXXXXXXXX", ifsc: "UTIB0000234", type: "Overdraft", status: "Inactive" },
    ],
  },

  {
    id: "paymode", label: "Payment Mode Master", navLabel: "Payment Mode", addLabel: "Payment Mode", group: "Finance",
    cols: [
      { key: "name", label: "Payment Mode", w: 180 },
      { key: "code", label: "Code", w: 90, mono: true },
      { key: "type", label: "Type", w: 130 },
      { key: "gateway", label: "Gateway / Provider", w: 160 },
      { key: "txnFee", label: "Txn Fee%", w: 90, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Payment Mode Name", required: true },
      { key: "code", label: "Code", required: true },
      { key: "type", label: "Type", type: "select", options: ["Cash","Digital","Card","Bank Transfer","Credit","Barter"] },
      { key: "gateway", label: "Gateway / Provider" },
      { key: "txnFee", label: "Transaction Fee (%)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "PM001", name: "Cash", code: "CASH", type: "Cash", gateway: "—", txnFee: "0%", status: "Active" },
      { id: "PM002", name: "UPI", code: "UPI", type: "Digital", gateway: "Razorpay / Paytm", txnFee: "0%", status: "Active" },
      { id: "PM003", name: "Debit Card", code: "DC", type: "Card", gateway: "Bank POS Terminal", txnFee: "0.4%", status: "Active" },
      { id: "PM004", name: "Credit Card", code: "CC", type: "Card", gateway: "Bank POS Terminal", txnFee: "1.8%", status: "Active" },
      { id: "PM005", name: "NEFT / RTGS", code: "NEFT", type: "Bank Transfer", gateway: "Bank", txnFee: "0%", status: "Active" },
      { id: "PM006", name: "Cheque", code: "CHQ", type: "Bank Transfer", gateway: "Bank", txnFee: "0%", status: "Active" },
    ],
  },

  {
    id: "ledger", label: "Ledger / Account Head Master", navLabel: "Ledger / Account Head", addLabel: "Ledger", group: "Finance",
    cols: [
      { key: "name", label: "Account Name", w: 200 },
      { key: "code", label: "Code", w: 90, mono: true },
      { key: "type", label: "Type", w: 120 },
      { key: "group", label: "Group", w: 160 },
      { key: "openingBal", label: "Opening Bal.", w: 130, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Account Name", required: true },
      { key: "code", label: "Account Code", required: true },
      { key: "type", label: "Type", type: "select", options: ["Asset","Liability","Income","Expense","Equity"] },
      { key: "group", label: "Group", type: "select", options: ["Cash & Bank","Sundry Debtors","Sundry Creditors","Stock","Fixed Assets","Sales","Purchase","Direct Expense","Indirect Expense","Tax Payable","Other"] },
      { key: "openingBal", label: "Opening Balance (₹)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "LED001", name: "Sales — Medicines", code: "4001", type: "Income", group: "Sales", openingBal: "₹0.00", status: "Active" },
      { id: "LED002", name: "Purchase — Medicines", code: "5001", type: "Expense", group: "Purchase", openingBal: "₹0.00", status: "Active" },
      { id: "LED003", name: "Cash in Hand", code: "1001", type: "Asset", group: "Cash & Bank", openingBal: "₹25,000.00", status: "Active" },
      { id: "LED004", name: "CGST Payable", code: "2101", type: "Liability", group: "Tax Payable", openingBal: "₹0.00", status: "Active" },
      { id: "LED005", name: "SGST Payable", code: "2102", type: "Liability", group: "Tax Payable", openingBal: "₹0.00", status: "Active" },
    ],
  },

  {
    id: "costcenter", label: "Cost Center Master", navLabel: "Cost Center", addLabel: "Cost Center", group: "Finance",
    cols: [
      { key: "name", label: "Cost Center Name", w: 200 },
      { key: "code", label: "Code", w: 100, mono: true },
      { key: "department", label: "Department", w: 160 },
      { key: "budget", label: "Annual Budget", w: 140, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Cost Center Name", required: true },
      { key: "code", label: "Code", required: true },
      { key: "department", label: "Department", type: "select", options: ["Pharmacy","Accounts","Administration","Warehouse","HR","Marketing"] },
      { key: "budget", label: "Annual Budget (₹)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "CC001", name: "Retail Pharmacy Operations", code: "RPO", department: "Pharmacy", budget: "₹12,00,000", status: "Active" },
      { id: "CC002", name: "Accounts & Finance", code: "ACF", department: "Accounts", budget: "₹3,60,000", status: "Active" },
      { id: "CC003", name: "Warehouse & Logistics", code: "WHL", department: "Warehouse", budget: "₹4,20,000", status: "Active" },
      { id: "CC004", name: "Administration", code: "ADM", department: "Administration", budget: "₹2,40,000", status: "Active" },
    ],
  },

  {
    id: "scheme", label: "Scheme / Discount Master", navLabel: "Scheme / Discount", addLabel: "Scheme", group: "Finance",
    cols: [
      { key: "name", label: "Scheme Name", w: 200 },
      { key: "type", label: "Type", w: 130 },
      { key: "value", label: "Value", w: 90, mono: true },
      { key: "applicableOn", label: "Applicable On", w: 180 },
      { key: "validTill", label: "Valid Till", w: 110, mono: true },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Scheme Name", required: true },
      { key: "type", label: "Type", type: "select", options: ["Flat %","Flat Amount","Buy-X-Get-Y","Cashback","Loyalty Points","Seasonal"] },
      { key: "value", label: "Discount Value (% or ₹)" },
      { key: "applicableOn", label: "Applicable On", type: "select", options: ["All Products","Category","Specific Product","Patient Group","Minimum Bill"] },
      { key: "minBillAmount", label: "Minimum Bill Amount (₹)", type: "number" },
      { key: "validFrom", label: "Valid From", type: "date" },
      { key: "validTill", label: "Valid Till", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "SCH001", name: "Senior Citizen Discount", type: "Flat %", value: "10%", applicableOn: "All Products", validTill: "31-Dec-2025", status: "Active" },
      { id: "SCH002", name: "Festive Season Sale", type: "Flat %", value: "15%", applicableOn: "Category", validTill: "05-Nov-2025", status: "Active" },
      { id: "SCH003", name: "Bulk Buy — Box Discount", type: "Flat Amount", value: "₹50/box", applicableOn: "Minimum Bill", validTill: "Ongoing", status: "Active" },
      { id: "SCH004", name: "Employee Welfare Scheme", type: "Flat %", value: "20%", applicableOn: "Patient Group", validTill: "31-Mar-2026", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 7 — PATIENT & INSURANCE
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "patientgroup", label: "Patient Group / Type Master", navLabel: "Patient Group / Type", addLabel: "Patient Group", group: "Patient & Insurance",
    cols: [
      { key: "name", label: "Group Name", w: 180 },
      { key: "code", label: "Code", w: 90, mono: true },
      { key: "discount", label: "Default Disc%", w: 110, mono: true, align: "right" },
      { key: "creditAllowed", label: "Credit", w: 90 },
      { key: "description", label: "Description", w: 220 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Group Name", required: true },
      { key: "code", label: "Code" },
      { key: "discount", label: "Default Discount (%)", type: "number" },
      { key: "creditAllowed", label: "Credit Allowed?", type: "select", options: ["Yes","No"] },
      { key: "creditLimit", label: "Credit Limit (₹)", type: "number" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "PG001", name: "Regular Customer", code: "REG", discount: "0%", creditAllowed: "No", description: "Standard walk-in patients", status: "Active" },
      { id: "PG002", name: "Senior Citizen", code: "SEN", discount: "10%", creditAllowed: "No", description: "Patients aged 60+ years", status: "Active" },
      { id: "PG003", name: "VIP / Premium", code: "VIP", discount: "15%", creditAllowed: "Yes", description: "Priority service and higher discounts", status: "Active" },
      { id: "PG004", name: "Employee", code: "EMP", discount: "20%", creditAllowed: "Yes", description: "Pharmacy staff and their family", status: "Active" },
      { id: "PG005", name: "Wholesale", code: "WHL", discount: "25%", creditAllowed: "Yes", description: "Bulk buyers and resellers", status: "Active" },
    ],
  },

  {
    id: "insurer", label: "Insurance Company / TPA Master", navLabel: "Insurance Company / TPA", addLabel: "Insurer", group: "Patient & Insurance",
    cols: [
      { key: "name", label: "Company / TPA Name", w: 220 },
      { key: "tpaCode", label: "TPA Code", w: 110, mono: true },
      { key: "phone", label: "Phone", w: 130, mono: true },
      { key: "billingFormat", label: "Billing Format", w: 150 },
      { key: "claimMode", label: "Claim Mode", w: 130 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Company / TPA Name", required: true },
      { key: "tpaCode", label: "TPA Code" },
      { key: "phone", label: "Contact Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "billingFormat", label: "Billing Format", type: "select", options: ["Standard","CGHS","ECHS","ESI","Cashless","Reimbursement"] },
      { key: "claimMode", label: "Claim Submission Mode", type: "select", options: ["Online Portal","Email","Physical","API"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "INS001", name: "Star Health and Allied Insurance", tpaCode: "STAR-TPA", phone: "1800-425-2255", billingFormat: "Standard", claimMode: "Online Portal", status: "Active" },
      { id: "INS002", name: "CGHS — Central Govt Health Scheme", tpaCode: "CGHS", phone: "1800-110-210", billingFormat: "CGHS", claimMode: "Physical", status: "Active" },
      { id: "INS003", name: "ESI Corporation", tpaCode: "ESIC", phone: "1800-11-2526", billingFormat: "ESI", claimMode: "Online Portal", status: "Active" },
      { id: "INS004", name: "Religare Health Insurance", tpaCode: "RHI-TPA", phone: "1800-200-4488", billingFormat: "Cashless", claimMode: "Online Portal", status: "Active" },
    ],
  },

  {
    id: "insurplan", label: "Insurance Plan Master", navLabel: "Insurance Plan", addLabel: "Insurance Plan", group: "Patient & Insurance",
    cols: [
      { key: "name", label: "Plan Name", w: 200 },
      { key: "insurer", label: "Insurer / TPA", w: 180 },
      { key: "coverageType", label: "Coverage Type", w: 150 },
      { key: "claimLimit", label: "Claim Limit", w: 130, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Plan Name", required: true },
      { key: "insurer", label: "Insurer / TPA", type: "select", options: ["Star Health","CGHS","ESIC","Religare Health","Max Bupa","HDFC Ergo","Other"] },
      { key: "coverageType", label: "Coverage Type", type: "select", options: ["Outpatient","Inpatient","Comprehensive","Dental","Maternity","Critical Illness"] },
      { key: "claimLimit", label: "Annual Claim Limit (₹)", type: "number" },
      { key: "copayPercent", label: "Co-pay (%)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "IP001", name: "Star Comprehensive Plan", insurer: "Star Health", coverageType: "Comprehensive", claimLimit: "₹5,00,000", status: "Active" },
      { id: "IP002", name: "CGHS OPD Coverage", insurer: "CGHS", coverageType: "Outpatient", claimLimit: "₹1,20,000", status: "Active" },
      { id: "IP003", name: "ESI Medical Benefit", insurer: "ESIC", coverageType: "Comprehensive", claimLimit: "Unlimited", status: "Active" },
      { id: "IP004", name: "Religare Care Plus", insurer: "Religare Health", coverageType: "Inpatient", claimLimit: "₹3,00,000", status: "Active" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // GROUP 8 — HR & ADMIN
  // ══════════════════════════════════════════════════════════════════════

  {
    id: "user", label: "User Master", navLabel: "Users", addLabel: "User", group: "HR & Admin",
    cols: [
      { key: "name", label: "Full Name", w: 160 },
      { key: "email", label: "Email", w: 220, mono: true },
      { key: "role", label: "Role", w: 160 },
      { key: "phone", label: "Phone", w: 130, mono: true },
      { key: "lastLogin", label: "Last Login", w: 120 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "role", label: "Role", type: "select", required: true, options: ["Head Pharmacist","Pharmacist","Pharmacy Tech","Cashier","Billing Executive","Inventory Manager","Admin","Accounts Manager","Sales Representative"] },
      { key: "department", label: "Department", type: "select", options: ["Pharmacy","Accounts","Administration","Warehouse","HR"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "U001", name: "Jane Doe", email: "jane.doe@pharmacy.com", role: "Head Pharmacist", phone: "9900001111", lastLogin: "Today 09:12", status: "Active" },
      { id: "U002", name: "Mark Stevens", email: "mark.s@pharmacy.com", role: "Pharmacist", phone: "9900002222", lastLogin: "Today 08:45", status: "Active" },
      { id: "U003", name: "Anna Kowalski", email: "anna.k@pharmacy.com", role: "Pharmacy Tech", phone: "9900003333", lastLogin: "Yesterday", status: "Active" },
      { id: "U004", name: "Leo Pham", email: "leo.p@pharmacy.com", role: "Cashier", phone: "9900004444", lastLogin: "3 days ago", status: "Active" },
      { id: "U005", name: "Rachel Hunt", email: "rachel.h@pharmacy.com", role: "Admin", phone: "9900005555", lastLogin: "2025-07-10", status: "Inactive" },
    ],
  },

  {
    id: "role", label: "Role / Permission Master", navLabel: "Roles & Permissions", addLabel: "Role", group: "HR & Admin",
    cols: [
      { key: "name", label: "Role Name", w: 180 },
      { key: "description", label: "Description", w: 240 },
      { key: "modulesCount", label: "Modules", w: 90, mono: true, align: "right" },
      { key: "usersCount", label: "Users", w: 80, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Role Name", required: true },
      { key: "description", label: "Description" },
      { key: "modules", label: "Module Access (comma-separated)", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "RL001", name: "Head Pharmacist", description: "Full access across all modules", modulesCount: 13, usersCount: 1, status: "Active" },
      { id: "RL002", name: "Pharmacist", description: "Sales, Prescriptions, Patients, Inventory", modulesCount: 7, usersCount: 2, status: "Active" },
      { id: "RL003", name: "Cashier", description: "Sales billing and payment collection only", modulesCount: 2, usersCount: 1, status: "Active" },
      { id: "RL004", name: "Inventory Manager", description: "Inventory, Stock, Purchases, Suppliers", modulesCount: 5, usersCount: 1, status: "Active" },
      { id: "RL005", name: "Admin", description: "Settings, Users, Masters, Reports", modulesCount: 6, usersCount: 1, status: "Active" },
    ],
  },

  {
    id: "department", label: "Department Master", navLabel: "Department", addLabel: "Department", group: "HR & Admin",
    cols: [
      { key: "name", label: "Department Name", w: 200 },
      { key: "code", label: "Code", w: 90, mono: true },
      { key: "head", label: "Department Head", w: 170 },
      { key: "staffCount", label: "Staff", w: 80, mono: true, align: "right" },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Department Name", required: true },
      { key: "code", label: "Department Code" },
      { key: "head", label: "Department Head" },
      { key: "description", label: "Description", type: "textarea", span: true },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "DEP001", name: "Pharmacy", code: "PHR", head: "Jane Doe", staffCount: 4, status: "Active" },
      { id: "DEP002", name: "Accounts & Finance", code: "ACF", head: "Rachel Hunt", staffCount: 2, status: "Active" },
      { id: "DEP003", name: "Administration", code: "ADM", head: "Rachel Hunt", staffCount: 2, status: "Active" },
      { id: "DEP004", name: "Warehouse & Inventory", code: "WHI", head: "Leo Pham", staffCount: 3, status: "Active" },
    ],
  },

  {
    id: "designation", label: "Designation Master", navLabel: "Designation", addLabel: "Designation", group: "HR & Admin",
    cols: [
      { key: "name", label: "Designation", w: 200 },
      { key: "code", label: "Code", w: 100, mono: true },
      { key: "department", label: "Department", w: 160 },
      { key: "grade", label: "Pay Grade", w: 110 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Designation Name", required: true },
      { key: "code", label: "Code" },
      { key: "department", label: "Department", type: "select", options: ["Pharmacy","Accounts & Finance","Administration","Warehouse & Inventory","HR"] },
      { key: "grade", label: "Pay Grade", type: "select", options: ["Grade-1","Grade-2","Grade-3","Grade-4","Grade-5","Manager","Senior Manager","Director"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "DG001", name: "Head Pharmacist", code: "HPHARM", department: "Pharmacy", grade: "Senior Manager", status: "Active" },
      { id: "DG002", name: "Pharmacist", code: "PHARM", department: "Pharmacy", grade: "Grade-3", status: "Active" },
      { id: "DG003", name: "Pharmacy Technician", code: "PTECH", department: "Pharmacy", grade: "Grade-2", status: "Active" },
      { id: "DG004", name: "Cashier", code: "CASH", department: "Pharmacy", grade: "Grade-1", status: "Active" },
      { id: "DG005", name: "Inventory Manager", code: "INVMGR", department: "Warehouse & Inventory", grade: "Manager", status: "Active" },
    ],
  },

  {
    id: "leavetype", label: "Leave Type Master", navLabel: "Leave Type", addLabel: "Leave Type", group: "HR & Admin",
    cols: [
      { key: "name", label: "Leave Type", w: 180 },
      { key: "code", label: "Code", w: 80, mono: true },
      { key: "paidLeave", label: "Paid", w: 80 },
      { key: "maxDays", label: "Max Days/Year", w: 120, mono: true, align: "right" },
      { key: "carryForward", label: "Carry Fwd", w: 100 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Leave Type Name", required: true },
      { key: "code", label: "Code", required: true },
      { key: "paidLeave", label: "Paid Leave?", type: "select", options: ["Yes","No"] },
      { key: "maxDays", label: "Max Days Per Year", type: "number" },
      { key: "carryForward", label: "Carry Forward?", type: "select", options: ["Yes","No"] },
      { key: "maxCarryDays", label: "Max Carry Forward Days", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "LT001", name: "Casual Leave", code: "CL", paidLeave: "Yes", maxDays: 12, carryForward: "No", status: "Active" },
      { id: "LT002", name: "Sick Leave", code: "SL", paidLeave: "Yes", maxDays: 10, carryForward: "No", status: "Active" },
      { id: "LT003", name: "Earned / Annual Leave", code: "EL", paidLeave: "Yes", maxDays: 18, carryForward: "Yes", status: "Active" },
      { id: "LT004", name: "Maternity Leave", code: "ML", paidLeave: "Yes", maxDays: 182, carryForward: "No", status: "Active" },
      { id: "LT005", name: "Compensatory Off", code: "CO", paidLeave: "Yes", maxDays: 12, carryForward: "Yes", status: "Active" },
      { id: "LT006", name: "Leave Without Pay", code: "LWP", paidLeave: "No", maxDays: 30, carryForward: "No", status: "Active" },
    ],
  },

  {
    id: "holiday", label: "Holiday / Calendar Master", navLabel: "Holiday / Calendar", addLabel: "Holiday", group: "HR & Admin",
    cols: [
      { key: "name", label: "Holiday Name", w: 220 },
      { key: "date", label: "Date", w: 120, mono: true },
      { key: "type", label: "Type", w: 140 },
      { key: "applicable", label: "Applicable For", w: 200 },
      { key: "status", label: "Status", w: 90, status: true },
    ],
    fields: [
      { key: "name", label: "Holiday Name", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "type", label: "Type", type: "select", options: ["National","State / Regional","Optional / Restricted","Festival","Company"] },
      { key: "applicable", label: "Applicable For", type: "select", options: ["All Staff","Pharmacy Only","Admin Only","Specific Branch"] },
      { key: "status", label: "Status", type: "select", options: ["Active","Inactive"] },
    ],
    rows: [
      { id: "HO001", name: "Republic Day", date: "26-Jan-2026", type: "National", applicable: "All Staff", status: "Active" },
      { id: "HO002", name: "Holi", date: "14-Mar-2026", type: "Festival", applicable: "All Staff", status: "Active" },
      { id: "HO003", name: "Independence Day", date: "15-Aug-2026", type: "National", applicable: "All Staff", status: "Active" },
      { id: "HO004", name: "Diwali", date: "20-Oct-2026", type: "Festival", applicable: "All Staff", status: "Active" },
      { id: "HO005", name: "Maharashtra Day", date: "01-May-2026", type: "State / Regional", applicable: "All Staff", status: "Active" },
    ],
  },

];

const MASTER_GROUPS = [
  { id: "Clinical",               label: "Clinical" },
  { id: "Product",                label: "Product" },
  { id: "Supply Chain",           label: "Supply Chain" },
  { id: "GST & Compliance",       label: "GST & Compliance" },
  { id: "Inventory & Operations", label: "Inventory & Operations" },
  { id: "Finance",                label: "Finance" },
  { id: "Patient & Insurance",    label: "Patient & Insurance" },
  { id: "HR & Admin",             label: "HR & Admin" },
];

// ─── MasterTable ──────────────────────────────────────────────────────────────

function MasterTable({
  config, rows, onAdd, onEdit, onDelete,
}: {
  config: MasterDef; rows: RowData[];
  onAdd: () => void; onEdit: (r: RowData) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => config.cols.some(c => String(r[c.key] ?? "").toLowerCase().includes(q)));
  }, [rows, search, config.cols]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{config.label}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {search && rows.length !== filtered.length && ` of ${rows.length}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ width: 200, padding: "6px 10px 6px 28px", border: "1px solid #DDE3EC", borderRadius: 4, fontSize: 12, fontFamily: "Inter", outline: "none", color: "#1A2436", background: "#FAFBFD" }}
            />
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#C8CDD8", pointerEvents: "none" }}>⌕</span>
          </div>
          <button
            onClick={onAdd}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#1B6CA8", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", whiteSpace: "nowrap" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#155a8a")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}
          >
            + Add {config.addLabel}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {config.cols.map(c => (
                <th key={c.key} style={{ padding: "8px 12px", textAlign: c.align ?? "left", fontSize: 10.5, fontWeight: 700, color: "#6B7280", fontFamily: "Inter", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", width: c.w, position: "sticky", top: 0, background: "#F8FAFC", zIndex: 1 }}>
                  {c.label}
                </th>
              ))}
              <th style={{ width: 96, padding: "8px 12px", borderBottom: "1px solid #EEF1F6", position: "sticky", top: 0, background: "#F8FAFC", zIndex: 1 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={config.cols.length + 1} style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>
                  {search ? "No records match your search" : "No records yet — click Add to create one"}
                </td>
              </tr>
            ) : filtered.map((row, i) => {
              const rid = String(row.id);
              const base = i % 2 === 0 ? "#fff" : "#FAFBFD";
              return (
                <tr key={rid} style={{ background: base, borderBottom: "1px solid #F0F3F7" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = base)}
                >
                  {config.cols.map(c => (
                    <td key={c.key} style={{ padding: "9px 12px", fontSize: 12.5, color: "#1A2436", fontFamily: c.mono ? "JetBrains Mono" : "Inter", textAlign: c.align ?? "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: c.w ?? 140 }}>
                      {c.status ? <Pill v={String(row[c.key])} /> : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                    {delConfirm === rid ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { onDelete(rid); setDelConfirm(null); }}
                          style={{ fontSize: 11, padding: "2px 8px", background: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2", borderRadius: 3, cursor: "pointer", fontFamily: "Inter" }}>
                          Delete
                        </button>
                        <button onClick={() => setDelConfirm(null)}
                          style={{ fontSize: 11, padding: "2px 8px", background: "#F0F3F7", color: "#6B7280", border: "1px solid #DDE3EC", borderRadius: 3, cursor: "pointer", fontFamily: "Inter" }}>
                          No
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => onEdit(row)}
                          style={{ fontSize: 11, padding: "3px 10px", background: "#EFF6FF", color: "#1B6CA8", border: "1px solid #BFDBFE", borderRadius: 3, cursor: "pointer", fontFamily: "Inter", fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#EFF6FF")}
                        >Edit</button>
                        <button onClick={() => setDelConfirm(rid)}
                          style={{ fontSize: 11, padding: "3px 8px", background: "#fff", color: "#9CA3AF", border: "1px solid #DDE3EC", borderRadius: 3, cursor: "pointer", fontFamily: "Inter" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#FFEBEE"; e.currentTarget.style.color = "#C62828"; e.currentTarget.style.borderColor = "#FFCDD2"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#9CA3AF"; e.currentTarget.style.borderColor = "#DDE3EC"; }}
                        >Del</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MasterForm ───────────────────────────────────────────────────────────────

function MasterForm({ config, initialData, onSave, onCancel }: {
  config: MasterDef; initialData: RowData | null;
  onSave: (d: RowData) => void; onCancel: () => void;
}) {
  const isEdit = initialData !== null;
  const [form, setForm] = useState<RowData>(() =>
    isEdit ? { ...initialData } : Object.fromEntries(config.fields.map(f => [f.key, ""]))
  );

  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #DDE3EC", borderRadius: 4, fontSize: 12.5, fontFamily: "Inter", color: "#1A2436", background: "#fff", outline: "none", boxSizing: "border-box" };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
        <button onClick={onCancel}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter", padding: "4px 6px", borderRadius: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F0F3F7"; e.currentTarget.style.color = "#1B6CA8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#6B7280"; }}
        >
          ← Back
        </button>
        <span style={{ color: "#DDE3EC" }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>
          {isEdit ? "Edit" : "Add New"} — {config.label}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 32px" }}>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px", maxWidth: 800 }}>
            {config.fields.map(f => (
              <div key={f.key} style={f.span ? { gridColumn: "1 / -1" } : {}}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 5, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {f.label}{f.required && <span style={{ color: "#C62828" }}> *</span>}
                </label>
                {f.type === "select" ? (
                  <select value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} style={inp} required={f.required}>
                    <option value="">— Select —</option>
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} style={{ ...inp, height: 72, resize: "vertical" }} rows={3} />
                ) : (
                  <input type={f.type ?? "text"} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} style={inp} required={f.required} />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 28, paddingTop: 20, borderTop: "1px solid #EEF1F6", maxWidth: 800 }}>
            <button type="submit"
              style={{ padding: "8px 22px", background: "#1B6CA8", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#155a8a")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}
            >
              {isEdit ? "Update Record" : "Save Record"}
            </button>
            <button type="button" onClick={onCancel}
              style={{ padding: "8px 18px", background: "#fff", color: "#6B7280", border: "1px solid #DDE3EC", borderRadius: 4, fontSize: 13, fontFamily: "Inter", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Masters ──────────────────────────────────────────────────────────────────

export default function Masters() {
  const [activeId, setActiveId] = useState(MASTERS[0].id);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editRow, setEditRow] = useState<RowData | null>(null);
  const [allData, setAllData] = useState<Record<string, RowData[]>>(
    () => Object.fromEntries(MASTERS.map(m => [m.id, [...m.rows]]))
  );

  const config = MASTERS.find(m => m.id === activeId)!;
  const rows = allData[activeId] ?? [];

  function selectMaster(id: string) { setActiveId(id); setView("list"); setEditRow(null); }

  function handleSave(data: RowData) {
    if (view === "edit" && editRow) {
      setAllData(prev => ({ ...prev, [activeId]: (prev[activeId] ?? []).map(r => String(r.id) === String(editRow.id) ? { ...data, id: editRow.id } : r) }));
    } else {
      const newId = `${activeId.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-5)}`;
      setAllData(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), { ...data, id: newId }] }));
    }
    setView("list");
    setEditRow(null);
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, background: "#fff", borderRadius: 6, overflow: "hidden", border: "1px solid #E8ECF4" }}>

      {/* Left nav */}
      <aside style={{ width: 218, minWidth: 218, flexShrink: 0, borderRight: "1px solid #E8ECF4", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>Masters & Configuration</div>
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>{MASTERS.length} master tables</div>
        </div>
        <nav style={{ flex: 1, paddingBottom: 16 }}>
          {MASTER_GROUPS.map(group => {
            const items = MASTERS.filter(m => m.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id}>
                <div style={{ padding: "10px 16px 4px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter" }}>
                  {group.label}
                </div>
                {items.map(m => {
                  const isActive = activeId === m.id;
                  return (
                    <button key={m.id} onClick={() => selectMaster(m.id)}
                      style={{ width: "100%", padding: "7px 16px", textAlign: "left", background: isActive ? "#EFF6FF" : "transparent", color: isActive ? "#1B6CA8" : "#4B5563", fontSize: 12.5, fontFamily: "Inter", fontWeight: isActive ? 600 : 400, border: "none", borderLeft: isActive ? "3px solid #1B6CA8" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, transition: "background 0.1s" }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.navLabel}</span>
                      <span style={{ fontSize: 10, color: isActive ? "#1B6CA8" : "#C8CDD8", fontFamily: "JetBrains Mono", flexShrink: 0 }}>
                        {(allData[m.id] ?? []).length}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Right content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        {view === "list" ? (
          <MasterTable
            config={config} rows={rows}
            onAdd={() => { setEditRow(null); setView("add"); }}
            onEdit={r => { setEditRow(r); setView("edit"); }}
            onDelete={id => setAllData(prev => ({ ...prev, [activeId]: (prev[activeId] ?? []).filter(r => String(r.id) !== id) }))}
          />
        ) : (
          <MasterForm
            config={config}
            initialData={view === "edit" ? editRow : null}
            onSave={handleSave}
            onCancel={() => { setView("list"); setEditRow(null); }}
          />
        )}
      </div>
    </div>
  );
}
