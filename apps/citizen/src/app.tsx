import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@hope/ui/components/skeleton";
import { api, ApiError } from "./api";
import { useMe } from "./hooks";
import { useI18n } from "./i18n";
import { HomeScreen } from "./screens/home";
import { WelcomeScreen } from "./screens/welcome";

// Screens beyond the first view load on demand to keep the first load small on 2G.
const BookScreen = lazy(() => import("./screens/book").then((m) => ({ default: m.BookScreen })));
const BookingScreen = lazy(() => import("./screens/booking").then((m) => ({ default: m.BookingScreen })));
const LoginScreen = lazy(() => import("./screens/login").then((m) => ({ default: m.LoginScreen })));
const RescueScreen = lazy(() => import("./screens/rescue").then((m) => ({ default: m.RescueScreen })));
const SettingsScreen = lazy(() => import("./screens/settings").then((m) => ({ default: m.SettingsScreen })));

/** Demo only: `?persona=salma` signs in as a fictional persona (used by the console's phone frames). */
function usePersonaLogin() {
  const [params, setParams] = useSearchParams();
  const persona = params.get("persona");
  const qc = useQueryClient();
  const [pending, setPending] = useState(Boolean(persona));
  const started = useRef(false);

  useEffect(() => {
    if (!persona || started.current) return;
    started.current = true;
    api("/demo/login", { body: { persona } })
      .catch(() => undefined)
      .finally(async () => {
        params.delete("persona");
        setParams(params, { replace: true });
        await qc.invalidateQueries({ queryKey: ["me"] });
        setPending(false);
      });
  }, [persona, params, setParams, qc]);

  return pending;
}

function Protected({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const { lang, setLang } = useI18n();
  const synced = useRef(false);

  // Use the language the citizen registered with, once per session.
  useEffect(() => {
    if (me.data && !synced.current) {
      synced.current = true;
      if (me.data.citizen.lang !== lang) setLang(me.data.citizen.lang);
    }
  }, [me.data, lang, setLang]);

  if (me.error instanceof ApiError && me.error.status === 401) return <Navigate to="/welcome" replace />;
  if (!me.data) return <LoadingShell />;
  return <>{children}</>;
}

function LoadingShell() {
  return (
    <div className="mx-auto max-w-[480px] space-y-4 p-4 pt-16">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

export function App() {
  const pendingPersona = usePersonaLogin();

  if (pendingPersona) return <LoadingShell />;

  return (
    <Suspense fallback={<LoadingShell />}>
    <Routes>
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<Protected><HomeScreen /></Protected>} />
      <Route path="/book" element={<Protected><BookScreen /></Protected>} />
      <Route path="/booking" element={<Protected><BookingScreen /></Protected>} />
      <Route path="/rescue" element={<Protected><RescueScreen /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsScreen /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
