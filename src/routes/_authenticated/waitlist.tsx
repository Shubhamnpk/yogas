import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, PackageCheck, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDateTime, friendlyError, timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist - YoGas" },
      { name: "description", content: "Manage your LPG requests in a simple tabular view." },
      { property: "og:title", content: "Waitlist - YoGas" },
      {
        property: "og:description",
        content: "Review, cancel and track your requests across depots.",
      },
    ],
  }),
  component: WaitlistPage,
});

type Row = {
  _id: Id<"waitlistEntries">;
  status: "waiting" | "allotted" | "collected" | "cancelled";
  cylinderSize: string;
  quantity: number;
  note?: string;
  createdAt: number;
  allottedAt?: number;
  collectedAt?: number;
  position?: number;
  dealer: { businessName: string; district: string } | null;
};

type Tab = "active" | "allotted" | "collected" | "cancelled" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "allotted", label: "Allotted" },
  { key: "collected", label: "Collected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

function WaitlistPage() {
  const { user, sessionToken } = useAuth();
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const confirmCollection = useMutation(api.waitlist.confirmCollection);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = useQuery(api.waitlist.consumerWaitlistAll, sessionToken ? { sessionToken } : "skip");
  const [tab, setTab] = useState<Tab>("active");

  const cancel = async (id: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(id);
    try {
      await cancelEntry(
        sessionToken ? { sessionToken, entryId: id } : { entryId: id as Id<"waitlistEntries"> },
      );
      toast.success("Request cancelled");
    } catch (error) {
      toast.error(friendlyError(error, "Could not cancel request"));
    } finally {
      setBusyId(null);
    }
  };

  const confirm = async (id: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(id);
    try {
      await confirmCollection(
        sessionToken ? { sessionToken, entryId: id } : { accountId: user.accountId, entryId: id },
      );
      toast.success("Collection confirmed — cylinder handed over");
    } catch (error) {
      toast.error(friendlyError(error, "Could not confirm collection"));
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    if (!rows) return [];
    if (tab === "all") return rows;
    if (tab === "active")
      return rows.filter((r) => r.status === "waiting" || r.status === "allotted");
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      active: 0,
      allotted: 0,
      collected: 0,
      cancelled: 0,
      all: rows?.length ?? 0,
    };
    for (const r of rows ?? []) {
      if (r.status === "waiting" || r.status === "allotted") c.active += 1;
      if (r.status === "allotted") c.allotted += 1;
      if (r.status === "collected") c.collected += 1;
      if (r.status === "cancelled") c.cancelled += 1;
    }
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Waitlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A compact view of every request you have made across depots.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <Ticket className="size-4" /> Back to dashboard
          </Link>
        </Button>
      </div>

      {rows === undefined ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse depots or scan a depot code to join your first queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                  tab === t.key
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-muted-foreground ring-border hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t.label} ({counts[t.key]})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Ticket className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">Nothing here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No {tab === "active" ? "active" : tab} requests in this view.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
                <table className="min-w-[920px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="border-b border-border px-4 py-3">Depot</th>
                      <th className="border-b border-border px-4 py-3">Your place</th>
                      <th className="border-b border-border px-4 py-3">Status</th>
                      <th className="border-b border-border px-4 py-3">Qty</th>
                      <th className="border-b border-border px-4 py-3">Requested</th>
                      <th className="border-b border-border px-4 py-3">Updated</th>
                      <th className="border-b border-border px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row._id} className="align-top">
                        <td className="border-b border-border px-4 py-4">
                          <p className="font-medium">{row.dealer?.businessName ?? "Depot"}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.dealer?.district ?? "Unknown district"}
                          </p>
                        </td>
                        <td className="border-b border-border px-4 py-4">
                          {row.status === "waiting" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/25">
                              #{row.position ?? "?"} in line
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="border-b border-border px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="border-b border-border px-4 py-4 text-sm">{row.quantity}</td>
                        <td className="border-b border-border px-4 py-4 text-sm text-muted-foreground">
                          {timeAgo(row.createdAt)}
                        </td>
                        <td className="border-b border-border px-4 py-4 text-sm text-muted-foreground">
                          {row.status === "allotted" && row.allottedAt
                            ? formatDateTime(row.allottedAt)
                            : "-"}
                        </td>
                        <td className="border-b border-border px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === "allotted" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busyId === row._id}
                                  onClick={() => void confirm(row._id)}
                                >
                                  {busyId === row._id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <PackageCheck className="size-4" />
                                  )}{" "}
                                  Confirm collection
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => void cancel(row._id)}
                                >
                                  <X className="size-4" />
                                </Button>
                              </>
                            ) : row.status === "waiting" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void cancel(row._id)}
                              >
                                {busyId === row._id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <X className="size-4" />
                                )}{" "}
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-1 text-center text-xs text-muted-foreground">
                Showing {visible.length} of {rows.length} requests.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
