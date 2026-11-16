import "@hope/ui/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionProvider } from "@hope/ui/components/motion";
import { Toaster } from "@hope/ui/components/sonner";
import { TooltipProvider } from "@hope/ui/components/tooltip";
import { initTheme } from "@hope/ui/lib/theme";
import { App } from "./app";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </MotionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
