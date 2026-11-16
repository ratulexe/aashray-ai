import "@hope/ui/globals.css";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionProvider } from "@hope/ui/components/motion";
import { initTheme } from "@hope/ui/lib/theme";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app";
import { I18nProvider } from "./i18n";
import { ApiError } from "./api";

// Toasts are rare (errors); load them off the critical path.
const Toaster = lazy(() => import("@hope/ui/components/sonner").then((m) => ({ default: m.Toaster })));

initTheme();
registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      refetchOnWindowFocus: true,
      networkMode: "offlineFirst",
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MotionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Suspense fallback={null}>
            <Toaster position="top-center" />
          </Suspense>
        </MotionProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
