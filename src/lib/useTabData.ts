import { useCallback, useEffect, useRef, useState } from "react";
import type { Paged } from "./distributorDetailApi";

export interface TabData<T, X = Record<string, never>> {
  rows: T[];
  /** Everything else the response carried (totals etc.); null until the first response. */
  extra: X | null;
  total: number;
  loading: boolean;
  error: string;
  /** Re-run the current query (e.g. after an error). */
  reload: () => void;
}

/**
 * Loads one tab's server-side page of rows.
 *
 * - Nothing is requested until `active` is true, so a tab only hits the backend the first time it is shown.
 * - It re-requests when `key` (the serialised filters / page) changes, and keeps showing the last result
 *   while the next one loads.
 * - A response from a stale request (the user changed a filter or left the page meanwhile) is discarded.
 */
export function useTabData<T, X = Record<string, never>>(
  active: boolean,
  key: string,
  fetcher: () => Promise<Paged<T> & X>,
): TabData<T, X> {
  const [extra, setExtra] = useState<X | null>(null);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!active) return;
    const id = ++latest.current;
    setLoading(true);
    setError("");
    fetcherRef.current()
      .then(r => {
        if (id !== latest.current) return;
        setRows(r.items);
        setTotal(r.total);
        setExtra(r);
      })
      .catch((e: unknown) => {
        if (id !== latest.current) return;
        setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Failed to load");
        setRows([]);
        setTotal(0);
        setExtra(null);
      })
      .finally(() => {
        if (id === latest.current) setLoading(false);
      });
  }, [active, key, nonce]);

  // Invalidate any in-flight request on unmount
  useEffect(() => () => { latest.current++; }, []);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return { rows, extra, total, loading, error, reload };
}

/** Debounce a fast-changing value (search box) so each keystroke does not hit the backend. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Map the UI period dropdown to inclusive YYYY-MM-DD bounds. */
export function periodBounds(range: "daily" | "weekly" | "monthly" | "all"): { dateFrom?: string; dateTo?: string } {
  if (range === "all") return {};
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "daily") return { dateFrom: iso(today), dateTo: iso(today) };
  if (range === "weekly") {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { dateFrom: iso(mon), dateTo: iso(sun) };
  }
  return {
    dateFrom: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
