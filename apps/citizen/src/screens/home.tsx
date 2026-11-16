import { Link } from "react-router";
import { ArrowRight, CheckCircle2, ChevronRight, Clock, LifeBuoy, MapPin, ShieldAlert, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import { FadeIn, PulseOnce } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { formatBookingCode } from "@hope/shared";
import type { Me } from "../api";
import { Shell } from "../components/shell";
import { useMe, useShelters } from "../hooks";
import { useI18n, type Key } from "../i18n";

export function HomeScreen() {
  const { data: me } = useMe();
  const { t, l } = useI18n();
  if (!me) return null;

  const w = me.warning;
  const active = w?.incidentStatus === "active";
  const area = l(me.citizen.area);

  return (
    <Shell subtitle={area ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{area}</span> : undefined}>
      <div className="space-y-5">
        {/* What the citizen has already done comes first: that's what they need to see at a glance. */}
        {me.rescue && me.rescue.status !== "closed" && active ? <RescueSummary rescue={me.rescue} /> : null}
        {me.booking && (me.booking.status === "held" || me.booking.status === "checked_in") && active ? <BookingSummary me={me} /> : null}

        {w && active ? <WarningCard me={me} /> : w && w.incidentStatus === "resolved" ? <AllClearCard area={area} /> : <NoWarningCard area={area} />}
        {me.booking?.status === "expired" && active && !me.rescue ? <ExpiredCard /> : null}

        {active ? <NearbyShelters /> : null}
        <HouseholdCard me={me} />
      </div>
    </Shell>
  );
}

function WarningCard({ me }: { me: Me }) {
  const { t, time } = useI18n();
  const w = me.warning!;
  const evacuate = w.level === "evacuate" || w.alertKind === "evacuate";
  const levelKey: Key = evacuate ? "levelEvacuate" : w.level === "watch" ? "levelWatch" : "levelWarning";
  const hasBooking = me.booking && (me.booking.status === "held" || me.booking.status === "checked_in");
  // Once the citizen has acted, the warning becomes a compact reminder.
  const acted = Boolean(hasBooking || (me.rescue && me.rescue.status !== "closed"));

  return (
    <FadeIn y={-12}>
      <section
        aria-live="polite"
        className={cn(
          "overflow-hidden rounded-2xl border",
          evacuate ? "border-danger/30 bg-danger-soft" : "border-warning/40 bg-warning-soft",
        )}
      >
        <div className="p-5">
          <div className="flex items-center gap-2">
            <PulseOnce pulseKey={w.at} className={cn("inline-flex size-2.5 rounded-full", evacuate ? "bg-danger" : "bg-warning")} />
            <span className={cn("text-sm font-semibold uppercase tracking-wide", evacuate ? "text-danger" : "text-warning-foreground dark:text-warning")}>
              {t(levelKey)}
            </span>
            <span className="ml-auto text-xs text-muted-foreground tabular">{t("issuedAt", { time: time(w.at) })}</span>
          </div>
          <h2 className="mt-3 flex items-start gap-2 font-display text-2xl font-bold leading-tight">
            {evacuate ? <ShieldAlert className="mt-1 size-6 shrink-0 text-danger" /> : <TriangleAlert className="mt-1 size-6 shrink-0 text-warning-foreground dark:text-warning" />}
            {w.title.toLowerCase().includes(w.hazard) ? w.title : `${t(`hazard_${w.hazard}` as Key)} · ${w.title}`}
          </h2>
          {w.summary && !acted ? <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{w.summary}</p> : null}
          <p className="mt-3 text-xs font-medium text-muted-foreground">{t("source", { source: w.source })}</p>
        </div>
        {!acted ? (
          <div className="grid gap-2 border-t border-foreground/5 bg-background/60 p-3">
            <Button asChild size="lg" className="h-14 rounded-xl text-base">
              <Link to="/book">
                {t("bookShelter")} <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-danger/40 text-base text-danger hover:bg-danger-soft hover:text-danger">
              <Link to="/rescue">
                <LifeBuoy className="size-5" /> {t("needRescue")}
              </Link>
            </Button>
          </div>
        ) : null}
      </section>
    </FadeIn>
  );
}

function NoWarningCard({ area }: { area: string }) {
  const { t } = useI18n();
  return (
    <FadeIn>
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 text-safe">
          <ShieldCheck className="size-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">{t("noWarning")}</span>
        </div>
        <p className="mt-3 text-lg leading-relaxed">{t("noWarningBody", { area })}</p>
      </section>
    </FadeIn>
  );
}

function AllClearCard({ area }: { area: string }) {
  const { t } = useI18n();
  return (
    <FadeIn>
      <section className="rounded-2xl border border-safe/30 bg-safe-soft p-5">
        <div className="flex items-center gap-2 text-safe">
          <CheckCircle2 className="size-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">{t("allClear")}</span>
        </div>
        <p className="mt-3 text-lg leading-relaxed">{t("allClearBody", { area })}</p>
      </section>
    </FadeIn>
  );
}

function BookingSummary({ me }: { me: Me }) {
  const { t, l, time } = useI18n();
  const b = me.booking!;
  const checkedIn = b.status === "checked_in";
  return (
    <FadeIn delay={0.05}>
      <Link to="/booking" className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t("yourBooking")}</span>
          {checkedIn ? (
            <Badge className="bg-safe text-safe-foreground"><CheckCircle2 /> {t("checkedIn")}</Badge>
          ) : (
            <span className="font-display text-lg font-bold tracking-wider tabular">{formatBookingCode(b.code)}</span>
          )}
        </div>
        <p className="mt-2 text-xl font-semibold leading-snug">{l(b.shelter.name)}</p>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Users className="size-4" />{t("people", { n: b.people })}</span>
          {!checkedIn ? <span className="inline-flex items-center gap-1"><Clock className="size-4" />{t("holdUntil", { time: time(b.holdUntil) })}</span> : null}
          <ChevronRight className="ml-auto size-5" />
        </div>
      </Link>
    </FadeIn>
  );
}

