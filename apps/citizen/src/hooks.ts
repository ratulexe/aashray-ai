import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type Me, type ShelterListItem } from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me"),
    // Live during an incident: alerts and booking changes appear within seconds.
    refetchInterval: 4000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
  });
}

export function useShelters(enabled: boolean) {
  return useQuery({
    queryKey: ["shelters"],
    queryFn: () => api<{ shelters: ShelterListItem[] }>("/shelters"),
    enabled,
    refetchInterval: 10000,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api<{ mode: "demo" | "production"; now: string }>("/config"),
    staleTime: Infinity,
  });
}

export function useRefreshMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST", body: {} }),
    onSettled: () => qc.clear(),
  });
}
