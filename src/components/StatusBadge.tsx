import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/lib/gas";

const TONE: Record<EntryStatus, string> = {
  waiting: "bg-warning/15 text-warning-foreground ring-warning/30",
  allotted: "bg-success/15 text-success ring-success/30",
  collected: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/25",
};

const STATUS_KEY: Record<EntryStatus, string> = {
  waiting: "common:statusWaiting",
  allotted: "common:statusAllotted",
  collected: "common:statusCollected",
  cancelled: "common:statusCancelled",
};

export function StatusBadge({ status, className }: { status: EntryStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(STATUS_KEY[status])}
    </span>
  );
}
