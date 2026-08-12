import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Loader2, Store, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEPAL_DISTRICTS } from "@/lib/gas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const consumerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(24)
    .regex(/^[a-z0-9._]+$/i, "Letters, numbers, dot and underscore only"),
  citizenship_no: z
    .string()
    .trim()
    .min(4, "Enter your citizenship number")
    .max(30)
    .regex(/^[0-9A-Za-z\-/ ]+$/, "Only numbers, letters, dashes and slashes"),
  address: z.string().trim().min(4, "Enter your address").max(160),
  district: z.string().trim().min(2, "Choose your district"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),

});

const dealerSchema = z.object({
  business_name: z.string().trim().min(2, "Enter your depot name").max(90),
  license_no: z.string().trim().max(40).optional().or(z.literal("")),
  district: z.string().trim().min(2, "Choose your district"),
  address: z.string().trim().min(4, "Enter your depot address").max(160),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

function Onboarding() {
  const { user, profile, role, dealer, profileComplete, refresh } = useAuth();
  const navigate = useNavigate();
  const [pickedRole, setPickedRole] = useState<"consumer" | "dealer" | null>(null);
  const [busy, setBusy] = useState(false);

  const activeRole = role ?? pickedRole;

  const [c, setC] = useState({
    full_name: "",
    username: "",
    citizenship_no: "",
    address: "",
    district: "",
    phone: "",
  });
  const [d, setD] = useState({
    business_name: "",
    license_no: "",
    district: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    if (profile) {
      setC((prev) => ({
        full_name: prev.full_name || (profile.full_name ?? ""),
        username: prev.username || (profile.username ?? ""),
        citizenship_no: prev.citizenship_no || (profile.citizenship_no ?? ""),
        address: prev.address || (profile.address ?? ""),
        district: prev.district || (profile.district ?? ""),
        phone: prev.phone || (profile.phone ?? ""),
      }));
    }
  }, [profile]);


  useEffect(() => {
    if (profileComplete) {
      void navigate({ to: role === "dealer" ? "/dealer" : "/dashboard", replace: true });
    }
  }, [profileComplete, role, navigate]);

  const saveRole = async (value: "consumer" | "dealer") => {
    if (!user) return;
    setPickedRole(value);
    await supabase.from("user_roles").insert({ user_id: user.id, role: value });
    await refresh();
  };

  const submitConsumer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = consumerSchema.safeParse(c);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: parsed.data.full_name,
      citizenship_no: parsed.data.citizenship_no,
      address: parsed.data.address,
      district: parsed.data.district,
      phone: parsed.data.phone || null,
      username: parsed.data.username.toLowerCase(),
    });

    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That username is taken" : error.message);
      return;
    }
    toast.success("Profile saved");
    await refresh();
  };

  const submitDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = dealerSchema.safeParse(d);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    if (!c.full_name.trim() || !c.username.trim()) {
      toast.error("Enter your name and a username");
      return;
    }
    setBusy(true);
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: c.full_name.trim(),
      username: c.username.trim().toLowerCase(),
      district: parsed.data.district,
      phone: parsed.data.phone || null,

    });
    if (pErr) {
      setBusy(false);
      toast.error(pErr.message.includes("duplicate") ? "That username is taken" : pErr.message);
      return;
    }
    const payload = {
      owner_id: user.id,
      business_name: parsed.data.business_name,
      license_no: parsed.data.license_no || null,
      district: parsed.data.district,
      address: parsed.data.address,
      phone: parsed.data.phone || null,
    };
    const { error } = dealer
      ? await supabase.from("dealers").update(payload).eq("id", dealer.id)
      : await supabase.from("dealers").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Depot registered");
    await refresh();
  };

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-flame text-primary-foreground">
            <Flame className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">GasQueue</span>
        </div>

        {!activeRole ? (
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h1 className="font-display text-2xl font-bold">How will you use GasQueue?</h1>
            <p className="mt-1 text-sm text-muted-foreground">You can only pick this once.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { key: "consumer", label: "I need gas", body: "Join depot queues", icon: User },
                  { key: "dealer", label: "I'm a dealer", body: "Run a depot queue", icon: Store },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => void saveRole(opt.key)}
                  className={cn(
                    "rounded-xl border border-border p-5 text-left transition-colors hover:border-primary hover:bg-accent",
                  )}
                >
                  <opt.icon className="size-5 text-primary" />
                  <p className="mt-3 font-semibold">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.body}</p>
                </button>
              ))}
            </div>
          </div>
        ) : activeRole === "consumer" ? (
          <form
            onSubmit={submitConsumer}
            className="space-y-4 rounded-2xl border border-border bg-card p-7 shadow-soft"
          >
            <div>
              <h1 className="font-display text-2xl font-bold">Your details</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Depots use this to verify you at the counter. Your citizenship number is only ever
                shown to them in masked form.
              </p>
            </div>
            <Field label="Full name">
              <Input
                value={c.full_name}
                onChange={(e) => setC({ ...c, full_name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label="Username">
              <Input
                value={c.username}
                onChange={(e) => setC({ ...c, username: e.target.value })}
                placeholder="sita.kc"
                maxLength={24}
              />
            </Field>
            <Field label="Citizenship number">
              <Input
                value={c.citizenship_no}
                onChange={(e) => setC({ ...c, citizenship_no: e.target.value })}
                placeholder="12-01-75-01234"
                maxLength={30}
              />
            </Field>
            <Field label="Address">
              <Textarea
                value={c.address}
                onChange={(e) => setC({ ...c, address: e.target.value })}
                rows={2}
                maxLength={160}
              />
            </Field>
            <Field label="District">
              <Select value={c.district} onValueChange={(v) => setC({ ...c, district: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {NEPAL_DISTRICTS.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Phone (optional)">
              <Input
                value={c.phone}
                onChange={(e) => setC({ ...c, phone: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save and continue
            </Button>
          </form>
        ) : (
          <form
            onSubmit={submitDealer}
            className="space-y-4 rounded-2xl border border-border bg-card p-7 shadow-soft"
          >
            <div>
              <h1 className="font-display text-2xl font-bold">Register your depot</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Consumers will find and scan this depot to join your queue.
              </p>
            </div>
            <Field label="Your name">
              <Input
                value={c.full_name}
                onChange={(e) => setC({ ...c, full_name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label="Username">
              <Input
                value={c.username}
                onChange={(e) => setC({ ...c, username: e.target.value })}
                placeholder="everest.depot"
                maxLength={24}
              />
            </Field>
            <Field label="Depot / business name">
              <Input
                value={d.business_name}
                onChange={(e) => setD({ ...d, business_name: e.target.value })}
                maxLength={90}
              />
            </Field>
            <Field label="Licence number (optional)">
              <Input
                value={d.license_no}
                onChange={(e) => setD({ ...d, license_no: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="District">
              <Select value={d.district} onValueChange={(v) => setD({ ...d, district: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {NEPAL_DISTRICTS.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Depot address">
              <Textarea
                value={d.address}
                onChange={(e) => setD({ ...d, address: e.target.value })}
                rows={2}
                maxLength={160}
              />
            </Field>
            <Field label="Contact phone (optional)">
              <Input
                value={d.phone}
                onChange={(e) => setD({ ...d, phone: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Register depot
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
