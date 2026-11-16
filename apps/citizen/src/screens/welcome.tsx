import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@hope/ui/components/button";
import { Logo } from "@hope/ui/components/logo";
import { FadeIn } from "@hope/ui/components/motion";
import { cn } from "@hope/ui/lib/utils";
import { LANGS } from "@hope/shared";
import { api } from "../api";
import { DemoBanner } from "../components/shell";
import { useConfig } from "../hooks";
import { LANG_LABELS, useI18n } from "../i18n";

const PERSONAS = [
  { key: "rina", name: "Rina" },
  { key: "arjun", name: "Arjun" },
  { key: "salma", name: "Salma" },
] as const;

export function WelcomeScreen() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const config = useConfig();
  const qc = useQueryClient();

  const openAs = async (persona: string) => {
    await api("/demo/login", { body: { persona } });
    await qc.invalidateQueries({ queryKey: ["me"] });
    navigate("/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DemoBanner />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-6 pt-[18vh] pb-8">
        <FadeIn>
          <Logo className="text-5xl" />
          <p className="mt-6 font-display text-2xl leading-snug">{t("tagline")}</p>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t("welcomeBody")}</p>
        </FadeIn>

        <FadeIn delay={0.08} className="mt-auto pt-10">
          <p className="mb-3 text-sm font-medium text-muted-foreground">{t("chooseLanguage")}</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("chooseLanguage")}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                lang={l}
                onClick={() => setLang(l)}
                className={cn(
                  "h-14 rounded-xl border text-base font-medium transition-colors",
                  lang === l ? "border-primary bg-primary/8 text-foreground ring-1 ring-primary" : "border-border hover:bg-muted",
                )}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <Button size="lg" className="mt-6 h-14 w-full rounded-xl text-base" onClick={() => navigate("/login")}>
            {t("continue")}
          </Button>

          {config.data?.mode === "demo" ? (
            <div className="mt-8 border-t pt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("demoTryAs")}</p>
              <div className="flex gap-2">
                {PERSONAS.map((p) => (
                  <Button key={p.key} variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => openAs(p.key)}>
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </FadeIn>
      </main>
    </div>
  );
}
