import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hope/ui/components/table";
import { api } from "../api";
import { fmtTime } from "../hooks";

interface Entry { id: number; actor_type: string; actor_name: string | null; action: string; entity: string; entity_id: string | null; detail: unknown; at: string }

export function AuditPage() {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => api<{ entries: Entry[] }>("/audit"), refetchInterval: 3000 });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Every staff action and every change to alerts, bookings, capacity and rescue requests. Append-only.</p>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Time</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data?.entries ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="tabular text-muted-foreground">{fmtTime(e.at)}</TableCell>
                <TableCell>{e.actor_name ?? e.actor_type}</TableCell>
                <TableCell><code className="text-xs">{e.action}</code></TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">{e.detail ? JSON.stringify(e.detail) : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
