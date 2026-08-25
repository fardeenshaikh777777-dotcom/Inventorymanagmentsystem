import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { matchItem, statusOf, type ViewId } from "./lib/data";
import { StatusDot, cn } from "./components/ui";
import {
  IcBarcode,
  IcBell,
  IcBox,
  IcChart,
  IcFactory,
  IcGear,
  IcGrid,
  IcMap,
  IcSearch,
  IcTrayIn,
  IcTruck,
} from "./components/icons";
import Dashboard from "./views/Dashboard";
import Inventory from "./views/Inventory";
import Receiving from "./views/Receiving";
import Shipments from "./views/Shipments";
import Locations from "./views/Locations";
import Suppliers from "./views/Suppliers";
import Reports from "./views/Reports";
import Alerts from "./views/Alerts";
import Settings from "./views/Settings";
import ItemPanel from "./views/ItemPanel";
import { ToastHost } from "./components/ui";

const NAV: { id: ViewId; label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: (p) => <IcGrid {...p} /> },
  { id: "inventory", label: "Inventory", icon: (p) => <IcBox {...p} /> },
  { id: "receiving", label: "Receiving", icon: (p) => <IcTrayIn {...p} /> },
  { id: "shipments", label: "Shipments", icon: (p) => <IcTruck {...p} /> },
  { id: "locations", label: "Locations", icon: (p) => <IcMap {...p} /> },
  { id: "suppliers", label: "Suppliers", icon: (p) => <IcFactory {...p} /> },
  { id: "reports", label: "Reports", icon: (p) => <IcChart {...p} /> },
  { id: "alerts", label: "Alerts", icon: (p) => <IcBell {...p} /> },
  { id: "settings", label: "Settings", icon: (p) => <IcGear {...p} /> },
];

const TITLES: Record<ViewId, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  receiving: "Receiving",
  shipments: "Shipments",
  locations: "Locations",
  suppliers: "Suppliers",
  reports: "Reports",
  alerts: "Alerts",
  settings: "Settings",
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden text-right leading-tight md:block" aria-label="Terminal clock">
      <p className="mono text-[13px] font-semibold tracking-wide">
        {now.toLocaleTimeString("en-US", { hour12: false })}
      </p>
      <p className="mono text-[9.5px] text-faint">
        {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase()} · SHIFT B
      </p>
    </div>
  );
}

