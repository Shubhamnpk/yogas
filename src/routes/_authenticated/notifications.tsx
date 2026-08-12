import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts — GasQueue" },
      { name: "description", content: "Updates about your LPG cylinder allotments and queue." },
      { property: "og:title", content: "Alerts — GasQueue" },
      { property: "og:description", content: "Every update on your cylinder request." },
    ],
  }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    setRows((data as Notification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel("notif-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    void load();
  };

  const unread = rows.filter((r) => !r.read).length;

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

      {loading ? (
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
          {rows.map((n) => (
            <li
              key={n.id}
              className={
                n.read
                  ? "rounded-2xl border border-border bg-card p-5"
                  : "rounded-2xl border border-primary/30 bg-accent p-5"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{n.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
