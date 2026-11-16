import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ClipboardCheck, Clock, FastForward, LayoutDashboard, LifeBuoy, LogOut, Moon, MonitorPlay, RotateCcw, ScrollText, Sun, UserRound } from "lucide-react";
import { Badge } from "@hope/ui/components/badge";
import { Button } from "@hope/ui/components/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@hope/ui/components/dropdown-menu";
import { Logo } from "@hope/ui/components/logo";
import { cn } from "@hope/ui/lib/utils";
import { useTheme } from "@hope/ui/lib/theme";
import type { StaffRole } from "@hope/shared";
import { api } from "../api";
import { fmtTime, useAction, useDemoInfo, useOverview, useRoles, useStaff } from "../hooks";
import { IncidentBadge } from "./status";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles?: StaffRole[]; demo?: boolean }[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell, roles: ["coordinator", "approver", "admin"] },
  { to: "/checkin", label: "Check-in", icon: ClipboardCheck, roles: ["shelter_operator", "coordinator"] },
  { to: "/rescue", label: "Rescue desk", icon: LifeBuoy, roles: ["rescue_desk", "coordinator"] },
  { to: "/audit", label: "Audit log", icon: ScrollText, roles: ["admin", "coordinator"] },
  { to: "/demo", label: "Demo presenter", icon: MonitorPlay, demo: true },
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coordinator: "Coordinator",
  approver: "Approver",
  shelter_operator: "Shelter operator",
  rescue_desk: "Rescue desk",
  volunteer: "Volunteer",
};

export function Layout() {
  const { can, mode } = useRoles();
  const nav = NAV.filter((n) => (n.demo ? mode === "demo" : !n.roles || can(...n.roles)));

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex h-14 items-center px-5 text-xl">
          <Logo suffix="Console" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )
              }
            >
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        {mode === "demo" ? (
          <p className="m-3 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Demo mode.</span> Fictional data. No real messages are sent.
          </p>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar nav={nav} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function TopBar({ nav }: { nav: typeof NAV }) {
  const overview = useOverview();
  const { mode } = useRoles();
  const incident = overview.data?.incident;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <span className="text-lg md:hidden"><Logo /></span>
        {incident ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-display text-lg font-bold">{incident.title}</span>
            <IncidentBadge status={incident.status} />
            {incident.is_drill ? <Badge variant="outline" className="hidden sm:inline-flex">Drill</Badge> : null}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {mode === "demo" && overview.data ? <DemoClock now={overview.data.now} /> : null}
          <UserMenu />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Main">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"}
            className={({ isActive }) => cn("shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground", isActive && "bg-muted text-foreground")}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function DemoClock({ now }: { now: string }) {
  const advance = useAction<{ minutes: number }>("/demo/clock");
  return (
    <div className="flex items-center gap-1 rounded-lg border px-2 py-1">
      <Clock className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium tabular" aria-label="Demo clock">{fmtTime(now)}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Fast-forward demo clock">
            <FastForward className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Fast-forward the demo</DropdownMenuLabel>
          {[30, 60, 120].map((m) => (
            <DropdownMenuItem key={m} onSelect={() => advance.mutate({ minutes: m })}>+{m} minutes</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function UserMenu() {
  const { data } = useStaff();
  const { mode } = useRoles();
  const demo = useDemoInfo(mode === "demo");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { resolved, setTheme } = useTheme();
  const switchRole = useAction<{ key: string }>("/demo/switch");
  const reset = useAction<Record<string, never>>("/demo/reset", { success: "Demo reset" });
  if (!data) return null;
  const roles = data.staff.roles.map((r) => ROLE_LABELS[r.role] ?? r.role).join(", ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 px-2.5">
          <UserRound className="size-4" />
          <span className="hidden max-w-40 truncate text-sm sm:inline">{roles}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{data.staff.name}</p>
          <p className="text-xs text-muted-foreground">{data.staff.email}</p>
        </DropdownMenuLabel>
        {mode === "demo" && demo.data ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Switch demo role</DropdownMenuLabel>
            {demo.data.staff.map((s) => (
              <DropdownMenuItem key={s.key} disabled={s.email === data.staff.email} onSelect={() => switchRole.mutate({ key: s.key })}>
                {ROLE_LABELS[s.roles[0] ?? ""] ?? s.key}
                <span className="ml-auto text-xs text-muted-foreground">{s.name.split(" ")[0]}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => reset.mutate({})}>
              <RotateCcw className="size-4" /> Reset demo
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setTheme(resolved === "dark" ? "light" : "dark")}>
          {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />} {resolved === "dark" ? "Light" : "Dark"} theme
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await api("/auth/logout", { method: "POST", body: {} }).catch(() => undefined);
            qc.clear();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
