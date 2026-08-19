import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Hourglass,
  Loader2,
  PackageCheck,
  Search,
  Store,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth, sessionArgs } from "@/lib/auth";
import i18n, { formatDate, formatNumber } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestDetails } from "@/components/RequestDetails";
import { SwipeableCards } from "@/components/SwipeableCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  consumerQrValue,
  formatDateTime,
  friendlyError,
  maskCitizenship,
  timeAgo,
} from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: i18n.t("dashboard:headTitle") },
      { name: "description", content: i18n.t("dashboard:headDescription") },
      { property: "og:title", content: i18n.t("dashboard:headTitle") },
      { property: "og:description", content: i18n.t("dashboard:headDescription") },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { role } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  return <ConsumerDashboard />;
}

function ConsumerDashboard() {
  const { t } = useTranslation();
  const { user, profile, sessionToken } = useAuth();
  const stats = useQuery(api.waitlist.consumerStats, sessionToken ? { sessionToken } : "skip");
  const purchase = useQuery(
    api.waitlist.consumerPurchaseSummary,
    sessionToken ? { sessionToken } : "skip",
  );
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const confirmCollection = useMutation(api.waitlist.confirmCollection);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requests = useQuery(
    api.waitlist.consumerWaitlistAll,
    sessionToken ? { sessionToken } : "skip",
  );
  const activeRequests =
    requests?.filter((r) => r.status === "waiting" || r.status === "allotted") ?? [];
  const depotCount = new Set(activeRequests.map((r) => String(r.dealerId))).size;
  const [selected, setSelected] = useState<
    | (Doc<"waitlistEntries"> & { dealer: Doc<"dealers"> | null; position: number | undefined })
    | null
  >(null);

  const cancel = async (entryId: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(entryId);
    try {
      await cancelEntry({ ...sessionArgs(sessionToken), entryId });
      toast.success(t("dashboard:requestCancelled"));
      setSelected(null);
    } catch (error) {
      toast.error(friendlyError(error, "Could not cancel request"));
    } finally {
      setBusyId(null);
    }
  };

  const confirm = async (entryId: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(entryId);
    try {
      await confirmCollection({ ...sessionArgs(sessionToken), entryId });
      toast.success(t("dashboard:collectionConfirmed"));
      setSelected(null);
    } catch (error) {
      toast.error(friendlyError(error, "Could not confirm collection"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {t("dashboard:greeting", {
              name: profile?.full_name?.split(" ")[0] ?? t("dashboard:greetingFallbackName"),
            })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats === undefined
              ? t("dashboard:loadingQueueSummary")
              : t("dashboard:activeCount", { count: stats.active })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/waitlist">
              <Ticket className="size-4" /> {t("dashboard:viewWaitlist")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dealers">
              <Search className="size-4" /> Find a depot
            </Link>
          </Button>
        </div>
      </div>

      {stats === undefined ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            <SwipeableCards
              items={[
                {
                  id: "active",
                  title: t("dashboard:activeRequests"),
                  value: formatNumber(stats.active),
                  sub: t("dashboard:waitingAllotted", {
                    waiting: formatNumber(stats.waiting),
                    allotted: formatNumber(stats.allotted),
                  }),
                  icon: Ticket,
                },
                {
                  id: "collected",
                  title: t("dashboard:cylindersCollected"),
                  value: formatNumber(purchase?.totalQuantity ?? 0),
                  icon: PackageCheck,
                },
              ]}
            />
          </div>
          <div className="hidden grid-cols-4 gap-3 lg:grid">
            <StatCard label={t("dashboard:activeRequests")} value={stats.active} icon={Ticket} />
            <StatCard label={t("dashboard:waiting")} value={stats.waiting} icon={Users} />
            <StatCard label={t("dashboard:allotted")} value={stats.allotted} icon={Check} />
            <StatCard
              label={t("dashboard:cylindersCollected")}
              value={purchase?.totalQuantity ?? 0}
              icon={PackageCheck}
            />
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{t("dashboard:yourWaitlist")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {requests === undefined
                  ? t("dashboard:loadingRequests")
                  : activeRequests.length > 0
                    ? t("dashboard:activeAcross", {
                        count: activeRequests.length,
                        depots: formatNumber(depotCount),
                      })
                    : t("dashboard:noActiveRequests")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/waitlist">
                <Ticket className="size-4" /> {t("dashboard:viewAll")}
              </Link>
            </Button>
          </div>

          {requests === undefined ? (
            <div className="grid h-32 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : activeRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
              <Ticket className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">{t("dashboard:noQueuesJoined")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard:browseDepotsHint")}
              </p>
              <Button asChild className="mt-4">
                <Link to="/dealers">
                  <Search className="size-4" /> {t("dashboard:findDepot")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activeRequests.map((row) => (
                <button
                  key={row._id}
                  type="button"
                  onClick={() => setSelected(row)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.dealer?.businessName ?? t("dashboard:depot")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.dealer?.district ?? t("dashboard:unknownDistrict")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.status === "waiting" ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/25">
                        {row.position
                          ? t("dashboard:inLine", { position: formatNumber(row.position) })
                          : t("dashboard:inLineUnknown")}
                      </span>
                    ) : null}
                    <StatusBadge status={row.status} />
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {timeAgo(row.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="font-semibold">{t("dashboard:collectionCode")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard:collectionCodeHint")}</p>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
            {user ? (
              <QRCodeSVG value={consumerQrValue(user.accountId)} size={128} level="M" />
            ) : null}
          </div>
          <p className="mt-4 text-sm font-semibold">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard:citizenship")} {maskCitizenship(profile?.citizenship_no)}
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm">
            <p className="font-medium">{t("dashboard:purchaseHistory")}</p>
            <p className="text-muted-foreground">
              {purchase === undefined
                ? t("dashboard:loadingHistory")
                : purchase.totalPurchases > 0
                  ? t("dashboard:completedPurchases", { count: purchase.totalPurchases })
                  : t("dashboard:noCompletedPurchases")}
            </p>
            {purchase?.lastCollectedAt ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {t("dashboard:lastCollected", { date: formatDate(purchase.lastCollectedAt) })}
              </p>
            ) : null}
            {purchase?.user?.cooldownUntil && purchase.user.cooldownUntil > Date.now() ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                <PackageCheck className="size-3.5" />
                {t("dashboard:rejoinAfter", { date: formatDate(purchase.user.cooldownUntil) })}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

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

function AdminDashboard() {
  const { t } = useTranslation();
  const { user, sessionToken } = useAuth();
  const opts = sessionToken ? { sessionToken } : "skip";
  const stats = useQuery(api.admin.dashboardStats, opts);
  const pendingQ = usePaginatedQuery(
    api.admin.listDealers,
    sessionToken ? { sessionToken, status: "pending" } : "skip",
    { initialNumItems: 50 },
  );
  const dealersQ = usePaginatedQuery(api.admin.listDealers, opts, { initialNumItems: 50 });
  const usersQ = usePaginatedQuery(api.admin.listUsers, opts, { initialNumItems: 50 });
  const entriesQ = usePaginatedQuery(api.admin.listEntries, opts, { initialNumItems: 50 });
  const logsQ = usePaginatedQuery(api.admin.listAuditLogs, opts, { initialNumItems: 50 });

  const reviewDealer = useMutation(api.admin.reviewDealer);
  const unapproveDealer = useMutation(api.admin.unapproveDealer);
  const deleteDealer = useMutation(api.admin.deleteDealer);
  const adminCancelEntry = useMutation(api.admin.adminCancelEntry);
  const deleteUser = useMutation(api.admin.deleteUser);

  const bulkReview = useMutation(api.admin.bulkReviewDealers);
  const bulkDelete = useMutation(api.admin.bulkDeleteDealers);
  const bulkCancel = useMutation(api.admin.bulkCancelEntries);

  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDealers, setSelectedDealers] = useState<Id<"dealers">[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Id<"waitlistEntries">[]>([]);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const pending = pendingQ.results ?? [];
  const dealers = dealersQ.results ?? [];
  const users = usersQ.results ?? [];
  const entries = entriesQ.results ?? [];
  const logs = logsQ.results ?? [];

  const toggleSelectDealer = (id: Id<"dealers">) => {
    setSelectedDealers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectEntry = (id: Id<"waitlistEntries">) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleReview = async (dealerId: Id<"dealers">, decision: "approved" | "rejected") => {
    if (!user) return;
    setBusy(dealerId);
    try {
      await reviewDealer({ ...sessionArgs(sessionToken), dealerId, decision });
      toast.success(
        decision === "approved" ? t("dashboard:depotApproved") : t("dashboard:depotRejected"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const handleUnapprove = async (dealerId: Id<"dealers">) => {
    if (!user) return;
    setBusy(dealerId);
    try {
      await unapproveDealer({ ...sessionArgs(sessionToken), dealerId });
      toast.success(t("dashboard:depotUnapproved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteDealer = async (dealerId: Id<"dealers">) => {
    if (!user) return;
    if (!window.confirm(t("dashboard:confirmDeleteDepot"))) return;
    setBusy(dealerId);
    try {
      await deleteDealer({ ...sessionArgs(sessionToken), dealerId });
      toast.success(t("dashboard:depotDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  };

  const handleCancelEntry = async (entryId: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusy(entryId);
    try {
      await adminCancelEntry({ ...sessionArgs(sessionToken), entryId });
      toast.success(t("dashboard:entryCancelled"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:couldNotCancelEntry"));
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteUser = async (userId: Id<"users">) => {
    if (!user) return;
    if (!window.confirm(t("dashboard:confirmDeleteConsumer"))) return;
    setBusy(userId);
    try {
      await deleteUser({ ...sessionArgs(sessionToken), userId });
      toast.success(t("dashboard:consumerAccountDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:couldNotDeleteConsumer"));
    } finally {
      setBusy(null);
    }
  };

  const handleBulkReview = async (decision: "approved" | "rejected") => {
    if (!user || selectedDealers.length === 0) return;
    setBusy("bulk");
    try {
      await bulkReview({ ...sessionArgs(sessionToken), dealerIds: selectedDealers, decision });
      toast.success(
        t(decision === "approved" ? "dashboard:depotsApproved" : "dashboard:depotsRejected", {
          count: selectedDealers.length,
        }),
      );
      setSelectedDealers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:bulkActionFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleBulkDeleteDealers = async () => {
    if (!user || selectedDealers.length === 0) return;
    if (
      !window.confirm(t("dashboard:confirmDeleteSelectedDepots", { count: selectedDealers.length }))
    )
      return;
    setBusy("bulk");
    try {
      await bulkDelete({ ...sessionArgs(sessionToken), dealerIds: selectedDealers });
      toast.success(t("dashboard:depotsDeleted", { count: selectedDealers.length }));
      setSelectedDealers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:bulkDeleteFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleBulkCancelEntries = async () => {
    if (!user || selectedEntries.length === 0) return;
    setBusy("bulk");
    try {
      await bulkCancel({ ...sessionArgs(sessionToken), entryIds: selectedEntries });
      toast.success(t("dashboard:entriesCancelled", { count: selectedEntries.length }));
      setSelectedEntries([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard:bulkCancelFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          {t("dashboard:adminDashboard")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          {t("dashboard:adminSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <StatCard label={t("dashboard:accounts")} value={stats?.accounts} icon={Ticket} />
        <StatCard label={t("dashboard:consumers")} value={stats?.users} icon={Users} />
        <StatCard label={t("dashboard:dealers")} value={stats?.dealers} icon={Store} />
        <StatCard label={t("dashboard:waitlist")} value={stats?.entries} icon={Ticket} />
        <StatCard
          label={t("dashboard:pending")}
          value={stats?.pendingDealers}
          icon={Hourglass}
          alert={!!stats?.pendingDealers}
        />
      </div>

      {/* Floating Bulk Operations Toolbar */}
      {selectedDealers.length > 0 || selectedEntries.length > 0 ? (
        <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-primary/30 bg-card p-3.5 shadow-lg backdrop-blur-md">
          <span className="text-xs font-bold text-foreground">
            {t("dashboard:selectedCount", {
              count: selectedDealers.length || selectedEntries.length,
            })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedDealers.length > 0 ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs"
                  onClick={() => void handleBulkReview("rejected")}
                  disabled={busy === "bulk"}
                >
                  <X className="size-3.5 mr-1 text-destructive" /> {t("dashboard:bulkReject")}
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-xl text-xs font-semibold"
                  onClick={() => void handleBulkReview("approved")}
                  disabled={busy === "bulk"}
                >
                  <Check className="size-3.5 mr-1" /> {t("dashboard:bulkApprove")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => void handleBulkDeleteDealers()}
                  disabled={busy === "bulk"}
                >
                  <Trash2 className="size-3.5 mr-1" /> {t("dashboard:bulkDelete")}
                </Button>
              </>
            ) : null}
            {selectedEntries.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs text-destructive border-destructive/30"
                onClick={() => void handleBulkCancelEntries()}
                disabled={busy === "bulk"}
              >
                <X className="size-3.5 mr-1" /> {t("dashboard:bulkCancelEntries")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl text-xs"
              onClick={() => {
                setSelectedDealers([]);
                setSelectedEntries([]);
              }}
            >
              {t("dashboard:clear")}
            </Button>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="pending">
        {/* Horizontal Touch Scrollable Tabs */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 justify-start h-11 p-1 bg-muted/60 rounded-2xl gap-1">
            <TabsTrigger
              value="pending"
              className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Hourglass className="size-3.5 text-amber-600" />{" "}
              {t("dashboard:pendingCount", { count: stats?.pendingDealers ?? 0 })}
            </TabsTrigger>
            <TabsTrigger
              value="dealers"
              className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Store className="size-3.5 text-primary" />{" "}
              {t("dashboard:dealersCount", { count: stats?.dealers ?? 0 })}
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Users className="size-3.5 text-primary" />{" "}
              {t("dashboard:consumersCount", { count: stats?.users ?? 0 })}
            </TabsTrigger>
            <TabsTrigger
              value="entries"
              className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Ticket className="size-3.5 text-primary" /> {t("dashboard:waitlist")}
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0"
            >
              <FileText className="size-3.5 text-primary" /> {t("dashboard:auditLog")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Pending Approvals */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingQ.status === "LoadingFirstPage" ? (
            <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 sm:p-10 text-center">
              <Store className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold text-foreground">
                {t("dashboard:noPendingApprovals")}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {t("dashboard:pendingApprovalsHint")}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={pending.length > 0 && selectedDealers.length === pending.length}
                          onChange={(e) =>
                            setSelectedDealers(e.target.checked ? pending.map((d) => d.id) : [])
                          }
                        />
                      </TableHead>
                      <TableHead>{t("dashboard:depot")}</TableHead>
                      <TableHead>{t("dashboard:owner")}</TableHead>
                      <TableHead>{t("dashboard:district")}</TableHead>
                      <TableHead>{t("dashboard:code")}</TableHead>
                      <TableHead className="text-right">{t("dashboard:actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedDealers.includes(d.id)}
                            onChange={() => toggleSelectDealer(d.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{d.businessName}</p>
                          <p className="text-xs text-muted-foreground">{d.address}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">{d.ownerEmail ?? "-"}</p>
                          <p className="text-xs text-muted-foreground">{d.phone}</p>
                        </TableCell>
                        <TableCell>{d.district}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {d.code}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl text-xs font-medium"
                              disabled={busy === d.id}
                              onClick={() => void handleReview(d.id, "rejected")}
                            >
                              <X className="size-3.5 mr-1 text-destructive" />{" "}
                              {t("dashboard:reject")}
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 rounded-xl text-xs font-semibold"
                              disabled={busy === d.id}
                              onClick={() => void handleReview(d.id, "approved")}
                            >
                              {busy === d.id ? (
                                <Loader2 className="size-3.5 animate-spin mr-1" />
                              ) : (
                                <Check className="size-3.5 mr-1" />
                              )}{" "}
                              {t("dashboard:approve")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View with Expandable Actions */}
              <div className="grid gap-3 md:hidden">
                {pending.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="rounded border-border size-4"
                          checked={selectedDealers.includes(d.id)}
                          onChange={() => toggleSelectDealer(d.id)}
                        />
                        <div>
                          <h3 className="font-bold text-base text-foreground">{d.businessName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {d.district} • {d.address}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full shrink-0">
                        {d.code}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-muted-foreground pl-6">
                      <p>
                        <strong className="text-foreground">{t("dashboard:ownerLabel")}</strong>{" "}
                        {d.ownerEmail ?? "-"}
                      </p>
                      {d.phone ? (
                        <p>
                          <strong className="text-foreground">{t("dashboard:phoneLabel")}</strong>{" "}
                          {d.phone}
                        </p>
                      ) : null}
                    </div>

                    {/* Compact Expandable Action Toggle on Mobile */}
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full justify-between rounded-xl text-xs font-medium"
                        onClick={() => setExpandedActionId(expandedActionId === d.id ? null : d.id)}
                      >
                        <span>{t("dashboard:manageApplication")}</span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform duration-200",
                            expandedActionId === d.id && "rotate-180",
                          )}
                        />
                      </Button>

                      {expandedActionId === d.id ? (
                        <div className="flex gap-2 pt-2.5 animate-in fade-in duration-200">
                          <Button
                            variant="outline"
                            className="h-10 rounded-xl flex-1 text-xs font-semibold"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "rejected")}
                          >
                            <X className="size-4 mr-1 text-destructive" /> {t("dashboard:reject")}
                          </Button>
                          <Button
                            className="h-10 rounded-xl flex-1 text-xs font-bold"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "approved")}
                          >
                            {busy === d.id ? (
                              <Loader2 className="size-4 animate-spin mr-1" />
                            ) : (
                              <Check className="size-4 mr-1" />
                            )}{" "}
                            {t("dashboard:approve")}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <AdminLoadMore
            status={pendingQ.status}
            onLoad={() => pendingQ.loadMore(50)}
            count={pendingQ.results?.length}
            total={stats?.pendingDealers}
          />
        </TabsContent>

        {/* Tab 2: Dealers */}
        <TabsContent value="dealers" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={dealers.length > 0 && selectedDealers.length === dealers.length}
                      onChange={(e) =>
                        setSelectedDealers(e.target.checked ? dealers.map((d) => d.id) : [])
                      }
                    />
                  </TableHead>
                  <TableHead>{t("dashboard:depot")}</TableHead>
                  <TableHead>{t("dashboard:owner")}</TableHead>
                  <TableHead>{t("dashboard:district")}</TableHead>
                  <TableHead>{t("dashboard:stock")}</TableHead>
                  <TableHead>{t("dashboard:waiting")}</TableHead>
                  <TableHead>{t("dashboard:status")}</TableHead>
                  <TableHead className="text-right">{t("dashboard:actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealersQ.status === "LoadingFirstPage" ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : dealers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      {t("dashboard:noRegisteredDealers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  dealers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedDealers.includes(d.id)}
                          onChange={() => toggleSelectDealer(d.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground">{d.businessName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{d.code}</p>
                      </TableCell>
                      <TableCell className="text-xs">{d.ownerEmail ?? "-"}</TableCell>
                      <TableCell>{d.district}</TableCell>
                      <TableCell className="font-semibold">{d.stock}</TableCell>
                      <TableCell className="font-semibold">{d.waiting}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.approvalStatus === "approved"
                              ? "default"
                              : d.approvalStatus === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className="rounded-full px-2.5 text-[11px]"
                        >
                          {d.approvalStatus}
                          {d.approvalStatus === "approved" && !d.isActive
                            ? t("dashboard:inactiveSuffix")
                            : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {d.approvalStatus === "approved" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl text-xs"
                              disabled={busy === d.id}
                              onClick={() => void handleUnapprove(d.id)}
                            >
                              <X className="size-3.5 mr-1" /> {t("dashboard:unapprove")}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-xl text-xs text-destructive hover:text-destructive"
                            disabled={busy === d.id}
                            onClick={() => void handleDeleteDealer(d.id)}
                          >
                            <Trash2 className="size-3.5" /> {t("dashboard:delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View with Expandable Actions */}
          <div className="grid gap-3 md:hidden">
            {dealers.map((d) => (
              <div
                key={d.id}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="rounded border-border size-4"
                      checked={selectedDealers.includes(d.id)}
                      onChange={() => toggleSelectDealer(d.id)}
                    />
                    <div>
                      <h3 className="font-bold text-base text-foreground">{d.businessName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {d.district} • {d.ownerEmail ?? "-"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={d.approvalStatus === "approved" ? "default" : "secondary"}
                    className="rounded-full shrink-0"
                  >
                    {d.approvalStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center bg-muted/40 rounded-2xl p-2.5">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      {t("dashboard:code")}
                    </p>
                    <p className="font-mono text-xs font-extrabold text-primary">{d.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      {t("dashboard:stock")}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">{d.stock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      {t("dashboard:waiting")}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">{d.waiting}</p>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-between rounded-xl text-xs font-medium"
                    onClick={() => setExpandedActionId(expandedActionId === d.id ? null : d.id)}
                  >
                    <span>{t("dashboard:manageDepot")}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-200",
                        expandedActionId === d.id && "rotate-180",
                      )}
                    />
                  </Button>

                  {expandedActionId === d.id ? (
                    <div className="flex gap-2 pt-2.5 animate-in fade-in duration-200">
                      {d.approvalStatus === "approved" ? (
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl flex-1 text-xs font-semibold"
                          disabled={busy === d.id}
                          onClick={() => void handleUnapprove(d.id)}
                        >
                          <X className="size-4 mr-1" /> {t("dashboard:unapprove")}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 flex-1"
                        disabled={busy === d.id}
                        onClick={() => void handleDeleteDealer(d.id)}
                      >
                        <Trash2 className="size-4 mr-1" /> {t("dashboard:deleteDepot")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <AdminLoadMore
            status={dealersQ.status}
            onLoad={() => dealersQ.loadMore(50)}
            count={dealersQ.results?.length}
            total={stats?.dealers}
          />
        </TabsContent>

        {/* Tab 3: Consumers */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard:name")}</TableHead>
                  <TableHead>{t("dashboard:email")}</TableHead>
                  <TableHead>{t("dashboard:citizenship")}</TableHead>
                  <TableHead>{t("dashboard:district")}</TableHead>
                  <TableHead>{t("dashboard:code")}</TableHead>
                  <TableHead>{t("dashboard:purchased")}</TableHead>
                  <TableHead className="text-right">{t("dashboard:actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQ.status === "LoadingFirstPage" ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {t("dashboard:noRegisteredConsumers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold text-foreground">{u.fullName}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {maskCitizenship(u.citizenshipNo)}
                      </TableCell>
                      <TableCell>{u.district}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {u.collectionCode}
                      </TableCell>
                      <TableCell className="font-semibold">{u.totalPurchasedQuantity}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          disabled={busy === u.id}
                          onClick={() => void handleDeleteUser(u.id)}
                        >
                          <Trash2 className="size-3.5 mr-1" /> {t("dashboard:delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View with Expandable Actions */}
          <div className="grid gap-3 md:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-2"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{u.fullName}</h3>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {u.collectionCode}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="bg-muted/40 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {t("dashboard:district")}
                    </p>
                    <p className="font-semibold text-foreground truncate mt-0.5">{u.district}</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {t("dashboard:citizenship")}
                    </p>
                    <p className="font-mono text-[11px] font-semibold text-foreground truncate mt-0.5">
                      {maskCitizenship(u.citizenshipNo)}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {t("dashboard:purchased")}
                    </p>
                    <p className="font-bold text-foreground mt-0.5">
                      {t("dashboard:purchasedCyl", { count: u.totalPurchasedQuantity })}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-between rounded-xl text-xs font-medium"
                    onClick={() => setExpandedActionId(expandedActionId === u.id ? null : u.id)}
                  >
                    <span>{t("dashboard:manageAccount")}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-200",
                        expandedActionId === u.id && "rotate-180",
                      )}
                    />
                  </Button>

                  {expandedActionId === u.id ? (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <Button
                        variant="ghost"
                        className="h-10 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
                        disabled={busy === u.id}
                        onClick={() => void handleDeleteUser(u.id)}
                      >
                        <Trash2 className="size-4 mr-1" /> {t("dashboard:deleteConsumerAccount")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <AdminLoadMore
            status={usersQ.status}
            onLoad={() => usersQ.loadMore(50)}
            count={usersQ.results?.length}
            total={stats?.users}
          />
        </TabsContent>

        {/* Tab 4: Waitlist */}
        <TabsContent value="entries" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={entries.length > 0 && selectedEntries.length === entries.length}
                      onChange={(e) =>
                        setSelectedEntries(e.target.checked ? entries.map((e) => e.id) : [])
                      }
                    />
                  </TableHead>
                  <TableHead>{t("dashboard:dealer")}</TableHead>
                  <TableHead>{t("dashboard:consumer")}</TableHead>
                  <TableHead>{t("dashboard:qty")}</TableHead>
                  <TableHead>{t("dashboard:status")}</TableHead>
                  <TableHead className="text-right">{t("dashboard:actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesQ.status === "LoadingFirstPage" ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {t("dashboard:noWaitlistEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedEntries.includes(e.id)}
                          onChange={() => toggleSelectEntry(e.id)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {e.dealerName ?? t("dashboard:unknownDepot")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.consumerEmail ?? t("dashboard:unknown")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {t("dashboard:quantitySize", {
                          quantity: formatNumber(e.quantity),
                          size: e.cylinderSize,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={e.status === "cancelled" ? "destructive" : "secondary"}
                          className="rounded-full"
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {e.status !== "cancelled" && e.status !== "collected" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            disabled={busy === e.id}
                            onClick={() => void handleCancelEntry(e.id)}
                          >
                            <X className="size-3.5 mr-1" /> {t("dashboard:cancelEntry")}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View with Expandable Actions */}
          <div className="grid gap-3 md:hidden">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-2"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-border size-4"
                      checked={selectedEntries.includes(e.id)}
                      onChange={() => toggleSelectEntry(e.id)}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {e.dealerName ?? t("dashboard:unknownDepot")}
                      </h4>
                      <p className="text-xs text-muted-foreground">{e.consumerEmail}</p>
                    </div>
                  </div>
                  <Badge
                    variant={e.status === "cancelled" ? "destructive" : "secondary"}
                    className="rounded-full text-[10px]"
                  >
                    {e.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-primary">
                    {t("dashboard:quantitySizeCylinder", {
                      quantity: formatNumber(e.quantity),
                      size: e.cylinderSize,
                    })}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                  </span>
                </div>

                {e.status !== "cancelled" && e.status !== "collected" ? (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between rounded-xl text-xs font-medium"
                      onClick={() => setExpandedActionId(expandedActionId === e.id ? null : e.id)}
                    >
                      <span>{t("dashboard:actions")}</span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-200",
                          expandedActionId === e.id && "rotate-180",
                        )}
                      />
                    </Button>

                    {expandedActionId === e.id ? (
                      <div className="pt-2 animate-in fade-in duration-200">
                        <Button
                          variant="ghost"
                          className="h-9 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
                          disabled={busy === e.id}
                          onClick={() => void handleCancelEntry(e.id)}
                        >
                          <X className="size-3.5 mr-1" /> {t("dashboard:cancelWaitlistEntry")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <AdminLoadMore
            status={entriesQ.status}
            onLoad={() => entriesQ.loadMore(50)}
            count={entriesQ.results?.length}
            total={stats?.entries}
          />
        </TabsContent>

        {/* Tab 5: Audit Log */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard:action")}</TableHead>
                  <TableHead>{t("dashboard:details")}</TableHead>
                  <TableHead>{t("dashboard:timestamp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQ.status === "LoadingFirstPage" ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      {t("dashboard:noActivity")}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {l.action}
                      </TableCell>
                      <TableCell className="text-xs">{l.details ?? l.targetId ?? "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(l.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-2.5 md:hidden">
            {logs.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-[11px]">
                    {l.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(l.createdAt)}
                  </span>
                </div>
                <p className="text-foreground text-xs pt-0.5">{l.details ?? l.targetId ?? "-"}</p>
              </div>
            ))}
          </div>

          <AdminLoadMore
            status={logsQ.status}
            onLoad={() => logsQ.loadMore(50)}
            count={logsQ.results?.length}
            total={stats?.logs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminLoadMore({
  status,
  onLoad,
  count,
  total,
}: {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  onLoad: () => void;
  count: number | undefined;
  total: number | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      {count !== undefined && total !== undefined ? (
        <p className="text-xs text-muted-foreground">
          {t("dashboard:showingEntries", { count, total: formatNumber(total) })}
        </p>
      ) : null}
      {status === "CanLoadMore" ? (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold h-9 px-4 text-xs"
          onClick={onLoad}
        >
          {t("dashboard:loadMore")}
        </Button>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: number | undefined;
  icon?: typeof Store;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4 sm:p-5 shadow-soft transition-all",
        alert ? "border-amber-500/30 bg-amber-500/5" : "border-border/80 bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "grid size-7 place-items-center rounded-xl text-xs",
              alert ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
        {value ?? "-"}
      </p>
    </div>
  );
}
