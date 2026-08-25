import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  SEED_ITEMS,
  SEED_MOVEMENTS,
  SEED_POS,
  SEED_PICKS,
  SEED_TRANSFERS,
  SEED_USERS,
  CATEGORIES,
  UNITS,
  SUPPLIERS,
  available,
  buildAlerts,
  statusOf,
  supById,
  type Alert,
  type Db,
  type Item,
  type Movement,
  type StockStatus,
  type UserRec,
  type ViewId,
} from "./data";

export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "err" | "info" | "warn";
}

export interface InvFilters {
  q: string;
  cat: string; // '' = all
  zone: string;
  status: "" | StockStatus;
  sup: string;
}

export const EMPTY_FILTERS: InvFilters = { q: "", cat: "", zone: "", status: "", sup: "" };

export interface SavedView {
  id: string;
  name: string;
  f: InvFilters;
}

interface Store {
  db: Db;
  ready: boolean;

  view: ViewId;
  nav: (v: ViewId) => void;
  panelSku: string | null;
  openItem: (sku: string) => void;
  closeItem: () => void;

  invQuery: string;
  setInvQuery: (q: string) => void;
  invPreset: InvFilters | null;
  setInvPreset: (f: InvFilters | null) => void;
  recvPoId: string | null;
  setRecvPoId: (id: string | null) => void;
  shipTab: "picks" | "transfer";
  setShipTab: (t: "picks" | "transfer") => void;

  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dropToast: (id: number) => void;

  flash: Set<string>;
  hasFlash: (sku: string) => boolean;

  alerts: Alert[];
  dismissAlert: (id: string) => void;
  dismissedCount: number;
  restoreAlerts: () => void;

  savedViews: SavedView[];
  addSavedView: (name: string, f: InvFilters) => void;
  removeSavedView: (id: string) => void;

  itemBySku: (sku: string) => Item | undefined;
  movementsFor: (sku: string) => Movement[];

  adjustStock: (sku: string, delta: number, reason: string) => void;
  transferStock: (sku: string, qty: number, toBin: string) => void;
  receiveLine: (poId: string, sku: string, qty: number, bin: string) => void;
  pickUnits: (pickId: string, sku: string, qty: number) => void;
  shipPick: (pickId: string) => void;
  reorder: (sku: string) => void;
  markTransfer: (id: string) => void;

