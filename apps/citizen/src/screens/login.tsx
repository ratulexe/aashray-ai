import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { Input } from "@hope/ui/components/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@hope/ui/components/input-otp";
import { Label } from "@hope/ui/components/label";
import { StepTransition } from "@hope/ui/components/motion";
import { api, ApiError, setDemoToken } from "../api";
import { Shell } from "../components/shell";
import { useConfig } from "../hooks";
import { useI18n } from "../i18n";

const PERSONAS = [
  { key: "rina", label: "personaRina" },
  { key: "arjun", label: "personaArjun" },
  { key: "salma", label: "personaSalma" },
] as const;

export function LoginScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDemo = useConfig().data?.mode === "demo";

  /** Demo only: sign in as a fictional person, no phone number needed. */
  const tryAs = async (persona: (typeof PERSONAS)[number]["key"]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token?: string }>("/demo/login", { body: { persona } });
      setDemoToken(res.token ?? null);
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ demoCode?: string }>("/auth/otp", { body: { phone } });
      setDemoCode(res.demoCode ?? null);
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.code === "DEMO_ONLY") setError(t("demoOnly"));
      else setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      await api("/auth/verify", { body: { phone, code: value } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={t("signIn")} back="/welcome">
      <StepTransition stepKey={step}>
        {step === "phone" ? (
          <form onSubmit={sendCode} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base">{t("phoneLabel")}</Label>
              <div className="flex h-14 items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
                <span className="pl-4 pr-2 text-lg text-muted-foreground tabular">+91</span>
                <Input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="h-full border-0 bg-transparent text-lg tracking-wide shadow-none focus-visible:ring-0 tabular"
                  placeholder="98765 43210"
                  autoFocus
                />
              </div>
              <p className="text-sm text-muted-foreground">{t("phoneHint")}</p>
            </div>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" size="lg" className="h-14 w-full rounded-xl text-base" disabled={phone.length !== 10 || busy}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : t("sendCode")}
            </Button>
            {isDemo ? (
              <div className="space-y-3 border-t pt-6">
                <p className="text-sm font-medium text-muted-foreground">{t("demoTry")}</p>
                {PERSONAS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-14 w-full justify-start rounded-xl text-base"
                    disabled={busy}
                    onClick={() => tryAs(p.key)}
                  >
                    {t(p.label)}
                  </Button>
                ))}
              </div>
            ) : null}
          </form>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="space-y-1">
              <p className="text-base font-medium">{t("codeLabel")}</p>
              <p className="text-sm text-muted-foreground">{t("codeSentTo", { phone: `+91 ${phone}` })}</p>
            </div>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={(v: string) => verify(v)}
              inputMode="numeric"
              autoFocus
              containerClassName="justify-between"
            >
              <InputOTPGroup className="w-full justify-between gap-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-14 w-12 rounded-xl border text-xl first:rounded-xl last:rounded-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {demoCode ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("demoCode", { code: demoCode })}</p>
            ) : null}
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            <Button size="lg" className="h-14 w-full rounded-xl text-base" disabled={code.length !== 6 || busy} onClick={() => verify()}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : t("verify")}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setCode(""); setError(null); }}>
              {t("changeNumber")}
            </Button>
          </div>
        )}
      </StepTransition>
    </Shell>
  );
}
