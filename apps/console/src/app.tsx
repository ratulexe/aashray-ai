import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { ApiError } from "./api";
import { useStaff } from "./hooks";
import { Layout } from "./components/layout";
import { LoginPage } from "./pages/login";
import { OverviewPage } from "./pages/overview";

const AlertsPage = lazy(() => import("./pages/alerts").then((m) => ({ default: m.AlertsPage })));
const CheckinPage = lazy(() => import("./pages/checkin").then((m) => ({ default: m.CheckinPage })));
const RescuePage = lazy(() => import("./pages/rescue").then((m) => ({ default: m.RescuePage })));
const AuditPage = lazy(() => import("./pages/audit").then((m) => ({ default: m.AuditPage })));
const DemoPage = lazy(() => import("./pages/demo").then((m) => ({ default: m.DemoPage })));

function Spinner() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

/** Nothing of the console — not even its navigation — renders before a staff session exists. */
function RequireStaff({ children }: { children: React.ReactNode }) {
  const staff = useStaff();
  const location = useLocation();
  if (staff.error instanceof ApiError && staff.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!staff.data) return <div className="min-h-dvh bg-background" />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireStaff>
            <Layout />
          </RequireStaff>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="alerts" element={<Suspense fallback={<Spinner />}><AlertsPage /></Suspense>} />
        <Route path="checkin" element={<Suspense fallback={<Spinner />}><CheckinPage /></Suspense>} />
        <Route path="rescue" element={<Suspense fallback={<Spinner />}><RescuePage /></Suspense>} />
        <Route path="audit" element={<Suspense fallback={<Spinner />}><AuditPage /></Suspense>} />
        <Route path="demo" element={<Suspense fallback={<Spinner />}><DemoPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
