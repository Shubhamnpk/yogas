import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  ClipboardList,
  Loader2,
  PackageCheck,
  ScanLine,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { depotQrValue, timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/")({
  head: () => ({
    meta: [
      { title: "Depot home - YoGas" },
      {
        name: "description",
        content: "Your depot at a glance — next up, stock and quick actions.",
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
    citizenshipNo: string | undefined;
    address: string | undefined;
    phone: string | undefined;
    totalPurchasedQuantity: number;
    lastCollectedAt: number | null;
    cooldownUntil: number | null;
  } | null;
};

type QueueData = {
  waiting: QueueEntry[];
  allotted: QueueEntry[];
  history: QueueEntry[];
  cancelled: QueueEntry[];
  hasMoreWaiting: boolean;
  hasMoreAllotted: boolean;
  hasMoreHistory: boolean;
  hasMoreCancelled: boolean;
};

function DealerHome() {
  const { dealer, user, sessionToken } = useAuth();
  const rows = useQuery(
    api.waitlist.dealerQueue,
    sessionToken ? { sessionToken, limit: 120 } : "skip",
  ) as QueueData | undefined;
  const allotEntry = useMutation(api.waitlist.allotEntry);
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!dealer || !user) return null;

  const waiting = rows?.waiting ?? [];
  const nextUp = waiting[0];
  const covered = dealer.stock >= waiting.length;
  const counts = {
    waiting: waiting.length,
    allotted: rows?.allotted.length ?? 0,
    history: rows?.history.length ?? 0,
    cancelled: rows?.cancelled.length ?? 0,
  };

  const act = async (fn: "allot" | "cancel", id: Id<"waitlistEntries">) => {
    setBusyId(id);
    try {
      if (fn === "allot") {
        await allotEntry(
          sessionToken
            ? { sessionToken, entryId: id }
            : { ownerAccountId: user.accountId, entryId: id },
        );
      } else {
        if (!window.confirm(`Cancel this request? The next customer moves up the line.`)) return;
        await cancelEntry(
          sessionToken
            ? { sessionToken, entryId: id }
            : { requesterAccountId: user.accountId, entryId: id },
        );
      }
      toast.success(fn === "allot" ? "Cylinder allotted" : "Request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {counts.waiting > dealer.stock ? (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning-foreground">Stock can't cover the queue</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.waiting} waiting but only {dealer.stock} cylinders in stock — allot as
              cylinders arrive, or bump stock from the depot page before handover stalls.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
            <Link to="/dealer/stock">Update stock</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cylinders in stock" value={dealer.stock} icon={PackageCheck} />
        <StatCard label="Waiting" value={counts.waiting} icon={Users} />
        <StatCard label="Ready to collect" value={counts.allotted} icon={Check} />
        <StatCard label="History" value={counts.history} icon={Clock3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Next in line</h2>
              <p className="text-sm text-muted-foreground">
                The first waiting customer at your depot.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dealer/waitlist">
                Open waitlist <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>

          {rows === undefined ? (
            <div className="grid h-24 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : nextUp ? (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                #{nextUp.position ?? 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">
                  {nextUp.consumer?.fullName ?? "Consumer"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextUp.quantity} × {nextUp.cylinderSize} · joined {timeAgo(nextUp.createdAt)}
                  {nextUp.note ? ` · “${nextUp.note}”` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => void act("allot", nextUp._id)}
                  disabled={busyId === nextUp._id || !covered}
                >
                  {busyId === nextUp._id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {covered ? "Allot & call" : "Out of stock"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void act("cancel", nextUp._id)}
                  disabled={busyId === nextUp._id}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-8 text-center text-sm text-muted-foreground">
              Nobody is waiting right now — share your depot code so consumers can join.
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
            <QRCodeSVG value={depotQrValue(dealer.code)} size={144} level="M" />
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
              ? "Queue is empty — share your code so consumers can join."
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
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
