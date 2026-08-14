import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation, useQuery } from "convex/react";
import {
  AtSign,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Hourglass,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  User,
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
  if (role === "admin") return <AdminProfile />;
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
  const isMobile = useIsMobile();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(true); // Default open on mobile for fast access at counter
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
      toast.success("Profile updated successfully");
      await refresh();
      setEditing(false);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update profile"));
    } finally {
      setBusy(false);
    }
  };

  const code = profile?.collection_code ?? "";
  const qrValue = user ? consumerQrValue(user.accountId) : null;
  const address = [profile?.district, profile?.address].filter(Boolean).join(", ");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Collection code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy - write it down instead");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const qrContent = (
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="rounded-xl bg-muted/50 p-2 text-xs text-muted-foreground max-w-xs">
        Present this QR code or collection code to the gas dealer to verify your order.
      </div>

      {qrValue ? (
        <div className="relative group rounded-3xl bg-white p-5 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.02]">
          <QRCodeSVG value={qrValue} size={isMobile ? 160 : 140} level="M" />
        </div>
      ) : null}

      <div className="w-full space-y-2">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Your Verification Code
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-foreground bg-primary/10 text-primary px-4 py-1.5 rounded-xl">
            {code || "-"}
          </span>
        </div>
      </div>

      <Button
        variant={copied ? "default" : "outline"}
        className="w-full h-11 rounded-xl text-sm font-medium transition-all"
        onClick={() => void copyCode()}
      >
        {copied ? (
          <>
            <Check className="size-4 mr-1.5 text-success-foreground" /> Copied to Clipboard
          </>
        ) : (
          <>
            <Copy className="size-4 mr-1.5" /> Copy Code
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Mobile-Optimized Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        {/* Subtle Elegant Header */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.2),transparent_60%)]" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background shadow-sm border border-white/20 transition-all active:scale-95"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">Sign out</span>
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <div className="-mt-12 sm:-mt-10 grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card">
                {initials(profile?.full_name) || "U"}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <User className="size-3" /> Consumer Account
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  {profile?.full_name || "-"}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <AtSign className="size-3.5 shrink-0 text-primary" /> {formatUsername(profile?.username)}
                  </span>
                  {address ? (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{address}</span>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Quick Copy Collection Badge */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 border-t sm:border-t-0 border-border/40">
              <button
                type="button"
                onClick={() => void copyCode()}
                title="Tap to copy collection code"
                className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3.5 py-2 font-mono text-xs font-bold tracking-wider text-primary transition-all active:scale-95 w-full sm:w-auto justify-between sm:justify-start"
              >
                <div className="flex items-center gap-1.5">
                  <QrCode className="size-4 text-primary" />
                  <span>Code: <strong className="text-foreground">{code || "-"}</strong></span>
                </div>
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 opacity-60" />}
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button asChild variant="outline" className="h-12 rounded-2xl justify-start px-4 border-border/80 hover:border-primary/40 hover:bg-accent/50 transition-all">
              <Link to="/waitlist" className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600">
                  <ClipboardList className="size-4" />
                </span>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-foreground">My Waitlist</p>
                  <p className="text-[10px] text-muted-foreground">Track gas status</p>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-12 rounded-2xl justify-start px-4 border-border/80 hover:border-primary/40 hover:bg-accent/50 transition-all">
              <Link to="/dealers" className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <Store className="size-4" />
                </span>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-foreground">Gas Depots</p>
                  <p className="text-[10px] text-muted-foreground">Find nearby stock</p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* Personal Details Section */}
        <div className="space-y-4 sm:space-y-6">
          {editing ? (
            <form
              onSubmit={save}
              className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Pencil className="size-4 text-primary" /> Edit Personal Information
                </h2>
                <span className="text-xs text-muted-foreground">Update your profile</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Username</Label>
                  <Input className="h-11 rounded-xl bg-muted/40" value={profile?.username ?? ""} readOnly disabled />
                  <p className="text-[11px] text-muted-foreground">System-assigned account identifier.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Citizenship Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-11 rounded-xl font-mono text-sm"
                      value={reveal ? form.citizenship_no : maskCitizenship(form.citizenship_no)}
                      onChange={(e) => setForm({ ...form, citizenship_no: e.target.value })}
                      readOnly={!reveal}
                      maxLength={30}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      aria-label={reveal ? "Hide citizenship number" : "Show citizenship number"}
                      onClick={() => setReveal((v) => !v)}
                    >
                      {reveal ? <EyeOff className="size-4 text-primary" /> : <Eye className="size-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">District *</Label>
                  <Combobox
                    value={form.district}
                    onValueChange={(v) => setForm({ ...form, district: v })}
                    options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                    placeholder="Select district"
                  />
                  <p className="text-[11px] text-muted-foreground">Used for filtering local depots.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Address *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={160}
                    placeholder="City, ward or landmark"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20}
                    placeholder="98XXXXXXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input className="h-11 rounded-xl bg-muted/40" value={profile?.email ?? user?.email ?? ""} readOnly disabled />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
                <Button type="button" variant="outline" className="h-11 rounded-xl sm:flex-1" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="h-11 rounded-xl sm:flex-1 font-semibold">
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <User className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="font-display font-bold text-base text-foreground">Personal Details</h2>
                    <p className="text-xs text-muted-foreground">Information verified by depots</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 font-medium text-xs" onClick={() => enterEdit()}>
                  <Pencil className="size-3.5" /> Edit Profile
                </Button>
              </div>

              {/* Mobile-Friendly Grid List of Details */}
              <div className="divide-y divide-border/40">
                <MobileDetailRow icon={User} label="Full Name" value={profile?.full_name ?? "-"} />
                <MobileDetailRow icon={AtSign} label="Username" value={formatUsername(profile?.username)} />
                <MobileDetailRow icon={FileText} label="Citizenship No." value={maskCitizenship(profile?.citizenship_no)} />
                <MobileDetailRow icon={MapPin} label="District" value={profile?.district ?? "-"} />
                <MobileDetailRow icon={MapPin} label="Local Address" value={profile?.address ?? "-"} />
                <MobileDetailRow icon={Phone} label="Phone Number" value={profile?.phone ?? "-"} />
                <MobileDetailRow icon={Mail} label="Email Address" value={profile?.email ?? user?.email ?? "-"} />
              </div>
            </div>
          )}
        </div>

        {/* QR Pass Sidebar Card - Mobile Collapsible, Desktop Always Visible */}
        <aside className="h-fit overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
          {isMobile ? (
            <Collapsible open={qrOpen} onOpenChange={setQrOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border-b border-border/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                      <QrCode className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-base text-foreground">Collection QR Pass</h2>
                      <p className="text-xs text-muted-foreground">Tap to toggle QR scan view</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      qrOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5">{qrContent}</div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/30 px-5 py-4">
                <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <QrCode className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Collection QR Pass</h2>
                  <p className="text-xs text-muted-foreground">Present at depot counter</p>
                </div>
              </div>
              <div className="p-6">{qrContent}</div>
            </>
          )}
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
  const upsertDealer = useMutation(api.app.upsertDealer);
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingDepot, setEditingDepot] = useState(false);
  const [qrOpen, setQrOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const [ownerForm, setOwnerForm] = useState({ full_name: "", district: "", address: "", phone: "" });
  const [depotForm, setDepotForm] = useState({ business_name: "", license_no: "", district: "", address: "", phone: "" });

  useEffect(() => {
    if (profile) {
      setOwnerForm({
        full_name: profile.full_name ?? "",
        district: profile.district ?? "",
        address: profile.address ?? "",
        phone: profile.phone ?? "",
      });
    }
    if (dealer) {
      setDepotForm({
        business_name: dealer.business_name ?? "",
        license_no: dealer.license_no ?? "",
        district: dealer.district ?? "",
        address: dealer.address ?? "",
        phone: dealer.phone ?? "",
      });
    }
  }, [profile, dealer]);

  const enterEditOwner = () => {
    if (!profile) return;
    setOwnerForm({
      full_name: profile.full_name ?? "",
      district: profile.district ?? "",
      address: profile.address ?? "",
      phone: profile.phone ?? "",
    });
    setEditingOwner(true);
    setEditingDepot(false);
  };

  const enterEditDepot = () => {
    if (!dealer) return;
    setDepotForm({
      business_name: dealer.business_name ?? "",
      license_no: dealer.license_no ?? "",
      district: dealer.district ?? "",
      address: dealer.address ?? "",
      phone: dealer.phone ?? "",
    });
    setEditingDepot(true);
    setEditingOwner(false);
  };

  const saveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ ...ownerForm, citizenship_no: "" });
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
      toast.success("Owner profile updated");
      await refresh();
      setEditingOwner(false);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update profile"));
    } finally {
      setBusy(false);
    }
  };

  const saveDepot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dealer) return;
    if (depotForm.business_name.trim().length < 2) {
      toast.error("Please enter a valid business name");
      return;
    }
    if (!depotForm.district.trim() || !depotForm.address.trim()) {
      toast.error("District and address are required");
      return;
    }
    setBusy(true);
    try {
      await upsertDealer({
        ...(sessionToken ? { sessionToken } : {}),
        businessName: depotForm.business_name.trim(),
        ...(depotForm.license_no.trim() ? { licenseNo: depotForm.license_no.trim() } : {}),
        district: depotForm.district.trim(),
        address: depotForm.address.trim(),
        ...(depotForm.phone.trim() ? { phone: depotForm.phone.trim() } : {}),
      });
      toast.success("Depot information updated");
      await refresh();
      setEditingDepot(false);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update depot information"));
    } finally {
      setBusy(false);
    }
  };

  const code = dealer?.code ?? "";
  const qrValue = dealer ? depotQrValue(dealer.code) : null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Depot code copied");
      setTimeout(() => setCopied(false), 2000);
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
    <div className="flex flex-col items-center text-center space-y-4">
      <p className="text-xs text-muted-foreground max-w-xs">
        Consumers scan this QR code to join your waitlist. Display it prominently at your counter.
      </p>
      {qrValue ? (
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-black/5">
          <QRCodeSVG value={qrValue} size={isMobile ? 160 : 140} level="M" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Depot Code</p>
        <p className="font-mono text-2xl font-extrabold tracking-widest text-primary">{code || "-"}</p>
        <p className="text-xs text-muted-foreground">{dealer.business_name}</p>
      </div>
      
      <Button variant={copied ? "default" : "outline"} className="w-full h-11 rounded-xl" onClick={() => void copyCode()}>
        {copied ? <Check className="size-4 mr-1.5 text-success-foreground" /> : <Copy className="size-4 mr-1.5" />}
        {copied ? "Copied" : "Copy Depot Code"}
      </Button>
      
      <Button asChild variant="secondary" className="w-full h-11 rounded-xl">
        <Link to="/dealer/stock">
          <Boxes className="size-4 mr-1.5 text-primary" /> Manage Stock & Availability
        </Link>
      </Button>
    </div>
  );

  const approval = approvalBadge(dealer.approval_status);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Hero with Elegant Subtle Styling */}
      <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        <div className="relative h-24 sm:h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.2),transparent_60%)]" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background border border-white/20"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">Sign out</span>
          </Button>
        </div>
        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <span className="-mt-12 sm:-mt-10 grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card">
                {initials(dealer.business_name) || "D"}
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <Store className="size-3" /> Depot Owner
                  </span>
                  {approval ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", approval.classes)}>
                      <approval.icon className="size-3" /> {approval.label}
                    </span>
                  ) : null}
                </div>
                <h1 className="truncate font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  {dealer.business_name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{address}</span>
                  </span>
                  {dealer.phone ? (
                    <a href={`tel:${dealer.phone}`} className="flex items-center gap-1 text-primary hover:underline font-medium">
                      <Phone className="size-3.5 shrink-0" /> {dealer.phone}
                    </a>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl text-xs px-2 sm:px-4">
              <Link to="/dealer/waitlist">
                <ClipboardList className="size-3.5 mr-1 text-primary" /> Waitlist
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl text-xs px-2 sm:px-4">
              <Link to="/dealer/stock">
                <Boxes className="size-3.5 mr-1 text-primary" /> Stock
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl text-xs px-2 sm:px-4">
              <Link to="/dealer/scan">
                <ScanLine className="size-3.5 mr-1 text-primary" /> Scan
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 sm:space-y-6">
          {/* Depot Details Edit Form */}
          {editingDepot ? (
            <form onSubmit={saveDepot} className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Pencil className="size-4 text-primary" /> Edit Depot Information
                </h2>
                <span className="text-xs text-muted-foreground">Public business details</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business Name *</Label>
                  <Input className="h-11 rounded-xl" value={depotForm.business_name} onChange={(e) => setDepotForm({ ...depotForm, business_name: e.target.value })} maxLength={90} placeholder="Depot business name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">License Number</Label>
                  <Input className="h-11 rounded-xl" value={depotForm.license_no} onChange={(e) => setDepotForm({ ...depotForm, license_no: e.target.value })} maxLength={40} placeholder="LPG License No. (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">District *</Label>
                  <Combobox value={depotForm.district} onValueChange={(v) => setDepotForm({ ...depotForm, district: v })} options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))} placeholder="Select district" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Address *</Label>
                  <Input className="h-11 rounded-xl" value={depotForm.address} onChange={(e) => setDepotForm({ ...depotForm, address: e.target.value })} maxLength={160} placeholder="Location, street, ward" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Contact Phone</Label>
                  <Input className="h-11 rounded-xl" value={depotForm.phone} onChange={(e) => setDepotForm({ ...depotForm, phone: e.target.value })} maxLength={20} placeholder="98XXXXXXXX" />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button type="button" variant="outline" className="h-11 rounded-xl flex-1" onClick={() => setEditingDepot(false)}>Cancel</Button>
                <Button type="submit" disabled={busy} className="h-11 rounded-xl flex-1 font-semibold">
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Depot Details
                </Button>
              </div>
            </form>
          ) : editingOwner ? (
            /* Owner Account Edit Form */
            <form onSubmit={saveOwner} className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Pencil className="size-4 text-primary" /> Edit Owner Profile
                </h2>
                <span className="text-xs text-muted-foreground">Personal details</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input className="h-11 rounded-xl" value={ownerForm.full_name} onChange={(e) => setOwnerForm({ ...ownerForm, full_name: e.target.value })} maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Username</Label>
                  <Input className="h-11 rounded-xl bg-muted/40" value={profile?.username ?? ""} readOnly disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">District *</Label>
                  <Combobox value={ownerForm.district} onValueChange={(v) => setOwnerForm({ ...ownerForm, district: v })} options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))} placeholder="Select district" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Address</Label>
                  <Input className="h-11 rounded-xl" value={ownerForm.address} onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })} maxLength={160} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone</Label>
                  <Input className="h-11 rounded-xl" value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} maxLength={20} />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button type="button" variant="outline" className="h-11 rounded-xl flex-1" onClick={() => setEditingOwner(false)}>Cancel</Button>
                <Button type="submit" disabled={busy} className="h-11 rounded-xl flex-1 font-semibold">
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Owner Profile
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Depot Details Section with Direct Inline Edit Button */}
              <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
                <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Store className="size-4.5" />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-base text-foreground">Depot Information</h2>
                      <p className="text-xs text-muted-foreground">Public business details seen by consumers</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 font-medium text-xs" onClick={() => enterEditDepot()}>
                    <Pencil className="size-3.5" /> Edit Depot
                  </Button>
                </div>
                <div className="divide-y divide-border/40">
                  <MobileDetailRow icon={Store} label="Business Name" value={dealer.business_name} />
                  <MobileDetailRow icon={BadgeCheck} label="License No." value={dealer.license_no ?? "-"} />
                  <MobileDetailRow icon={MapPin} label="District" value={dealer.district} />
                  <MobileDetailRow icon={MapPin} label="Address" value={dealer.address ?? "-"} />
                  <MobileDetailRow icon={Phone} label="Contact Phone" value={dealer.phone ?? "-"} />
                </div>
              </div>

              {/* Owner Account Section */}
              <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
                <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <User className="size-4.5" />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-base text-foreground">Owner Account</h2>
                      <p className="text-xs text-muted-foreground">Personal registration details</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 font-medium text-xs" onClick={() => enterEditOwner()}>
                    <Pencil className="size-3.5" /> Edit Owner
                  </Button>
                </div>
                <div className="divide-y divide-border/40">
                  <MobileDetailRow icon={User} label="Full Name" value={profile?.full_name ?? "-"} />
                  <MobileDetailRow icon={AtSign} label="Username" value={formatUsername(profile?.username)} />
                  <MobileDetailRow icon={Phone} label="Phone" value={profile?.phone ?? "-"} />
                  <MobileDetailRow icon={Mail} label="Email" value={profile?.email ?? user?.email ?? "-"} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* QR Code Pass */}
        <aside className="h-fit overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
          {isMobile ? (
            <Collapsible open={qrOpen} onOpenChange={setQrOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border-b border-border/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                      <QrCode className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-base text-foreground">Depot QR Code</h2>
                      <p className="text-xs text-muted-foreground">Customers scan to join waitlist</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-300", qrOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5">{qrContent}</div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/30 px-5 py-4">
                <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <QrCode className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Depot QR Code</h2>
                  <p className="text-xs text-muted-foreground">Customers scan to join queue</p>
                </div>
              </div>
              <div className="p-6">{qrContent}</div>
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
      label: "Pending",
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
/* Shared Mobile Components                                           */
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

function formatUsername(username: string | null | undefined): string {
  if (!username) return "-";
  return username.replace(/^@+/, "");
}

function MobileDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <span className="text-sm font-semibold text-foreground text-right truncate break-words max-w-[60%] font-mono">
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin profile                                                       */
/* ------------------------------------------------------------------ */

function AdminProfile() {
  const { user, signOut, sessionToken } = useAuth();
  const navigate = useNavigate();
  const opts = sessionToken ? { sessionToken } : "skip";
  const stats = useQuery(api.admin.dashboardStats, opts);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        <div className="relative h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background shadow-sm border border-border/40 transition-all active:scale-95"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">Sign out</span>
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <div className="-mt-12 sm:-mt-10 grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card">
                <ShieldCheck className="size-10 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="size-3" /> System Administrator
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  Administrator
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <Mail className="size-3.5 shrink-0 text-primary" /> {user?.email ?? "admin@YoGas.app"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard Direct Navigation */}
          <div className="mt-5">
            <Button asChild className="h-12 w-full rounded-2xl font-semibold shadow-soft">
              <Link to="/dashboard">
                <Store className="size-4 mr-2" /> Open Admin Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Admin Account & Platform Metrics */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 sm:space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Admin Credentials</h2>
                  <p className="text-xs text-muted-foreground">Platform governance account</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              <MobileDetailRow icon={Mail} label="Account Email" value={user?.email ?? "admin@YoGas.app"} />
              <MobileDetailRow icon={ShieldCheck} label="Role" value="System Administrator" />
              <MobileDetailRow icon={BadgeCheck} label="Permissions" value="Full Platform Access" />
              <MobileDetailRow icon={FileText} label="Authentication" value="PBKDF2 SHA-256 Verified" />
            </div>
          </div>
        </div>

        <aside className="h-fit overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Store className="size-4.5" />
            </span>
            <div>
              <h2 className="font-bold text-base text-foreground">Platform Overview</h2>
              <p className="text-xs text-muted-foreground">Live platform metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Consumers</p>
              <p className="font-display text-xl font-bold text-foreground mt-0.5">{stats?.users ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Dealers</p>
              <p className="font-display text-xl font-bold text-foreground mt-0.5">{stats?.dealers ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Waitlist</p>
              <p className="font-display text-xl font-bold text-foreground mt-0.5">{stats?.entries ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-amber-500/10 p-3 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending</p>
              <p className="font-display text-xl font-bold text-amber-600 mt-0.5">{stats?.pendingDealers ?? "-"}</p>
            </div>
          </div>

          <Button asChild className="w-full h-11 rounded-xl font-semibold mt-2">
            <Link to="/dashboard">Go to Full Dashboard</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

