import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "convex/react";
import {
  BadgeCheck,
  Boxes,
  ChevronDown,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Hourglass,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  QrCode,
  ScanLine,
  ShieldAlert,
  Store,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  consumerQrValue,
  depotQrValue,
  friendlyError,
  maskCitizenship,
  NEPAL_DISTRICTS,
} from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile - YoGas" },
      {
        name: "description",
        content: "Manage your YoGas details, district and personal collection code.",
      },
      { property: "og:title", content: "Your profile - YoGas" },
      { property: "og:description", content: "Your details and collection QR code in one place." },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  citizenship_no: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  district: z.string().trim().min(2, "Choose your district"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

function ProfilePage() {
  const { role } = useAuth();
  if (role === "dealer") return <DealerProfile />;
  return <ConsumerProfile />;
}

/* ------------------------------------------------------------------ */
/* Consumer profile                                                    */
/* ------------------------------------------------------------------ */

function ConsumerProfile() {
  const { user, profile, signOut, refresh, sessionToken } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.app.updateProfile);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    citizenship_no: "",
    address: "",
    district: "",
    phone: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      citizenship_no: profile.citizenship_no ?? "",
      address: profile.address ?? "",
      district: profile.district ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile]);

  const enterEdit = () => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      citizenship_no: profile.citizenship_no ?? "",
      address: profile.address ?? "",
      district: profile.district ?? "",
      phone: profile.phone ?? "",
    });
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    if (!parsed.data.citizenship_no || !parsed.data.address) {
      toast.error("Citizenship number and address are required");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        ...(sessionToken ? { sessionToken } : {}),
        fullName: parsed.data.full_name,
        ...(parsed.data.citizenship_no ? { citizenshipNo: parsed.data.citizenship_no } : {}),
        ...(parsed.data.address ? { address: parsed.data.address } : {}),
        district: parsed.data.district,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      });
      toast.success("Profile updated");
      await refresh();
    } catch (error) {
      toast.error(friendlyError(error, "Could not update profile"));
    } finally {
      setBusy(false);
    }
  };

  const code = profile?.collection_code ?? "";
  const qrValue = user ? consumerQrValue(user.accountId) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy - write it down instead");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep these accurate - depots verify you against them at the counter.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {editing ? (
          <form
            onSubmit={save}
            className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={profile?.username ?? ""} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                This is auto-generated for your account.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Citizenship number</Label>
              <div className="flex gap-2">
                <Input
                  value={reveal ? form.citizenship_no : maskCitizenship(form.citizenship_no)}
                  onChange={(e) => setForm({ ...form, citizenship_no: e.target.value })}
                  readOnly={!reveal}
                  maxLength={30}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={reveal ? "Hide citizenship number" : "Show citizenship number"}
                  onClick={() => setReveal((v) => !v)}
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Combobox
                value={form.district}
                onValueChange={(v) => setForm({ ...form, district: v })}
                options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                placeholder="Select district"
              />
              <p className="text-xs text-muted-foreground">
                Depot search opens on this district by default.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? user?.email ?? ""} readOnly disabled />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </form>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex flex-wrap items-center gap-4 border-b border-border bg-secondary/40 p-6">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground">
                {initials(profile?.full_name) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-bold">
                  {profile?.full_name || "-"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Consumer · @{profile?.username || "-"}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-2">
              <ProfileTile label="Full name" value={profile?.full_name ?? "-"} />
              <ProfileTile label="Username" value={profile?.username ?? "-"} />
              <ProfileTile
                label="Citizenship number"
                value={maskCitizenship(profile?.citizenship_no)}
              />
              <ProfileTile label="District" value={profile?.district ?? "-"} />
              <ProfileTile label="Address" value={profile?.address ?? "-"} />
              <ProfileTile label="Phone" value={profile?.phone ?? "-"} />
              <ProfileTile label="Email" value={profile?.email ?? user?.email ?? "-"} />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border p-6">
              <Button onClick={() => enterEdit()}>
                <Pencil className="size-4" /> Edit profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </div>
        )}

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="font-semibold">Your collection code</h2>
          <p className="text-sm text-muted-foreground">
            The dealer scans this - or types the code below - to verify you.
          </p>
          {qrValue ? (
            <div className="mx-auto w-fit rounded-2xl bg-white p-4">
              <QRCodeSVG value={qrValue} size={128} level="M" />
            </div>
          ) : null}
          <p className="truncate font-display text-2xl font-bold tracking-widest">{code || "-"}</p>
          <Button variant="outline" className="w-full" onClick={() => void copy()}>
            <Copy className="size-4" /> Copy code
          </Button>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dealer profile                                                      */
/* ------------------------------------------------------------------ */

