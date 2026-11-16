import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StaffRole } from "@hope/shared";
import { api, ApiError, type DemoInfo, type MapData, type Overview, type Staff } from "./api";

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => api<{ staff: Staff; mode: "demo" | "production" }>("/me"),
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
    staleTime: 30_000,
  });
}

export function useRoles() {
  const { data } = useStaff();
  const roles = new Set(data?.staff.roles.map((r) => r.role) ?? []);
  return {
    roles,
    can: (...want: StaffRole[]) => want.some((r) => roles.has(r)),
    mode: data?.mode,
  };
}

/** Live picture of the incident; polled quickly so counters move during a demo. */
export function useOverview() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: () => api<Overview>("/overview"),
    refetchInterval: 1200,
  });
}

export function useMapData() {
  return useQuery({ queryKey: ["map"], queryFn: () => api<MapData>("/map"), staleTime: 60_000 });
}

export function useDemoInfo(enabled = true) {
  return useQuery({ queryKey: ["demo-info"], queryFn: () => api<DemoInfo>("/demo/info"), refetchInterval: 1500, enabled });
}

/** POST helper with toast on error and a refresh of live data afterwards. */
export function useAction<TBody, TResult = unknown>(path: string | ((body: TBody) => string), opts: { method?: string; success?: string } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<TResult>(typeof path === "function" ? path(body) : path, { method: opts.method ?? "POST", body: body ?? {} }),
    onSuccess: () => {
      if (opts.success) toast.success(opts.success);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Something went wrong"),
    onSettled: () => qc.invalidateQueries(),
  });
}

export function fmtTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

export function minutesBetween(a: string | Date, b: string | Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}
