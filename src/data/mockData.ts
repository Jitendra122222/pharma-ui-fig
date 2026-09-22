export const drugs = [
  { id: 1, name: "Amoxicillin 500mg", category: "Antibiotics", stock: 240, minStock: 50, unit: "Capsules", price: 0.85, cost: 0.45, expiry: "2026-08-15", supplier: "MedLine Pharma", location: "A1-02", status: "In Stock" },
  { id: 2, name: "Metformin 1000mg", category: "Antidiabetics", stock: 18, minStock: 30, unit: "Tablets", price: 0.32, cost: 0.18, expiry: "2025-12-31", supplier: "GenPharm Ltd", location: "B3-05", status: "Low Stock" },
  { id: 3, name: "Lisinopril 10mg", category: "Antihypertensives", stock: 0, minStock: 40, unit: "Tablets", price: 0.56, cost: 0.28, expiry: "2026-03-20", supplier: "PharmaCo Inc", location: "B2-01", status: "Out of Stock" },
  { id: 4, name: "Atorvastatin 20mg", category: "Statins", stock: 312, minStock: 60, unit: "Tablets", price: 0.78, cost: 0.38, expiry: "2027-01-10", supplier: "MedLine Pharma", location: "C1-04", status: "In Stock" },
  { id: 5, name: "Omeprazole 20mg", category: "Antacids", stock: 145, minStock: 50, unit: "Capsules", price: 0.62, cost: 0.31, expiry: "2026-09-05", supplier: "BioPharm AG", location: "A2-08", status: "In Stock" },
  { id: 6, name: "Salbutamol Inhaler", category: "Bronchodilators", stock: 28, minStock: 25, unit: "Inhaler", price: 8.50, cost: 4.20, expiry: "2026-06-30", supplier: "RespiCare Ltd", location: "D1-01", status: "In Stock" },
  { id: 7, name: "Paracetamol 500mg", category: "Analgesics", stock: 1200, minStock: 200, unit: "Tablets", price: 0.08, cost: 0.04, expiry: "2027-05-15", supplier: "GenPharm Ltd", location: "A3-01", status: "In Stock" },
  { id: 8, name: "Ciprofloxacin 500mg", category: "Antibiotics", stock: 12, minStock: 40, unit: "Tablets", price: 1.20, cost: 0.65, expiry: "2025-11-20", supplier: "PharmaCo Inc", location: "A1-06", status: "Low Stock" },
  { id: 9, name: "Amlodipine 5mg", category: "Antihypertensives", stock: 380, minStock: 60, unit: "Tablets", price: 0.45, cost: 0.22, expiry: "2026-11-30", supplier: "MedLine Pharma", location: "B2-03", status: "In Stock" },
  { id: 10, name: "Insulin Glargine", category: "Hormones", stock: 45, minStock: 20, unit: "Vial", price: 42.00, cost: 28.00, expiry: "2025-10-15", supplier: "BioPharm AG", location: "COLD-01", status: "In Stock" },
  { id: 11, name: "Warfarin 5mg", category: "Anticoagulants", stock: 6, minStock: 30, unit: "Tablets", price: 0.95, cost: 0.52, expiry: "2026-04-01", supplier: "PharmaCo Inc", location: "B4-02", status: "Low Stock" },
  { id: 12, name: "Sertraline 50mg", category: "Antidepressants", stock: 220, minStock: 40, unit: "Tablets", price: 0.88, cost: 0.44, expiry: "2027-02-20", supplier: "MedLine Pharma", location: "C2-07", status: "In Stock" },
];

