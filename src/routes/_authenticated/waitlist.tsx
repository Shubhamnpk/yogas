import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Loader2, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth, sessionArgs } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestDetails, type RequestRow } from "@/components/RequestDetails";
import { cn } from "@/lib/utils";
import { friendlyError, timeAgo } from "@/lib/gas";
import { formatNumber } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist - YoGas" },
      { name: "description", content: "Manage your LPG requests in a simple card view." },
      { property: "og:title", content: "Waitlist - YoGas" },
      {
        property: "og:description",
        content: "Review, cancel and track your requests across depots.",
      },
    ],
  }),
  component: WaitlistPage,
});

type Tab = "active" | "allotted" | "collected" | "cancelled" | "all";

const TABS: Tab[] = ["active", "allotted", "collected", "cancelled", "all"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function WaitlistPage() {
  const { t } = useTranslation();
  const { user, sessionToken } = useAuth();
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const confirmCollection = useMutation(api.waitlist.confirmCollection);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = useQuery(api.waitlist.consumerWaitlistAll, sessionToken ? { sessionToken } : "skip");
  const [tab, setTab] = useState<Tab>("active");
  const [selected, setSelected] = useState<RequestRow | null>(null);

  const cancel = async (id: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(id);
    try {
      await cancelEntry(
        sessionToken ? { sessionToken, entryId: id } : { entryId: id as Id<"waitlistEntries"> },
      );
      toast.success(t("waitlist:requestCancelled"));
      setSelected(null);
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
      await confirmCollection({ ...sessionArgs(sessionToken), entryId: id });
      toast.success(t("waitlist:collectionConfirmed"));
      setSelected(null);
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
          <h1 className="font-display text-3xl font-bold">{t("waitlist:title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("waitlist:subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <Ticket className="size-4" /> {t("waitlist:backToDashboard")}
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
          <p className="mt-3 font-semibold">{t("waitlist:noRequestsYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("waitlist:emptyBrowseHint")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                  tab === tabKey
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-muted-foreground ring-border hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t(`waitlist:tab${capitalize(tabKey)}`)} ({counts[tabKey]})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Ticket className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">{t("waitlist:nothingHere")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("waitlist:noRequestsInView", {
                  tab: t(`waitlist:tabName${capitalize(tab)}`),
                })}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((row) => (
                <button
                  key={row._id}
                  type="button"
                  onClick={() => setSelected(row)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-soft transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">
                        {row.dealer?.businessName ?? t("common:depot")}
                      </p>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.dealer?.district ?? t("waitlist:unknownDistrict")} ·{" "}
                      {timeAgo(row.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {row.status === "waiting" ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/25">
                          {t("waitlist:positionInLine", {
                            position: row.position != null ? formatNumber(row.position) : "?",
                          })}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {row.quantity} × {row.cylinderSize}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <RequestDetails
        entry={selected}
        busy={busyId === selected?._id}
        onCancel={(id) => void cancel(id as Id<"waitlistEntries">)}
        onConfirm={(id) => void confirm(id as Id<"waitlistEntries">)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
