import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Clock3,
  Loader2,
  PackageCheck,
  Search,
  Store,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestDetails } from "@/components/RequestDetails";
import { SwipeableCards } from "@/components/SwipeableCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      await cancelEntry(sessionToken ? { sessionToken, entryId } : { entryId });
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
      await confirmCollection(
        sessionToken ? { sessionToken, entryId } : { accountId: user.accountId, entryId },
      );
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
                },
                {
                  id: "collected",
                  title: "Cylinders collected",
                  value: String(purchase?.totalQuantity ?? 0),
                },
              ]}
            />
          </div>
          <div className="hidden grid-cols-4 gap-3 lg:grid">
            <StatCard label="Active requests" value={stats.active} />
            <StatCard label="Waiting" value={stats.waiting} />
            <StatCard label="Allotted" value={stats.allotted} />
            <StatCard label="Cylinders collected" value={purchase?.totalQuantity ?? 0} />
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
  const dealers = useQuery(api.admin.listDealers, opts);
  const users = useQuery(api.admin.listUsers, opts);
  const entries = useQuery(api.admin.listEntries, opts);
  const logs = useQuery(api.admin.listAuditLogs, opts);
  const reviewDealer = useMutation(api.admin.reviewDealer);
  const unapproveDealer = useMutation(api.admin.unapproveDealer);
  const deleteDealer = useMutation(api.admin.deleteDealer);
  const [busy, setBusy] = useState<Id<"dealers"> | null>(null);

  const pending = dealers?.filter((d) => d.approvalStatus === "pending") ?? [];

  const handleReview = async (dealerId: Id<"dealers">, decision: "approved" | "rejected") => {
    if (!user) return;
    setBusy(dealerId);
    try {
      await reviewDealer(
        sessionToken
          ? { sessionToken, dealerId, decision }
          : { accountId: user.accountId, dealerId, decision },
      );
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
      await unapproveDealer(
        sessionToken ? { sessionToken, dealerId } : { accountId: user.accountId, dealerId },
      );
      toast.success("Depot unapproved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (dealerId: Id<"dealers">) => {
    if (!user) return;
    if (!window.confirm("Delete this depot? Its waitlist entries will be cancelled.")) return;
    setBusy(dealerId);
    try {
      await deleteDealer(
        sessionToken ? { sessionToken, dealerId } : { accountId: user.accountId, dealerId },
      );
      toast.success("Depot deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview, depot approvals, users and activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Accounts" value={stats?.accounts} />
        <StatCard label="Consumers" value={stats?.users} />
        <StatCard label="Dealers" value={stats?.dealers} />
        <StatCard label="Waitlist entries" value={stats?.entries} />
        <StatCard label="Pending approvals" value={stats?.pendingDealers} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending approvals</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
          <TabsTrigger value="users">Consumers</TabsTrigger>
          <TabsTrigger value="entries">Waitlist</TabsTrigger>
          <TabsTrigger value="logs">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {dealers === undefined ? (
            <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Store className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No pending approvals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New dealer applications will appear here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        <p className="font-semibold">{d.businessName}</p>
                        <p className="text-xs text-muted-foreground">{d.address}</p>
                      </TableCell>
                      <TableCell>
                        <p>{d.ownerEmail ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">{d.phone}</p>
                      </TableCell>
                      <TableCell>{d.district}</TableCell>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "rejected")}
                          >
                            <X className="size-4" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy === d.id}
                            onClick={() => void handleReview(d.id, "approved")}
                          >
                            <Check className="size-4" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dealers">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depot</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealers === undefined ? (
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
                      No dealers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  dealers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-semibold">{d.businessName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{d.code}</p>
                      </TableCell>
                      <TableCell className="text-xs">{d.ownerEmail ?? "-"}</TableCell>
                      <TableCell>{d.district}</TableCell>
                      <TableCell>{d.stock}</TableCell>
                      <TableCell>{d.waiting}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.approvalStatus === "approved"
                              ? "default"
                              : d.approvalStatus === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {d.approvalStatus}
                          {d.approvalStatus === "approved" && !d.isActive ? " (inactive)" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(d.requestedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {d.approvalStatus === "approved" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === d.id}
                              onClick={() => void handleUnapprove(d.id)}
                            >
                              <X className="size-4" /> Unapprove
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === d.id}
                            onClick={() => void handleDelete(d.id)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Citizenship</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Purchased</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users === undefined ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No consumers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold">{u.fullName}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell className="text-xs">{maskCitizenship(u.citizenshipNo)}</TableCell>
                      <TableCell>{u.district}</TableCell>
                      <TableCell className="font-mono text-xs">{u.collectionCode}</TableCell>
                      <TableCell>{u.totalPurchasedQuantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="entries">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Consumer</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries === undefined ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="grid h-32 place-items-center">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No waitlist entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.dealerName ?? "Unknown depot"}</TableCell>
                      <TableCell className="text-xs">{e.consumerEmail ?? "Unknown"}</TableCell>
                      <TableCell>
                        {e.quantity} × {e.cylinderSize}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "cancelled" ? "destructive" : "secondary"}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(e.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs === undefined ? (
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
                      <TableCell className="font-mono text-xs">{l.action}</TableCell>
                      <TableCell className="text-xs">{l.details ?? l.targetId ?? "-"}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(l.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="font-display text-3xl font-bold">{value ?? "-"}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