export const patients = [
  { id: "P-001", name: "Margaret Thompson", dob: "1958-03-14", gender: "F", phone: "+1 (555) 201-4432", bloodGroup: "A+", allergies: ["Penicillin", "Sulfa"], lastVisit: "2025-07-12", prescriptions: 8, balance: 0.00 },
  { id: "P-002", name: "Robert Kiefer", dob: "1972-11-28", gender: "M", phone: "+1 (555) 308-9921", bloodGroup: "O-", allergies: [], lastVisit: "2025-07-20", prescriptions: 3, balance: 14.50 },
  { id: "P-003", name: "Amara Nwosu", dob: "1990-06-05", gender: "F", phone: "+1 (555) 441-7723", bloodGroup: "B+", allergies: ["Aspirin"], lastVisit: "2025-07-25", prescriptions: 2, balance: 0.00 },
  { id: "P-004", name: "David Okafor", dob: "1965-09-17", gender: "M", phone: "+1 (555) 122-6644", bloodGroup: "AB+", allergies: ["Codeine"], lastVisit: "2025-07-18", prescriptions: 12, balance: 8.75 },
  { id: "P-005", name: "Elena Vasquez", dob: "1983-02-22", gender: "F", phone: "+1 (555) 567-3312", bloodGroup: "O+", allergies: [], lastVisit: "2025-07-28", prescriptions: 5, balance: 0.00 },
  { id: "P-006", name: "James Whitfield", dob: "1948-07-30", gender: "M", phone: "+1 (555) 789-0011", bloodGroup: "A-", allergies: ["Penicillin", "NSAIDs"], lastVisit: "2025-07-10", prescriptions: 15, balance: 32.00 },
  { id: "P-007", name: "Sofia Lindqvist", dob: "2001-04-11", gender: "F", phone: "+1 (555) 334-8891", bloodGroup: "B-", allergies: [], lastVisit: "2025-07-22", prescriptions: 1, balance: 0.00 },
  { id: "P-008", name: "Marcus Adeyemi", dob: "1977-12-03", gender: "M", phone: "+1 (555) 678-2209", bloodGroup: "O+", allergies: ["Morphine"], lastVisit: "2025-07-15", prescriptions: 6, balance: 0.00 },
];

export const prescriptions = [
  { id: "RX-20250728-001", patient: "Margaret Thompson", patientId: "P-001", doctor: "Dr. Sarah Chen", date: "2025-07-28", status: "Dispensed", items: [{ drug: "Amoxicillin 500mg", qty: 21, days: 7 }, { drug: "Paracetamol 500mg", qty: 30, days: 10 }], total: 20.25 },
  { id: "RX-20250728-002", patient: "Robert Kiefer", patientId: "P-002", doctor: "Dr. Ahmed Hassan", date: "2025-07-28", status: "Pending", items: [{ drug: "Metformin 1000mg", qty: 60, days: 30 }], total: 19.20 },
  { id: "RX-20250727-001", patient: "David Okafor", patientId: "P-004", doctor: "Dr. Maria Santos", date: "2025-07-27", status: "Dispensed", items: [{ drug: "Amlodipine 5mg", qty: 30, days: 30 }, { drug: "Atorvastatin 20mg", qty: 30, days: 30 }], total: 37.80 },
  { id: "RX-20250727-002", patient: "Elena Vasquez", patientId: "P-005", doctor: "Dr. Sarah Chen", date: "2025-07-27", status: "Dispensed", items: [{ drug: "Sertraline 50mg", qty: 30, days: 30 }], total: 26.40 },
  { id: "RX-20250726-001", patient: "James Whitfield", patientId: "P-006", doctor: "Dr. Ahmed Hassan", date: "2025-07-26", status: "Partial", items: [{ drug: "Warfarin 5mg", qty: 30, days: 30 }, { drug: "Lisinopril 10mg", qty: 30, days: 30 }], total: 44.70 },
  { id: "RX-20250725-001", patient: "Amara Nwosu", patientId: "P-003", doctor: "Dr. Maria Santos", date: "2025-07-25", status: "Dispensed", items: [{ drug: "Salbutamol Inhaler", qty: 1, days: 30 }], total: 8.50 },
  { id: "RX-20250724-001", patient: "Marcus Adeyemi", patientId: "P-008", doctor: "Dr. Sarah Chen", date: "2025-07-24", status: "Cancelled", items: [{ drug: "Ciprofloxacin 500mg", qty: 14, days: 7 }], total: 16.80 },
  { id: "RX-20250723-001", patient: "Sofia Lindqvist", patientId: "P-007", doctor: "Dr. Ahmed Hassan", date: "2025-07-23", status: "Dispensed", items: [{ drug: "Omeprazole 20mg", qty: 30, days: 30 }], total: 18.60 },
];

