import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/lib/gas";
import { STATUS_LABEL } from "@/lib/gas";

const TONE: Record<EntryStatus, string> = {
  waiting: "bg-warning/15 text-warning-foreground ring-warning/30",
  allotted: "bg-success/15 text-success ring-success/30",
  collected: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function StatusBadge({ status, className }: { status: EntryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
