import { useState } from "react";
import type { UserRec } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, Field, Toggle, cn, inputCls } from "../components/ui";
import { IcCheck, IcPlus, IcUser, IcX } from "../components/icons";

const ROLES: UserRec["role"][] = ["admin", "supervisor", "clerk", "viewer"];
const roleLabel = (r: UserRec["role"]) => r.charAt(0).toUpperCase() + r.slice(1);

export default function Settings() {
  const { db, ready, setUserRole, toggleUser, patchPrefs, addCategory, removeCategory, addUnit, removeUnit, toast } = useStore();
  const [newCat, setNewCat] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [catErr, setCatErr] = useState("");
  const [unitErr, setUnitErr] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saved = () => {
    setSavedAt(new Date().toLocaleTimeString("en-US", { hour12: false }));
  };

  if (!ready) {
    return (
      <div className="anim-rise grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="skel h-[320px]" />
        <div className="skel h-[320px]" />
      </div>
    );
  }

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Settings</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">Terminal configuration · changes apply immediately and are written to the log</p>
        </div>
        <span className="mono flex items-center gap-1.5 text-[11.5px] text-faint">
          {savedAt && (
            <>
              <IcCheck className="h-3.5 w-3.5 text-ok" />
              Saved {savedAt}
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* users & roles */}
        <section className="card" aria-label="Users and roles">
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <IcUser className="h-4 w-4 text-mut" />
            <h2 className="text-[13.5px] font-bold tracking-tight">Users & roles</h2>
            <span className="mono ml-auto text-[10.5px] text-faint">{db.users.filter((u) => u.active).length} active</span>
          </header>
          <ul>
            {db.users.map((u) => (
              <li key={u.id} className={cn("flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-2.5 last:border-0", !u.active && "opacity-55")}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail text-[11px] font-bold text-white">{u.initials}</span>
                <span className="min-w-[110px] flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{u.name}</span>
                  <span className="mono block text-[10.5px] text-faint">{u.id}</span>
                </span>
                <select
                  className={cn(inputCls, "w-[128px]")}
                  value={u.role}
                  onChange={(e) => {
                    setUserRole(u.id, e.target.value as UserRec["role"]);
                    toast(`${u.name} → ${roleLabel(e.target.value as UserRec["role"])}`, "info");
                    saved();
                  }}
                  aria-label={`Role for ${u.name}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
                <Toggle
                  on={u.active}
                  label={`Toggle access for ${u.name}`}
                  onChange={() => {
                    toggleUser(u.id);
                    toast(`${u.name} ${u.active ? "deactivated" : "reactivated"}`, u.active ? "warn" : "ok");
                    saved();
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* reorder policy */}
        <section className="card self-start p-4" aria-label="Reorder policy">
          <h2 className="text-[13.5px] font-bold tracking-tight">Reorder policy</h2>
          <p className="mt-0.5 text-[12px] text-mut">Feeds the reorder engine, stockout forecast and alert thresholds.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Safety stock (days)" hint="Added on top of supplier lead time">
              <input
                className={cn(inputCls, "mono")}
                type="number"
                min={0}
                max={30}
                value={db.safetyDays}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(30, Number(e.target.value) || 0));
                  patchPrefs({ safetyDays: v });
                }}
                onBlur={saved}
              />
            </Field>
            <Field label="Low-stock alerts" hint="Which items raise alerts">
              <select
                className={inputCls}
                value={db.alertLevel}
                onChange={(e) => {
                  patchPrefs({ alertLevel: e.target.value as "crit" | "critlow" });
                  toast(e.target.value === "crit" ? "Low-stock warnings muted — critical only" : "Low-stock warnings enabled", "info");
                  saved();
                }}
              >
                <option value="critlow">Critical + Low</option>
                <option value="crit">Critical only</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded border border-line bg-paper/60 px-3 py-2.5">
            <p className="mono text-[11.5px] leading-relaxed text-mut">
              Reorder suggestion = max(2× reorder point − available, daily use × (lead time + {db.safetyDays} d safety))
            </p>
          </div>
        </section>

        {/* units of measure */}
        <section className="card self-start p-4" aria-label="Units of measure">
          <h2 className="text-[13.5px] font-bold tracking-tight">Units of measure</h2>
          <p className="mt-0.5 text-[12px] text-mut">Accepted on receipts, picks and adjustments.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {db.units.map((u) => (
              <span key={u} className="mono inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 text-[11.5px] font-semibold">
                {u}
                <button
                  className="text-faint transition-colors hover:text-crit"
                  aria-label={`Remove unit ${u}`}
                  onClick={() => {
                    removeUnit(u);
                    toast(`Unit ${u} removed`, "info");
                    saved();
                  }}
                >
                  <IcX className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className={cn(inputCls, "mono w-[120px] uppercase")}
              placeholder="e.g. PAL"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitUnit()}
              aria-label="New unit of measure"
            />
            <Btn onClick={submitUnit}>
              <IcPlus className="h-4 w-4" />
              Add
            </Btn>
          </div>
          {unitErr && <p className="mt-2 text-[11.5px] font-medium text-crit">{unitErr}</p>}
        </section>

        {/* categories */}
        <section className="card self-start p-4" aria-label="Categories">
          <h2 className="text-[13.5px] font-bold tracking-tight">Item categories</h2>
          <p className="mt-0.5 text-[12px] text-mut">Used by inventory filters and valuation reports.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {db.categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 text-[11.5px] font-medium">
                {c}
                <button
                  className="text-faint transition-colors hover:text-crit"
                  aria-label={`Remove category ${c}`}
                  onClick={() => {
                    if (db.items.some((i) => i.cat === c)) {
                      setCatErr(`“${c}” still has SKUs assigned — move them first.`);
                      return;
                    }
                    removeCategory(c);
                    toast(`Category “${c}” removed`, "info");
                    saved();
                  }}
                >
                  <IcX className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className={cn(inputCls, "w-[200px]")}
              placeholder="New category name"
              value={newCat}
              onChange={(e) => {
                setNewCat(e.target.value);
                setCatErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && submitCat()}
              aria-label="New category"
            />
            <Btn onClick={submitCat}>
              <IcPlus className="h-4 w-4" />
              Add
            </Btn>
          </div>
          {catErr && <p className="mt-2 text-[11.5px] font-medium text-crit">{catErr}</p>}
        </section>
      </div>

      <p className="mono mt-4 text-[11px] text-faint">
        Forgeline IMS v2.4.1 · terminal 04 · plant 2 · local session — changes sync to the plant server on the next heartbeat.
      </p>
    </div>
  );

  function submitUnit() {
    const v = newUnit.trim().toUpperCase();
    if (!v) return setUnitErr("Type a unit code first, e.g. PAL.");
    if (db.units.includes(v)) return setUnitErr(`${v} already exists.`);
    addUnit(v);
    setNewUnit("");
    setUnitErr("");
    toast(`Unit ${v} added`);
    saved();
  }

  function submitCat() {
    const v = newCat.trim();
    if (!v) return setCatErr("Type a category name first.");
    if (db.categories.some((c) => c.toLowerCase() === v.toLowerCase())) return setCatErr(`“${v}” already exists.`);
    addCategory(v);
    setNewCat("");
    setCatErr("");
    toast(`Category “${v}” added`);
    saved();
  }
}
