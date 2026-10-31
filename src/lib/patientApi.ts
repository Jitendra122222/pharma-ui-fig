/**
 * Patients module API client.
 * Adapters return shapes matching the patients array in mockData.ts.
 */
import { apiFetch } from "./api";

const API = "/api/v1/patients";

// ── API response shapes ───────────────────────────────────────────────────────

interface ApiPatient {
  id: string;
  patient_number: string;
  name: string;
  dob: string | null;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  blood_group: string;
  allergies: string[];
  conditions: string[];
  credit_enabled: boolean;
  credit_limit: string;
  payment_terms: string;
  is_active: boolean;
}

interface ApiPatientList {
  total: number; page: number; page_size: number; items: ApiPatient[];
}

// ── Adapter ───────────────────────────────────────────────────────────────────

function adaptPatient(api: ApiPatient) {
  return {
    id: api.patient_number,
    dbId: api.id,
    name: api.name,
    phone: api.phone,
    dob: api.dob ?? "",
    gender: api.gender,
    bloodGroup: api.blood_group,
    address: `${api.address}${api.city ? ", " + api.city : ""}${api.state ? ", " + api.state : ""}`,
    email: api.email,
    allergies: api.allergies,
    conditions: api.conditions,
    creditEnabled: api.credit_enabled,
    creditLimit: parseFloat(api.credit_limit),
    paymentTerms: api.payment_terms,
    isActive: api.is_active,
    balance: 0,
    prescriptions: 0,
    lastVisit: "",
  };
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchPatients(page = 1, pageSize = 100) {
  const data = await apiFetch<ApiPatientList>(`${API}?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptPatient) };
}

// ── Write payload ─────────────────────────────────────────────────────────────

export interface CreatePatientPayload {
  name: string;
  dob?: string | null;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  blood_group?: string;
  allergies?: string[];
  conditions?: string[];
  credit_enabled?: boolean;
  credit_limit?: number;
  payment_terms?: string;
}

export async function createPatient(payload: CreatePatientPayload) {
  return apiFetch<ApiPatient>(API, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