  setUserRole: (id: string, role: UserRec["role"]) => void;
  toggleUser: (id: string) => void;
  patchPrefs: (p: Partial<Pick<Db, "safetyDays" | "alertLevel">>) => void;
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
  addUnit: (u: string) => void;
  removeUnit: (u: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("store missing");
  return s;
}

const SEED_VIEWS: SavedView[] = [
  { id: "sv-1", name: "Critical only", f: { ...EMPTY_FILTERS, status: "crit" } },
  { id: "sv-2", name: "Raw Steel yard", f: { ...EMPTY_FILTERS, zone: "A" } },
  { id: "sv-3", name: "Electrical · low+", f: { ...EMPTY_FILTERS, zone: "D", status: "low" } },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>({
    items: SEED_ITEMS,
    movements: SEED_MOVEMENTS,
    pos: SEED_POS,
    picks: SEED_PICKS,
    transfers: SEED_TRANSFERS,
    users: SEED_USERS,
    categories: CATEGORIES,
    units: UNITS,
    safetyDays: 3,
    alertLevel: "critlow",
  });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewId>("dashboard");
  const [panelSku, setPanelSku] = useState<string | null>(null);
  const [invQuery, setInvQuery] = useState("");
  const [invPreset, setInvPreset] = useState<InvFilters | null>(null);
  const [recvPoId, setRecvPoId] = useState<string | null>(null);
  const [shipTab, setShipTab] = useState<"picks" | "transfer">("picks");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<SavedView[]>(SEED_VIEWS);
  const mvId = useRef(920);
  const toastId = useRef(1);
  const poSeq = useRef(2230);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const toast = (msg: string, kind: Toast["kind"] = "ok") => {
    const id = toastId.current++;
    setToasts((ts) => [...ts.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4200);
  };

  const doFlash = (sku: string) => {
    setFlash((f) => new Set(f).add(sku));
    setTimeout(() => {
      setFlash((f) => {
        const n = new Set(f);
        n.delete(sku);
        return n;
      });
    }, 1400);
  };

  const pushMv = (sku: string, kind: Movement["kind"], q: number, ref: string, from?: string, to?: string): Movement => ({
    id: `MV-${mvId.current++}`,
    ts: Date.now(),
    sku,
    kind,
    qty: q,
    ref,
    user: "R. Vance",
    from,
    to,
  });

  /* ---------------- inventory actions ---------------- */

  const adjustStock = (sku: string, delta: number, reason: string) => {
    setDb((d) => ({
      ...d,
      items: d.items.map((i) => (i.sku === sku ? { ...i, onHand: Math.max(0, i.onHand + delta), lastCountH: 0 } : i)),
      movements: [pushMv(sku, "ADJ", delta, reason), ...d.movements],
    }));
    doFlash(sku);
    toast(`${sku} adjusted ${delta > 0 ? "+" : ""}${delta} · ${reason}`);
  };

  const transferStock = (sku: string, q: number, toBin: string) => {
    let from = "";
    setDb((d) => {
      const item = d.items.find((i) => i.sku === sku);
      from = item?.bin ?? "";
      return {
        ...d,
        items: d.items.map((i) => (i.sku === sku ? { ...i, bin: toBin } : i)),
        movements: [pushMv(sku, "XFER", q, `TR-${53 + d.transfers.length}`, from, toBin), ...d.movements],
        transfers: [
          { id: `TR-${53 + d.transfers.length}`, sku, qty: q, from, to: toBin, ts: Date.now(), status: "done", user: "R. Vance" },
          ...d.transfers,
        ],
      };
    });
    doFlash(sku);
    toast(`${sku} moved ${from} → ${toBin}`);
  };

  const receiveLine = (poId: string, sku: string, q: number, bin: string) => {
    setDb((d) => {
      const pos = d.pos.map((p) =>
        p.id === poId
          ? { ...p, lines: p.lines.map((l) => (l.sku === sku ? { ...l, rcv: Math.min(l.ord, l.rcv + q) } : l)) }
          : p
      );
      return {
        ...d,
        pos,
        items: d.items.map((i) => (i.sku === sku ? { ...i, onHand: i.onHand + q, bin } : i)),
        movements: [pushMv(sku, "IN", q, poId, "Dock 1", bin), ...d.movements],
      };
    });
    doFlash(sku);
    toast(`Received ${q} × ${sku} against ${poId}`);
  };

  const pickUnits = (pickId: string, sku: string, q: number) => {
    setDb((d) => ({
      ...d,
      picks: d.picks.map((p) =>
        p.id === pickId
          ? { ...p, lines: p.lines.map((l) => (l.sku === sku ? { ...l, pick: Math.min(l.req, l.pick + q) } : l)) }
          : p
      ),
    }));
    doFlash(sku);
    toast(`Picked ${q} × ${sku} for ${pickId}`);
  };

  const shipPick = (pickId: string) => {
    const pick = db.picks.find((p) => p.id === pickId);
    if (!pick) return;
    const shipped = pick.lines.filter((l) => l.pick > 0);
    const short = pick.lines.reduce((a, l) => a + (l.req - l.pick), 0);
    setDb((d) => ({
      ...d,
      picks: d.picks.map((p) => (p.id === pickId ? { ...p, status: "shipped" } : p)),
      items: d.items.map((i) => {
        const l = pick.lines.find((x) => x.sku === i.sku);
        return l && l.pick > 0 ? { ...i, onHand: Math.max(0, i.onHand - l.pick), alloc: Math.max(0, i.alloc - l.pick) } : i;
      }),
      movements: [
        ...shipped.map((l) => pushMv(l.sku, "OUT", l.pick, pickId, undefined, pick.dest)),
        ...d.movements,
      ],
    }));
    shipped.forEach((l) => doFlash(l.sku));
    toast(`${pickId} shipped to ${pick.dest}${short > 0 ? ` · ${short} short` : ""}`, short > 0 ? "warn" : "ok");
  };

  const reorder = (sku: string) => {
    const item = db.items.find((i) => i.sku === sku);
    if (!item) return;
    const lead = supById(item.sup)?.leadDays ?? 10;
    const suggested = Math.max(item.rp * 2 - available(item), Math.ceil(item.dailyUse * (lead + db.safetyDays)));
    const id = `PO-${poSeq.current++}`;
    setDb((d) => ({
      ...d,
      pos: [{ id, sup: item.sup, etaDays: lead, draft: true, lines: [{ sku, ord: suggested, rcv: 0 }] }, ...d.pos],
    }));
    toast(`Draft ${id} raised · ${suggested} ${item.unit} from ${supById(item.sup)?.name}`, "info");
  };

  const markTransfer = (id: string) => {
    setDb((d) => ({ ...d, transfers: d.transfers.map((t) => (t.id === id ? { ...t, status: "done" } : t)) }));
    toast(`${id} confirmed at destination`);
  };

  /* ---------------- admin actions ---------------- */

  const setUserRole = (id: string, role: UserRec["role"]) =>
    setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
  const toggleUser = (id: string) =>
    setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) }));
  const patchPrefs = (p: Partial<Pick<Db, "safetyDays" | "alertLevel">>) => setDb((d) => ({ ...d, ...p }));
  const addCategory = (c: string) =>
    setDb((d) => (d.categories.includes(c) ? d : { ...d, categories: [...d.categories, c] }));
  const removeCategory = (c: string) => setDb((d) => ({ ...d, categories: d.categories.filter((x) => x !== c) }));
  const addUnit = (u: string) => setDb((d) => (d.units.includes(u) ? d : { ...d, units: [...d.units, u] }));
  const removeUnit = (u: string) => setDb((d) => ({ ...d, units: d.units.filter((x) => x !== u) }));

  /* ---------------- derived ---------------- */

  const alerts = useMemo(() => buildAlerts(db, dismissed), [db, dismissed]);

  const value: Store = {
    db,
    ready,
    view,
    nav: (v) => setView(v),
    panelSku,
    openItem: (sku) => setPanelSku(sku),
    closeItem: () => setPanelSku(null),
    invQuery,
    setInvQuery,
    invPreset,
    setInvPreset,
    recvPoId,
    setRecvPoId,
    shipTab,
    setShipTab,
    toasts,
    toast,
    dropToast: (id) => setToasts((ts) => ts.filter((t) => t.id !== id)),
    flash,
    hasFlash: (sku) => flash.has(sku),
    alerts,
    dismissAlert: (id) => {
      setDismissed((s) => new Set(s).add(id));
      toast("Alert dismissed", "info");
    },
    dismissedCount: dismissed.size,
    restoreAlerts: () => {
      setDismissed(new Set());
      toast("All alerts restored", "info");
    },
    savedViews,
    addSavedView: (name, f) => {
      setSavedViews((v) => [...v, { id: `sv-${Date.now()}`, name, f }]);
      toast(`View “${name}” saved`);
    },
    removeSavedView: (id) => setSavedViews((v) => v.filter((x) => x.id !== id)),
    itemBySku: (sku) => db.items.find((i) => i.sku === sku),
    movementsFor: (sku) => db.movements.filter((m) => m.sku === sku),
    adjustStock,
    transferStock,
    receiveLine,
    pickUnits,
    shipPick,
    reorder,
    markTransfer,
    setUserRole,
    toggleUser,
    patchPrefs,
    addCategory,
    removeCategory,
    addUnit,
    removeUnit,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* convenience for views that only need status ordering */
export const statusRank = (s: StockStatus) => (s === "crit" ? 2 : s === "low" ? 1 : 0);
export { statusOf, available };
