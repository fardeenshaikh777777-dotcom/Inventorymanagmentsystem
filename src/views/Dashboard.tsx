import { useMemo, type ReactNode } from "react";
import {
  available,
  etaLabel,
  hhmm,
  money,
  num,
  poStatus,
  qty as fmtQty,
  statusOf,
  supName,
  STATUS_META,
} from "../lib/data";
import { EMPTY_FILTERS, useStore } from "../lib/store";
import { Btn, EmptyState, KindTag, Sparkline, StatusChip, StatusDot, StatusRail, cn } from "../components/ui";
import { IcArrowR, IcCheck, IcChevR, IcMap, IcTrayIn, IcTruck, IcBarcode, IcWarn } from "../components/icons";

const rank = (s: "ok" | "low" | "crit") => (s === "crit" ? 2 : s === "low" ? 1 : 0);

function KpiCell({ label, value, unit, sub, rail, chip, spark }: { label: string; value: string; unit?: string; sub: ReactNode; rail?: string; chip?: ReactNode; spark?: number[] }) {
  return (
    <div className="relative bg-surface px-4 py-3.5">
      {rail && <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: rail }} />}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">{label}</p>
        {chip}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="mono text-[22px] font-bold leading-none tracking-tight">
          {value}
          {unit && <span className="ml-1 text-[11px] font-medium text-faint">{unit}</span>}
        </p>
        {spark && <Sparkline data={spark} color={rail ?? "#2C5AA0"} />}
      </div>
      <div className="mt-1.5 text-[11.5px] text-mut">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { db, ready, nav, openItem, setInvPreset, reorder, setRecvPoId, alerts } = useStore();

  const stats = useMemo(() => {
    const withStatus = db.items.map((i) => ({ i, s: statusOf(i) }));
    const low = withStatus.filter((x) => x.s === "low").length;
    const crit = withStatus.filter((x) => x.s === "crit").length;
    const value = db.items.reduce((a, i) => a + i.onHand * i.cost, 0);
    const openPos = db.pos.filter((p) => poStatus(p) !== "closed");
    const pendingLines = openPos.reduce((a, p) => a + p.lines.filter((l) => l.rcv < l.ord).length, 0);
    const overdue = openPos.filter((p) => poStatus(p) === "overdue").length;
    const openXfers = db.transfers.filter((t) => t.status === "open").length;
    const openPicks = db.picks.filter((p) => p.status === "open").length;
    return { low, crit, value, pendingLines, overdue, openXfers, openPicks, openPos };
  }, [db]);

  const attention = useMemo(() => {
    return db.items
      .map((i) => ({ i, s: statusOf(i) }))
      .filter((x) => x.s !== "ok")
      .sort((a, b) => rank(b.s) - rank(a.s) || available(a.i) - available(b.i));
  }, [db.items]);

  const feed = db.movements.slice(0, 14);

  const goFiltered = (status: "" | "low" | "crit") => {
    setInvPreset({ ...EMPTY_FILTERS, status });
    nav("inventory");
  };

  if (!ready) {
    return (
      <div className="anim-rise space-y-4">
        <div className="skel h-[92px] w-full" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="skel h-[420px] xl:col-span-7" />
          <div className="space-y-4 xl:col-span-5">
            <div className="skel h-[260px]" />
            <div className="skel h-[140px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-rise space-y-4">
      {/* KPI instrument strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line shadow-[0_1px_2px_rgba(27,34,43,0.04)] md:grid-cols-3 xl:grid-cols-5">
        <KpiCell
          label="Total SKUs"
          value={num(db.items.length)}
          sub={<>Stock value <span className="mono font-semibold text-ink">{money(stats.value)}</span></>}
          spark={[26, 27, 27, 28, 30, 29, 31, 32]}
        />
        <button className="text-left transition-colors hover:bg-paper focus-visible:bg-paper" onClick={() => goFiltered("low")} aria-label="Show low stock items">
          <KpiCell
            label="Low Stock"
            value={num(stats.low)}
            unit="SKUs"
            rail="#E0982A"
            sub={<>Below reorder point · tap to review</>}
            chip={stats.low > 0 ? <StatusDot status="low" /> : <IcCheck className="h-3.5 w-3.5 text-ok" />}
          />
        </button>
        <button className="text-left transition-colors hover:bg-paper focus-visible:bg-paper" onClick={() => goFiltered("crit")} aria-label="Show critical items">
          <KpiCell
            label="Critical / Out"
            value={num(stats.crit)}
            unit="SKUs"
            rail="#C4432E"
            sub={<>Available at zero · stops production</>}
            chip={stats.crit > 0 ? <StatusDot status="crit" /> : <IcCheck className="h-3.5 w-3.5 text-ok" />}
          />
        </button>
        <button className="text-left transition-colors hover:bg-paper focus-visible:bg-paper" onClick={() => nav("receiving")} aria-label="Go to receiving">
          <KpiCell
            label="Pending Receipts"
            value={num(stats.pendingLines)}
            unit="lines"
            rail="#2C5AA0"
            spark={[2, 4, 3, 5, 4, 6, 5, 7]}
            sub={
              stats.overdue > 0 ? (
                <span className="font-semibold text-crit">{stats.overdue} PO overdue at dock</span>
              ) : (
                <>Across {stats.openPos.length} open purchase orders</>
              )
            }
          />
        </button>
        <button className="text-left transition-colors hover:bg-paper focus-visible:bg-paper" onClick={() => nav("shipments")} aria-label="Go to shipments">
          <KpiCell
            label="Open Orders"
            value={num(stats.openPicks)}
            unit="picks"
            sub={
              <>
                {stats.openXfers} inter-zone transfer{stats.openXfers === 1 ? "" : "s"} in flight
              </>
            }
            chip={stats.openXfers > 0 ? <StatusDot status="low" /> : <IcCheck className="h-3.5 w-3.5 text-ok" />}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Needs attention */}
        <section className="card xl:col-span-7" aria-label="Items needing attention">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[13.5px] font-bold tracking-tight">Needs attention</h2>
              <span className="mono rounded-sm border border-crit/25 bg-critwash px-1.5 py-0.5 text-[10.5px] font-semibold text-crit">{stats.crit} crit</span>
              <span className="mono rounded-sm border border-warn/30 bg-warnwash px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">{stats.low} low</span>
            </div>
            <Btn sm variant="subtle" onClick={() => goFiltered("")}>
              All inventory
              <IcArrowR className="h-3.5 w-3.5" />
            </Btn>
          </header>
          {attention.length === 0 ? (
            <EmptyState title="All stock is healthy" body="Every SKU is at or above its reorder point. Nothing needs action right now." />
          ) : (
            <ul className="scroll-thin max-h-[430px] overflow-y-auto">
              {attention.map(({ i, s }) => {
                const av = available(i);
                const cover = i.dailyUse > 0 ? av / i.dailyUse : Infinity;
                return (
                  <li key={i.sku} className={cn("relative border-b border-line/70 last:border-0", s === "crit" && "bg-critwash/40")}>
                    <StatusRail status={s} />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openItem(i.sku)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openItem(i.sku))}
                      className="group flex w-full cursor-pointer items-center gap-3 py-2.5 pl-4 pr-3 text-left transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]"
                    >
                      <StatusDot status={s} />
                      <span className="mono w-[132px] shrink-0 text-[12.5px] font-semibold">{i.sku}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-mut">{i.name}</span>
                      <span className="mono hidden w-[92px] shrink-0 text-right text-[12.5px] sm:block">
                        <span className="font-semibold" style={{ color: STATUS_META[s].color }}>
                          {fmtQty(av)}
                        </span>
                        <span className="text-faint"> / rp {fmtQty(i.rp)}</span>
                      </span>
                      <span className="mono hidden w-[64px] shrink-0 text-right text-[11.5px] text-mut lg:block">
                        {cover === Infinity ? "—" : cover <= 0 ? "0 d" : `${cover.toFixed(1)} d`}
                      </span>
                      <Btn
                        sm
                        variant="ghost"
                        className="shrink-0 opacity-80 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          reorder(i.sku);
                        }}
                      >
                        Reorder
                      </Btn>
                      <IcChevR className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-sig" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4 xl:col-span-5">
          {/* Live movements */}
          <section className="card" aria-label="Live movements">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="led h-2 w-2 rounded-full bg-ok shadow-[0_0_0_3px_rgba(31,138,95,0.15)]" />
                <h2 className="text-[13.5px] font-bold tracking-tight">Live movements</h2>
              </div>
              <span className="mono text-[11px] text-faint">in / out / transfer</span>
            </header>
            <ul className="scroll-thin max-h-[300px] overflow-y-auto">
              {feed.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 border-b border-line/70 px-4 py-2 last:border-0">
                  <span className="mono w-[42px] shrink-0 text-[11px] text-faint">{hhmm(m.ts)}</span>
                  <KindTag kind={m.kind} />
                  <button className="mono min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-ink transition-colors hover:text-sig" onClick={() => openItem(m.sku)}>
                    {m.sku}
                  </button>
                  <span className="mono shrink-0 text-[12px] font-semibold">
                    {m.kind === "ADJ" && m.qty > 0 ? "+" : ""}
                    {fmtQty(m.qty)}
                  </span>
                  <span className="mono w-[70px] shrink-0 text-right text-[10.5px] text-faint">{m.ref}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick actions */}
          <section className="card p-3" aria-label="Quick actions">
            <h2 className="px-1 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <IcBarcode className="h-4.5 w-4.5" />, t: "Scan item", d: "Open scanner", fn: () => (document.getElementById("global-search") as HTMLInputElement | null)?.focus() },
                { icon: <IcTrayIn className="h-4.5 w-4.5" />, t: "Start receiving", d: "PO at dock", fn: () => nav("receiving") },
                { icon: <IcTruck className="h-4.5 w-4.5" />, t: "Build pick list", d: `${stats.openPicks} open`, fn: () => nav("shipments") },
                { icon: <IcMap className="h-4.5 w-4.5" />, t: "Warehouse map", d: "Zones & bins", fn: () => nav("locations") },
              ].map((a) => (
                <button
                  key={a.t}
                  onClick={a.fn}
                  className="group flex items-center gap-2.5 rounded border border-line bg-surface px-3 py-2.5 text-left transition-all hover:border-sig/50 hover:bg-sigwash/50"
                >
                  <span className="text-mut transition-colors group-hover:text-sig">{a.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold leading-tight">{a.t}</span>
                    <span className="mono block text-[10.5px] text-faint">{a.d}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Incoming */}
          <section className="card" aria-label="Incoming purchase orders">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[13.5px] font-bold tracking-tight">Incoming stock</h2>
              <Btn sm variant="subtle" onClick={() => nav("receiving")}>
                Receiving
                <IcArrowR className="h-3.5 w-3.5" />
              </Btn>
            </header>
            {stats.openPos.length === 0 ? (
              <EmptyState title="Dock is clear" body="No open purchase orders. Raise one from an item's Reorder action." />
            ) : (
              <ul>
                {stats.openPos.slice(0, 4).map((p) => {
                  const st = poStatus(p);
                  return (
                    <li key={p.id}>
                      <button
                        className="flex w-full items-center gap-3 border-b border-line/70 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-[#f3f6fb]"
                        onClick={() => {
                          setRecvPoId(p.id);
                          nav("receiving");
                        }}
                      >
                        <StatusDot status={st === "overdue" ? "crit" : st === "partial" ? "low" : "ok"} />
                        <span className="mono text-[12.5px] font-semibold">{p.id}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-mut">{supName(p.sup)}</span>
                        <span
                          className={cn(
                            "mono shrink-0 rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold",
                            st === "overdue" ? "border-crit/30 bg-critwash text-crit" : "border-line bg-paper text-mut"
                          )}
                        >
                          {etaLabel(p.etaDays)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {alerts.length > 0 && (
        <button
          onClick={() => nav("alerts")}
          className="group flex w-full items-center gap-3 rounded-md border border-warn/35 bg-warnwash px-4 py-2.5 text-left transition-colors hover:border-warn/60"
        >
          <IcWarn className="h-4 w-4 shrink-0 text-warn" />
          <span className="text-[12.5px] font-semibold text-ink">
            {alerts.length} open alert{alerts.length === 1 ? "" : "s"} — {alerts.filter((a) => a.sev === "crit").length} critical
          </span>
          <span className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-warn">
            Open alerts center
            <IcArrowR className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}