function DealerProfile() {
  const { dealer, profile, user, sessionToken, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.app.updateProfile);
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", district: "", address: "", phone: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      district: profile.district ?? "",
      address: profile.address ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile]);

  const enterEdit = () => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      district: profile.district ?? "",
      address: profile.address ?? "",
      phone: profile.phone ?? "",
    });
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ ...form, citizenship_no: "" });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        ...(sessionToken ? { sessionToken } : {}),
        fullName: parsed.data.full_name,
        ...(parsed.data.address ? { address: parsed.data.address } : {}),
        district: parsed.data.district,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      });
      toast.success("Profile updated");
      await refresh();
    } catch (error) {
      toast.error(friendlyError(error, "Could not update profile"));
    } finally {
      setBusy(false);
    }
  };

  const code = dealer?.code ?? "";
  const qrValue = dealer ? depotQrValue(dealer.code) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy - write it down instead");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  if (!dealer || !user) return null;

  const address = dealer.district + (dealer.address ? `, ${dealer.address}` : "");

  const qrContent = (
    <>
      <p className="text-sm text-muted-foreground">
        Consumers scan this to join your queue. Print it and display it at your counter.
      </p>
      {qrValue ? (
        <div className="mx-auto w-fit rounded-2xl bg-white p-4">
          <QRCodeSVG value={qrValue} size={132} level="M" />
        </div>
      ) : null}
      <p className="font-display text-2xl font-bold tracking-widest">{code || "-"}</p>
      <p className="text-xs text-muted-foreground">{dealer.business_name}</p>
      <Button variant="outline" className="w-full" onClick={() => void copy()}>
        <Copy className="size-4" /> Copy code
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to="/dealer/stock">
          <Boxes className="size-4" /> Stock & depot settings
        </Link>
      </Button>
    </>
  );

  const approval = approvalBadge(dealer.approval_status);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="relative h-28 bg-flame sm:h-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.35),transparent_55%)]" />
        </div>
        <div className="px-6 pb-6">
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-end gap-4">
              <span className="-mt-10 grid size-20 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground ring-4 ring-card">
                {initials(dealer.business_name) || "D"}
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Depot owner
                </p>
                <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
                  {dealer.business_name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{address}</span>
                  </span>
                  {dealer.phone ? (
                    <a
                      href={`tel:${dealer.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="size-3.5 shrink-0" /> {dealer.phone}
                    </a>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="hidden flex-wrap items-center gap-2 pb-1 sm:flex">
              {approval ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${approval.classes}`}
                >
                  <approval.icon className="size-3.5" />
                  {approval.label}
                </span>
              ) : null}
              {dealer.is_active ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <span className="size-1.5 rounded-full bg-success" /> Accepting requests
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Hidden from search
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Button asChild variant="outline">
              <Link to="/dealer/waitlist">
                <ClipboardList className="size-4" /> View waitlist
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dealer/stock">
                <Boxes className="size-4" /> Update stock
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dealer/scan">
                <ScanLine className="size-4" /> Verify & hand over
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {editing ? (
            <form
              onSubmit={save}
              className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <h2 className="font-semibold">Edit owner details</h2>
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={profile?.username ?? ""} readOnly disabled />
                <p className="text-xs text-muted-foreground">
                  This is auto-generated for your account.
                </p>
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Combobox
                  value={form.district}
                  onValueChange={(v) => setForm({ ...form, district: v })}
                  options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select district"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? user?.email ?? ""} readOnly disabled />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Depot details */}
              <CollapsibleSection
                icon={Store}
                title="Depot details"
                subtitle="How consumers see your depot."
              >
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <ProfileTile label="Business name" value={dealer.business_name} />
                  <ProfileTile label="License no." value={dealer.license_no ?? "-"} />
                  <ProfileTile label="District" value={dealer.district} />
                  <ProfileTile label="Address" value={dealer.address ?? "-"} />
                  <ProfileTile label="Contact phone" value={dealer.phone ?? "-"} />
                  <div className="bg-card px-5 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Depot code
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="truncate font-mono text-sm font-bold tracking-wider">
                        {dealer.code}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copy()}
                        aria-label="Copy depot code"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-border p-6">
                  <Button asChild variant="outline">
                    <Link to="/dealer/stock">
                      <Pencil className="size-4" /> Edit depot details
                    </Link>
                  </Button>
                </div>
              </CollapsibleSection>

              {/* Owner account */}
              <CollapsibleSection
                icon={BadgeCheck}
                title="Owner account"
                subtitle="The account this depot is registered to."
              >
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <ProfileTile label="Full name" value={profile?.full_name ?? "-"} />
                  <ProfileTile label="Username" value={profile?.username ?? "-"} />
                  <ProfileTile label="Phone" value={profile?.phone ?? "-"} />
                  <ProfileTile label="Email" value={profile?.email ?? user?.email ?? "-"} />
                </div>
                <div className="flex flex-wrap gap-3 border-t border-border p-6">
                  <Button onClick={() => enterEdit()}>
                    <Pencil className="size-4" /> Edit profile
                  </Button>
                </div>
              </CollapsibleSection>
            </>
          )}

          <div className="hidden justify-end sm:flex">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>

        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {isMobile ? (
            <Collapsible open={qrOpen} onOpenChange={setQrOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-6 py-4 text-left"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <QrCode className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">Depot QR</h2>
                    <p className="text-xs text-muted-foreground">Scan to join your queue.</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      qrOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 border-t border-border p-6 text-center">{qrContent}</div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <QrCode className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Depot QR</h2>
                  <p className="text-xs text-muted-foreground">Scan to join your queue.</p>
                </div>
              </div>
              <div className="space-y-4 p-6 text-center">{qrContent}</div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function approvalBadge(status: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return {
      label: "Approved",
      icon: BadgeCheck,
      classes: "border-success/30 bg-success/10 text-success",
    };
  }
  if (status === "pending") {
    return {
      label: "Pending approval",
      icon: Hourglass,
      classes: "border-warning/30 bg-warning/10 text-warning",
    };
  }
  return {
    label: "Rejected",
    icon: ShieldAlert,
    classes: "border-destructive/30 bg-destructive/10 text-destructive",
  };
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function initials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfileTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Store;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </section>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4 text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
