import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Clock, Loader2, Minus, Plus, Users, XCircle } from "lucide-react";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import { Input } from "@hope/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hope/ui/components/select";
import { FadeIn } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { formatBookingCode, type CheckinResult, type LocalizedText } from "@hope/shared";
import { api, en } from "../api";
import { fmtTime, useAction, useOverview, useRoles } from "../hooks";
import { CapacityBar } from "../components/status";

interface CheckinResponse {
  result: CheckinResult;
  booking?: { code: string; people: number; household: { adults: number; children: number; elderly: number; needsMobilityHelp: boolean }; shelterId: string; shelterName: LocalizedText; status: string; holdUntil: string; checkedInAt: string | null };
}

const RESULT_TEXT: Record<CheckinResult, { title: string; tone: "safe" | "warning" | "danger" }> = {
  CHECKED_IN: { title: "Checked in", tone: "safe" },
  NOT_FOUND: { title: "No booking with this code", tone: "danger" },
  WRONG_SHELTER: { title: "Booked at a different shelter", tone: "warning" },
  WRONG_INCIDENT: { title: "Booking is from an incident that has ended", tone: "danger" },
  EXPIRED: { title: "Booking expired", tone: "warning" },
  ALREADY_CHECKED_IN: { title: "Already checked in", tone: "warning" },
  CANCELLED: { title: "Booking was cancelled", tone: "danger" },
};

const SHELTER_KEY = "hope-operator-shelter";

