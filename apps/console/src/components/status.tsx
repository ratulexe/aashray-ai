import { CheckCircle2, CircleDashed, ShieldAlert, TriangleAlert, Eye } from "lucide-react";
import { Badge } from "@hope/ui/components/badge";
import { cn } from "@hope/ui/lib/utils";
import type { Level } from "../api";

export const LEVEL_STYLE: Record<Level, { label: string; className: string; fill: string; icon: typeof ShieldAlert }> = {
  evacuate: { label: "Evacuate", className: "bg-danger text-danger-foreground", fill: "#d63a2f", icon: ShieldAlert },
  warning: { label: "Warning", className: "bg-warning text-warning-foreground", fill: "#e3a21a", icon: TriangleAlert },
  watch: { label: "Watch", className: "bg-info text-info-foreground", fill: "#3b6fd1", icon: Eye },
};

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  const s = LEVEL_STYLE[level];
  return (
    <Badge className={cn(s.className, className)}>
      <s.icon /> {s.label}
    </Badge>
  );
}

export function IncidentBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-danger text-danger-foreground"><ShieldAlert /> Active</Badge>;
  if (status === "resolved") return <Badge className="bg-safe text-safe-foreground"><CheckCircle2 /> Resolved</Badge>;
  return <Badge variant="outline"><CircleDashed /> Draft</Badge>;
}

/** Capacity bar: occupied (solid) + reserved (light) out of capacity. */
export function CapacityBar({ capacity, reserved, occupied, className }: { capacity: number; reserved: number; occupied: number; className?: string }) {
  const occ = Math.min(100, (occupied / capacity) * 100);
  const res = Math.min(100 - occ, (reserved / capacity) * 100);
  const used = (occupied + reserved) / capacity;
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="img"
      aria-label={`${occupied} sheltered, ${reserved} reserved of ${capacity}`}>
      <div className={cn("absolute inset-y-0 left-0 transition-[width] duration-500 ease-out", used >= 1 ? "bg-danger" : "bg-primary")} style={{ width: `${occ}%` }} />
      <div className={cn("absolute inset-y-0 transition-[left,width] duration-500 ease-out", used >= 1 ? "bg-danger/40" : "bg-primary/35")} style={{ left: `${occ}%`, width: `${res}%` }} />
    </div>
  );
}