function ExpiredCard() {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border bg-card p-5">
      <p className="font-medium">{t("bookingExpired")}</p>
      <Button asChild className="mt-3 h-12 w-full rounded-xl"><Link to="/book">{t("bookAgain")}</Link></Button>
    </section>
  );
}

function RescueSummary({ rescue }: { rescue: NonNullable<Me["rescue"]> }) {
  const { t } = useI18n();
  const done = rescue.status === "rescued";
  return (
    <FadeIn delay={0.05}>
      <section className={cn("rounded-2xl border p-5", done ? "border-safe/30 bg-safe-soft" : "border-danger/30 bg-danger-soft")}>
        <div className="flex items-center gap-2">
          <LifeBuoy className={cn("size-5", done ? "text-safe" : "text-danger")} />
          <span className="text-sm font-semibold">{t("rescueRequested")}</span>
          <span className="ml-auto text-sm text-muted-foreground tabular">{rescue.ref}</span>
        </div>
        <p className="mt-3 text-lg leading-relaxed">{t(`rescueStatus_${rescue.status}` as Key, { team: rescue.assignedTo ?? "" })}</p>
        {!done ? <p className="mt-2 text-sm text-muted-foreground">{t("stayHigh")}</p> : null}
      </section>
    </FadeIn>
  );
}

function NearbyShelters() {
  const { t, l } = useI18n();
  const shelters = useShelters(true);
  const list = shelters.data?.shelters.filter((s) => s.safe_for_hazard).slice(0, 4) ?? [];
  if (!list.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{t("nearbyShelters")}</h2>
      <ul className="divide-y rounded-2xl border bg-card">
        {list.map((s) => {
          const full = s.status !== "open" || s.available <= 0;
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l(s.name)}</p>
                <p className="text-sm text-muted-foreground">
                  {t("km", { n: s.distance_km })}
                  {s.accessible ? ` · ${t("accessible")}` : ""}
                </p>
              </div>
              <span className={cn("shrink-0 text-sm font-medium tabular", full ? "text-danger" : "text-safe")}>
                {full ? t("full") : t("available", { n: s.available })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HouseholdCard({ me }: { me: Me }) {
  const { t } = useI18n();
  const h = me.household;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-medium text-muted-foreground">{t("household")}</h2>
      <p className="mt-1 text-lg font-semibold">{h.size === 1 ? t("person") : t("people", { n: h.size })}</p>
      {h.needsMobilityHelp ? <p className="mt-1 text-sm text-muted-foreground">{t("needsHelpWalking")}</p> : null}
    </section>
  );
}
