import { useMemo, useState } from "react";
import { ZONES, available, num, qty as fmtQty, statusOf, worst } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, EmptyState, Meter, StatusChip, StatusDot, StatusRail, cn } from "../components/ui";
import { IcMap } from "../components/icons";

export default function Locations() {
  const { db, ready, openItem } = useStore();
  const [zone, setZone] = useState("A");
  const [bin, setBin] = useState<string | null>(null);

  const byBin = useMemo(() => {
    const m = new Map<string, typeof db.items>();
    for (const i of db.items) {
      const arr = m.get(i.bin) ?? [];
      arr.push(i);
      m.set(i.bin, arr);
    }
    return m;
  }, [db.items]);

  const zoneBins = useMemo(() => {
    return Array.from(byBin.entries())
      .filter(([b]) => b.startsWith(zone))
      .map(([b, items]) => ({
        bin: b,
        items,
        worst: worst(items.map((i) => statusOf(i))),
        total: items.reduce((a, i) => a + i.onHand, 0),
      }))
      .sort((a, b) => a.bin.localeCompare(b.bin));
  }, [byBin, zone]);

  const zoneMeta = ZONES.find((z) => z.code === zone)!;
  const occupancy = (zoneBins.length / zoneMeta.cap) * 100;
  const binItems = bin ? byBin.get(bin) ?? [] : [];

  if (!ready) {
    return (
      <div className="anim-rise space-y-4">
        <div className="skel h-[110px]" />
        <div className="skel h-[380px]" />
      </div>
    );
  }

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Locations · Warehouse map</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">Plant 2 · {ZONES.length} zones · bin occupancy updates with every movement</p>
        </div>
        <span className="mono rounded border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-mut">
          {num(byBin.size)} active bins · {num(db.items.length)} SKUs put away
        </span>
      </div>

      {/* zone strip */}
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {ZONES.map((z) => {
          const used = Array.from(byBin.keys()).filter((b) => b.startsWith(z.code)).length;
          const pct = (used / z.cap) * 100;
          const active = zone === z.code;
          return (
            <button
              key={z.code}
              onClick={() => {
                setZone(z.code);
                setBin(null);
              }}
              className={cn("relative bg-surface px-4 py-3 text-left transition-colors hover:bg-paper focus-visible:bg-paper", active && "bg-sigwash/60 hover:bg-sigwash/60")}
              aria-pressed={active}
            >
              <span className={cn("absolute inset-x-0 top-0 h-[3px] transition-opacity", active ? "bg-sig opacity-100" : "opacity-0")} />
              <span className="flex items-baseline justify-between">
                <span className="mono text-[18px] font-bold tracking-tight">{z.code}</span>
                <span className="mono text-[10.5px] text-faint">
                  {used}/{z.cap}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] font-medium text-mut">{z.name}</span>
              <span className="mt-2 block">
                <Meter pct={pct} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* bin grid */}
        <section className="card xl:col-span-7" aria-label={`Zone ${zone} bins`}>
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[13.5px] font-bold tracking-tight">
                Zone {zone} — {zoneMeta.name}
              </h2>
              <p className="mono mt-0.5 text-[11px] text-faint">
                {zoneBins.length} of {zoneMeta.cap} bins occupied · {Math.round(occupancy)}%
              </p>
            </div>
            <span className="flex items-center gap-3 text-[10.5px] text-mut">
              <span className="flex items-center gap-1"><StatusDot status="ok" size="w-1.5 h-1.5" />healthy</span>
              <span className="flex items-center gap-1"><StatusDot status="low" size="w-1.5 h-1.5" />low</span>
              <span className="flex items-center gap-1"><StatusDot status="crit" size="w-1.5 h-1.5" />critical</span>
            </span>
          </header>

          {zoneBins.length === 0 ? (
            <EmptyState
              icon={<IcMap className="h-5 w-5" />}
              title={`Zone ${zone} has no stock put away`}
              body="Receipts and transfers into this zone will appear here as occupied bins. Finished goods usually land in Zone E."
            />
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {zoneBins.map((b) => (
                  <button
                    key={b.bin}
                    onClick={() => setBin(bin === b.bin ? null : b.bin)}
                    className={cn(
                      "group relative rounded border px-2.5 py-2 text-left transition-all hover:border-sig/60 hover:shadow-[0_2px_8px_rgba(44,90,160,0.12)]",
                      bin === b.bin ? "border-sig bg-sigwash/60" : "border-line bg-surface"
                    )}
                    aria-pressed={bin === b.bin}
                  >
                    <StatusDot status={b.worst} size="w-1.5 h-1.5" />
                    <span className="mono absolute right-2 top-2 text-[9.5px] font-semibold text-faint">{b.items.length} SKU{b.items.length > 1 ? "s" : ""}</span>
                    <span className="mono mt-1.5 block text-[12px] font-bold tracking-tight">{b.bin}</span>
                    <span className="mono block truncate text-[10px] text-faint">{b.items[0].sku}{b.items.length > 1 ? ` +${b.items.length - 1}` : ""}</span>
                  </button>
                ))}
                {Array.from({ length: Math.min(12, Math.max(0, zoneMeta.cap - zoneBins.length)) }).map((_, i) => (
                  <div key={`e-${i}`} className="flex items-center justify-center rounded border border-dashed border-line px-2 py-2 text-[10px] text-faint/70">
                    empty
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* bin contents */}
        <section className="card self-start xl:col-span-5" aria-label="Bin contents">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[13.5px] font-bold tracking-tight">
              {bin ? (
                <>
                  Bin <span className="mono">{bin}</span>
                </>
              ) : (
                "Bin contents"
              )}
            </h2>
            {bin && (
              <Btn sm variant="subtle" onClick={() => setBin(null)}>
                Clear
              </Btn>
            )}
          </header>
          {!bin ? (
            <EmptyState
              icon={<IcMap className="h-5 w-5" />}
              title="Select a bin to drill down"
              body="Tap any occupied bin to list exactly what sits in it — quantities, status, and a shortcut into the item record."
            />
          ) : binItems.length === 0 ? (
            <EmptyState title="Bin is empty" body="Nothing is put away in this location right now." />
          ) : (
            <ul>
              {binItems.map((i) => {
                const s = statusOf(i);
                return (
                  <li key={i.sku} className="relative border-b border-line/70 last:border-0">
                    <StatusRail status={s} />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openItem(i.sku)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openItem(i.sku))}
                      className="flex cursor-pointer items-center gap-3 py-2.5 pl-4 pr-3 transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]"
                    >
                      <StatusDot status={s} />
                      <span className="min-w-0 flex-1">
                        <span className="mono block text-[12.5px] font-bold">{i.sku}</span>
                        <span className="block truncate text-[11.5px] text-mut">{i.name}</span>
                      </span>
                      <span className="text-right">
                        <span className="mono block text-[13px] font-bold" style={{ color: s === "ok" ? "#1B222B" : s === "low" ? "#B26E12" : "#C4432E" }}>
                          {fmtQty(available(i))}
                          <span className="ml-1 text-[10px] font-medium text-faint">{i.unit} avail</span>
                        </span>
                        <StatusChip status={s} className="mt-0.5 justify-end text-[10.5px]" />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
