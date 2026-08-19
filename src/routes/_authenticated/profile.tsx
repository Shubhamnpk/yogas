import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
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
  Printer,
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
import i18n from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";
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
      { title: i18n.t("profile:metaTitle") },
      { name: "description", content: i18n.t("profile:metaDescription") },
      { property: "og:title", content: i18n.t("profile:metaOgTitle") },
      { property: "og:description", content: i18n.t("profile:metaOgDescription") },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, i18n.t("profile:enterFullName")).max(80),
  citizenship_no: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  district: z.string().trim().min(2, i18n.t("profile:chooseDistrict")),
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
  const { t } = useTranslation();
  const { user, profile, signOut, refresh, sessionToken } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.app.updateProfile);
  const isMobile = useIsMobile();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
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
      toast.error(parsed.error.issues[0]?.message ?? t("profile:checkDetails"));
      return;
    }
    if (!parsed.data.citizenship_no || !parsed.data.address) {
      toast.error(t("profile:citizenshipAndAddressRequired"));
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
      toast.success(t("profile:profileUpdated"));
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
      toast.success(t("profile:collectionCodeCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("profile:copyFailed"));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const qrContent = (
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="rounded-xl bg-muted/50 p-2 text-xs text-muted-foreground max-w-xs">
        {t("profile:qrPresentHint")}
      </div>

      {qrValue ? (
        <div className="relative group rounded-3xl bg-white p-5 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.02]">
          <QRCodeSVG value={qrValue} size={isMobile ? 160 : 140} level="M" />
        </div>
      ) : null}

      <div className="w-full space-y-2">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {t("profile:yourVerificationCode")}
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
            <Check className="size-4 mr-1.5 text-success-foreground" />{" "}
            {t("profile:copiedToClipboard")}
          </>
        ) : (
          <>
            <Copy className="size-4 mr-1.5" /> {t("profile:copyCode")}
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
        <div className="relative hidden h-24 sm:block sm:h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.2),transparent_60%)]" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background shadow-sm border border-white/20 transition-all active:scale-95"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">{t("profile:signOut")}</span>
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <div className="grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card sm:-mt-10">
                {initials(profile?.full_name) || "U"}
              </div>
              <div className="min-w-0 flex-1 pt-4 pb-1 sm:pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <User className="size-3" /> {t("profile:consumerAccount")}
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  {profile?.full_name || "-"}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <AtSign className="size-3.5 shrink-0 text-primary" />{" "}
                    {formatUsername(profile?.username)}
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
                title={t("profile:tapToCopyCode")}
                className="flex w-full sm:w-auto items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3.5 py-2 font-mono text-xs font-bold tracking-wider text-primary transition-all active:scale-95 justify-between sm:justify-start"
              >
                <div className="flex items-center gap-1.5">
                  <QrCode className="size-4 text-primary" />
                  <span>
                    {t("profile:code")}: <strong className="text-foreground">{code || "-"}</strong>
                  </span>
                </div>
                {copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5 opacity-60" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl justify-start px-4 border-border/80 hover:border-primary/40 hover:bg-accent/50 transition-all"
            >
              <Link to="/waitlist" className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600">
                  <ClipboardList className="size-4" />
                </span>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-foreground">{t("profile:myWaitlist")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("profile:trackGasStatus")}</p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl justify-start px-4 border-border/80 hover:border-primary/40 hover:bg-accent/50 transition-all"
            >
              <Link to="/dealers" className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <Store className="size-4" />
                </span>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-foreground">{t("profile:gasDepots")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("profile:findNearbyStock")}
                  </p>
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
                  <Pencil className="size-4 text-primary" /> {t("profile:editPersonalInformation")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("profile:updateYourProfile")}
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:fullName")} *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:username")}</Label>
                  <Input
                    className="h-11 rounded-xl bg-muted/40"
                    value={profile?.username ?? ""}
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile:systemAssignedIdentifier")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {t("profile:citizenshipNumber")} *
                  </Label>
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
                      aria-label={
                        reveal
                          ? t("profile:hideCitizenshipNumber")
                          : t("profile:showCitizenshipNumber")
                      }
                      onClick={() => setReveal((v) => !v)}
                    >
                      {reveal ? (
                        <EyeOff className="size-4 text-primary" />
                      ) : (
                        <Eye className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:district")} *</Label>
                  <Combobox
                    value={form.district}
                    onValueChange={(v) => setForm({ ...form, district: v })}
                    options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                    placeholder={t("profile:selectDistrict")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile:districtFiltersLocal")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:address")} *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={160}
                    placeholder={t("profile:cityWardLandmark")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:phoneNumber")}</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20}
                    placeholder="98XXXXXXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:emailAddress")}</Label>
                  <Input
                    className="h-11 rounded-xl bg-muted/40"
                    value={profile?.email ?? user?.email ?? ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl sm:flex-1"
                  onClick={() => setEditing(false)}
                >
                  {t("profile:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-xl sm:flex-1 font-semibold"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}{" "}
                  {t("profile:saveChanges")}
                </Button>
              </div>
            </form>
          ) : (
            <Collapsible
              open={isMobile ? personalOpen : true}
              onOpenChange={setPersonalOpen}
              className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft"
            >
              <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <User className="size-4.5" />
                      </span>
                      <div>
                        <h2 className="font-display font-bold text-base text-foreground">
                          {t("profile:personalDetails")}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {t("profile:infoVerifiedByDepots")}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground transition-transform duration-300 sm:hidden",
                        personalOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-3 h-9 shrink-0 rounded-xl gap-1.5 font-medium text-xs"
                  onClick={() => enterEdit()}
                >
                  <Pencil className="size-3.5" /> {t("profile:editProfile")}
                </Button>
              </div>
              <CollapsibleContent>
                <div className="divide-y divide-border/40">
                  <MobileDetailRow
                    icon={User}
                    label={t("profile:fullName")}
                    value={profile?.full_name ?? "-"}
                  />
                  <MobileDetailRow
                    icon={AtSign}
                    label={t("profile:username")}
                    value={formatUsername(profile?.username)}
                  />
                  <MobileDetailRow
                    icon={FileText}
                    label={t("profile:citizenshipNo")}
                    value={maskCitizenship(profile?.citizenship_no)}
                  />
                  <MobileDetailRow
                    icon={MapPin}
                    label={t("profile:district")}
                    value={profile?.district ?? "-"}
                  />
                  <MobileDetailRow
                    icon={MapPin}
                    label={t("profile:localAddress")}
                    value={profile?.address ?? "-"}
                  />
                  <MobileDetailRow
                    icon={Phone}
                    label={t("profile:phoneNumber")}
                    value={profile?.phone ?? "-"}
                  />
                  <MobileDetailRow
                    icon={Mail}
                    label={t("profile:emailAddress")}
                    value={profile?.email ?? user?.email ?? "-"}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                      <h2 className="font-display font-bold text-base text-foreground">
                        {t("profile:collectionQrPass")}
                      </h2>
                      <p className="text-xs text-muted-foreground">{t("profile:tapToToggleQr")}</p>
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
                  <h2 className="font-display font-bold text-base text-foreground">
                    {t("profile:collectionQrPass")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("profile:presentAtDepotCounter")}
                  </p>
                </div>
              </div>
              <div className="p-6">{qrContent}</div>
            </>
          )}
        </aside>
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={() => void handleSignOut()}
        className="h-12 w-full rounded-2xl border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 sm:hidden"
      >
        <LogOut className="size-4" /> {t("profile:signOut")}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dealer profile                                                      */
/* ------------------------------------------------------------------ */

function DealerProfile() {
  const { t } = useTranslation();
  const { dealer, profile, user, sessionToken, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.app.updateProfile);
  const upsertDealer = useMutation(api.app.upsertDealer);
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingDepot, setEditingDepot] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [depotOpen, setDepotOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [ownerForm, setOwnerForm] = useState({
    full_name: "",
    district: "",
    address: "",
    phone: "",
  });
  const [depotForm, setDepotForm] = useState({
    business_name: "",
    license_no: "",
    district: "",
    address: "",
    phone: "",
  });

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
      toast.error(parsed.error.issues[0]?.message ?? t("profile:checkDetails"));
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
      toast.success(t("profile:ownerProfileUpdated"));
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
      toast.error(t("profile:validBusinessName"));
      return;
    }
    if (!depotForm.district.trim() || !depotForm.address.trim()) {
      toast.error(t("profile:districtAndAddressRequired"));
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
      toast.success(t("profile:depotInformationUpdated"));
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
      toast.success(t("profile:depotCodeCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("profile:copyFailed"));
    }
  };

  const downloadQr = async () => {
    if (!printRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(printRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        style: { margin: "0" },
      });
      const link = document.createElement("a");
      link.download = `yogas-depot-${dealer?.code ?? "qr"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t("profile:depotCardDownloaded"));
    } catch {
      toast.error(t("profile:exportDepotCardFailed"));
    } finally {
      setDownloading(false);
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
      <p className="text-xs text-muted-foreground max-w-xs">{t("profile:qrScanToJoinHint")}</p>
      <div className="mx-auto w-fit">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #depot-print-card, #depot-print-card * { visibility: visible !important; }
            #depot-print-card {
              position: fixed !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) scale(1.7) !important;
              box-shadow: none !important;
              border-radius: 12px !important;
              margin: 0 !important;
            }
          }
        `}</style>
        <div
          ref={printRef}
          id="depot-print-card"
          className="flex w-[300px] flex-col overflow-hidden rounded-3xl bg-white text-center shadow-md ring-1 ring-black/5"
          style={{ margin: 0 }}
        >
          <div className="bg-gradient-to-r from-primary to-amber-500 px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              <LogoMark className="size-7" />
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                YoGas
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              {t("profile:depotEntryPass")}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 py-6">
            {qrValue ? (
              <div className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
                <QRCodeSVG value={qrValue} size={180} level="M" />
              </div>
            ) : null}
            <div className="space-y-0.5">
              <p className="font-display text-lg font-bold leading-tight text-foreground">
                {dealer.business_name}
              </p>
              <p className="font-mono text-sm font-extrabold tracking-[0.25em] text-primary">
                {code || "-"}
              </p>
            </div>
            <p className="max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
              {address}
              {dealer.phone ? <> · {dealer.phone}</> : null}
            </p>
          </div>

          <div className="border-t border-black/5 bg-muted/30 px-6 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
              {t("profile:scanToJoinQueue")}
            </p>
          </div>
        </div>
      </div>

      <Button
        variant={copied ? "default" : "outline"}
        className="w-full h-11 rounded-xl"
        onClick={() => void copyCode()}
      >
        {copied ? (
          <Check className="size-4 mr-1.5 text-success-foreground" />
        ) : (
          <Copy className="size-4 mr-1.5" />
        )}
        {copied ? t("profile:copied") : t("profile:copyDepotCode")}
      </Button>

      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => void downloadQr()}
          disabled={downloading || !qrValue}
        >
          {downloading ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-4 mr-1.5 text-primary" />
          )}
          {downloading ? t("profile:preparing") : t("profile:download")}
        </Button>

        <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}>
          <Printer className="size-4 mr-1.5 text-primary" /> {t("profile:printCard")}
        </Button>
      </div>

      <Button asChild variant="secondary" className="w-full h-11 rounded-xl">
        <Link to="/dealer/stock">
          <Boxes className="size-4 mr-1.5 text-primary" /> {t("profile:manageStockAvailability")}
        </Link>
      </Button>
    </div>
  );

  const approval = approvalBadge(dealer.approval_status);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Hero with Elegant Subtle Styling */}
      <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        <div className="relative hidden h-24 sm:block sm:h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.2),transparent_60%)]" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background border border-white/20"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">{t("profile:signOut")}</span>
          </Button>
        </div>
        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <span className="grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card sm:-mt-10">
                {initials(dealer.business_name) || "D"}
              </span>
              <div className="min-w-0 flex-1 pt-4 pb-1 sm:pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <Store className="size-3" /> {t("profile:depotOwner")}
                  </span>
                  {approval ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        approval.classes,
                      )}
                    >
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
                    <a
                      href={`tel:${dealer.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
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
                <ClipboardList className="size-3.5 mr-1 text-primary" /> {t("profile:waitlist")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl text-xs px-2 sm:px-4">
              <Link to="/dealer/stock">
                <Boxes className="size-3.5 mr-1 text-primary" /> {t("profile:stock")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl text-xs px-2 sm:px-4">
              <Link to="/dealer/scan">
                <ScanLine className="size-3.5 mr-1 text-primary" /> {t("profile:scan")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 sm:space-y-6">
          {/* Depot Details Edit Form */}
          {editingDepot ? (
            <form
              onSubmit={saveDepot}
              className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Pencil className="size-4 text-primary" /> {t("profile:editDepotInformation")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("profile:publicBusinessDetails")}
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:businessName")} *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={depotForm.business_name}
                    onChange={(e) => setDepotForm({ ...depotForm, business_name: e.target.value })}
                    maxLength={90}
                    placeholder={t("profile:depotBusinessNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:licenseNumber")}</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={depotForm.license_no}
                    onChange={(e) => setDepotForm({ ...depotForm, license_no: e.target.value })}
                    maxLength={40}
                    placeholder={t("profile:lpgLicensePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:district")} *</Label>
                  <Combobox
                    value={depotForm.district}
                    onValueChange={(v) => setDepotForm({ ...depotForm, district: v })}
                    options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                    placeholder={t("profile:selectDistrict")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:address")} *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={depotForm.address}
                    onChange={(e) => setDepotForm({ ...depotForm, address: e.target.value })}
                    maxLength={160}
                    placeholder={t("profile:locationStreetWard")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:contactPhone")}</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={depotForm.phone}
                    onChange={(e) => setDepotForm({ ...depotForm, phone: e.target.value })}
                    maxLength={20}
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl flex-1"
                  onClick={() => setEditingDepot(false)}
                >
                  {t("profile:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-xl flex-1 font-semibold"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}{" "}
                  {t("profile:saveDepotDetails")}
                </Button>
              </div>
            </form>
          ) : editingOwner ? (
            /* Owner Account Edit Form */
            <form
              onSubmit={saveOwner}
              className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Pencil className="size-4 text-primary" /> {t("profile:editOwnerProfile")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("profile:personalDetailsSubtitle")}
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:fullName")} *</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={ownerForm.full_name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, full_name: e.target.value })}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:username")}</Label>
                  <Input
                    className="h-11 rounded-xl bg-muted/40"
                    value={profile?.username ?? ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:district")} *</Label>
                  <Combobox
                    value={ownerForm.district}
                    onValueChange={(v) => setOwnerForm({ ...ownerForm, district: v })}
                    options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                    placeholder={t("profile:selectDistrict")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:address")}</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={ownerForm.address}
                    onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                    maxLength={160}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("profile:phone")}</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={ownerForm.phone}
                    onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl flex-1"
                  onClick={() => setEditingOwner(false)}
                >
                  {t("profile:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-xl flex-1 font-semibold"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}{" "}
                  {t("profile:saveOwnerProfile")}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Depot Details Section with Direct Inline Edit Button */}
              <Collapsible
                open={isMobile ? depotOpen : true}
                onOpenChange={setDepotOpen}
                className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft"
              >
                <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Store className="size-4.5" />
                        </span>
                        <div>
                          <h2 className="font-display font-bold text-base text-foreground">
                            {t("profile:depotInformation")}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {t("profile:publicBusinessDetailsSeenByConsumers")}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-muted-foreground transition-transform duration-300 sm:hidden",
                          depotOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mr-3 h-9 shrink-0 rounded-xl gap-1.5 font-medium text-xs"
                    onClick={() => enterEditDepot()}
                  >
                    <Pencil className="size-3.5" /> {t("profile:editDepot")}
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="divide-y divide-border/40">
                    <MobileDetailRow
                      icon={Store}
                      label={t("profile:businessName")}
                      value={dealer.business_name}
                    />
                    <MobileDetailRow
                      icon={BadgeCheck}
                      label={t("profile:licenseNo")}
                      value={dealer.license_no ?? "-"}
                    />
                    <MobileDetailRow
                      icon={MapPin}
                      label={t("profile:district")}
                      value={dealer.district}
                    />
                    <MobileDetailRow
                      icon={MapPin}
                      label={t("profile:address")}
                      value={dealer.address ?? "-"}
                    />
                    <MobileDetailRow
                      icon={Phone}
                      label={t("profile:contactPhone")}
                      value={dealer.phone ?? "-"}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Owner Account Section */}
              <Collapsible
                open={isMobile ? ownerOpen : true}
                onOpenChange={setOwnerOpen}
                className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft"
              >
                <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <User className="size-4.5" />
                        </span>
                        <div>
                          <h2 className="font-display font-bold text-base text-foreground">
                            {t("profile:ownerAccount")}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {t("profile:personalRegistrationDetails")}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-muted-foreground transition-transform duration-300 sm:hidden",
                          ownerOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mr-3 h-9 shrink-0 rounded-xl gap-1.5 font-medium text-xs"
                    onClick={() => enterEditOwner()}
                  >
                    <Pencil className="size-3.5" /> {t("profile:editOwner")}
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="divide-y divide-border/40">
                    <MobileDetailRow
                      icon={User}
                      label={t("profile:fullName")}
                      value={profile?.full_name ?? "-"}
                    />
                    <MobileDetailRow
                      icon={AtSign}
                      label={t("profile:username")}
                      value={formatUsername(profile?.username)}
                    />
                    <MobileDetailRow
                      icon={Phone}
                      label={t("profile:phone")}
                      value={profile?.phone ?? "-"}
                    />
                    <MobileDetailRow
                      icon={Mail}
                      label={t("profile:email")}
                      value={profile?.email ?? user?.email ?? "-"}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                      <h2 className="font-display font-bold text-base text-foreground">
                        {t("profile:depotQrCode")}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t("profile:customersScanToJoinWaitlist")}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 text-muted-foreground transition-transform duration-300",
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
                  <h2 className="font-display font-bold text-base text-foreground">
                    {t("profile:depotQrCode")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("profile:customersScanToJoinQueue")}
                  </p>
                </div>
              </div>
              <div className="p-6">{qrContent}</div>
            </>
          )}
        </aside>
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={() => void handleSignOut()}
        className="h-12 w-full rounded-2xl border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 sm:hidden"
      >
        <LogOut className="size-4" /> {t("profile:signOut")}
      </Button>
    </div>
  );
}

function approvalBadge(status: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return {
      label: i18n.t("profile:approved"),
      icon: BadgeCheck,
      classes: "border-success/30 bg-success/10 text-success",
    };
  }
  if (status === "pending") {
    return {
      label: i18n.t("profile:pending"),
      icon: Hourglass,
      classes: "border-warning/30 bg-warning/10 text-warning",
    };
  }
  return {
    label: i18n.t("profile:rejected"),
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
  const { t } = useTranslation();
  const { user, signOut, sessionToken } = useAuth();
  const navigate = useNavigate();
  const opts = sessionToken ? { sessionToken } : "skip";
  const stats = useQuery(api.admin.dashboardStats, opts);
  const isMobile = useIsMobile();
  const [adminOpen, setAdminOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        <div className="relative hidden h-24 sm:block sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-9 rounded-full bg-background/85 text-foreground backdrop-blur-md hover:bg-background shadow-sm border border-border/40 transition-all active:scale-95"
          >
            <LogOut className="size-4 text-destructive" />
            <span className="text-xs font-medium ml-1">{t("profile:signOut")}</span>
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
              <div className="grid size-20 sm:size-24 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground shadow-md ring-4 ring-card sm:-mt-10">
                <ShieldCheck className="size-10 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1 pt-4 pb-1 sm:pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="size-3" /> {t("profile:systemAdministrator")}
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  {t("profile:administrator")}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <Mail className="size-3.5 shrink-0 text-primary" />{" "}
                    {user?.email ?? "admin@YoGas.app"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard Direct Navigation */}
          <div className="mt-5">
            <Button asChild className="h-12 w-full rounded-2xl font-semibold shadow-soft">
              <Link to="/dashboard">
                <Store className="size-4 mr-2" /> {t("profile:openAdminDashboard")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Admin Account & Platform Metrics */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 sm:space-y-6">
          <Collapsible
            open={isMobile ? adminOpen : true}
            onOpenChange={setAdminOpen}
            className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <ShieldCheck className="size-4.5" />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-base text-foreground">
                        {t("profile:adminCredentials")}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t("profile:platformGovernanceAccount")}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-300 sm:hidden",
                      adminOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="divide-y divide-border/40">
                <MobileDetailRow
                  icon={Mail}
                  label={t("profile:accountEmail")}
                  value={user?.email ?? "admin@YoGas.app"}
                />
                <MobileDetailRow
                  icon={ShieldCheck}
                  label={t("profile:role")}
                  value={t("profile:systemAdministrator")}
                />
                <MobileDetailRow
                  icon={BadgeCheck}
                  label={t("profile:permissions")}
                  value={t("profile:fullPlatformAccess")}
                />
                <MobileDetailRow
                  icon={FileText}
                  label={t("profile:authentication")}
                  value={t("profile:pbkdf2Verified")}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Collapsible
          open={isMobile ? overviewOpen : true}
          onOpenChange={setOverviewOpen}
          className="h-fit overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft p-5 space-y-4"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Store className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-bold text-base text-foreground">
                    {t("profile:platformOverview")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("profile:livePlatformMetrics")}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform duration-300 sm:hidden",
                  overviewOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">{t("profile:consumers")}</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {stats?.users ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">{t("profile:dealers")}</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {stats?.dealers ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">{t("profile:waitlist")}</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {stats?.entries ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-3 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {t("profile:pending")}
                </p>
                <p className="font-display text-xl font-bold text-amber-600 mt-0.5">
                  {stats?.pendingDealers ?? "-"}
                </p>
              </div>
            </div>

            <Button asChild className="w-full h-11 rounded-xl font-semibold mt-2">
              <Link to="/dashboard">{t("profile:goToFullDashboard")}</Link>
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={() => void handleSignOut()}
        className="h-12 w-full rounded-2xl border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 sm:hidden"
      >
        <LogOut className="size-4" /> {t("profile:signOut")}
      </Button>
    </div>
  );
}