function GlobalSearch() {
  const { db, openItem, nav, setInvQuery } = useStore();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
      if (e.key === "/") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
        return;
      }
      if (e.key.length === 1) ref.current?.focus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const results = useMemo(() => (q.trim() ? db.items.filter((i) => matchItem(i, q)).slice(0, 8) : []), [q, db.items]);
  const exact = db.items.find((i) => i.sku.toLowerCase() === q.trim().toLowerCase());
  const showDrop = focused && q.trim().length > 0;

  const commit = (sku?: string) => {
    const target = sku ?? results[active]?.sku ?? exact?.sku;
    if (target) {
      openItem(target);
    } else if (q.trim()) {
      setInvQuery(q.trim());
      nav("inventory");
    }
    setQ("");
    setActive(0);
    ref.current?.blur();
  };

  return (
    <div className="relative min-w-0 flex-1 max-w-[520px]">
      <IcSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        id="global-search"
        ref={ref}
        className="mono h-9 w-full rounded border border-line bg-paper/70 pl-8 pr-16 text-[12.5px] font-medium text-ink placeholder:font-sans placeholder:text-faint transition-all focus:border-sig focus:bg-surface focus:outline-none focus:ring-2 focus:ring-sig/20"
        placeholder="Scan or search SKU · batch · bin…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Escape") {
            setQ("");
            ref.current?.blur();
          }
        }}
        aria-label="Global search — scan a barcode or type a SKU"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="kbd absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">/</span>

      {showDrop && (
        <div className="anim-rise absolute left-0 right-0 top-[42px] z-40 card overflow-hidden p-1 shadow-[0_16px_48px_rgba(27,34,43,0.18)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[12.5px] text-mut">
              No match for <span className="mono font-semibold text-ink">“{q.trim()}”</span> — check the label and scan again, or press{" "}
              <span className="kbd">Enter</span> to search inventory text.
            </p>
          ) : (
            <ul role="listbox" aria-label="Search results">
              {results.map((i, idx) => (
                <li key={i.sku} role="option" aria-selected={idx === active}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors",
                      idx === active ? "bg-sigwash" : "hover:bg-paper"
                    )}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => commit(i.sku)}
                  >
                    <StatusDot status={statusOf(i)} />
                    <span className="mono text-[12.5px] font-bold">{i.sku}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-mut">{i.name}</span>
                    <span className="mono shrink-0 text-[10.5px] text-faint">{i.bin}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line/70 px-3 py-1.5">
            <p className="text-[10.5px] text-faint">
              <span className="kbd">↑↓</span> select · <span className="kbd">Enter</span> open · scanner auto-submits
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { view, nav, alerts } = useStore();
  const [railOpen, setRailOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1100 : true));

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1099px)");
    const apply = () => setRailOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      {/* ---------------- left rail ---------------- */}
      <nav
        className={cn("relative z-30 flex shrink-0 flex-col bg-rail text-railtext transition-[width] duration-200", railOpen ? "w-[228px]" : "w-[64px]")}
        aria-label="Primary navigation"
      >
        <div className={cn("flex h-[54px] items-center border-b border-white/8", railOpen ? "justify-between gap-2.5 px-3.5" : "justify-center px-0")}>
          {railOpen && (
            <>
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sig text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M6 20V4h13v3.6h-8.6v3h6.8V14h-6.8v6z" />
                  </svg>
                </span>
                <span className="leading-none">
                  <span className="block text-[13px] font-bold tracking-[0.14em] text-white">FORGELINE</span>
                  <span className="mono mt-0.5 block text-[9px] tracking-wider text-railtext">IMS · PLANT 02</span>
                </span>
              </span>
              <button
                className="rounded p-1 text-railtext transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setRailOpen(false)}
                aria-label="Collapse navigation rail"
                title="Collapse"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m11 7-5 5 5 5" />
                  <path d="m18 7-5 5 5 5" />
                </svg>
              </button>
            </>
          )}
          {!railOpen && (
            <button
              className="rounded p-1.5 text-railtext transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setRailOpen(true)}
              aria-label="Expand navigation rail"
              title="Expand"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m13 7 5 5-5 5" />
                <path d="m6 7 5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
        {!railOpen && (
          <div className="flex justify-center py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-sig text-white" title="Forgeline IMS · Plant 02">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M6 20V4h13v3.6h-8.6v3h6.8V14h-6.8v6z" />
              </svg>
            </span>
          </div>
        )}

        <div className="scroll-thin flex-1 overflow-y-auto py-3">
          {NAV.map((n) => {
            const active = view === n.id;
            const badge = n.id === "alerts" && alerts.length > 0 ? alerts.length : null;
            return (
              <button
                key={n.id}
                onClick={() => nav(n.id)}
                title={railOpen ? undefined : n.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative mx-2 my-0.5 flex items-center gap-3 rounded px-2.5 py-2 text-[13px] font-medium transition-all",
                  active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
                  !railOpen && "justify-center px-0"
                )}
              >
                {active && <span className="absolute inset-y-1 left-[-8px] w-[3px] rounded-r bg-sig" />}
                <span className={cn("shrink-0", active ? "text-sig" : "")} style={active ? { color: "#7FA8E0" } : undefined}>
                  {n.icon({ className: "w-5 h-5" })}
                </span>
                {railOpen && <span className="flex-1 text-left">{n.label}</span>}
                {badge !== null && (
                  <span
                    className={cn(
                      "mono flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      railOpen ? "bg-crit text-white" : "absolute right-1 top-0.5 bg-crit text-white"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={cn("border-t border-white/8 px-4 py-3", !railOpen && "px-0 text-center")}>
          {railOpen ? (
            <div className="flex items-center gap-2.5">
              <span className="led h-2 w-2 shrink-0 rounded-full bg-ok shadow-[0_0_0_3px_rgba(31,138,95,0.2)]" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[11.5px] font-semibold text-white">Line 2 · running</p>
                <p className="mono text-[9.5px] text-railtext">TERMINAL 04 · AISLE C</p>
              </div>
            </div>
          ) : (
            <span className="led mx-auto block h-2 w-2 rounded-full bg-ok shadow-[0_0_0_3px_rgba(31,138,95,0.2)]" title="Line 2 · running" />
          )}
        </div>
      </nav>

      {/* ---------------- main column ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[54px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
          <span className="mono hidden w-[92px] shrink-0 text-[10.5px] font-semibold tracking-[0.12em] text-faint lg:block">
            {TITLES[view].toUpperCase()}
          </span>
          <GlobalSearch />
          <button
            className="hidden h-9 items-center gap-2 rounded bg-sig px-3.5 text-[13px] font-semibold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] transition-colors hover:bg-sigdark sm:inline-flex"
            onClick={() => {
              const el = document.getElementById("global-search") as HTMLInputElement | null;
              el?.focus();
              el?.select();
            }}
          >
            <IcBarcode className="h-4 w-4" />
            Scan
          </button>
          <button
            className="relative rounded p-2 text-mut transition-colors hover:bg-paper hover:text-ink"
            onClick={() => nav("alerts")}
            aria-label={`Alerts — ${alerts.length} open`}
            title="Alerts"
          >
            <IcBell className="h-5 w-5" />
            {alerts.length > 0 && (
              <span className="mono absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-crit px-1 text-[9.5px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>
          <span className="hidden h-6 w-px bg-line sm:block" />
          <Clock />
          <span className="hidden h-6 w-px bg-line md:block" />
          <div className="flex items-center gap-2.5" title="Signed in as R. Vance — Supervisor">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">RV</span>
            <span className="hidden leading-tight xl:block">
              <span className="block text-[12.5px] font-semibold">R. Vance</span>
              <span className="mono block text-[9.5px] uppercase tracking-wider text-faint">Supervisor</span>
            </span>
          </div>
        </header>

        <main className="canvas-bg scroll-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 lg:p-5" key={view}>
            {view === "dashboard" && <Dashboard />}
            {view === "inventory" && <Inventory />}
            {view === "receiving" && <Receiving />}
            {view === "shipments" && <Shipments />}
            {view === "locations" && <Locations />}
            {view === "suppliers" && <Suppliers />}
            {view === "reports" && <Reports />}
            {view === "alerts" && <Alerts />}
            {view === "settings" && <Settings />}
          </div>
        </main>
      </div>

      <ItemPanel />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
