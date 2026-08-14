import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type SwipeCard = {
  id: string;
  title: string;
  value: string;
  sub?: string;
};

type SwipeableCardsProps = {
  items: SwipeCard[];
};

export function SwipeableCards({ items }: SwipeableCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActive((prev) => (prev !== index ? index : prev));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    if (!cards[index]) return;
    el.style.scrollSnapType = "none";
    cards[index].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setTimeout(() => {
      el.style.scrollSnapType = "x mandatory";
    }, 400);
    setActive(index);
  };

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="hide-scrollbars overflow-x-auto"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
      >
        <div className="flex gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              data-card
              className="flex-shrink-0"
              style={{ width: "100%", scrollSnapAlign: "start" }}
            >
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="font-display text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.title}</p>
                {item.sub ? <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-3">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to card ${i + 1}`}
            className={cn(
              "relative rounded-full transition-all duration-300",
              active === i
                ? "h-2 w-6 scale-110 bg-primary"
                : "h-2 w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
