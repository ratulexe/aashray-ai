import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { Label } from "@hope/ui/components/label";
import { Textarea } from "@hope/ui/components/textarea";
import { FadeIn } from "@hope/ui/components/motion";
import { api, ApiError } from "../api";
import { Shell } from "../components/shell";
import { useMe } from "../hooks";
import { useI18n } from "../i18n";

export function RescueScreen() {
  const { data: me } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [people, setPeople] = useState(me?.household.size ?? 1);
  const [landmark, setLandmark] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"idle" | "busy" | "ok" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = () => {
    if (!navigator.geolocation) return setLocState("failed");
    setLocState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("ok");
      },
      () => setLocState("failed"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/rescue", { body: { people, landmark: landmark.trim() || undefined, location } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={t("rescueTitle")} back="/">
      <FadeIn className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold">{t("rescuePeople")}</h2>
          <div className="flex items-center justify-between rounded-2xl border bg-card p-3">
            <Button variant="secondary" size="icon" className="size-14 rounded-xl" aria-label="−" disabled={people <= 1} onClick={() => setPeople((p) => p - 1)}>
              <Minus className="size-6" />
            </Button>
            <output aria-live="polite" className="font-display text-5xl font-bold tabular">{people}</output>
            <Button variant="secondary" size="icon" className="size-14 rounded-xl" aria-label="+" disabled={people >= 30} onClick={() => setPeople((p) => p + 1)}>
              <Plus className="size-6" />
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <Label htmlFor="landmark" className="font-display text-xl font-bold">{t("rescueWhere")}</Label>
          <p className="text-sm text-muted-foreground">{t("rescueWhereHint")}</p>
          <Textarea id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={160} rows={2}
            placeholder={t("landmarkPlaceholder")} className="rounded-xl text-base" />
          {me?.citizen.landmark ? <p className="text-sm text-muted-foreground">{t("useRegistered", { landmark: me.citizen.landmark })}</p> : null}
          <Button type="button" variant="outline" className="h-12 w-full rounded-xl" onClick={share} disabled={locState === "busy" || locState === "ok"}>
            {locState === "busy" ? <Loader2 className="size-5 animate-spin" /> : locState === "ok" ? <Check className="size-5 text-safe" /> : <LocateFixed className="size-5" />}
            {locState === "ok" ? t("locationShared") : locState === "failed" ? t("locationFailed") : t("shareLocation")}
          </Button>
        </section>

        {error ? <p role="alert" className="text-danger">{error}</p> : null}
        <Button size="lg" className="h-14 w-full rounded-xl bg-danger text-base text-danger-foreground hover:bg-danger/90" onClick={submit} disabled={busy}>
          {busy ? <><Loader2 className="size-5 animate-spin" /> {t("sending")}</> : t("sendRescue")}
        </Button>
      </FadeIn>
    </Shell>
  );
}
