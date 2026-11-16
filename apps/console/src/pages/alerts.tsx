import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, MessageSquare, OctagonX, ShieldCheck, Smartphone, UsersRound } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@hope/ui/components/alert-dialog";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import { Progress } from "@hope/ui/components/progress";
import { ToggleGroup, ToggleGroupItem } from "@hope/ui/components/toggle-group";
import { FadeIn } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { api, en, type AlertSummary, type Level, type Preview } from "../api";
import { fmtTime, useAction, useMapData, useOverview, useRoles, useStaff } from "../hooks";
import { IncidentMap, MapLegend } from "../components/incident-map";
import { LEVEL_STYLE, LevelBadge } from "../components/status";

const CYCLE: (Level | null)[] = [null, "watch", "warning", "evacuate"];
const SHORT: Record<Level, string> = { watch: "Watch", warning: "Warn", evacuate: "Evac" };
// The selected level shows in its status colour.
const SELECTED: Record<Level, string> = {
  watch: "data-[state=on]:bg-info data-[state=on]:text-info-foreground",
  warning: "data-[state=on]:bg-warning data-[state=on]:text-warning-foreground",
  evacuate: "data-[state=on]:bg-danger data-[state=on]:text-danger-foreground",
};
const LANG_NAME = { bn: "Bengali", en: "English", hi: "Hindi" } as const;

