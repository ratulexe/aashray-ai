import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@hope/ui/components/toggle-group";
import { useTheme, type ThemePreference } from "@hope/ui/lib/theme";
import { LANGS, type Lang } from "@hope/shared";
import { api } from "../api";
import { Shell } from "../components/shell";
import { useMe, useSignOut } from "../hooks";
import { LANG_LABELS, useI18n } from "../i18n";

export function SettingsScreen() {
  const { data: me } = useMe();
  const { t, lang, setLang, l } = useI18n();
  const { preference, setTheme } = useTheme();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const changeLang = async (value: string) => {
    if (!value) return;
    setLang(value as Lang);
    // Also changes the language of SMS / WhatsApp messages.
    await api("/me", { method: "PATCH", body: { lang: value } }).catch(() => undefined);
  };

  return (
    <Shell title={t("settings")} back="/">
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("language")}</h2>
          <ToggleGroup type="single" value={lang} onValueChange={changeLang} variant="outline" className="grid w-full grid-cols-3">
            {LANGS.map((l2) => (
              <ToggleGroupItem key={l2} value={l2} lang={l2} className="h-12 text-base data-[state=on]:bg-primary/10 data-[state=on]:text-foreground">
                {LANG_LABELS[l2]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("theme")}</h2>
          <ToggleGroup type="single" value={preference} onValueChange={(v: string) => v && setTheme(v as ThemePreference)} variant="outline" className="grid w-full grid-cols-3">
            <ToggleGroupItem value="system" className="h-12">{t("themeSystem")}</ToggleGroupItem>
            <ToggleGroupItem value="light" className="h-12">{t("themeLight")}</ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-12">{t("themeDark")}</ToggleGroupItem>
          </ToggleGroup>
        </section>

        {me ? (
          <section className="rounded-2xl border bg-card p-5 text-[15px]">
            <p className="font-medium">{me.citizen.name ?? me.citizen.phone}</p>
            <p className="text-muted-foreground">{me.citizen.phone} · {l(me.citizen.area)}</p>
            <p className="mt-2 text-muted-foreground">{t("household")}: {t("people", { n: me.household.size })}</p>
          </section>
        ) : null}

        <Button variant="outline" size="lg" className="h-12 w-full rounded-xl" onClick={() => signOut.mutate(undefined, { onSettled: () => navigate("/welcome", { replace: true }) })}>
          <LogOut className="size-5" /> {t("signOut")}
        </Button>
      </div>
    </Shell>
  );
}
