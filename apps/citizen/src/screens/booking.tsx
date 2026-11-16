import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Accessibility, CheckCircle2, Clock, Navigation, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@hope/ui/components/alert-dialog";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import { DrawCheck, FadeIn } from "@hope/ui/components/motion";
import { formatBookingCode } from "@hope/shared";
import { api } from "../api";
import { Shell } from "../components/shell";
import { useMe } from "../hooks";
import { useI18n, type Key } from "../i18n";
import { toast } from "sonner";

export function BookingScreen() {
  const { data: me } = useMe();
  const { t, l, time } = useI18n();
  const [params] = useSearchParams();
  const isNew = params.get("new") === "1";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const b = me?.booking;
  if (!b || (b.status !== "held" && b.status !== "checked_in")) return <Navigate to="/" replace />;
  const checkedIn = b.status === "checked_in";
  const code = formatBookingCode(b.code);
  const { lat, lng } = b.shelter.location;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  const facilities = Object.entries(b.shelter.facilities).filter(([, v]) => v).map(([k]) => k);

  const cancel = async () => {
    setCancelling(true);
    try {
      await api("/booking/cancel", { method: "POST", body: {} });
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch {
      toast.error(t("error"));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Shell title={t("yourBooking")} back="/">
      <div className="space-y-6">
        <FadeIn className="text-center">
          {isNew && !checkedIn ? <DrawCheck className="mx-auto mb-3 size-14 text-safe" /> : null}
          {checkedIn ? (
            <Badge className="mb-3 bg-safe px-3 py-1 text-sm text-safe-foreground"><CheckCircle2 /> {t("checkedIn")}</Badge>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">{isNew ? t("bookedTitle") : t("showCode")}</p>
          )}
          <FadeIn delay={isNew ? 0.5 : 0}>
            <p className="mt-1 font-display text-5xl font-bold tracking-[0.12em] tabular" aria-label={code.split("").join(" ")}>{code}</p>
            {!checkedIn ? (
              <div className="mx-auto mt-5 w-fit rounded-2xl border bg-white p-4">
                <QRCodeSVG value={`HOPE:${b.code}`} size={168} level="M" />
              </div>
            ) : null}
          </FadeIn>
        </FadeIn>

        <section className="rounded-2xl border bg-card p-5">
          <p className="text-xl font-semibold leading-snug">{l(b.shelter.name)}</p>
          <div className="mt-3 grid gap-2 text-[15px] text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Users className="size-4" />{t("people", { n: b.people })}</span>
            {!checkedIn ? <span className="inline-flex items-center gap-2"><Clock className="size-4" />{t("holdUntil", { time: time(b.holdUntil) })}</span> : null}
            {b.shelter.distanceKm != null ? <span className="inline-flex items-center gap-2"><Navigation className="size-4" />{t("km", { n: b.shelter.distanceKm })}</span> : null}
            {b.shelter.accessible ? <span className="inline-flex items-center gap-2"><Accessibility className="size-4" />{t("accessible")}</span> : null}
          </div>
          {facilities.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {facilities.map((f) => <Badge key={f} variant="secondary" className="font-normal">{t(`facilities_${f}` as Key)}</Badge>)}
            </div>
          ) : null}
        </section>

        {!checkedIn ? (
          <div className="grid gap-2">
            <Button asChild size="lg" className="h-14 rounded-xl text-base">
              <a href={directions} target="_blank" rel="noreferrer"><Navigation className="size-5" /> {t("directions")}</a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="lg" className="h-12 rounded-xl text-muted-foreground">{t("cancelBooking")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[400px] rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("cancelConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("cancelConfirmBody")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("keepBooking")}</AlertDialogCancel>
                  <AlertDialogAction onClick={cancel} disabled={cancelling} className="bg-danger text-danger-foreground hover:bg-danger/90">
                    {t("cancelBooking")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
