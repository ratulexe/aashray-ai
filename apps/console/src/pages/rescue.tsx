import { useQuery } from "@tanstack/react-query";
import { Accessibility, Baby, CheckCircle2, MapPin, MessageSquare, Smartphone, UserRound, Users } from "lucide-react";
import { AnimatePresence, m } from "@hope/ui/components/motion";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@hope/ui/components/dropdown-menu";
import { cn } from "@hope/ui/lib/utils";
import { api, en, type RescueRow } from "../api";
import { fmtTime, minutesBetween, useAction, useOverview, useRoles } from "../hooks";

const TEAMS = ["NDRF Team 1", "NDRF Team 2", "Civil Defence Boat 3", "Block Rescue Volunteers"];

const STATUS_STYLE: Record<RescueRow["status"], string> = {
  new: "bg-danger text-danger-foreground",
  triaged: "bg-warning text-warning-foreground",
  assigned: "bg-info text-info-foreground",
  rescued: "bg-safe text-safe-foreground",
  closed: "bg-muted text-muted-foreground",
};

export function RescuePage() {
  const { data: o } = useOverview();
  const { can } = useRoles();
  const list = useQuery({ queryKey: ["rescue"], queryFn: () => api<{ requests: RescueRow[] }>("/rescue"), refetchInterval: 1500 });
  const update = useAction<{ id: string; status: string; team?: string }>((b) => `/rescue/${b.id}`);
  const desk = can("rescue_desk");
  const rows = list.data?.requests ?? [];
  const open = rows.filter((r) => r.status !== "rescued" && r.status !== "closed");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold">Rescue desk</h1>
        <span className="text-sm text-muted-foreground">{open.length} open · priority 1 is most urgent</span>
      </div>
      {!desk ? <p className="text-sm text-muted-foreground">View only. The rescue desk role assigns teams.</p> : null}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <m.li key={r.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4", (r.status === "rescued" || r.status === "closed") && "opacity-60")}>
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg font-display text-lg font-bold", r.priority === 1 ? "bg-danger text-danger-foreground" : r.priority === 2 ? "bg-warning text-warning-foreground" : "bg-muted")}
                aria-label={`Priority ${r.priority}`}>
                P{r.priority}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular">{r.ref}</span>
                  <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-3.5" />{r.people}</span>
                  {r.vulnerable.elderly ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><UserRound className="size-3.5" />{String(r.vulnerable.elderly)} elderly</span> : null}
                  {r.vulnerable.children ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Baby className="size-3.5" />{String(r.vulnerable.children)}</span> : null}
                  {r.vulnerable.mobility ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Accessibility className="size-3.5" />needs help</span> : null}
                </div>
                <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />{en(r.area)}{r.landmark ? ` · ${r.landmark}` : ""}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {r.channel === "pwa" ? <Smartphone className="size-3" /> : <MessageSquare className="size-3" />}
                  {r.channel.toUpperCase()} · {fmtTime(r.created_at)}
                  {o ? ` · ${minutesBetween(r.created_at, o.now)} min ago` : ""}
                  {r.assigned_to ? ` · ${r.assigned_to}` : ""}
                </p>
              </div>
              {desk && (r.status === "new" || r.status === "triaged") ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm">Assign team</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Available teams</DropdownMenuLabel>
                    {TEAMS.map((t) => <DropdownMenuItem key={t} onSelect={() => update.mutate({ id: r.id, status: "assigned", team: t })}>{t}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {desk && r.status === "assigned" ? (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: "rescued" })}><CheckCircle2 className="size-4" /> Mark rescued</Button>
              ) : null}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      {list.data && !rows.length ? <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No rescue requests.</p> : null}
    </div>
  );
}
