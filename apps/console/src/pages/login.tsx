import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@hope/ui/components/button";
import { Input } from "@hope/ui/components/input";
import { Label } from "@hope/ui/components/label";
import { Logo } from "@hope/ui/components/logo";
import { FadeIn } from "@hope/ui/components/motion";
import { api, ApiError } from "../api";

const DEMO_ACCOUNTS = [
  { email: "coordinator@demo.hope", label: "Coordinator" },
  { email: "approver@demo.hope", label: "Approver" },
  { email: "operator@demo.hope", label: "Shelter operator" },
  { email: "rescue@demo.hope", label: "Rescue desk" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["config"], queryFn: () => api<{ mode: string }>("/config"), staleTime: Infinity });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", { body: creds ?? { email, password } });
      await qc.invalidateQueries();
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : creds ? "/demo" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <FadeIn className="w-full max-w-sm">
        <div className="mb-8 text-center text-3xl">
          <Logo suffix="Console" />
        </div>
        <form onSubmit={login} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Authorised staff only
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        {config.data?.mode === "demo" ? (
          <div className="mt-6 rounded-2xl border border-dashed p-4">
            <p className="text-sm font-medium">Demo accounts</p>
            <p className="mt-1 text-xs text-muted-foreground">Fictional staff. Password: <code className="rounded bg-muted px-1">hope-demo</code></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <Button key={a.email} variant="outline" size="sm" disabled={busy} onClick={() => login(undefined, { email: a.email, password: "hope-demo" })}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </FadeIn>
    </div>
  );
}
