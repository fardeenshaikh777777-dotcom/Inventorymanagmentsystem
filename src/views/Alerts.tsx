import { useMemo } from "react";
import type { Alert } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, EmptyState, cn } from "../components/ui";
import { IcBell, IcCheck, IcChevR, IcPencil, IcRefresh, IcTrayIn, IcTruck, IcX } from "../components/icons";

const SEV_COLOR = { crit: "#C4432E", warn: "#E0982A", info: "#2C5AA0" } as const;

function AlertRow({ a }: { a: Alert }) {
  const { openItem, reorder, dismissAlert, setRecvPoId, nav } = useStore();

  const actions = () => {
    switch (a.kind) {
      case "stock":
        return (
          <>
            <Btn sm onClick={() => openItem(a.sku!)}>
              View item
              <IcChevR className="h-3.5 w-3.5" />
            </Btn>
            <Btn sm variant="primary" onClick={() => reorder(a.sku!)}>
              <IcTruck className="h-3.5 w-3.5" />
              Reorder
            </Btn>
          </>
        );
      case "receipt":
        return (
          <Btn
            sm
            variant="primary"
            onClick={() => {
              setRecvPoId(a.poId!);
              nav("receiving");
            }}
          >
            <IcTrayIn className="h-3.5 w-3.5" />
            Open receiving
          </Btn>
        );
      case "expiry":
        return (
          <Btn sm onClick={() => openItem(a.sku!)}>
            View batch
            <IcChevR className="h-3.5 w-3.5" />
          </Btn>
        );
      case "count":
        return (
          <Btn sm onClick={() => openItem(a.sku!)}>
            <IcPencil className="h-3.5 w-3.5" />
            Correct count
          </Btn>
        );
    }
  };

  return (
    <li className="relative border-b border-line/70 last:border-0">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: SEV_COLOR[a.sev] }} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 pl-4 pr-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SEV_COLOR[a.sev], boxShadow: `0 0 0 3px ${SEV_COLOR[a.sev]}1f` }} />
        <div className="min-w-[220px] flex-1">
          <p className="text-[13px] font-semibold leading-snug">{a.title}</p>
          <p className="mono mt-0.5 text-[11.5px] leading-relaxed text-mut">{a.detail}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {actions()}
          <Btn sm variant="subtle" onClick={() => dismissAlert(a.id)} aria-label={`Dismiss alert: ${a.title}`}>
            <IcX className="h-3.5 w-3.5" />
          </Btn>
        </div>
      </div>
    </li>
  );
}

export default function Alerts() {
  const { alerts, dismissedCount, restoreAlerts, ready, nav } = useStore();

  const groups = useMemo(() => {
    const crit = alerts.filter((a) => a.sev === "crit");
    const warn = alerts.filter((a) => a.sev === "warn");
    const info = alerts.filter((a) => a.sev === "info");
    return { crit, warn, info };
  }, [alerts]);

  if (!ready) {
    return (
      <div className="anim-rise space-y-4">
        <div className="skel h-[60px]" />
        <div className="skel h-[360px]" />
      </div>
    );
  }

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Alerts center</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">
            {alerts.length === 0 ? "Queue is clear" : `${alerts.length} open — every alert has an action attached`}
          </p>
        </div>
        {dismissedCount > 0 && (
          <Btn onClick={restoreAlerts}>
            <IcRefresh className="h-4 w-4" />
            Restore {dismissedCount} dismissed
          </Btn>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IcCheck className="h-5 w-5 text-ok" />}
            title="All clear on the floor"
            body="No critical stock, no overdue receipts, no expiring batches and no count discrepancies. Dismissed alerts can be restored any time."
            action={
              <Btn variant="ghost" onClick={() => nav("dashboard")}>
                Back to dashboard
              </Btn>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.crit.length > 0 && (
            <section className="card overflow-hidden" aria-label="Critical alerts">
              <header className="flex items-center gap-2 border-b border-line bg-critwash/50 px-4 py-2.5">
                <IcBell className="h-4 w-4 text-crit" />
                <h2 className="text-[12.5px] font-bold tracking-tight text-crit">Critical · act now</h2>
                <span className="mono ml-auto rounded-sm border border-crit/30 bg-surface px-1.5 py-0.5 text-[10.5px] font-bold text-crit">{groups.crit.length}</span>
              </header>
              <ul>
                {groups.crit.map((a) => (
                  <AlertRow key={a.id} a={a} />
                ))}
              </ul>
            </section>
          )}
          {groups.warn.length > 0 && (
            <section className="card overflow-hidden" aria-label="Warning alerts">
              <header className="flex items-center gap-2 border-b border-line bg-warnwash/50 px-4 py-2.5">
                <IcBell className="h-4 w-4 text-warn" />
                <h2 className="text-[12.5px] font-bold tracking-tight text-warn">Warnings · plan today</h2>
                <span className="mono ml-auto rounded-sm border border-warn/40 bg-surface px-1.5 py-0.5 text-[10.5px] font-bold text-warn">{groups.warn.length}</span>
              </header>
              <ul>
                {groups.warn.map((a) => (
                  <AlertRow key={a.id} a={a} />
                ))}
              </ul>
            </section>
          )}
          {groups.info.length > 0 && (
            <section className="card overflow-hidden" aria-label="Informational alerts">
              <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <IcBell className="h-4 w-4 text-sig" />
                <h2 className="text-[12.5px] font-bold tracking-tight">Informational</h2>
              </header>
              <ul>
                {groups.info.map((a) => (
                  <AlertRow key={a.id} a={a} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className={cn("mt-4 text-[11.5px] text-faint")}>
        Alerts recompute live from stock levels, PO dates and batch expiries — resolving the underlying issue clears the alert automatically.
      </p>
    </div>
  );
}