export function AlertsPage() {
  const overview = useOverview();
  const map = useMapData();
  const { can } = useRoles();
  const o = overview.data;
  const serverZones = useMemo(() => new Map((o?.zones ?? []).map((z) => [z.area_id, z.level as Level])), [o?.zones]);
  const [zones, setZones] = useState<Map<number, Level>>(new Map());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setZones(new Map(serverZones));
  }, [serverZones, dirty]);

  const save = useAction<{ zones: { areaId: number; level: Level }[] }>(() => `/incidents/${o!.incident!.id}/zones`, { method: "PUT", success: "Affected areas saved" });
  const editable = can("coordinator") && o?.incident?.status !== "resolved";

  const setLevel = (areaId: number, level: Level | null) => {
    if (!editable) return;
    const next = new Map(zones);
    if (level) next.set(areaId, level);
    else next.delete(areaId);
    setZones(next);
    setDirty(true);
  };

  if (!o || !map.data) return null;
  if (!o.incident) return <p className="text-muted-foreground">No incident.</p>;
  const gps = map.data.areas.filter((a) => a.level === "gram_panchayat");
  const draft = o.alerts.find((a) => a.status === "draft");

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_460px]">
      <section className="space-y-4">
        <Bulletin />
        <div className="rounded-xl border bg-card">
          <header className="flex items-center gap-3 border-b px-4 py-3">
            <h2 className="font-display text-lg font-bold">1. Affected areas</h2>
            <span className="text-xs text-muted-foreground">{editable ? "Click an area on the map to change its level" : "View only"}</span>
            {editable ? (
              <Button size="sm" className="ml-auto" disabled={!dirty || save.isPending}
                onClick={() => save.mutate({ zones: [...zones].map(([areaId, level]) => ({ areaId, level })) }, { onSuccess: () => setDirty(false) })}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Save areas
              </Button>
            ) : null}
          </header>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-2">
              <div className="h-[380px]">
                <IncidentMap data={map.data} shelters={o.shelters} zones={zones} showHouseholds={false}
                  onAreaClick={editable ? (id) => setLevel(id, CYCLE[(CYCLE.indexOf(zones.get(id) ?? null) + 1) % CYCLE.length]!) : undefined} />
              </div>
              <MapLegend />
            </div>
            <ul className="space-y-1">
              {gps.map((g) => (
                <li key={g.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{en(g.name)}</p>
                    <p className="text-xs text-muted-foreground">{g.households} households · {g.vulnerable} vulnerable</p>
                  </div>
                  <ToggleGroup type="single" size="sm" variant="outline" value={zones.get(g.id) ?? "none"} disabled={!editable}
                    onValueChange={(v: string) => v && setLevel(g.id, v === "none" ? null : (v as Level))}>
                    <ToggleGroupItem value="none" aria-label="Not affected" className="px-2 text-xs">Off</ToggleGroupItem>
                    {(["watch", "warning", "evacuate"] as const).map((l) => (
                      <ToggleGroupItem key={l} value={l} aria-label={LEVEL_STYLE[l].label} className={cn("px-2 text-xs", SELECTED[l])}>
                        {SHORT[l]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <DraftPanel incidentId={o.incident.id} hasZones={serverZones.size > 0} dirty={dirty} draft={draft} resolved={o.incident.status === "resolved"} />
        <History alerts={o.alerts.filter((a) => a.status !== "draft")} />
      </section>
    </div>
  );
}

function Bulletin() {
  const { data: o } = useOverview();
  if (!o?.incident) return null;
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Official bulletin · {o.incident.source} <span className="text-muted-foreground">({o.incident.source_ref})</span></p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.incident.summary}</p>
      </div>
    </div>
  );
}

function DraftPanel({ incidentId, hasZones, dirty, draft, resolved }: { incidentId: string; hasZones: boolean; dirty: boolean; draft?: AlertSummary; resolved: boolean }) {
  const { can } = useRoles();
  const [kind, setKind] = useState<"warning" | "all_clear">("warning");
  const create = useAction<{ kind: string; level: Level }>(`/incidents/${incidentId}/alerts`, { success: "Draft ready for approval" });

  return (
    <div className="rounded-xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="font-display text-lg font-bold">2. Alert</h2>
      </header>
      <div className="space-y-4 p-4">
        {resolved ? <p className="text-sm text-muted-foreground">This incident is resolved.</p> : null}
        {!draft && !resolved && can("coordinator") ? (
          <>
            <ToggleGroup type="single" variant="outline" value={kind} onValueChange={(v: string) => v && setKind(v as typeof kind)} className="grid w-full grid-cols-2">
              <ToggleGroupItem value="warning">Alert</ToggleGroupItem>
              <ToggleGroupItem value="all_clear">All clear</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {kind === "warning"
                ? "Every household in the affected areas is alerted. Each gets the wording for its own area's level: evacuate now, warning or watch. Replies 1 and 2 book shelter or ask for rescue."
                : "Ends the incident: everyone who was alerted is told the danger has passed. Open holds are released."}
            </p>
            <Button className="w-full" disabled={!hasZones || dirty || create.isPending}
              onClick={() => create.mutate({ kind, level: "warning" })}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Draft alert
            </Button>
            {!hasZones ? <p className="text-xs text-muted-foreground">Save the affected areas first.</p> : dirty ? <p className="text-xs text-muted-foreground">Save your area changes first.</p> : null}
          </>
        ) : null}
        {!draft && !can("coordinator") && !resolved ? <p className="text-sm text-muted-foreground">No alert is waiting for approval.</p> : null}
        {draft ? <DraftPreview draft={draft} /> : null}
      </div>
    </div>
  );
}

function DraftPreview({ draft }: { draft: AlertSummary }) {
  const { data: me } = useStaff();
  const { can } = useRoles();
  const preview = useQuery({ queryKey: ["preview", draft.id], queryFn: () => api<Preview>(`/alerts/${draft.id}/preview`) });
  const approve = useAction<Record<string, never>>(`/alerts/${draft.id}/approve`, { success: "Alert approved — sending now" });
  const cancel = useAction<Record<string, never>>(`/alerts/${draft.id}/cancel`, { success: "Draft discarded" });
  const ownDraft = me?.staff.id === draft.created_by;
  const p = preview.data;

  return (
    <FadeIn className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Draft</Badge>
        {draft.kind === "all_clear" ? <Badge className="bg-safe text-safe-foreground">All clear</Badge> : <LevelBadge level={draft.kind === "evacuate" ? "evacuate" : draft.level} />}
        <span className="ml-auto text-xs text-muted-foreground">by {draft.created_by_name} · {fmtTime(draft.created_at)}</span>
      </div>
      {p ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat icon={UsersRound} label="Recipients" value={p.total} />
            <Stat icon={MessageSquare} label="SMS" value={p.groups.filter((g) => g.channel === "sms").reduce((s, g) => s + g.n, 0)} />
            <Stat icon={Smartphone} label="WhatsApp / app" value={p.groups.filter((g) => g.channel !== "sms").reduce((s, g) => s + g.n, 0)} />
          </div>
          <div className="space-y-2">
            {p.texts.map((t) => (
              <div key={`${t.level}-${t.lang}`} className="rounded-lg border bg-muted/40 p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    {t.level ? <span className="size-2 rounded-full" style={{ background: LEVEL_STYLE[t.level].fill }} /> : null}
                    {t.level ? `${LEVEL_STYLE[t.level].label} areas · ` : ""}{LANG_NAME[t.lang]}
                  </span>
                  <span className={cn("tabular", t.segments > 2 && "font-semibold text-danger")}>{t.length} chars · {t.segments} SMS segment{t.segments > 1 ? "s" : ""}</span>
                </div>
                <p lang={t.lang} className="text-sm leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated cost if sent through a paid provider: <span className="font-medium text-foreground">₹{(p.estCostPaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>. In demo mode nothing is sent.
          </p>
        </>
      ) : (
        <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      )}

      <div className="flex gap-2">
        {(can("coordinator") || can("approver")) ? (
          <Button variant="ghost" className="flex-1" onClick={() => cancel.mutate({})} disabled={cancel.isPending}>Discard</Button>
        ) : null}
        {can("approver") ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-[2]" disabled={ownDraft || !p || approve.isPending}>
                <ShieldCheck className="size-4" /> Approve and send
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send this alert to {p?.total.toLocaleString("en-IN")} households?</AlertDialogTitle>
                <AlertDialogDescription>
                  It goes out immediately by SMS, WhatsApp and the app, most vulnerable households first. You can stop it while it is still sending.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <AlertDialogAction onClick={() => approve.mutate({})}>Approve and send</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      {can("approver") && ownDraft ? (
        <p className="text-xs text-muted-foreground">Two-person rule: you drafted this alert, so someone else must approve it.</p>
      ) : !can("approver") ? (
        <p className="text-xs text-muted-foreground">Waiting for an approver. Two-person rule: the author can't approve their own alert.</p>
      ) : null}
    </FadeIn>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return (
    <div className="rounded-lg border p-2">
      <Icon className="mx-auto size-4 text-muted-foreground" />
      <p className="mt-1 font-display text-xl font-bold tabular">{value.toLocaleString("en-IN")}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function History({ alerts }: { alerts: AlertSummary[] }) {
  const { can } = useRoles();
  const stop = useAction<{ id: string }>((b) => `/alerts/${b.id}/cancel`, { success: "Sending stopped" });
  if (!alerts.length) return null;
  return (
    <div className="rounded-xl border bg-card">
      <header className="border-b px-4 py-3"><h2 className="font-display text-lg font-bold">Sent alerts</h2></header>
      <ul className="divide-y">
        {alerts.map((a) => {
          const pct = a.recipients ? Math.round((a.delivered / a.recipients) * 100) : 0;
          return (
            <li key={a.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2">
                {a.kind === "all_clear" ? <Badge className="bg-safe text-safe-foreground"><CheckCircle2 /> All clear</Badge> : <LevelBadge level={a.kind === "evacuate" ? "evacuate" : a.level} />}
                <span className="text-xs text-muted-foreground">{a.approved_at ? fmtTime(a.approved_at) : ""} · {a.created_by_name.split(" ")[0]} → {a.approved_by_name?.split(" ")[0]}</span>
                {a.status === "sending" && (can("coordinator") || can("approver")) ? (
                  <Button size="sm" variant="outline" className="ml-auto h-7 border-danger/40 text-danger" onClick={() => stop.mutate({ id: a.id })}>
                    <OctagonX className="size-3.5" /> Stop
                  </Button>
                ) : (
                  <span className="ml-auto text-xs tabular text-muted-foreground">{a.delivered.toLocaleString("en-IN")} / {a.recipients?.toLocaleString("en-IN")}</span>
                )}
              </div>
              <Progress value={pct} className="h-1.5" />
              {a.failed ? <p className="text-xs text-danger">{a.failed} failed</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
