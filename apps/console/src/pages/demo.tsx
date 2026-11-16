/**
 * Demo presenter: a guided 10-step story with three simulated phones.
 * Every step can also be done by hand in the other console pages.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { Progress } from "@hope/ui/components/progress";
import { StepTransition } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { api, ApiError, type DemoInfo, type Level, type MapData, type Overview, type RescueRow } from "../api";
import { useDemoInfo, useMapData, useOverview } from "../hooks";
import { IncidentMap } from "../components/incident-map";
import { PwaPhone, SmsPhone, WhatsAppPhone, sendAsPersona } from "../components/phones";
import { Kpis, ShelterList } from "./overview";

const COASTAL = ["Fraserganj", "Moushuni", "Haripur"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Ctx {
  switchTo: (key: string) => Promise<void>;
  overview: () => Promise<Overview>;
  info: () => Promise<DemoInfo>;
  map: () => Promise<MapData>;
  note: (text: string) => void;
}

interface Step {
  title: string;
  body: string;
  action?: { label: string; run: (ctx: Ctx) => Promise<void> };
}

const STEPS: Step[] = [
  {
    title: "The area",
    body: "Namkhana block, South 24 Parganas: 7 gram panchayats, 8 shelters and 503 registered households. Purple dots are vulnerable households (elderly, or needing help to walk). Everything here is fictional.",
  },
  {
    title: "A warning arrives",
    body: "A (fictional) official bulletin says cyclone DEMO-1 will reach the coast near Fraserganj in about 18 hours. HOPE never predicts disasters itself; every incident links to an official source.",
  },
  {
    title: "Coordinator targets the alert",
    body: "The coordinator marks the coastal gram panchayats for evacuation and the others for a warning, then drafts the alert. The preview shows recipients, the text in three languages, and SMS segments.",
    action: {
      label: "Select areas and draft",
      run: async (c) => {
        await c.switchTo("coordinator");
        const [o, map] = await Promise.all([c.overview(), c.map()]);
        const zones = map.areas
          .filter((a) => a.level === "gram_panchayat")
          .map((a) => ({ areaId: a.id, level: (COASTAL.includes(a.name.en) ? "evacuate" : "warning") as Level }));
        await api(`/incidents/${o.incident!.id}/zones`, { method: "PUT", body: { zones } });
        await api(`/incidents/${o.incident!.id}/alerts`, { body: { kind: "warning", level: "warning" } });
        c.note("Draft created: evacuate the coast, warn the rest.");
      },
    },
  },
  {
    title: "A second person approves",
    body: "The coordinator can't approve their own alert: that's enforced by the database. Switching to the approver, who checks the preview and approves.",
    action: {
      label: "Try self-approval, then approve",
      run: async (c) => {
        const o = await c.overview();
        const draft = o.alerts.find((a) => a.status === "draft");
        if (!draft) throw new Error("No draft alert. Run the previous step first.");
        try {
          await api(`/alerts/${draft.id}/approve`, { body: {} });
        } catch (e) {
          c.note(e instanceof ApiError ? `Blocked: ${e.message}` : "Blocked");
        }
        await c.switchTo("approver");
        await sleep(600);
        await api(`/alerts/${draft.id}/approve`, { body: {} });
        c.note("Approved by a second person. Sending now, most vulnerable first.");
      },
    },
  },
  {
    title: "The alert goes out",
    body: "Watch the delivery counter climb and the three phones receive the alert: Rina by SMS in Bengali, Arjun on WhatsApp in English, Salma in the HOPE app in Hindi.",
  },
  {
    title: "Rina books by SMS",
    body: "Rina has a basic phone. She replies 1 to book, 1 to confirm 4 people, and 1 because her mother needs help walking. HOPE picks the safest accessible shelter with space and holds the places.",
    action: {
      label: "Reply as Rina",
      run: async (c) => {
        const info = await c.info();
        const rina = info.personas.find((p) => p.key === "rina")!;
        for (const text of ["1", "1", "1"]) {
          await sendAsPersona(rina.phone, "sms", text);
          await sleep(1100);
        }
        c.note("Rina has a booking code by SMS.");
      },
    },
  },
  {
    title: "The crowd replies",
    body: "Every alerted household replies (simulated) through the same conversation engine. Capacity bars fill; when the coastal shelter is full, new bookings go to the next best one. About 5% ask for rescue.",
    action: {
      label: "Start crowd simulation",
      run: async (c) => {
        await api("/demo/crowd", { body: { size: 500 } });
        c.note("Crowd started: ~25 seconds of replies.");
      },
    },
  },
  {
    title: "Salma asks for rescue",
    body: "Water is rising around Salma's house and her mother can't walk. She taps “I need rescue” in the app. Her request goes to the rescue desk as priority 1, and a team is assigned.",
    action: {
      label: "Request rescue and assign a team",
      run: async (c) => {
        const info = await c.info();
        const salma = info.personas.find((p) => p.key === "salma")!;
        const { ref } = await api<{ ref: string }>("/demo/personas/salma/rescue", { body: { people: 5 } });
        await sleep(1500);
        await c.switchTo("rescue");
        const { requests } = await api<{ requests: RescueRow[] }>("/rescue");
        const req = requests.find((r) => r.ref === ref) ?? requests.find((r) => r.phone === salma.phone);
        if (req && req.status !== "assigned") await api(`/rescue/${req.id}`, { body: { status: "assigned", team: "NDRF Team 2" } });
        c.note(`${ref}: NDRF Team 2 assigned. Salma's app updates.`);
      },
    },
  },
  {
    title: "Check-in at the shelter",
    body: "Rina reaches a shelter. The operator first tries her code at the wrong shelter and HOPE says where she is booked. At the right shelter she is checked in and capacity moves from reserved to sheltered.",
    action: {
      label: "Check Rina in",
      run: async (c) => {
        await c.switchTo("operator");
        const [info, o] = await Promise.all([c.info(), c.overview()]);
        const b = info.personas.find((p) => p.key === "rina")?.booking;
        if (!b) throw new Error("Rina has no booking yet. Run step 6 first.");
        const wrong = o.shelters.find((s) => s.id !== b.shelterId)!;
        const r1 = await api<{ result: string }>("/checkin", { body: { code: b.code, shelterId: wrong.id } });
        c.note(`At ${wrong.code}: ${r1.result}`);
        await sleep(1800);
        const r2 = await api<{ result: string }>("/checkin", { body: { code: b.code, shelterId: b.shelterId } });
        c.note(`At ${b.shelterCode}: ${r2.result}`);
      },
    },
  },
  {
    title: "Time passes · all clear",
    body: "Two hours later: families who never arrived lose their hold and the places are released. When the official all-clear comes, the coordinator drafts it, the approver approves, and the incident is resolved.",
    action: {
      label: "Fast-forward 2 h and send all clear",
      run: async (c) => {
        await api("/demo/clock", { body: { minutes: 120 } });
        await sleep(4000);
        await c.switchTo("coordinator");
        const o = await c.overview();
        await api(`/incidents/${o.incident!.id}/alerts`, { body: { kind: "all_clear", level: "watch" } });
        await c.switchTo("approver");
        const o2 = await c.overview();
        const draft = o2.alerts.find((a) => a.status === "draft");
        if (draft) await api(`/alerts/${draft.id}/approve`, { body: {} });
        c.note("All clear sent. Incident resolved.");
      },
    },
  },
];

const STEP_KEY = "hope-demo-step";

export function DemoPage() {
  const qc = useQueryClient();
  const overview = useOverview();
  const map = useMapData();
  const info = useDemoInfo();
  const [step, setStepState] = useState(() => {
    try { return Math.min(STEPS.length - 1, Number(localStorage.getItem(STEP_KEY) ?? 0)); } catch { return 0; }
  });
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<string[]>([]);
  const [frameKey, setFrameKey] = useState(0);

  const setStep = (n: number) => {
    setStepState(n);
    setNotes([]);
    try { localStorage.setItem(STEP_KEY, String(n)); } catch { /* ignore */ }
  };

  const ctx: Ctx = useMemo(() => ({
    switchTo: async (key) => {
      await api("/demo/switch", { body: { key } });
      await qc.invalidateQueries({ queryKey: ["staff"] });
    },
    overview: () => api<Overview>("/overview"),
    info: () => api<DemoInfo>("/demo/info"),
    map: () => api<MapData>("/map"),
    note: (text) => setNotes((n) => [...n, text]),
  }), [qc]);

  const run = async () => {
    const action = STEPS[step]!.action;
    if (!action) return;
    setRunning(true);
    setNotes([]);
    try {
      await action.run(ctx);
      setDone((d) => new Set(d).add(step));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Step failed");
    } finally {
      setRunning(false);
      await qc.invalidateQueries();
    }
  };

  const reset = async () => {
    setRunning(true);
    try {
      await api("/demo/reset", { body: {} });
      setDone(new Set());
      setStep(0);
      setFrameKey((k) => k + 1);
      await qc.invalidateQueries();
      toast.success("Demo reset to the start");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setRunning(false);
    }
  };

  const zones = useMemo(() => new Map((overview.data?.zones ?? []).map((z) => [z.area_id, z.level as Level])), [overview.data?.zones]);
  const s = STEPS[step]!;
  const personas = info.data?.personas ?? [];
  const p = (k: string) => personas.find((x) => x.key === k);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      {/* Guided tour */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-3 border-b px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guided tour</span>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1 max-w-48" />
          <span className="text-xs tabular text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={reset} disabled={running}>
            <RotateCcw className="size-4" /> Reset demo
          </Button>
        </div>
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
          <StepTransition stepKey={step} className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              {s.title}
              {done.has(step) ? <Check className="size-5 text-safe" /> : null}
            </h2>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            {notes.length ? (
              <ul className="mt-2 space-y-0.5 text-sm">
                {notes.map((n, i) => <li key={i} className="flex items-center gap-1.5"><Check className="size-3.5 text-safe" />{n}</li>)}
              </ul>
            ) : null}
          </StepTransition>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || running} aria-label="Previous step"><ChevronLeft /></Button>
            {s.action ? (
              <Button onClick={run} disabled={running} className="min-w-52">
                {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {s.action.label}
              </Button>
            ) : null}
            <Button variant={s.action ? "outline" : "default"} onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1 || running}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)]">
        <section className="flex flex-wrap items-start justify-center gap-5 xl:justify-start" aria-label="Simulated phones">
          {p("rina") ? <SmsPhone persona={p("rina")!} /> : null}
          {p("arjun") ? <WhatsAppPhone persona={p("arjun")!} /> : null}
          {p("salma") ? <PwaPhone persona={p("salma")!} reloadKey={frameKey} /> : null}
        </section>
        <div className="min-w-0 space-y-4">
          {overview.data ? <Kpis o={overview.data} compact /> : null}
          <div className={cn("h-[300px]", !map.data && "animate-pulse rounded-xl bg-muted")}>
            {map.data && overview.data ? <IncidentMap data={map.data} shelters={overview.data.shelters} zones={zones} /> : null}
          </div>
          {overview.data ? <ShelterList o={overview.data} className="max-h-[340px] overflow-auto" /> : null}
        </div>
      </div>
    </div>
  );
}