export const suppliers = [
  { id: "SUP-001", name: "MedLine Pharma", contact: "John Harrison", email: "orders@medlinepharma.com", phone: "+1 (800) 555-1200", address: "2400 Industrial Blvd, Chicago, IL 60601", products: 145, lastOrder: "2025-07-20", balance: -3420.00, status: "Active", rating: 4.8, notifyChannel: "Email" as const },
  { id: "SUP-002", name: "GenPharm Ltd", contact: "Lisa Nakamura", email: "supply@genpharm.co", phone: "+1 (800) 555-3400", address: "88 Pharma Way, Boston, MA 02101", products: 82, lastOrder: "2025-07-15", balance: 0.00, status: "Active", rating: 4.5, notifyChannel: "WhatsApp" as const },
  { id: "SUP-003", name: "PharmaCo Inc", contact: "Carlos Rivera", email: "b2b@pharmacoinc.com", phone: "+1 (800) 555-5600", address: "1200 Health Drive, Dallas, TX 75201", products: 210, lastOrder: "2025-07-22", balance: -1850.00, status: "Active", rating: 4.2, notifyChannel: "WhatsApp" as const },
  { id: "SUP-004", name: "BioPharm AG", contact: "Inga Müller", email: "orders@biopharm.ag", phone: "+49 30 555 7800", address: "Hauptstraße 45, 10115 Berlin, Germany", products: 38, lastOrder: "2025-07-08", balance: 0.00, status: "Active", rating: 4.9, notifyChannel: "Email" as const },
  { id: "SUP-005", name: "RespiCare Ltd", contact: "Priya Sharma", email: "sales@respicare.co.uk", phone: "+44 20 7946 0000", address: "12 Medical Quarter, London EC1A 1BB", products: 24, lastOrder: "2025-06-30", balance: -620.00, status: "Active", rating: 4.6, notifyChannel: "Email" as const },
];

export const purchaseOrders = [
  { id: "PO-2025-0142", supplier: "MedLine Pharma", date: "2025-07-22", expected: "2025-07-29", status: "Delivered", items: 8, total: 2840.50 },
  { id: "PO-2025-0141", supplier: "GenPharm Ltd", date: "2025-07-18", expected: "2025-07-25", status: "In Transit", items: 4, total: 1280.00 },
  { id: "PO-2025-0140", supplier: "PharmaCo Inc", date: "2025-07-15", expected: "2025-07-22", status: "Delivered", items: 12, total: 4120.75 },
  { id: "PO-2025-0139", supplier: "BioPharm AG", date: "2025-07-10", expected: "2025-07-24", status: "Pending Approval", items: 3, total: 6840.00 },
  { id: "PO-2025-0138", supplier: "RespiCare Ltd", date: "2025-07-08", expected: "2025-07-15", status: "Delivered", items: 2, total: 620.00 },
  { id: "PO-2025-0137", supplier: "MedLine Pharma", date: "2025-07-04", expected: "2025-07-11", status: "Delivered", items: 15, total: 5200.00 },
];

export const salesData = [
  { month: "Feb", revenue: 28400, cost: 14200, profit: 14200 },
  { month: "Mar", revenue: 31200, cost: 15600, profit: 15600 },
  { month: "Apr", revenue: 29800, cost: 14900, profit: 14900 },
  { month: "May", revenue: 34500, cost: 17250, profit: 17250 },
  { month: "Jun", revenue: 38200, cost: 19100, profit: 19100 },
  { month: "Jul", revenue: 41800, cost: 20900, profit: 20900 },
];

export const categoryData = [
  { name: "Antibiotics", value: 22 },
  { name: "Antidiabetics", value: 18 },
  { name: "Antihypertensives", value: 16 },
  { name: "Analgesics", value: 14 },
  { name: "Statins", value: 12 },
  { name: "Other", value: 18 },
];

export const recentTransactions = [
  { id: "TXN-8821", time: "14:32", patient: "Margaret Thompson", items: 2, total: 20.25, method: "Card" },
  { id: "TXN-8820", time: "13:58", patient: "Walk-in Customer", items: 1, total: 8.50, method: "Cash" },
  { id: "TXN-8819", time: "13:21", patient: "David Okafor", items: 3, total: 37.80, method: "Insurance" },
  { id: "TXN-8818", time: "12:47", patient: "Elena Vasquez", items: 1, total: 26.40, method: "Card" },
  { id: "TXN-8817", time: "12:10", patient: "Walk-in Customer", items: 4, total: 12.80, method: "Cash" },
];

export const dailySalesData = [
  { hour: "08:00", sales: 3 }, { hour: "09:00", sales: 8 }, { hour: "10:00", sales: 12 },
  { hour: "11:00", sales: 15 }, { hour: "12:00", sales: 9 }, { hour: "13:00", sales: 7 },
  { hour: "14:00", sales: 18 }, { hour: "15:00", sales: 22 }, { hour: "16:00", sales: 14 },
  { hour: "17:00", sales: 11 }, { hour: "18:00", sales: 6 }, { hour: "19:00", sales: 2 },
];
