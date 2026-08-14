import { usePaginatedQuery } from "convex/react";
import { Clock3, Hourglass, Loader2, Store, XCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Dealer, Profile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/gas";
import { useAuth } from "@/lib/auth";

function statusCopy(status: Dealer["approval_status"]) {
  if (status === "pending") {
    return {
      icon: Hourglass,
      title: "Your depot is waiting for approval",
      body: "An administrator is reviewing your application. Until it is approved you are not listed on the depot directory and consumers cannot join your queue.",
    };
  }
  return {
    icon: XCircle,
    title: "Your depot application was not approved",
    body: "An administrator rejected your application. You are not listed on the depot directory. Contact the platform admin to understand why.",
  };
}

export function DealerPendingApproval({
  dealer,
  profile,
}: {
  dealer: Dealer;
  profile: Profile | null;
}) {
  const { sessionToken, signOut } = useAuth();
  const logs = usePaginatedQuery(
    api.admin.dealerActivityLogs,
    sessionToken ? { sessionToken } : "skip",
    { initialNumItems: 50 },
  );
  const copy = statusCopy(dealer.approval_status);
  const Icon = copy.icon;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          <p className="font-semibold">{dealer.business_name}</p>
          <p className="text-muted-foreground">
            Applied {formatDateTime(dealer.requested_at)}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-secondary-foreground">
            <Store className="size-3.5" />
            {dealer.approval_status} · {dealer.is_active ? "active" : "inactive"}
          </span>
        </div>
        <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Your activity</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.full_name ?? "Your account"} · {dealer.business_name}
        </p>
        {logs.status === "LoadingFirstPage" ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : logs.results.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            No activity logged yet.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {logs.results.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-mono text-xs text-secondary-foreground">{log.action}</p>
                    {log.details ? <p className="text-xs text-muted-foreground">{log.details}</p> : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
            {logs.status === "CanLoadMore" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => logs.loadMore(50)}
                disabled={logs.isLoading}
              >
                {logs.isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                Load more activity
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}