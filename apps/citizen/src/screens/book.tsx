import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Accessibility, Loader2, Minus, Plus, Users } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { Progress } from "@hope/ui/components/progress";
import { StepTransition } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { api, ApiError } from "../api";
import { Shell } from "../components/shell";
import { useMe } from "../hooks";
import { useI18n } from "../i18n";

type BookResult = { status: "booked" | "already_booked" | "no_shelter" | "no_incident" };

export function BookScreen() {
  const { data: me } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [people, setPeople] = useState(me?.household.size ?? 1);
  const [needsHelp, setNeedsHelp] = useState<boolean | null>(me?.household.needsMobilityHelp ? true : null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<BookResult["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<BookResult>("/book", { body: { people, needsMobilityHelp: Boolean(needsHelp) } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      if (res.status === "booked" || res.status === "already_booked") navigate("/booking?new=1", { replace: true });
      else setOutcome(res.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  if (outcome) {
    return (
      <Shell title={t("bookShelter")} back="/">
        <div className="space-y-4 pt-4">
          <h2 className="font-display text-2xl font-bold">{outcome === "no_incident" ? t("noIncident") : t("noShelter")}</h2>
          {outcome === "no_shelter" ? <p className="text-lg text-muted-foreground">{t("noShelterBody")}</p> : null}
          <Button asChild size="lg" variant="outline" className="h-14 w-full rounded-xl border-danger/40 text-base text-danger">
            <Link to="/rescue">{t("needRescue")}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={t("bookShelter")} back="/">
      <Progress value={((step + 1) / 3) * 100} className="mb-6 h-1" aria-hidden />
      <StepTransition stepKey={step}>
        {step === 0 ? (
          <section className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight">{t("howMany")}</h2>
              <p className="mt-2 text-muted-foreground">{t("howManyHint")}</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <Button variant="secondary" size="icon" className="size-14 rounded-xl" aria-label="−" disabled={people <= 1} onClick={() => setPeople((p) => p - 1)}>
                <Minus className="size-6" />
              </Button>
              <output aria-live="polite" className="font-display text-5xl font-bold tabular">{people}</output>
              <Button variant="secondary" size="icon" className="size-14 rounded-xl" aria-label="+" disabled={people >= 30} onClick={() => setPeople((p) => p + 1)}>
                <Plus className="size-6" />
              </Button>
            </div>
            <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={() => setStep(1)}>{t("next")}</Button>
          </section>
        ) : step === 1 ? (
          <section className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight">{t("anyoneNeedsHelp")}</h2>
              <p className="mt-2 text-muted-foreground">{t("anyoneNeedsHelpHint")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={needsHelp === v}
                  onClick={() => setNeedsHelp(v)}
                  className={cn(
                    "h-20 rounded-2xl border text-lg font-semibold transition-colors",
                    needsHelp === v ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted",
                  )}
                >
                  {v ? t("yes") : t("no")}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-14 flex-1 rounded-xl" onClick={() => setStep(0)}>{t("back")}</Button>
              <Button size="lg" className="h-14 flex-[2] rounded-xl text-base" disabled={needsHelp === null} onClick={() => setStep(2)}>{t("next")}</Button>
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <h2 className="font-display text-2xl font-bold leading-tight">{t("confirmTitle")}</h2>
            <dl className="divide-y rounded-2xl border bg-card">
              <div className="flex items-center gap-3 p-4">
                <Users className="size-5 text-muted-foreground" />
                <dt className="sr-only">{t("howMany")}</dt>
                <dd className="text-lg font-medium">{people === 1 ? t("person") : t("people", { n: people })}</dd>
              </div>
              <div className="flex items-center gap-3 p-4">
                <Accessibility className="size-5 text-muted-foreground" />
                <dt className="sr-only">{t("anyoneNeedsHelp")}</dt>
                <dd className="text-lg font-medium">{needsHelp ? t("needsHelpWalking") : `${t("needsHelpWalking")}: ${t("no")}`}</dd>
              </div>
            </dl>
            {error ? <p role="alert" className="text-danger">{error}</p> : null}
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-14 flex-1 rounded-xl" onClick={() => setStep(1)} disabled={busy}>{t("back")}</Button>
              <Button size="lg" className="h-14 flex-[2] rounded-xl text-base" onClick={submit} disabled={busy}>
                {busy ? <><Loader2 className="size-5 animate-spin" /> {t("booking")}</> : t("confirm")}
              </Button>
            </div>
          </section>
        )}
      </StepTransition>
    </Shell>
  );
}
