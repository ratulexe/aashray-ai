import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Settings, WifiOff } from "lucide-react";
import { Logo } from "@hope/ui/components/logo";
import { Button } from "@hope/ui/components/button";
import { cn } from "@hope/ui/lib/utils";
import { useConfig } from "../hooks";
import { useI18n } from "../i18n";

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function DemoBanner() {
  const config = useConfig();
  const { t } = useI18n();
  if (config.data?.mode !== "demo") return null;
  return (
    <div className="bg-foreground text-background py-1 text-center text-[11px] font-medium tracking-wide uppercase">
      {t("demoBanner")}
    </div>
  );
}

/** Mobile-first page frame: one centred column, sticky header, generous spacing. */
export function Shell({ children, title, back, subtitle, className }: { children: ReactNode; title?: string; back?: string | boolean; subtitle?: ReactNode; className?: string }) {
  const online = useOnline();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <DemoBanner />
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
          {back ? (
            <Button variant="ghost" size="icon" className="-ml-2 size-11" aria-label={t("back")} onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}>
              <ArrowLeft className="size-5" />
            </Button>
          ) : null}
          {title ? (
            <h1 className="font-display text-xl font-bold leading-none">{title}</h1>
          ) : (
            <Link to="/" aria-label="HOPE" className="text-xl">
              <Logo />
            </Link>
          )}
          <div className="ml-auto flex items-center gap-1">
            {subtitle ? <span className="text-sm text-muted-foreground">{subtitle}</span> : null}
            {!back ? (
              <Button asChild variant="ghost" size="icon" className="size-11" aria-label={t("settings")}>
                <Link to="/settings">
                  <Settings className="size-5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      {!online ? (
        <div role="status" className="mx-auto flex max-w-[480px] items-center gap-2 px-4 pt-3 text-sm text-muted-foreground">
          <WifiOff className="size-4" /> {t("offline")}
        </div>
      ) : null}
      <main className={cn("mx-auto max-w-[480px] px-4 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]", className)}>{children}</main>
    </div>
  );
}
