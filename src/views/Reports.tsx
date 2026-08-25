import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  available,
  daysUntil,
  downloadText,
  flowSeries,
  hhmm,
  money,
  num,
  qty as fmtQty,
  statusOf,
  supById,
  toCsv,
  type Movement,
} from "../lib/data";
import { useStore } from "../lib/store";
import { DataTable } from "../components/table";
import { Btn, EmptyState, StatusDot, cn } from "../components/ui";
import { IcChart, IcDownload, IcWarn } from "../components/icons";

const mvH = createColumnHelper<Movement>();

export default function Reports() {
  const { db, ready, openItem, toast } = useStore();
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const valByCat = useMemo(() => {
    const m = new Map<string, number>();
    db.items.forEach((i) => m.set(i.cat, (m.get(i.cat) ?? 0) + i.onHand * i.cost));
    return Array.from(m.entries())
      .map(([cat, value]) => ({ cat: cat.length > 14 ? cat.slice(0, 13) + "…" : cat, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [db.items]);

  const turnsByCat = useMemo(
    () =>
      db.categories
        .map((cat) => {
          const items = db.items.filter((i) => i.cat === cat);
          const value = items.reduce((a, i) => a + i.onHand * i.cost, 0);
          const monthlyCogs = items.reduce((a, i) => a + i.dailyUse * i.cost * 30, 0);
          const turns = value > 0 ? monthlyCogs / value : 0;
          const lowCount = items.filter((i) => statusOf(i) !== "ok").length;
          return { cat, skus: items.length, value, turns, lowCount };
        })
        .filter((r) => r.skus > 0)
        .sort((a, b) => b.turns - a.turns),
    [db]
  );

  const totalValue = db.items.reduce((a, i) => a + i.onHand * i.cost, 0);
  const monthlyCogs = db.items.reduce((a, i) => a + i.dailyUse * i.cost * 30, 0);
  const overallTurns = totalValue > 0 ? monthlyCogs / totalValue : 0;

  const forecast = useMemo(() => {
    return db.items
      .map((i) => {
        const av = available(i);
        const cover = i.dailyUse > 0 ? av / i.dailyUse : Infinity;
        const lead = supById(i.sup)?.leadDays ?? 10;
        const horizon = lead + db.safetyDays;
        return { i, av, cover, horizon };
      })
      .filter((r) => r.cover !== Infinity && r.cover < r.horizon)
      .sort((a, b) => a.cover - b.cover);
  }, [db]);

  const expiring = useMemo(
    () =>
      db.items
        .filter((i) => i.expiry)
        .map((i) => ({ i, d: daysUntil(i.expiry!) }))
        .sort((a, b) => a.d - b.d),
    [db.items]
  );

  const auditCols = useMemo<ColumnDef<Movement, unknown>[]>(
    () => [
      mvH.accessor("ts", {
        header: "Time",
        cell: ({ getValue }) => <span className="mono text-[11.5px] text-faint">{hhmm(getValue())}</span>,
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor("sku", {
        header: "SKU",
        cell: ({ getValue }) => (
          <button className="mono text-[12.5px] font-semibold transition-colors hover:text-sig" onClick={(e) => (e.stopPropagation(), openItem(getValue()))}>
            {getValue()}
          </button>
        ),
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor("kind", {
        header: "Kind",
        cell: ({ getValue }) => <span className="mono text-[11.5px] font-semibold">{getValue()}</span>,
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor("qty", {
        header: "Qty",
        meta: { num: true },
        cell: ({ getValue, row }) => (
          <span className="mono text-[12.5px] font-semibold">
            {row.original.kind === "ADJ" && getValue() > 0 ? "+" : ""}
            {fmtQty(getValue())}
          </span>
        ),
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor("ref", {
        header: "Reference",
        cell: ({ getValue }) => <span className="mono text-[11.5px] text-mut">{getValue()}</span>,
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor((m) => m.from ?? "—", {
        id: "from",
        header: "From",
        cell: ({ getValue }) => <span className="mono text-[11.5px] text-mut">{getValue()}</span>,
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor((m) => m.to ?? "—", {
        id: "to",
        header: "To",
        cell: ({ getValue }) => <span className="mono text-[11.5px] text-mut">{getValue()}</span>,
      }) as ColumnDef<Movement, unknown>,
      mvH.accessor("user", {
        header: "By",
        cell: ({ getValue }) => <span className="text-[12px] text-mut">{getValue()}</span>,
      }) as ColumnDef<Movement, unknown>,
    ],
    [openItem]
  );

  const exportAudit = () => {
    const csv = toCsv([
      ["ID", "Timestamp", "SKU", "Kind", "Qty", "Reference", "From", "To", "User"],
      ...db.movements.map((m) => [m.id, new Date(m.ts).toISOString(), m.sku, m.kind, m.qty, m.ref, m.from ?? "", m.to ?? "", m.user]),
    ]);
    downloadText("forgeline-audit-log.csv", csv);
    toast(`Exported ${db.movements.length} audit rows → forgeline-audit-log.csv`);
  };

  if (!ready) {
    return (
      <div className="anim-rise space-y-4">
        <div className="skel h-[90px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skel h-[280px]" />
          <div className="skel h-[280px]" />
        </div>
      </div>
    );
  }

  const flow = flowSeries(range);

  return (
    <div className="anim-rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Reports</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">Valuation, turnover and the full movement audit trail</p>
        </div>
        <div className="flex rounded border border-line bg-surface p-0.5" role="group" aria-label="Report range">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn("mono rounded px-3 py-1.5 text-[12px] font-semibold transition-colors", range === r ? "bg-sig text-white" : "text-mut hover:text-ink")}
            >
              {r} d
            </button>
          ))}
        </div>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line xl:grid-cols-4">
        {[
          { l: "Stock value", v: money(totalValue), s: `${num(db.items.length)} SKUs on hand` },
          { l: "Turnover (30 d)", v: overallTurns.toFixed(1) + "×", s: "consumption vs average stock" },
          { l: "Count accuracy", v: "97.4%", s: "last 40 cycle counts" },
          { l: "Below reorder point", v: String(db.items.filter((i) => statusOf(i) !== "ok").length), s: "need action now" },
        ].map((k) => (
          <div key={k.l} className="bg-surface px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">{k.l}</p>
            <p className="mono mt-1.5 text-[22px] font-bold leading-none tracking-tight">{k.v}</p>
            <p className="mt-1.5 text-[11.5px] text-mut">{k.s}</p>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-4" aria-label="Stock value by category">
          <h2 className="text-[13.5px] font-bold tracking-tight">Stock value by category</h2>
          <p className="mb-3 mt-0.5 text-[11.5px] text-mut">on-hand × unit cost</p>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valByCat} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E6EA" vertical={false} />
                <XAxis dataKey="cat" tick={{ fontSize: 10, fill: "#5B6572" }} axisLine={{ stroke: "#E3E6EA" }} tickLine={false} interval={0} angle={-18} textAnchor="end" height={44} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6572", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                <Tooltip cursor={{ fill: "#F6F7F9" }} formatter={(v) => [money(Number(v)), "Value"]} contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono", border: "1px solid #E3E6EA", borderRadius: 6 }} />
                <Bar dataKey="value" fill="#2C5AA0" radius={[2, 2, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4" aria-label="Daily stock flow">
          <h2 className="text-[13.5px] font-bold tracking-tight">Daily stock flow · last {range} days</h2>
          <p className="mb-3 mt-0.5 text-[11.5px] text-mut">units received vs units issued</p>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flow} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2C5AA0" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2C5AA0" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B6572" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#5B6572" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E6EA" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#5B6572", fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: "#E3E6EA" }} tickLine={false} minTickGap={26} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6572", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono", border: "1px solid #E3E6EA", borderRadius: 6 }} />
                <Area type="monotone" dataKey="inQty" name="Received" stroke="#2C5AA0" strokeWidth={1.8} fill="url(#gIn)" />
                <Area type="monotone" dataKey="outQty" name="Issued" stroke="#5B6572" strokeWidth={1.8} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* turnover + forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden" aria-label="Turnover by category">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[13.5px] font-bold tracking-tight">Turnover by category · 30 d</h2>
          </header>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Category", "SKUs", "Value", "Turns", "Attention"].map((h, i) => (
                  <th key={h} className={cn("border-b border-line bg-[#fafbfc] px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-mut", i >= 1 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {turnsByCat.map((r) => (
                <tr key={r.cat} className="border-t border-line/70">
                  <td className="px-3 py-2 font-medium">{r.cat}</td>
                  <td className="mono px-3 py-2 text-right text-mut">{r.skus}</td>
                  <td className="mono px-3 py-2 text-right">{money(r.value)}</td>
                  <td className="mono px-3 py-2 text-right font-semibold">{r.turns.toFixed(1)}×</td>
                  <td className="px-3 py-2 text-right">
                    {r.lowCount > 0 ? (
                      <span className="mono rounded-sm border border-warn/40 bg-warnwash px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">{r.lowCount} SKU{r.lowCount > 1 ? "s" : ""}</span>
                    ) : (
                      <span className="mono text-[10.5px] text-ok">clear</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card" aria-label="Low stock forecast">
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <IcWarn className="h-4 w-4 text-warn" />
            <h2 className="text-[13.5px] font-bold tracking-tight">Stockout forecast</h2>
            <span className="mono ml-auto text-[10.5px] text-faint">cover &lt; lead + {db.safetyDays} d safety</span>
          </header>
          {forecast.length === 0 ? (
            <EmptyState title="No stockouts projected" body="At current consumption, every SKU outlives its supplier lead time plus safety stock." />
          ) : (
            <ul className="scroll-thin max-h-[300px] overflow-y-auto">
              {forecast.map(({ i, av, cover, horizon }) => (
                <li key={i.sku} className="flex items-center gap-3 border-b border-line/70 px-4 py-2.5 last:border-0">
                  <StatusDot status={statusOf(i)} />
                  <button className="mono w-[130px] shrink-0 text-left text-[12px] font-bold transition-colors hover:text-sig" onClick={() => openItem(i.sku)}>
                    {i.sku}
                  </button>
                  <span className="mono hidden w-[88px] shrink-0 text-right text-[11.5px] text-mut sm:block">use {fmtQty(i.dailyUse)}/d</span>
                  <span className="mono hidden w-[70px] shrink-0 text-right text-[11.5px] text-mut md:block">av {fmtQty(av)}</span>
                  <span className="mono ml-auto w-[58px] shrink-0 text-right text-[12px] font-bold" style={{ color: cover <= 0 ? "#C4432E" : cover < horizon / 2 ? "#B26E12" : "#1B222B" }}>
                    {cover <= 0 ? "0 d" : `${cover.toFixed(1)} d`}
                  </span>
                  <span
                    className={cn(
                      "mono w-[76px] shrink-0 rounded-sm border px-1.5 py-0.5 text-center text-[10px] font-bold uppercase",
                      cover <= 2 ? "border-crit/30 bg-critwash text-crit" : "border-warn/40 bg-warnwash text-warn"
                    )}
                  >
                    {cover <= 2 ? "Order now" : "Watch"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* expiry */}
      <section className="card" aria-label="Expiring batches">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[13.5px] font-bold tracking-tight">Batch expiry register</h2>
        </header>
        {expiring.length === 0 ? (
          <EmptyState title="No tracked batches" body="Chemicals and coated goods with expiry dates will be tracked here." />
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-line/70 md:grid-cols-2 md:divide-x lg:grid-cols-4 lg:divide-y-0">
            {expiring.map(({ i, d }) => (
              <li key={i.sku} className="px-4 py-3">
                <button className="mono text-[12px] font-bold transition-colors hover:text-sig" onClick={() => openItem(i.sku)}>
                  {i.sku}
                </button>
                <p className="mono mt-1 text-[11px] text-mut">
                  lot {i.batch} · {fmtQty(i.onHand)} {i.unit}
                </p>
                <p className={cn("mono mt-1.5 text-[12px] font-bold", d <= 21 ? "text-crit" : d <= 45 ? "text-warn" : "text-mut")}>
                  {i.expiry} · {d} d
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* audit log */}
      <section aria-label="Movement audit log">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[13.5px] font-bold tracking-tight">
            <IcChart className="h-4 w-4 text-mut" />
            Movement audit log
            <span className="mono text-[11px] font-medium text-faint">{db.movements.length} entries</span>
          </h2>
          <Btn onClick={exportAudit}>
            <IcDownload className="h-4 w-4" />
            Export CSV
          </Btn>
        </div>
        <DataTable
          data={db.movements}
          columns={auditCols}
          rowKey={(m) => m.id}
          maxH="420px"
          dense
          initialSort={[{ id: "ts", desc: true }]}
          empty={<EmptyState title="No movements yet" body="Receipts, picks, transfers and adjustments will be recorded here." />}
        />
      </section>
    </div>
  );
}
