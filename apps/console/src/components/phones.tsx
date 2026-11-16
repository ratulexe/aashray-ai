import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, SendHorizontal, Signal, Wifi } from "lucide-react";
import { AnimatePresence, m } from "@hope/ui/components/motion";
import { Button } from "@hope/ui/components/button";
import { cn } from "@hope/ui/lib/utils";
import { api, type DemoInfo, type PhoneMessage } from "../api";
import { fmtTime } from "../hooks";

type Persona = DemoInfo["personas"][number];

const CITIZEN_URL = import.meta.env.VITE_CITIZEN_URL ?? `${location.protocol}//${location.hostname}:5173`;

function useThread(phone: string) {
  return useQuery({
    queryKey: ["thread", phone],
    queryFn: () => api<{ messages: PhoneMessage[] }>(`/demo/phones/${encodeURIComponent(phone)}/messages`),
    refetchInterval: 1000,
  });
}

export async function sendAsPersona(phone: string, channel: "sms" | "whatsapp", text: string) {
  return api(`/demo/phones/${encodeURIComponent(phone)}/reply`, { body: { text, channel } });
}

function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [dep]);
  return ref;
}

function Caption({ persona, detail }: { persona: Persona; detail: string }) {
  return (
    <div className="mt-2 text-center">
      <p className="text-sm font-medium">{persona.name}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/** A basic phone: plain SMS, number replies. */
export function SmsPhone({ persona }: { persona: Persona }) {
  const thread = useThread(persona.phone);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const msgs = (thread.data?.messages ?? []).filter((x) => x.channel === "sms");
  const scroller = useAutoScroll(msgs.length);

  const send = async (value: string) => {
    if (!value.trim()) return;
    setText("");
    await sendAsPersona(persona.phone, "sms", value).catch(() => undefined);
    await qc.invalidateQueries({ queryKey: ["thread", persona.phone] });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-[230px] rounded-[28px] bg-neutral-800 p-3 pb-4 shadow-lg dark:bg-neutral-900 dark:ring-1 dark:ring-white/10">
        <div className="flex items-center justify-between px-1 pb-1 text-[10px] text-neutral-400">
          <span className="inline-flex items-center gap-1"><Signal className="size-3" />BSNL</span>
          <span>SMS</span>
        </div>
        <div className="rounded-md bg-[#cfd8c4] p-1.5 text-neutral-900">
          <div className="border-b border-neutral-900/20 pb-1 text-[11px] font-semibold">Messages · HOPE</div>
          <div ref={scroller} className="h-[300px] space-y-1.5 overflow-y-auto py-1.5 pr-0.5 font-mono text-[11px] leading-snug">
            <AnimatePresence initial={false}>
              {msgs.map((msg) => (
                <m.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("rounded-sm px-1.5 py-1", msg.dir === "in" ? "ml-6 bg-neutral-900/80 text-[#cfd8c4]" : "mr-2 bg-white/50")}>
                  <p lang={persona.lang} className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className="mt-0.5 text-right text-[9px] opacity-60">{fmtTime(msg.created_at)}{msg.dir === "out" && msg.segments > 1 ? ` · ${msg.segments} SMS` : ""}</p>
                </m.div>
              ))}
            </AnimatePresence>
            {!msgs.length ? <p className="pt-24 text-center text-[11px] opacity-50">No messages</p> : null}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex gap-1 border-t border-neutral-900/20 pt-1">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" aria-label={`Reply as ${persona.name}`}
              className="min-w-0 flex-1 bg-transparent px-1 font-mono text-[12px] outline-none placeholder:text-neutral-600" />
            <button type="submit" className="px-1 text-[11px] font-bold">SEND</button>
          </form>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {["1", "2", "9", "0"].map((k) => (
            <button key={k} type="button" onClick={() => send(k)}
              className="h-8 rounded-md bg-neutral-700 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-600 active:bg-neutral-500">
              {k}
            </button>
          ))}
        </div>
      </div>
      <Caption persona={persona} detail="Basic phone · SMS · বাংলা" />
    </div>
  );
}

function SmartFrame({ children, statusDark }: { children: React.ReactNode; statusDark?: boolean }) {
  return (
    <div className="w-[250px] rounded-[34px] bg-neutral-900 p-2 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      <div className="overflow-hidden rounded-[26px] bg-background">
        <div className={cn("flex h-6 items-center justify-between px-4 text-[10px] font-medium", statusDark ? "bg-[#0f5c66] text-white" : "text-muted-foreground")}>
          <span>14:00</span>
          <span className="inline-flex items-center gap-1"><Signal className="size-3" /><Wifi className="size-3" /></span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** WhatsApp-style chat (the WhatsApp Cloud API adapter replaces the fake one in production). */
export function WhatsAppPhone({ persona }: { persona: Persona }) {
  const thread = useThread(persona.phone);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const msgs = (thread.data?.messages ?? []).filter((x) => x.channel === "whatsapp");
  const scroller = useAutoScroll(msgs.length);

  const send = async (value: string) => {
    if (!value.trim()) return;
    setText("");
    await sendAsPersona(persona.phone, "whatsapp", value).catch(() => undefined);
    await qc.invalidateQueries({ queryKey: ["thread", persona.phone] });
  };

  return (
    <div className="flex flex-col items-center">
      <SmartFrame statusDark>
        <div className="flex h-10 items-center gap-2 bg-[#0f5c66] px-3 text-white">
          <div className="grid size-6 place-items-center rounded-full bg-white/20 font-display text-[11px] font-bold">H</div>
          <div className="leading-tight">
            <p className="text-[12px] font-semibold">HOPE</p>
            <p className="text-[9px] opacity-80">Official alerts</p>
          </div>
        </div>
        <div ref={scroller} className="h-[330px] space-y-1.5 overflow-y-auto bg-muted/60 p-2">
          <AnimatePresence initial={false}>
            {msgs.map((msg) => (
              <m.div key={msg.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className={cn("max-w-[85%] rounded-xl px-2.5 py-1.5 text-[12px] leading-snug shadow-sm",
                  msg.dir === "in" ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card")}>
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] opacity-60">
                  {fmtTime(msg.created_at)} {msg.dir === "in" ? <CheckCheck className="size-3" /> : null}
                </p>
              </m.div>
            ))}
          </AnimatePresence>
          {!msgs.length ? <p className="pt-28 text-center text-[11px] text-muted-foreground">No messages</p> : null}
        </div>
        <div className="flex gap-1 border-t px-2 pt-1.5">
          {["1", "2", "STATUS"].map((k) => (
            <button key={k} type="button" onClick={() => send(k)} className="rounded-full border px-2 py-0.5 text-[11px] text-primary hover:bg-muted">{k}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-center gap-1 p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label={`Reply as ${persona.name}`}
            className="h-8 min-w-0 flex-1 rounded-full bg-muted px-3 text-[12px] outline-none" />
          <Button type="submit" size="icon" className="size-8 rounded-full" aria-label="Send"><SendHorizontal className="size-3.5" /></Button>
        </form>
      </SmartFrame>
      <Caption persona={persona} detail="Smartphone · WhatsApp · English" />
    </div>
  );
}

/** The real citizen PWA, signed in as the persona, inside a phone frame. */
export function PwaPhone({ persona, reloadKey }: { persona: Persona; reloadKey: number }) {
  return (
    <div className="flex flex-col items-center">
      <SmartFrame>
        <iframe
          key={reloadKey}
          title={`HOPE app as ${persona.name}`}
          src={`${CITIZEN_URL}/?persona=${persona.key}`}
          className="h-[420px] w-full border-0 bg-background"
        />
      </SmartFrame>
      <Caption persona={persona} detail="HOPE app (PWA) · हिन्दी" />
    </div>
  );
}