export function CheckinPage() {
  const { data: o } = useOverview();
  const { can } = useRoles();
  const [shelterId, setShelterId] = useState<string>(() => {
    try { return localStorage.getItem(SHELTER_KEY) ?? ""; } catch { return ""; }
  });
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [walkIns, setWalkIns] = useState(1);
  const checkin = useAction<{ code: string; shelterId: string }, CheckinResponse>("/checkin");
  const walkIn = useAction<{ shelterId: string; people: number }>("/walkins", { success: "Walk-ins recorded" });

  useEffect(() => {
    if (!shelterId && o?.shelters[0]) setShelterId(o.shelters[0].id);
  }, [o, shelterId]);

  const choose = (id: string) => {
    setShelterId(id);
    setResult(null);
    try { localStorage.setItem(SHELTER_KEY, id); } catch { /* ignore */ }
  };

  const arrivals = useQuery({
    queryKey: ["arrivals", shelterId],
    queryFn: () => api<{ arrivals: { code: string; people: number; status: string; hold_expires_at: string; checked_in_at: string | null; household: { elderly: number; needsMobilityHelp: boolean } }[] }>(`/shelters/${shelterId}/arrivals`),
    enabled: Boolean(shelterId),
    refetchInterval: 2000,
  });

  if (!o) return null;
  const shelter = o.shelters.find((s) => s.id === shelterId);
  const operator = can("shelter_operator");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !shelterId) return;
    checkin.mutate({ code, shelterId }, { onSuccess: (r) => { setResult(r); if (r.result === "CHECKED_IN") setCode(""); } });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="shelter">Your shelter</label>
          <Select value={shelterId} onValueChange={choose}>
            <SelectTrigger id="shelter" className="mt-1 h-11 w-full"><SelectValue placeholder="Choose a shelter" /></SelectTrigger>
            <SelectContent>
              {o.shelters.map((s) => <SelectItem key={s.id} value={s.id}>{en(s.name)} ({s.code})</SelectItem>)}
            </SelectContent>
          </Select>
          {shelter ? (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span><span className="font-semibold tabular">{shelter.occupied}</span> sheltered · <span className="tabular">{shelter.reserved}</span> expected</span>
                <span className="text-muted-foreground tabular">{Math.max(0, shelter.capacity - shelter.occupied - shelter.reserved)} free of {shelter.capacity}</span>
              </div>
              <CapacityBar capacity={shelter.capacity} reserved={shelter.reserved} occupied={shelter.occupied} className="h-2.5" />
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="rounded-xl border bg-card p-4">
          <label htmlFor="code" className="font-display text-lg font-bold">Check in a family</label>
          <p className="text-sm text-muted-foreground">Type the booking code they show you, or scan their QR code.</p>
          <div className="mt-3 flex gap-2">
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7Q-M3P" autoComplete="off"
              className="h-14 font-display text-2xl tracking-[0.2em] uppercase tabular" maxLength={8} disabled={!operator} />
            <Button type="submit" className="h-14 px-6" disabled={!operator || !code.trim() || checkin.isPending}>
              {checkin.isPending ? <Loader2 className="size-5 animate-spin" /> : "Check in"}
            </Button>
          </div>
          {!operator ? <p className="mt-2 text-xs text-muted-foreground">Only shelter operators can check people in.</p> : null}
        </form>

        {result ? <ResultCard result={result} onSwitch={result.booking ? () => choose(result.booking!.shelterId) : undefined} /> : null}

        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Walk-ins</h2>
          <p className="text-sm text-muted-foreground">People who arrive without a booking still take space.</p>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="secondary" size="icon" className="size-11" onClick={() => setWalkIns((n) => Math.max(1, n - 1))} aria-label="Fewer"><Minus /></Button>
            <span className="w-10 text-center font-display text-2xl font-bold tabular">{walkIns}</span>
            <Button variant="secondary" size="icon" className="size-11" onClick={() => setWalkIns((n) => Math.min(100, n + 1))} aria-label="More"><Plus /></Button>
            <Button className="ml-auto h-11" disabled={!operator || !shelterId || walkIn.isPending} onClick={() => walkIn.mutate({ shelterId, people: walkIns }, { onSuccess: () => setWalkIns(1) })}>
              Record {walkIns} {walkIns === 1 ? "person" : "people"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <header className="border-b px-4 py-3">
          <h2 className="font-display text-lg font-bold">Expected arrivals</h2>
        </header>
        <ul className="max-h-[640px] divide-y overflow-auto">
          {(arrivals.data?.arrivals ?? []).map((a) => (
            <li key={a.code} className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-display text-base font-bold tracking-wider tabular">{formatBookingCode(a.code)}</span>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-3.5" />{a.people}</span>
              {a.household?.needsMobilityHelp ? <Badge variant="outline" className="h-5 text-[11px]">Needs help</Badge> : null}
              <span className="ml-auto text-xs text-muted-foreground tabular">
                {a.status === "checked_in" ? <span className="inline-flex items-center gap-1 text-safe"><CheckCircle2 className="size-3.5" />{a.checked_in_at ? fmtTime(a.checked_in_at) : ""}</span> : <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />by {fmtTime(a.hold_expires_at)}</span>}
              </span>
            </li>
          ))}
          {arrivals.data && !arrivals.data.arrivals.length ? <li className="px-4 py-8 text-center text-sm text-muted-foreground">No bookings for this shelter yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function ResultCard({ result, onSwitch }: { result: CheckinResponse; onSwitch?: () => void }) {
  const r = RESULT_TEXT[result.result];
  const b = result.booking;
  const Icon = r.tone === "safe" ? CheckCircle2 : r.tone === "warning" ? AlertTriangle : XCircle;
  return (
    <FadeIn key={`${result.result}-${b?.code}`}>
      <div className={cn("rounded-xl border p-4", r.tone === "safe" ? "border-safe/30 bg-safe-soft" : r.tone === "warning" ? "border-warning/40 bg-warning-soft" : "border-danger/30 bg-danger-soft")}>
        <div className="flex items-center gap-2">
          <Icon className={cn("size-5", r.tone === "safe" ? "text-safe" : r.tone === "warning" ? "text-warning-foreground" : "text-danger")} />
          <p className="font-semibold">{r.title}</p>
          <code className="ml-auto text-xs text-muted-foreground">{result.result}</code>
        </div>
        {b ? (
          <div className="mt-2 text-sm">
            <p><span className="font-display font-bold tracking-wider">{formatBookingCode(b.code)}</span> · {b.people} people
              {b.household.elderly ? ` · ${b.household.elderly} elderly` : ""}{b.household.needsMobilityHelp ? " · needs help walking" : ""}</p>
            {result.result === "WRONG_SHELTER" ? (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-muted-foreground">Their place is at <span className="font-medium text-foreground">{en(b.shelterName)}</span>.</p>
                {onSwitch ? <Button size="sm" variant="outline" className="ml-auto" onClick={onSwitch}><ArrowRightLeft className="size-3.5" /> Switch shelter</Button> : null}
              </div>
            ) : null}
            {result.result === "EXPIRED" ? <p className="mt-1 text-muted-foreground">Held until {fmtTime(b.holdUntil)}. If there is space, record them as walk-ins.</p> : null}
          </div>
        ) : null}
      </div>
    </FadeIn>
  );
}
