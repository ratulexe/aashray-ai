import { cn } from "@hope/ui/lib/utils";

/** The HOPE wordmark, set in The Henston (Adobe Fonts kit mdg5ygi). */
export function Logo({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 select-none", className)}>
      <span className="font-display font-bold uppercase tracking-[0.08em] leading-none">HOPE</span>
      {suffix ? (
        <span className="font-sans text-[0.55em] font-medium tracking-normal text-muted-foreground">{suffix}</span>
      ) : null}
    </span>
  );
}
