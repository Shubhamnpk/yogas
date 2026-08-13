import { useId } from "react";
import { cn } from "@/lib/utils";

const FLAME_OUTER =
  "M24 3.5 C21.5 9.5 13.5 15.5 13.5 24 C13.5 29 16.5 33.5 20.5 35.5 C20.8 33.5 22 32.5 23.2 32.5 C22.4 34 23 35 24 35 C25 35 25.6 34 24.8 32.5 C26 32.5 27.2 33.5 27.5 35.5 C31.5 33.5 34.5 29 34.5 24 C34.5 15.5 26.5 9.5 24 3.5 Z";
const FLAME_INNER =
  "M24 15.5 C22.5 19.5 17 22 17 27 C17 30.5 20 33 24 33 C28 33 31 30.5 31 27 C31 22 25.5 19.5 24 15.5 Z";

export function LogoMark({ className }: { className?: string }) {
  const uid = useId();
  const tileGrad = `tile-${uid}`;
  const flameGrad = `flame-${uid}`;
  const innerGrad = `inner-${uid}`;
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-xl shadow-soft", className)}
    >
      <svg viewBox="0 0 48 48" className="size-full" aria-hidden="true">
        <defs>
          <linearGradient id={tileGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f97316" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id={flameGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ffedd5" />
          </linearGradient>
          <linearGradient id={innerGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff7ed" />
            <stop offset="1" stopColor="#ffedd5" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill={`url(#${tileGrad})`} />
        <rect width="48" height="48" rx="12" fill="none" stroke="white" strokeOpacity="0.25" />
        <path d={FLAME_OUTER} fill={`url(#${flameGrad})`} />
        <path d={FLAME_INNER} fill={`url(#${innerGrad})`} opacity="0.95" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark {...(markClassName ? { className: markClassName } : {})} />
      <span className={cn("font-display text-lg font-semibold tracking-tight", wordmarkClassName)}>
        YoGas
      </span>
    </span>
  );
}
