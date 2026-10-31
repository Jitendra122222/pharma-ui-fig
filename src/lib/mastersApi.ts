/**
 * Master (lookup) data: dosage forms, routes, categories, manufacturers, units, GST slabs, and a pharmacy's
 * own storage locations / zones / bins / reasons. All dropdown values come from the database through here.
 */
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";

const API = "/api/v1/masters";

export interface MasterItem {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  is_verified?: boolean | null;
  // type-specific
  loose_sell_allowed?: boolean;
  requires_prescription?: boolean;
  is_scheduled?: boolean;
  is_sellable?: boolean;
  manufacturer_type?: string;
  rate?: number;
  location_type?: string;
  is_default?: boolean;
  location_id?: string;
  [k: string]: unknown;
}

export type MasterKey =
  | "dosage_forms" | "routes" | "categories" | "classes" | "manufacturers" | "prescription_statuses"
  | "product_statuses" | "unit_types" | "gst_slabs" | "storage_locations" | "storage_zones" | "storage_bins"
  | "adjustment_reasons" | "transfer_reasons";

export type Masters = Record<MasterKey, MasterItem[]>;

export const EMPTY_MASTERS: Masters = {
  dosage_forms: [], routes: [], categories: [], classes: [], manufacturers: [], prescription_statuses: [],
  product_statuses: [], unit_types: [], gst_slabs: [], storage_locations: [], storage_zones: [], storage_bins: [],
  adjustment_reasons: [], transfer_reasons: [],
};

export async function fetchAllMasters(): Promise<Masters> {
  return { ...EMPTY_MASTERS, ...(await apiFetch<Partial<Masters>>(`${API}/all`)) };
}

export async function createMaster(key: MasterKey, body: Record<string, unknown>): Promise<MasterItem> {
  return apiFetch<MasterItem>(`${API}/${key}`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateMaster(key: MasterKey, id: string, body: Record<string, unknown>): Promise<MasterItem> {
  return apiFetch<MasterItem>(`${API}/${key}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deactivateMaster(key: MasterKey, id: string): Promise<MasterItem> {
  return apiFetch<MasterItem>(`${API}/${key}/${id}`, { method: "DELETE" });
}

export const names = (items: MasterItem[]): string[] => items.map(i => i.name);

export interface MastersState {
  masters: Masters;
  status: "loading" | "ready" | "error";
  error: string;
  reload: () => void;
  /** Add a value and make it available immediately without refetching everything. */
  add: (key: MasterKey, body: Record<string, unknown>) => Promise<MasterItem>;
}

/** Loads every master once for the screen that uses it. */
export function useMasters(): MastersState {
  const [masters, setMasters] = useState<Masters>(EMPTY_MASTERS);
  const [status, setStatus] = useState<MastersState["status"]>("loading");
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    setStatus("loading");
    fetchAllMasters()
      .then(m => { if (live) { setMasters(m); setStatus("ready"); } })
      .catch((e: unknown) => {
        if (live) { setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Could not load lists"); setStatus("error"); }
      });
    return () => { live = false; };
  }, [nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  const add = useCallback(async (key: MasterKey, body: Record<string, unknown>) => {
    const row = await createMaster(key, body);
    setMasters(prev => (prev[key].some(i => i.id === row.id) ? prev : { ...prev, [key]: [...prev[key], row] }));
    return row;
  }, []);

  return { masters, status, error, reload, add };
}
