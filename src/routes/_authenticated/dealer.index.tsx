import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Loader2,
  PackageCheck,
  ScanLine,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth, sessionArgs } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { CancelRequestModal } from "@/components/CancelRequestModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { depotQrValue, friendlyError, timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/")({
  head: () => ({
    meta: [
      { title: "Depot home - YoGas" },
      {
        name: "description",
        content: "Your depot at a glance - next up, stock and quick actions.",
      },
      { property: "og:title", content: "Depot home - YoGas" },
      {
        property: "og:description",
        content: "A compact console for waiting, allotted and collected requests.",
      },
    ],
  }),
  component: DealerHome,
});

type QueueEntry = Doc<"waitlistEntries"> & {
  position?: number;
  consumer: {
    fullName: string | undefined;
    citizenshipMasked: string | null;
    address: string | undefined;
    phone: string | undefined;
    totalPurchasedQuantity: number;
    lastCollectedAt: number | null;
    cooldownUntil: number | null;
  } | null;
};

function DealerHome() {
  const { dealer, user, sessionToken } = useAuth();
  const counts = useQuery(api.waitlist.dealerCounts, sessionToken ? { sessionToken } : "skip") ?? {
    waiting: 0,
    allotted: 0,
    history: 0,
    cancelled: 0,
  };
  const queue = useQuery(
    api.waitlist.dealerQueue,
    sessionToken
      ? { sessionToken, status: "waiting", paginationOpts: { numItems: 100, cursor: null } }
      : "skip",
  );
  const allotEntry = useMutation(api.waitlist.allotEntry);
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<QueueEntry | null>(null);

  if (!dealer || !user) return null;

  const waiting: QueueEntry[] = queue?.page ?? [];
  const covered = dealer.stock >= counts.waiting;

  const allot = async (id: Id<"waitlistEntries">) => {
    setBusyId(id);
    try {
      await allotEntry({ ...sessionArgs(sessionToken), entryId: id });
      toast.success("Cylinder allotted");
    } catch (error) {
      toast.error(friendlyError(error, "Could not update request"));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: Id<"waitlistEntries">, reason: string) => {
    setBusyId(id);
    try {
      await cancelEntry({ ...sessionArgs(sessionToken), entryId: id, reason });
      toast.success("Request cancelled");
      setCancelTarget(null);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update request"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {counts.waiting > dealer.stock ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 font-semibold text-warning-foreground">
              <AlertTriangle className="size-5 shrink-0 text-warning" />
              Stock can't cover the queue
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.waiting} waiting but only {dealer.stock} cylinders in stock - allot as
              cylinders arrive, or bump stock from the depot page before handover stalls.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="sm:ml-auto sm:shrink-0">
            <Link to="/dealer/stock">Update stock</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Cylinders in stock" value={dealer.stock} icon={PackageCheck} />
        <StatCard label="Waiting" value={counts.waiting} icon={Users} />
        <StatCard label="Ready to collect" value={counts.allotted} icon={Check} />
        <StatCard label="History" value={counts.history} icon={Clock3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Next in line</h2>
              <p className="text-sm text-muted-foreground">
                The waiting customers at your depot, in order.
              </p>
            </div>
            {counts.waiting > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/dealer/waitlist">
                  See all {counts.waiting} <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          {queue === undefined ? (
            <div className="grid h-24 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : waiting.length > 0 ? (
            <div className="space-y-2">
              {waiting.slice(0, 3).map((entry) => (
                <WaitingEntryCard
                  key={entry._id}
                  entry={entry}
                  busy={busyId === entry._id}
                  covered={covered}
                  onAllot={() => void allot(entry._id)}
                  onCancel={() => setCancelTarget(entry)}
                />
              ))}
              {counts.waiting > 3 ? (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/dealer/waitlist">
                    See the remaining {counts.waiting - 3} waiting customer
                    {counts.waiting - 3 === 1 ? "" : "s"} <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-8 text-center text-sm text-muted-foreground">
              Nobody is waiting right now - share your depot code so consumers can join.
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline">
              <Link to="/dealer/waitlist">
                <ClipboardList className="size-4" /> View full waitlist
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dealer/scan">
                <ScanLine className="size-4" /> Verify or hand over
              </Link>
            </Button>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 text-center shadow-soft">
          <h2 className="font-semibold">Your depot code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Print this. Consumers scan it to join your queue.
          </p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3">
            <QRCodeSVG value={depotQrValue(dealer.code)} size={128} level="M" />
          </div>
          <p className="mt-3 font-display text-lg font-bold tracking-wide">{dealer.code}</p>
          <p className="text-xs text-muted-foreground">{dealer.business_name}</p>
          <p
            className={
              covered
                ? "mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success"
                : "mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
            }
          >
            {counts.waiting === 0
              ? "Queue is empty - share your code so consumers can join."
              : covered
                ? `Stock covers the ${counts.waiting} waiting request${counts.waiting === 1 ? "" : "s"}.`
                : `Short by ${counts.waiting - dealer.stock} cylinder${counts.waiting - dealer.stock === 1 ? "" : "s"} for the waiting queue.`}
          </p>
          <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground">
            Cooldown is enforced automatically after collection. A customer cannot rejoin until the
            cooling period ends.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/dealer/waitlist">Go to waitlist</Link>
          </Button>
        </aside>
      </div>

      <CancelRequestModal
        open={cancelTarget !== null}
        consumerName={cancelTarget?.consumer?.fullName ?? "the customer"}
        busy={cancelTarget !== null && busyId === cancelTarget._id}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          if (cancelTarget) void cancel(cancelTarget._id, reason);
        }}
      />
    </div>
  );
}

function WaitingEntryCard({
  entry,
  busy,
  covered,
  onAllot,
  onCancel,
}: {
  entry: QueueEntry;
  busy: boolean;
  covered: boolean;
  onAllot: () => void;
  onCancel: () => void;
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  const name = entry.consumer?.fullName ?? "Consumer";
  const meta = `${entry.quantity} x ${entry.cylinderSize} · ${timeAgo(entry.createdAt)}`;

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
          #{entry.position ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            {meta}
            {entry.note ? ` - "${entry.note}"` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={onAllot} disabled={busy || !covered}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {covered ? "Allot" : "Out of stock"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? "rounded-2xl border border-primary/40 bg-primary/5"
          : "rounded-2xl border border-border bg-card"
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
            entry.position === 1
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          #{entry.position ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block text-xs text-muted-foreground">{meta}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {entry.note ? (
            <p className="rounded-xl bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              “{entry.note}”
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button onClick={onAllot} disabled={busy || !covered} className="flex-1">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {covered ? "Allot" : "Out of stock"}
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon?: typeof Users;
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft transition-all sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span className="grid size-7 place-items-center rounded-xl bg-primary/10 text-xs text-primary">
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
