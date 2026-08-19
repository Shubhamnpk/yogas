import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Check,
  CheckCheck,
  Loader2,
  PackageCheck,
  ScanLine,
  Search,
  Ticket,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import i18n, { formatNumber } from "@/lib/i18n";
import { useAuth, sessionArgs } from "@/lib/auth";
import { CancelRequestModal } from "@/components/CancelRequestModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDateTime, friendlyError, maskCitizenship, timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/waitlist")({
  head: () => ({
    meta: [
      { title: i18n.t("dealer:waitlistTitle") },
      {
        name: "description",
        content: i18n.t("dealer:waitlistDescription"),
      },
      { property: "og:title", content: i18n.t("dealer:waitlistTitle") },
      {
        property: "og:description",
        content: i18n.t("dealer:waitlistOgDescription"),
      },
    ],
  }),
  component: DealerWaitlistPage,
});

type Row = Doc<"waitlistEntries"> & {
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

type Tab = "all" | "waiting" | "allotted" | "collected" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "dealer:tabAll" },
  { key: "waiting", label: "dealer:tabWaiting" },
  { key: "allotted", label: "dealer:tabAllotted" },
  { key: "collected", label: "dealer:tabCollected" },
  { key: "cancelled", label: "dealer:tabCancelled" },
];

