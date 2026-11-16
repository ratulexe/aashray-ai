import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
const KEY = "hope-theme";

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

/** Light / dark theme that follows the system unless the person overrides it. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(read);
  const [resolved, setResolved] = useState<"light" | "dark">(() => (typeof document === "undefined" ? "light" : apply(read())));

  useEffect(() => {
    setResolved(apply(preference));
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setTheme = useCallback((pref: ThemePreference) => {
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* private mode: still apply for this visit */
    }
    setPreference(pref);
  }, []);

  return { preference, resolved, setTheme };
}

/** Call once before React renders, to avoid a flash of the wrong theme. */
export function initTheme() {
  apply(read());
}
