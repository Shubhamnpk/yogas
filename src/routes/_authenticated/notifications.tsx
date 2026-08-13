import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  Loader2,
  PackageCheck,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts - YoGas" },
      { name: "description", content: "Updates about your LPG cylinder allotments and queue." },
      { property: "og:title", content: "Alerts - YoGas" },
      { property: "og:description", content: "Every update on your cylinder request." },
    ],
  }),
  component: NotificationsPage,
});

const TONE = {
  success: "bg-success/15 text-success ring-success/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  warning: "bg-warning/15 text-warning ring-warning/30",
  neutral: "bg-accent text-accent-foreground ring-border",
} as const;

type Tone = keyof typeof TONE;

function iconForTitle(title: string): { Icon: LucideIcon; tone: Tone } {
  const t = title.toLowerCase();
  if (t.includes("allotted") || t.includes("handover"))
    return { Icon: PackageCheck, tone: "success" };
  if (t.includes("collected")) return { Icon: PackageCheck, tone: "success" };
  if (t.includes("approved")) return { Icon: BadgeCheck, tone: "success" };
  if (t.includes("rejected") || t.includes("revoked"))
    return { Icon: ShieldAlert, tone: "warning" };
  if (t.includes("removed")) return { Icon: Trash2, tone: "danger" };
  if (t.includes("cancelled") || t.includes("canceled")) return { Icon: XCircle, tone: "danger" };
  return { Icon: Bell, tone: "neutral" };
}

function NotificationsPage() {
  const { sessionToken } = useAuth();
  const rows = useQuery(api.notifications.list, sessionToken ? { sessionToken } : "skip");
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unread = rows?.filter((r) => !r.read).length ?? 0;

  const markAll = async () => {
    if (!sessionToken) return;
    await markAllRead({ sessionToken });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <Button variant="outline" size="sm" onClick={() => void markAll()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        ) : null}
      </div>

      {rows === undefined ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No alerts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll tell you the moment your cylinder is allotted.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => {
            const { Icon, tone } = iconForTitle(n.title);
            return (
              <li
                key={n._id}
                className={
                  n.read
                    ? "rounded-2xl border border-border bg-card p-4"
                    : "rounded-2xl border border-primary/30 bg-accent p-4"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
                      TONE[tone],
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex items-center gap-2 font-semibold">
                        {n.title}
                        {!n.read ? (
                          <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
                        ) : null}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(new Date(n.createdAt).toISOString())}
                      </span>
                    </div>
                    {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
