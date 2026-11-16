/**
 * Motion presets (docs/DESIGN.md › Motion). Animations explain a change of
 * state; they never decorate. Reduced motion is respected everywhere.
 */
import { animate, AnimatePresence, domAnimation, LazyMotion, m, MotionConfig, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";

export const EASE = [0.2, 0, 0, 1] as const;
export const DURATION = { fast: 0.12, base: 0.2, slow: 0.32 } as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE }}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

/** Content that fades and rises slightly into place. */
export function FadeIn({ children, delay = 0, className, y = 8 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE, delay }}
    >
      {children}
    </m.div>
  );
}

/** Swaps between steps (booking flow, wizard) with a short slide. */
export function StepTransition({ stepKey, children, className }: { stepKey: string | number; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={stepKey}
        className={className}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: DURATION.base, ease: EASE }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/** A number that counts smoothly to its new value (live counters). */
export function CountUp({ value, className, format = (n: number) => Math.round(n).toLocaleString("en-IN") }: { value: number; className?: string; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: EASE });
    return () => controls.stop();
  }, [value, mv, reduce]);
  return <m.span className={className}>{text}</m.span>;
}

/** Check mark that draws itself once — used for a confirmed booking. */
export function DrawCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden="true">
      <m.circle
        cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      <m.path
        d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: EASE, delay: 0.3 }}
      />
    </svg>
  );
}

/** A single gentle pulse to draw the eye to something new (not a loop). */
export function PulseOnce({ children, className, pulseKey }: { children?: ReactNode; className?: string; pulseKey?: string | number }) {
  return (
    <m.span
      key={pulseKey}
      className={className}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.35, 1] }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {children}
    </m.span>
  );
}

export { AnimatePresence, m };
