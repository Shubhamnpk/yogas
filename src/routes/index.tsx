import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Bell, QrCode, ShieldCheck, Store, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { stockLabel } from "@/lib/gas";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YoGas - Fair LPG cylinder queues for Nepal" },
      {
        name: "description",
        content:
          "Join a verified LPG depot's virtual waitlist with your citizenship details, track your queue position live, and collect your cylinder with a QR code.",
      },
      { property: "og:title", content: "YoGas - Fair LPG cylinder queues for Nepal" },
      {
        property: "og:description",
        content: "A transparent virtual queue between LPG dealers and consumers - no crowds, no favouritism.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const dealers = useQuery(api.waitlist.listDealers, { limit: 6 });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <ShieldCheck className="size-3.5" /> Built for Nepal's LPG shortage
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] md:text-6xl">
              No queues on the street. <span className="text-flame">Just a fair line.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Join your depot's virtual waitlist with your name and citizenship number, watch your
              position update live, and collect your cylinder by showing one QR code. Dealers verify
              and allot in seconds so hoarding and favouritism have nowhere to hide.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Join a waitlist <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Register your depot</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
            <p className="text-sm font-semibold text-muted-foreground">Live depot stock</p>
            <ul className="mt-4 space-y-3">
              {dealers === undefined ? (
                <li className="text-sm text-muted-foreground">Loading depots...</li>
              ) : dealers.length === 0 ? (
                <li className="text-sm text-muted-foreground">No depots are active yet.</li>
              ) : (
                dealers.map((d) => {
                  const s = stockLabel(d.stock);
                  return (
                    <li
                      key={d._id}
                      className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{d.businessName}</p>
                        <p className="text-xs text-muted-foreground">{d.district}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold">{d.stock}</p>
                        <p
                          className={
                            s.tone === "success"
                              ? "text-xs font-medium text-success"
                              : s.tone === "warning"
                                ? "text-xs font-medium text-warning"
                                : "text-xs font-medium text-destructive"
                          }
                        >
                          {s.label}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Join with your identity",
              body: "Name, citizenship number and address - one person, one place in the line.",
            },
            {
              icon: QrCode,
              title: "Scan to join, scan to collect",
              body: "Scan a depot's code to join its queue. Show your own code at the counter to collect.",
            },
            {
              icon: Bell,
              title: "Know the moment it's ready",
              body: "Live position updates and alerts the second your cylinder is allotted.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Users className="size-5 text-primary" /> For consumers
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>1. Create your account and fill your details once.</li>
              <li>2. Scan the depot QR or search by name and district.</li>
              <li>3. Request a cylinder, add a note if you need one urgently.</li>
              <li>4. Track your position and collect with your QR code.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Store className="size-5 text-primary" /> For dealers
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>1. Register your depot with its licence number.</li>
              <li>2. Update your cylinder stock as trucks arrive.</li>
              <li>3. Allot cylinders in queue order - stock updates itself.</li>
              <li>4. Scan a consumer's QR to verify and hand over.</li>
            </ol>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link to="/auth">Get started - it's free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        YoGas · Fair LPG distribution for Nepali households
      </footer>
    </div>
  );
}
