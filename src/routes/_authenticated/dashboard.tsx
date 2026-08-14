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
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth, sessionArgs } from "@/lib/auth";
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
      { title: "Your dashboard - YoGas" },
      { name: "description", content: "A quick summary of your LPG queue activity." },
      { property: "og:title", content: "Your dashboard - YoGas" },
      { property: "og:description", content: "A quick summary of your LPG queue activity." },
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
  const [selected, setSelected] = useState<
    | (Doc<"waitlistEntries"> & { dealer: Doc<"dealers"> | null; position: number | undefined })
    | null
  >(null);

  const cancel = async (entryId: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(entryId);
    try {
      await cancelEntry({ ...sessionArgs(sessionToken), entryId });
      toast.success("Request cancelled");
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
      toast.success("Collection confirmed - cylinder handed over");
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
            Namaste, {profile?.full_name?.split(" ")[0] ?? "friend"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats === undefined
              ? "Loading your queue summary..."
              : `You have ${stats.active} active request${stats.active === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/waitlist">
              <Ticket className="size-4" /> View waitlist
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
                  title: "Active requests",
                  value: String(stats.active),
                  sub: `${stats.waiting} waiting · ${stats.allotted} allotted`,
                  icon: Ticket,
                },
                {
                  id: "collected",
                  title: "Cylinders collected",
                  value: String(purchase?.totalQuantity ?? 0),
                  icon: PackageCheck,
                },
              ]}
            />
          </div>
          <div className="hidden grid-cols-4 gap-3 lg:grid">
            <StatCard label="Active requests" value={stats.active} icon={Ticket} />
            <StatCard label="Waiting" value={stats.waiting} icon={Users} />
            <StatCard label="Allotted" value={stats.allotted} icon={Check} />
            <StatCard label="Cylinders collected" value={purchase?.totalQuantity ?? 0} icon={PackageCheck} />
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Your waitlist</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {requests === undefined
                  ? "Loading your requests..."
                  : activeRequests.length > 0
                    ? `${activeRequests.length} active request${activeRequests.length === 1 ? "" : "s"} across ${new Set(activeRequests.map((r) => String(r.dealerId))).size} depot${new Set(activeRequests.map((r) => String(r.dealerId))).size === 1 ? "" : "s"}.`
                    : "No active requests - join a queue to get gas."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/waitlist">
                <Ticket className="size-4" /> View all
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
              <p className="mt-2 text-sm font-semibold">You haven't joined any queue yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse depots or scan a depot code to join your first waitlist.
              </p>
              <Button asChild className="mt-4">
                <Link to="/dealers">
                  <Search className="size-4" /> Find a depot
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
                    <p className="truncate font-medium">{row.dealer?.businessName ?? "Depot"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.dealer?.district ?? "Unknown district"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.status === "waiting" ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/25">
                        #{row.position ?? "?"} in line
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
          <h2 className="font-semibold">Your collection code</h2>
          <p className="mt-1 text-sm text-muted-foreground">The dealer scans this to verify you.</p>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
            {user ? (
              <QRCodeSVG value={consumerQrValue(user.accountId)} size={128} level="M" />
            ) : null}
          </div>
          <p className="mt-4 text-sm font-semibold">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground">
            Citizenship {maskCitizenship(profile?.citizenship_no)}
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm">
            <p className="font-medium">Purchase history</p>
            <p className="text-muted-foreground">
              {purchase === undefined
                ? "Loading history..."
                : purchase.totalPurchases > 0
                  ? `${purchase.totalPurchases} completed purchase${purchase.totalPurchases === 1 ? "" : "s"} so far.`
                  : "No completed purchases yet."}
            </p>
            {purchase?.lastCollectedAt ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                Last collected {new Date(purchase.lastCollectedAt).toLocaleDateString()}
              </p>
            ) : null}
            {purchase?.user?.cooldownUntil && purchase.user.cooldownUntil > Date.now() ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                <PackageCheck className="size-3.5" />
                Rejoin after {new Date(purchase.user.cooldownUntil).toLocaleDateString()}
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
      toast.success(decision === "approved" ? "Depot approved" : "Depot rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleUnapprove = async (dealerId: Id<"dealers">) => {
    if (!user) return;
    setBusy(dealerId);
    try {
      await unapproveDealer({ ...sessionArgs(sessionToken), dealerId });
      toast.success("Depot unapproved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteDealer = async (dealerId: Id<"dealers">) => {
    if (!user) return;
    if (!window.confirm("Delete this depot? Its waitlist entries will be cancelled.")) return;
    setBusy(dealerId);
    try {
      await deleteDealer({ ...sessionArgs(sessionToken), dealerId });
      toast.success("Depot deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleCancelEntry = async (entryId: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusy(entryId);
    try {
      await adminCancelEntry({ ...sessionArgs(sessionToken), entryId });
      toast.success("Waitlist entry cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel entry");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteUser = async (userId: Id<"users">) => {
    if (!user) return;
    if (!window.confirm("Delete this consumer account? All associated entries will be cancelled.")) return;
    setBusy(userId);
    try {
      await deleteUser({ ...sessionArgs(sessionToken), userId });
      toast.success("Consumer account deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete consumer");
    } finally {
      setBusy(null);
    }
  };

  const handleBulkReview = async (decision: "approved" | "rejected") => {
    if (!user || selectedDealers.length === 0) return;
    setBusy("bulk");
    try {
      await bulkReview({ ...sessionArgs(sessionToken), dealerIds: selectedDealers, decision });
      toast.success(`${selectedDealers.length} depots ${decision}`);
      setSelectedDealers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBusy(null);
    }
  };

  const handleBulkDeleteDealers = async () => {
    if (!user || selectedDealers.length === 0) return;
    if (!window.confirm(`Delete ${selectedDealers.length} selected depots?`)) return;
    setBusy("bulk");
    try {
      await bulkDelete({ ...sessionArgs(sessionToken), dealerIds: selectedDealers });
      toast.success(`${selectedDealers.length} depots deleted`);
      setSelectedDealers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBusy(null);
    }
  };

  const handleBulkCancelEntries = async () => {
    if (!user || selectedEntries.length === 0) return;
    setBusy("bulk");
    try {
      await bulkCancel({ ...sessionArgs(sessionToken), entryIds: selectedEntries });
      toast.success(`${selectedEntries.length} waitlist entries cancelled`);
      setSelectedEntries([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk cancel failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Platform governance, depot approvals, user registry & audit logs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <StatCard label="Accounts" value={stats?.accounts} icon={Ticket} />
        <StatCard label="Consumers" value={stats?.users} icon={Users} />
        <StatCard label="Dealers" value={stats?.dealers} icon={Store} />
        <StatCard label="Waitlist" value={stats?.entries} icon={Ticket} />
        <StatCard label="Pending" value={stats?.pendingDealers} icon={Hourglass} alert={!!stats?.pendingDealers} />
      </div>

      {/* Floating Bulk Operations Toolbar */}
      {selectedDealers.length > 0 || selectedEntries.length > 0 ? (
        <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-primary/30 bg-card p-3.5 shadow-lg backdrop-blur-md">
          <span className="text-xs font-bold text-foreground">
            Selected: {selectedDealers.length || selectedEntries.length} item(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedDealers.length > 0 ? (
              <>
                <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs" onClick={() => void handleBulkReview("rejected")} disabled={busy === "bulk"}>
                  <X className="size-3.5 mr-1 text-destructive" /> Bulk Reject
                </Button>
                <Button size="sm" className="h-8 rounded-xl text-xs font-semibold" onClick={() => void handleBulkReview("approved")} disabled={busy === "bulk"}>
                  <Check className="size-3.5 mr-1" /> Bulk Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/10" onClick={() => void handleBulkDeleteDealers()} disabled={busy === "bulk"}>
                  <Trash2 className="size-3.5 mr-1" /> Bulk Delete
                </Button>
              </>
            ) : null}
            {selectedEntries.length > 0 ? (
              <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs text-destructive border-destructive/30" onClick={() => void handleBulkCancelEntries()} disabled={busy === "bulk"}>
                <X className="size-3.5 mr-1" /> Bulk Cancel Entries
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => { setSelectedDealers([]); setSelectedEntries([]); }}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="pending">
        {/* Horizontal Touch Scrollable Tabs */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 justify-start h-11 p-1 bg-muted/60 rounded-2xl gap-1">
            <TabsTrigger value="pending" className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0">
              <Hourglass className="size-3.5 text-amber-600" /> Pending ({stats?.pendingDealers ?? 0})
            </TabsTrigger>
            <TabsTrigger value="dealers" className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0">
              <Store className="size-3.5 text-primary" /> Dealers ({stats?.dealers ?? 0})
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0">
              <Users className="size-3.5 text-primary" /> Consumers ({stats?.users ?? 0})
            </TabsTrigger>
            <TabsTrigger value="entries" className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0">
              <Ticket className="size-3.5 text-primary" /> Waitlist
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl px-3.5 text-xs font-semibold gap-1.5 shrink-0">
              <FileText className="size-3.5 text-primary" /> Audit Log
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
              <p className="mt-3 font-semibold text-foreground">No pending approvals</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                New dealer applications will appear here for review.
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
                          onChange={(e) => setSelectedDealers(e.target.checked ? pending.map((d) => d.id) : [])}
                        />
                      </TableHead>
                      <TableHead>Depot</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell className="font-mono text-xs font-bold text-primary">{d.code}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl text-xs font-medium"
                              disabled={busy === d.id}
                              onClick={() => void handleReview(d.id, "rejected")}
                            >
                              <X className="size-3.5 mr-1 text-destructive" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 rounded-xl text-xs font-semibold"
                              disabled={busy === d.id}
                              onClick={() => void handleReview(d.id, "approved")}
                            >
                              {busy === d.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />} Approve
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
                  <div key={d.id} className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
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
                          <p className="text-xs text-muted-foreground">{d.district} • {d.address}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full shrink-0">
                        {d.code}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-muted-foreground pl-6">
                      <p><strong className="text-foreground">Owner:</strong> {d.ownerEmail ?? "-"}</p>
                      {d.phone ? <p><strong className="text-foreground">Phone:</strong> {d.phone}</p> : null}
                    </div>

                    {/* Compact Expandable Action Toggle on Mobile */}
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full justify-between rounded-xl text-xs font-medium"
                        onClick={() => setExpandedActionId(expandedActionId === d.id ? null : d.id)}
                      >
                        <span>Manage Application</span>
                        <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedActionId === d.id && "rotate-180")} />
                      </Button>

                      {expandedActionId === d.id ? (
                        <div className="flex gap-2 pt-2.5 animate-in fade-in duration-200">
                          <Button
                            variant="outline"
                            className="h-10 rounded-xl flex-1 text-xs font-semibold"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "rejected")}
                          >
                            <X className="size-4 mr-1 text-destructive" /> Reject
                          </Button>
                          <Button
                            className="h-10 rounded-xl flex-1 text-xs font-bold"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "approved")}
                          >
                            {busy === d.id ? <Loader2 className="size-4 animate-spin mr-1" /> : <Check className="size-4 mr-1" />} Approve
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <AdminLoadMore status={pendingQ.status} onLoad={() => pendingQ.loadMore(50)} count={pendingQ.results?.length} total={stats?.pendingDealers} />
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
                      onChange={(e) => setSelectedDealers(e.target.checked ? dealers.map((d) => d.id) : [])}
                    />
                  </TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      No registered dealers yet.
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
                          {d.approvalStatus === "approved" && !d.isActive ? " (inactive)" : ""}
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
                              <X className="size-3.5 mr-1" /> Unapprove
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-xl text-xs text-destructive hover:text-destructive"
                            disabled={busy === d.id}
                            onClick={() => void handleDeleteDealer(d.id)}
                          >
                            <Trash2 className="size-3.5" /> Delete
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
              <div key={d.id} className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
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
                      <p className="text-xs text-muted-foreground">{d.district} • {d.ownerEmail ?? "-"}</p>
                    </div>
                  </div>
                  <Badge variant={d.approvalStatus === "approved" ? "default" : "secondary"} className="rounded-full shrink-0">
                    {d.approvalStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center bg-muted/40 rounded-2xl p-2.5">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Code</p>
                    <p className="font-mono text-xs font-extrabold text-primary">{d.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Stock</p>
                    <p className="font-display text-sm font-bold text-foreground">{d.stock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Waiting</p>
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
                    <span>Manage Depot</span>
                    <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedActionId === d.id && "rotate-180")} />
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
                          <X className="size-4 mr-1" /> Unapprove
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 flex-1"
                        disabled={busy === d.id}
                        onClick={() => void handleDeleteDealer(d.id)}
                      >
                        <Trash2 className="size-4 mr-1" /> Delete Depot
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <AdminLoadMore status={dealersQ.status} onLoad={() => dealersQ.loadMore(50)} count={dealersQ.results?.length} total={stats?.dealers} />
        </TabsContent>

        {/* Tab 3: Consumers */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Citizenship</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      No registered consumers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold text-foreground">{u.fullName}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell className="text-xs font-mono">{maskCitizenship(u.citizenshipNo)}</TableCell>
                      <TableCell>{u.district}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">{u.collectionCode}</TableCell>
                      <TableCell className="font-semibold">{u.totalPurchasedQuantity}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          disabled={busy === u.id}
                          onClick={() => void handleDeleteUser(u.id)}
                        >
                          <Trash2 className="size-3.5 mr-1" /> Delete
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
              <div key={u.id} className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-2">
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
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">District</p>
                    <p className="font-semibold text-foreground truncate mt-0.5">{u.district}</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Citizenship</p>
                    <p className="font-mono text-[11px] font-semibold text-foreground truncate mt-0.5">{maskCitizenship(u.citizenshipNo)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Purchased</p>
                    <p className="font-bold text-foreground mt-0.5">{u.totalPurchasedQuantity} Cyl</p>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-between rounded-xl text-xs font-medium"
                    onClick={() => setExpandedActionId(expandedActionId === u.id ? null : u.id)}
                  >
                    <span>Manage Account</span>
                    <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedActionId === u.id && "rotate-180")} />
                  </Button>

                  {expandedActionId === u.id ? (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <Button
                        variant="ghost"
                        className="h-10 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
                        disabled={busy === u.id}
                        onClick={() => void handleDeleteUser(u.id)}
                      >
                        <Trash2 className="size-4 mr-1" /> Delete Consumer Account
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <AdminLoadMore status={usersQ.status} onLoad={() => usersQ.loadMore(50)} count={usersQ.results?.length} total={stats?.users} />
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
                      onChange={(e) => setSelectedEntries(e.target.checked ? entries.map((e) => e.id) : [])}
                    />
                  </TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Consumer</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      No waitlist entries yet.
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
                      <TableCell className="font-semibold">{e.dealerName ?? "Unknown depot"}</TableCell>
                      <TableCell className="text-xs">{e.consumerEmail ?? "Unknown"}</TableCell>
                      <TableCell className="font-semibold">
                        {e.quantity} × {e.cylinderSize}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "cancelled" ? "destructive" : "secondary"} className="rounded-full">
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
                            <X className="size-3.5 mr-1" /> Cancel Entry
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
              <div key={e.id} className="rounded-3xl border border-border/80 bg-card p-4 shadow-soft space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-border size-4"
                      checked={selectedEntries.includes(e.id)}
                      onChange={() => toggleSelectEntry(e.id)}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{e.dealerName ?? "Unknown Depot"}</h4>
                      <p className="text-xs text-muted-foreground">{e.consumerEmail}</p>
                    </div>
                  </div>
                  <Badge variant={e.status === "cancelled" ? "destructive" : "secondary"} className="rounded-full text-[10px]">
                    {e.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-primary">{e.quantity} × {e.cylinderSize} Cylinder</span>
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                </div>

                {e.status !== "cancelled" && e.status !== "collected" ? (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between rounded-xl text-xs font-medium"
                      onClick={() => setExpandedActionId(expandedActionId === e.id ? null : e.id)}
                    >
                      <span>Actions</span>
                      <ChevronDown className={cn("size-3.5 transition-transform duration-200", expandedActionId === e.id && "rotate-180")} />
                    </Button>

                    {expandedActionId === e.id ? (
                      <div className="pt-2 animate-in fade-in duration-200">
                        <Button
                          variant="ghost"
                          className="h-9 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
                          disabled={busy === e.id}
                          onClick={() => void handleCancelEntry(e.id)}
                        >
                          <X className="size-3.5 mr-1" /> Cancel Waitlist Entry
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <AdminLoadMore status={entriesQ.status} onLoad={() => entriesQ.loadMore(50)} count={entriesQ.results?.length} total={stats?.entries} />
        </TabsContent>

        {/* Tab 5: Audit Log */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
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
                      No activity logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs font-bold text-primary">{l.action}</TableCell>
                      <TableCell className="text-xs">{l.details ?? l.targetId ?? "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-2.5 md:hidden">
            {logs.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-[11px]">
                    {l.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                </div>
                <p className="text-foreground text-xs pt-0.5">{l.details ?? l.targetId ?? "-"}</p>
              </div>
            ))}
          </div>

          <AdminLoadMore status={logsQ.status} onLoad={() => logsQ.loadMore(50)} count={logsQ.results?.length} total={stats?.logs} />
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
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      {count !== undefined && total !== undefined ? (
        <p className="text-xs text-muted-foreground">
          Showing {count} of {total} entries
        </p>
      ) : null}
      {status === "CanLoadMore" ? (
        <Button variant="outline" size="sm" className="rounded-xl font-semibold h-9 px-4 text-xs" onClick={onLoad}>
          Load more
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
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
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
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{value ?? "-"}</p>
    </div>
  );
}
