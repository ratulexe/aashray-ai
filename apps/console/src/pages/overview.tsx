import { useMemo } from "react";
import { Accessibility, BellRing, Clock3, Home, LifeBuoy, Send, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@hope/ui/components/badge";
import { Skeleton } from "@hope/ui/components/skeleton";
import { CountUp, FadeIn } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { en, type Level, type Overview } from "../api";
import { useMapData, useOverview } from "../hooks";
import { IncidentMap, MapLegend } from "../components/incident-map";
import { CapacityBar } from "../components/status";

export function OverviewPage() {
  const overview = useOverview();
  const map = useMapData();
  const zones = useMemo(() => new Map((overview.data?.zones ?? []).map((z) => [z.area_id, z.level as Level])), [overview.data?.zones]);

  if (!overview.data || !map.data) return <OverviewSkeleton />;
  const o = overview.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {o.incident?.summary ? (
        <FadeIn>
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            {o.incident.summary} <span className="whitespace-nowrap text-xs">— Source: {o.incident.source} · {o.incident.source_ref}</span>
          </p>
        </FadeIn>
      ) : null}
      <Kpis o={o} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-2">
          <div className="h-[460px]">
            <IncidentMap data={map.data} shelters={o.shelters} zones={zones} />
          </div>
          <MapLegend />
        </section>
        <ShelterList o={o} />
      </div>
    </div>
  );
}

export function Kpis({ o, compact }: { o: Overview; compact?: boolean }) {
  const lastAlert = o.alerts.find((a) => a.kind !== "all_clear") ?? o.alerts[0];
  const delivered = o.alerts.reduce((s, a) => s + a.delivered, 0);
  const held = o.bookings.held ?? { families: 0, people: 0 };
  const checked = o.bookings.checked_in ?? { families: 0, people: 0 };
  const sheltered = o.shelters.reduce((s, x) => s + x.occupied, 0);
  const openRescue = (o.rescue.new ?? 0) + (o.rescue.triaged ?? 0) + (o.rescue.assigned ?? 0);

  const items = [
    { label: "Households registered", value: o.households.total, sub: `${o.households.vulnerable} vulnerable`, icon: Home },
    { label: "Alerts delivered", value: delivered, sub: lastAlert ? `${lastAlert.queued > 0 ? `${lastAlert.queued} sending…` : `${lastAlert.failed} failed`}` : "No alert yet", icon: Send },
    { label: "Booked (families)", value: held.families + checked.families, sub: `${held.people} people on the way`, icon: BellRing },
    { label: "People sheltered", value: sheltered, sub: `${checked.families} families checked in · ${o.metrics.walkIns} walk-ins`, icon: ShieldCheck },
    { label: "Open rescue requests", value: openRescue, sub: `${o.rescue.rescued ?? 0} rescued`, icon: LifeBuoy, alert: openRescue > 0 },
    { label: "Median alert → booking", value: o.metrics.medianMinutesToBook ?? 0, sub: o.metrics.medianMinutesToBook == null ? "—" : "minutes", icon: Clock3, raw: o.metrics.medianMinutesToBook == null },
  ];

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6")}>
      {items.map((k) => (
        <div key={k.label} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <k.icon className={cn("size-4", k.alert && "text-danger")} /> {k.label}
          </div>
          <div className="mt-2 font-display text-3xl font-bold tabular">
            {k.raw ? "—" : <CountUp value={k.value} />}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function ShelterList({ o, className }: { o: Overview; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-lg font-bold">Shelters</h2>
        <span className="text-xs text-muted-foreground">sheltered · reserved / capacity</span>
      </header>
      <ul className="divide-y">
        {o.shelters.map((s) => {
          const free = Math.max(0, s.capacity - s.reserved - s.occupied);
          const safe = o.incident ? s.safe_for.includes(o.incident.hazard) : true;
          return (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{en(s.name)}</span>
                {s.accessible ? <Accessibility className="size-3.5 shrink-0 text-muted-foreground" aria-label="Accessible" /> : null}
                <span className="ml-auto shrink-0 text-xs tabular text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.occupied}</span> · {s.reserved} / {s.capacity}
                </span>
              </div>
              <CapacityBar className="mt-2" capacity={s.capacity} reserved={s.reserved} occupied={s.occupied} />
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                {!safe ? <Badge variant="outline" className="h-5 border-danger/40 text-danger">Not {o.incident?.hazard}-safe</Badge> : null}
                {s.status === "full" ? <Badge className="h-5 bg-danger text-danger-foreground">Full</Badge> : null}
                <span className="inline-flex items-center gap-1"><Users className="size-3" />{s.expected_families} families expected</span>
                <span className="ml-auto tabular">{free} free</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[460px] rounded-xl" />
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    </div>
  );
}
