import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownUp,
  Check,
  CheckCheck,
  Loader2,
  PackageCheck,
  ScanLine,
  Search,
  Ticket,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateTime, maskCitizenship, timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist — YoGas" },
      {
        name: "description",
        content: "Search, filter and allot requests at your depot in one view.",
      },
      { property: "og:title", content: "Waitlist - YoGas" },
      {
        property: "og:description",
        content: "Search, filter, allot and collect requests across your queue.",
      },
    ],
  }),
  component: DealerWaitlistPage,
});

type Row = Doc<"waitlistEntries"> & {
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

type Tab = "all" | "waiting" | "allotted" | "collected" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting" },
  { key: "allotted", label: "Allotted" },
  { key: "collected", label: "Collected" },
  { key: "cancelled", label: "Cancelled" },
];

function DealerWaitlistPage() {
  const { dealer, user, sessionToken } = useAuth();
  const allotEntry = useMutation(api.waitlist.allotEntry);
  const collectEntry = useMutation(api.waitlist.collectEntry);
  const cancelEntry = useMutation(api.waitlist.cancelEntry);
  const bulkAllot = useMutation(api.waitlist.bulkAllot);
  const autoAllot = useMutation(api.waitlist.autoAllotByStock);
  const queue = useQuery(
    api.waitlist.dealerQueue,
    sessionToken ? { sessionToken, limit: 300 } : "skip",
  );
  const [tab, setTab] = useState<Tab>("waiting");
  const [search, setSearch] = useState("");
  const [cylinder, setCylinder] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  const allRows = useMemo<Row[]>(() => {
    if (!queue) return [];
    return [
      ...queue.waiting.map((e) => ({ ...e, status: "waiting" as const })),
      ...queue.allotted.map((e) => ({ ...e, status: "allotted" as const })),
      ...queue.history.map((e) => ({ ...e, status: "collected" as const })),
      ...queue.cancelled.map((e) => ({ ...e, status: "cancelled" as const })),
    ].sort((a, b) => b.createdAt - a.createdAt);
  }, [queue]);

  const sizes = useMemo(() => [...new Set(allRows.map((r) => r.cylinderSize))].sort(), [allRows]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: allRows.length,
      waiting: 0,
      allotted: 0,
      collected: 0,
      cancelled: 0,
    };
    for (const r of allRows) c[r.status] += 1;
    return c;
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = allRows;
    if (tab !== "all") rows = rows.filter((r) => r.status === tab);
    if (cylinder !== "all") rows = rows.filter((r) => r.cylinderSize === cylinder);
    if (q) {
      rows = rows.filter((r) =>
        [r.consumer?.fullName, r.consumer?.citizenshipNo, r.consumer?.phone, r.note]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    }
    return rows.sort((a, b) =>
      sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
  }, [allRows, tab, cylinder, search, sort]);

  const visibleWaiting = useMemo(() => filtered.filter((r) => r.status === "waiting"), [filtered]);
  const selectedWaiting = visibleWaiting.filter((r) => selected.has(r._id));
  const selectedQty = selectedWaiting.reduce((sum, r) => sum + r.quantity, 0);
  const stock = dealer?.stock ?? 0;

  const act = async (fn: "allot" | "collect" | "cancel", id: Id<"waitlistEntries">) => {
    if (!user) return;
    setBusyId(id);
    try {
      if (fn === "allot") {
        await allotEntry(
          sessionToken
            ? { sessionToken, entryId: id }
            : { ownerAccountId: user.accountId, entryId: id },
        );
      } else if (fn === "collect") {
        await collectEntry(
          sessionToken
            ? { sessionToken, entryId: id }
            : { ownerAccountId: user.accountId, entryId: id },
        );
      } else {
        await cancelEntry(
          sessionToken
            ? { sessionToken, entryId: id }
            : { requesterAccountId: user.accountId, entryId: id },
        );
      }
      toast.success(
        fn === "allot"
          ? "Cylinder allotted"
          : fn === "collect"
            ? "Marked collected"
            : "Request cancelled",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update request");
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = (row: Row) => {
    if (!window.confirm(`Cancel the request for ${row.consumer?.fullName ?? "this consumer"}?`))
      return;
    void act("cancel", row._id);
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
      const result = await bulkAllot(
        sessionToken
          ? { sessionToken, entryIds: selectedWaiting.map((r) => r._id) }
          : { ownerAccountId: user.accountId, entryIds: selectedWaiting.map((r) => r._id) },
      );
      setSelected(new Set());
      toast.success(`Allotted ${result.allotted} cylinder${result.allotted === 1 ? "" : "s"}.`);
      if (result.skipped > 0) {
        toast.warning(`${result.skipped} could not be allotted (no longer waiting or no stock).`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not allot the selection");
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
      const result = await autoAllot(
        sessionToken ? { sessionToken } : { ownerAccountId: user.accountId },
      );
      toast.success(
        `Auto-allotted ${result.allotted} cylinder${result.allotted === 1 ? "" : "s"} right now — the next customers are now allotted.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not auto-allot");
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Waitlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter and allot every request at {dealer?.business_name ?? "your depot"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/dealer/scan">
              <ScanLine className="size-4" /> Scan consumer
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dealer">
              <Ticket className="size-4" /> Back to home
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
            placeholder="Search name, citizenship, phone, note"
            className="pl-9"
          />
        </div>
        <Select value={cylinder} onValueChange={setCylinder}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Cylinder size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sizes</SelectItem>
            {sizes.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          title={sort === "newest" ? "Newest first" : "Oldest first"}
          onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
        >
          <ArrowDownUp className="size-4" />
        </Button>
      </div>

      {counts.waiting > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-3">
          <CheckCheck className="size-4 text-success" />
          <p className="text-sm">
            <span className="font-semibold">{counts.waiting}</span> waiting ·{" "}
            <span className="font-semibold">{stock}</span> in stock — allot in queue order to match
            your stock.
          </p>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={() => void runAutoAllot()}
              disabled={autoBusy || stock === 0}
            >
              {autoBusy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Auto-allot by stock
            </Button>
          </div>
        </div>
      ) : null}

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

      {selectedWaiting.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm">
            <span className="font-semibold">{selectedWaiting.length}</span> selected ·{" "}
            <span className="font-semibold">{selectedQty}</span> cylinder
            {selectedQty === 1 ? "" : "s"}
            {stock > 0 ? ` · stock left ${stock}` : ""}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              Clear
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
              {selectedQty > stock ? "Not enough stock" : "Allot selected"}
            </Button>
          </div>
        </div>
      ) : null}

      {queue === undefined ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No requests in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different filter or search term.
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
                        aria-label="Select all waiting shown"
                      />
                    ) : null}
                  </th>
                  <th className="border-b border-border px-4 py-3">#</th>
                  <th className="border-b border-border px-4 py-3">Consumer</th>
                  <th className="border-b border-border px-4 py-3">Citizenship</th>
                  <th className="border-b border-border px-4 py-3">Status</th>
                  <th className="border-b border-border px-4 py-3">Cylinder</th>
                  <th className="border-b border-border px-4 py-3">Qty</th>
                  <th className="border-b border-border px-4 py-3">Requested</th>
                  <th className="border-b border-border px-4 py-3">Updated</th>
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
                          aria-label={`Select ${row.consumer?.fullName ?? "consumer"}`}
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
                          {row.position ?? "?"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-4">
                      <p className="font-medium">{row.consumer?.fullName ?? "Consumer"}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.consumer?.address ?? "No address"}
                        {row.note ? ` · “${row.note}”` : ""}
                      </p>
                    </td>
                    <td className="border-b border-border px-4 py-4 text-sm">
                      {maskCitizenship(row.consumer?.citizenshipNo)}
                    </td>
                    <td className="border-b border-border px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="border-b border-border px-4 py-4 text-sm">{row.cylinderSize}</td>
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
                              {stock < row.quantity ? "No stock" : "Allot"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => confirmCancel(row)}
                              disabled={busyId === row._id}
                            >
                              <Trash2 className="size-4" />
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
                              Collect
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => confirmCancel(row)}
                              disabled={busyId === row._id}
                            >
                              <Trash2 className="size-4" />
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
            Showing {filtered.length} of {allRows.length} requests — up to 300 per status.
          </p>
        </div>
      )}
    </div>
  );
}