function DealerWaitlistPage() {
  const { t } = useTranslation();
  const { dealer, user, sessionToken } = useAuth();
  const allotEntry = useMutation(api.waitlist.allotEntry);
  const collectEntry = useMutation(api.waitlist.collectEntry);
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const bulkAllot = useMutation(api.waitlist.bulkAllot);
  const autoAllot = useMutation(api.waitlist.autoAllotByStock);
  const counts = useQuery(api.waitlist.dealerCounts, sessionToken ? { sessionToken } : "skip") ?? {
    waiting: 0,
    allotted: 0,
    history: 0,
    cancelled: 0,
  };
  const [tab, setTab] = useState<Tab>("waiting");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"rank" | "newest" | "oldest">("rank");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  const queueArgs = useMemo<{ sessionToken: string; status?: Exclude<Tab, "all"> } | "skip">(() => {
    if (!sessionToken) return "skip";
    return tab === "all" ? { sessionToken } : { sessionToken, status: tab as Exclude<Tab, "all"> };
  }, [sessionToken, tab]);

  const queue = usePaginatedQuery(api.waitlist.dealerQueue, queueArgs, {
    initialNumItems: 100,
  });
  const allRows = queue.results ?? [];

  const tabCounts: Record<Tab, number> = {
    all: counts.waiting + counts.allotted + counts.history + counts.cancelled,
    waiting: counts.waiting,
    allotted: counts.allotted,
    collected: counts.history,
    cancelled: counts.cancelled,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = allRows;
    if (tab !== "all") rows = rows.filter((r) => r.status === tab);
    if (q) {
      rows = rows.filter((r) =>
        [r.consumer?.fullName, r.consumer?.phone, r.note]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    }
    if (sort === "rank") {
      return rows.sort((a, b) => {
        const aRank = a.status === "waiting" ? (a.position ?? Infinity) : Infinity;
        const bRank = b.status === "waiting" ? (b.position ?? Infinity) : Infinity;
        if (aRank !== bRank) return aRank - bRank;
        return b.createdAt - a.createdAt;
      });
    }
    return rows.sort((a, b) =>
      sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
  }, [allRows, tab, search, sort]);

  const visibleWaiting = useMemo(() => filtered.filter((r) => r.status === "waiting"), [filtered]);
  const selectedWaiting = visibleWaiting.filter((r) => selected.has(r._id));
  const selectedQty = selectedWaiting.reduce((sum, r) => sum + r.quantity, 0);
  const stock = dealer?.stock ?? 0;

  const act = async (fn: "allot" | "collect", id: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(id);
    try {
      if (fn === "allot") {
        await allotEntry({ ...sessionArgs(sessionToken), entryId: id });
      } else {
        await collectEntry({ ...sessionArgs(sessionToken), entryId: id });
      }
      toast.success(fn === "allot" ? t("dealer:cylinderAllotted") : t("dealer:markedCollected"));
    } catch (error) {
      toast.error(friendlyError(error, "Could not update request"));
    } finally {
      setBusyId(null);
    }
  };

  const cancelWithReason = async (id: Id<"waitlistEntries">, reason: string) => {
    if (!user) return;
    setBusyId(id);
    try {
      await cancelEntry({ ...sessionArgs(sessionToken), entryId: id, reason });
      toast.success(t("dealer:requestCancelled"));
      setCancelTarget(null);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update request"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allPicked = visibleWaiting.every((r) => next.has(r._id));
      for (const r of visibleWaiting) {
        if (allPicked) next.delete(r._id);
        else next.add(r._id);
      }
      return next;
    });
  };

  const runBulkAllot = async () => {
    if (!user || selectedWaiting.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await bulkAllot({
        ...sessionArgs(sessionToken),
        entryIds: selectedWaiting.map((r) => r._id),
      });
      setSelected(new Set());
      toast.success(
        t("dealer:allottedCylinders", {
          count: result.allotted,
          formatted: formatNumber(result.allotted),
        }),
      );
      if (result.skipped > 0) {
        toast.warning(
          t("dealer:skippedAllot", {
            count: result.skipped,
            formatted: formatNumber(result.skipped),
          }),
        );
      }
    } catch (error) {
      toast.error(friendlyError(error, "Could not allot the selection"));
    } finally {
      setBulkBusy(false);
    }
  };

  const allShownPicked =
    visibleWaiting.length > 0 && visibleWaiting.every((r) => selected.has(r._id));

  const runAutoAllot = async () => {
    if (!user) return;
    setAutoBusy(true);
    try {
      const result = await autoAllot({ ...sessionArgs(sessionToken) });
      toast.success(
        t("dealer:autoAllotted", {
          count: result.allotted,
          formatted: formatNumber(result.allotted),
        }),
      );
    } catch (error) {
      toast.error(friendlyError(error, "Could not auto-allot"));
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dealer:waitlist")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dealer:searchFilterIntro", {
              depot: dealer?.business_name ?? t("dealer:yourDepot"),
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/dealer/scan">
              <ScanLine className="size-4" /> {t("dealer:scanConsumer")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dealer">
              <Ticket className="size-4" /> {t("dealer:backToHome")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dealer:searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[170px]" aria-label={t("dealer:sortWaitlist")}>
            <SelectValue placeholder={t("dealer:sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rank">{t("dealer:queueOrder")}</SelectItem>
            <SelectItem value="newest">{t("dealer:newestFirst")}</SelectItem>
            <SelectItem value="oldest">{t("dealer:oldestFirst")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tabCounts.waiting > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckCheck className="size-4 shrink-0 text-success" />
            <span>
              {t("dealer:queueOrderHint", {
                waiting: formatNumber(tabCounts.waiting),
                stock: formatNumber(stock),
              })}
            </span>
          </p>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={() => void runAutoAllot()}
              disabled={autoBusy || stock === 0}
            >
              {autoBusy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {t("dealer:autoAllotByStock")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
              tab === tabItem.key
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(tabItem.label)} ({formatNumber(tabCounts[tabItem.key])})
          </button>
        ))}
      </div>

      {selectedWaiting.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm">
            <span className="font-semibold">{formatNumber(selectedWaiting.length)}</span>{" "}
            {t("dealer:selected")} · <span className="font-semibold">{formatNumber(selectedQty)}</span>{" "}
            {t("dealer:cylinders", { count: selectedQty })}
            {stock > 0 ? ` · ${t("dealer:stockLeft", { formatted: formatNumber(stock) })}` : ""}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              {t("dealer:clear")}
            </Button>
            <Button
              size="sm"
              onClick={() => void runBulkAllot()}
              disabled={bulkBusy || selectedQty > stock}
            >
              {bulkBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              {selectedQty > stock ? t("dealer:notEnoughStock") : t("dealer:allotSelected")}
            </Button>
          </div>
        </div>
      ) : null}

      {queue.status === "LoadingFirstPage" ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("dealer:noRequestsInView")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dealer:tryDifferentFilter")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="min-w-[1020px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 border-b border-border px-4 py-3">
                    {visibleWaiting.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={allShownPicked}
                        onChange={toggleAllShown}
                        className="size-4 accent-primary"
                        aria-label={t("dealer:selectAllWaitingShown")}
                      />
                    ) : null}
                  </th>
                  <th className="border-b border-border px-4 py-3">#</th>
                  <th className="border-b border-border px-4 py-3">{t("dealer:consumer")}</th>
                  <th className="border-b border-border px-4 py-3">{t("dealer:citizenship")}</th>
                  <th className="border-b border-border px-4 py-3">{t("common:status")}</th>
                  <th className="border-b border-border px-4 py-3">{t("dealer:qty")}</th>
                  <th className="border-b border-border px-4 py-3">{t("common:requested")}</th>
                  <th className="border-b border-border px-4 py-3">{t("dealer:updated")}</th>
                  <th className="border-b border-border px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row._id} className="align-top">
                    <td className="border-b border-border px-4 py-4">
                      {row.status === "waiting" ? (
                        <input
                          type="checkbox"
                          checked={selected.has(row._id)}
                          onChange={() => toggleSelected(row._id)}
                          className="size-4 accent-primary"
                          aria-label={t("dealer:selectConsumer", {
                            name: row.consumer?.fullName ?? t("dealer:consumer"),
                          })}
                        />
                      ) : null}
                    </td>
                    <td className="border-b border-border px-4 py-4">
                      {row.status === "waiting" ? (
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-lg text-sm font-bold",
                            row.position === 1
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          {row.position ? formatNumber(row.position) : "?"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-4">
                      <p className="font-medium">{row.consumer?.fullName ?? t("dealer:consumer")}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.consumer?.address ?? t("dealer:noAddress")}
                        {row.note ? ` · “${row.note}”` : ""}
                      </p>
                    </td>
                    <td className="border-b border-border px-4 py-4 text-sm">
                      {maskCitizenship(row.consumer?.citizenshipMasked)}
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
                        : row.status === "collected" && row.collectedAt
                          ? formatDateTime(row.collectedAt)
                          : "-"}
                    </td>
                    <td className="border-b border-border px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status === "waiting" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void act("allot", row._id)}
                              disabled={busyId === row._id || stock < row.quantity}
                            >
                              {busyId === row._id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                              {stock < row.quantity ? t("dealer:noStock") : t("dealer:allot")}
                            </Button>
<Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCancelTarget(row)}
                              disabled={busyId === row._id}
                            >
                              {t("common:cancel")}
                            </Button>
                          </>
                        ) : row.status === "allotted" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void act("collect", row._id)}
                              disabled={busyId === row._id}
                            >
                              {busyId === row._id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <PackageCheck className="size-4" />
                              )}{" "}
                              {t("dealer:collect")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCancelTarget(row)}
                              disabled={busyId === row._id}
                            >
                              {t("common:cancel")}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-1 text-center text-xs text-muted-foreground">
            {t("dealer:showingRequests", {
              count: tabCounts[tab],
              shown: formatNumber(filtered.length),
              total: formatNumber(tabCounts[tab]),
            })}
          </p>
          {queue.status === "CanLoadMore" ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => queue.loadMore(100)}
              disabled={queue.isLoading}
            >
              {queue.isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t("dealer:loadMore")}
            </Button>
          ) : null}
        </div>
      )}

      <CancelRequestModal
        open={cancelTarget !== null}
        consumerName={cancelTarget?.consumer?.fullName ?? t("dealer:theCustomer")}
        busy={cancelTarget !== null && busyId === cancelTarget._id}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          if (cancelTarget) void cancelWithReason(cancelTarget._id, reason);
        }}
      />
    </div>
  );
}
