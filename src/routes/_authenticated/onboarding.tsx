import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Store, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { api } from "../../../convex/_generated/api";
import { useAuth, sessionArgs } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { friendlyError, NEPAL_DISTRICTS } from "@/lib/gas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const consumerSchema = z.object({
  full_name: z.string().trim().min(2, i18n.t("onboarding:fullNameRequired")).max(80),
  citizenship_no: z
    .string()
    .trim()
    .min(4, i18n.t("onboarding:citizenshipRequired"))
    .max(30)
    .regex(/^[0-9A-Za-z\-/ ]+$/, i18n.t("onboarding:citizenshipFormat")),
  address: z.string().trim().min(4, i18n.t("onboarding:addressRequired")).max(160),
  district: z.string().trim().min(2, i18n.t("onboarding:districtRequired")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

const dealerSchema = z.object({
  business_name: z.string().trim().min(2, i18n.t("onboarding:depotNameRequired")).max(90),
  license_no: z.string().trim().max(40).optional().or(z.literal("")),
  district: z.string().trim().min(2, i18n.t("onboarding:districtRequired")),
  address: z.string().trim().min(4, i18n.t("onboarding:depotAddressRequired")).max(160),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

function Onboarding() {
  const { t } = useTranslation();
  const { user, profile, role, dealer, profileComplete, refresh, sessionToken } = useAuth();
  const navigate = useNavigate();
  const updateRole = useMutation(api.app.updateRole);
  const updateProfile = useMutation(api.app.updateProfile);
  const upsertDealer = useMutation(api.app.upsertDealer);
  const [pickedRole, setPickedRole] = useState<"consumer" | "dealer" | null>(null);
  const [busy, setBusy] = useState(false);
  const [citizenshipError, setCitizenshipError] = useState<string | null>(null);

  const activeRole = role ?? pickedRole;

  const [c, setC] = useState({
    full_name: "",
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
    await updateRole({ ...sessionArgs(sessionToken), role: value });
    await refresh();
  };

  const submitConsumer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCitizenshipError(null);
    const parsed = consumerSchema.safeParse(c);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("onboarding:checkYourDetails"));
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        ...sessionArgs(sessionToken),
        fullName: parsed.data.full_name,
        citizenshipNo: parsed.data.citizenship_no,
        address: parsed.data.address,
        district: parsed.data.district,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      });
      toast.success(t("onboarding:profileSaved"));
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const message = friendlyError(error, "Could not save profile");
      if (/citizenship/i.test(raw)) {
        setCitizenshipError(t("onboarding:citizenshipTaken"));
      }
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submitDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = dealerSchema.safeParse(d);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("onboarding:checkYourDetails"));
      return;
    }
    if (!c.full_name.trim()) {
      toast.error(t("onboarding:enterYourName"));
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        ...sessionArgs(sessionToken),
        fullName: c.full_name.trim(),
        district: parsed.data.district,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      });
      await upsertDealer({
        ...sessionArgs(sessionToken),
        businessName: parsed.data.business_name,
        ...(parsed.data.license_no ? { licenseNo: parsed.data.license_no } : {}),
        district: parsed.data.district,
        address: parsed.data.address,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      });
      toast.success(dealer ? t("onboarding:depotUpdated") : t("onboarding:depotRegistered"));
      await refresh();
    } catch (error) {
      toast.error(friendlyError(error, "Could not register depot"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2">
          <Logo />
        </div>

        {!activeRole ? (
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              {t("onboarding:howWillYouUseYoGas")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("onboarding:pickOnce")}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    key: "consumer",
                    label: t("onboarding:iNeedGas"),
                    body: t("onboarding:joinDepotQueues"),
                    icon: User,
                  },
                  {
                    key: "dealer",
                    label: t("onboarding:imADealer"),
                    body: t("onboarding:runADepotQueue"),
                    icon: Store,
                  },
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
              <h1 className="font-display text-2xl font-bold">{t("onboarding:yourDetails")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("onboarding:yourDetailsHint")}
              </p>
            </div>
            <Field label={t("onboarding:fullName")}>
              <Input
                value={c.full_name}
                onChange={(e) => setC({ ...c, full_name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label={t("onboarding:citizenshipNumber")}>
              <Input
                value={c.citizenship_no}
                onChange={(e) => {
                  setC({ ...c, citizenship_no: e.target.value });
                  if (citizenshipError) setCitizenshipError(null);
                }}
                placeholder="12-01-75-01234"
                maxLength={30}
                aria-invalid={Boolean(citizenshipError)}
                aria-describedby={citizenshipError ? "citizenship-error" : undefined}
              />
              {citizenshipError ? (
                <p id="citizenship-error" className="text-sm text-destructive">
                  {citizenshipError}
                </p>
              ) : null}
            </Field>
            <Field label={t("onboarding:address")}>
              <Input
                value={c.address}
                onChange={(e) => setC({ ...c, address: e.target.value })}
                maxLength={160}
                placeholder={t("onboarding:addressPlaceholder")}
              />
            </Field>
            <Field label={t("onboarding:district")}>
              <Combobox
                value={c.district}
                onValueChange={(v) => setC({ ...c, district: v })}
                options={NEPAL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                placeholder={t("onboarding:selectDistrict")}
              />
            </Field>

            <Field label={t("onboarding:phoneOptional")}>
              <Input
                value={c.phone}
                onChange={(e) => setC({ ...c, phone: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
              {t("onboarding:saveAndContinue")}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={submitDealer}
            className="space-y-4 rounded-2xl border border-border bg-card p-7 shadow-soft"
          >
            <div>
              <h1 className="font-display text-2xl font-bold">
                {t("onboarding:registerYourDepot")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("onboarding:registerDepotHint")}
              </p>
            </div>
            <Field label={t("onboarding:yourName")}>
              <Input
                value={c.full_name}
                onChange={(e) => setC({ ...c, full_name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label={t("onboarding:depotBusinessName")}>
              <Input
                value={d.business_name}
                onChange={(e) => setD({ ...d, business_name: e.target.value })}
                maxLength={90}
              />
            </Field>
            <Field label={t("onboarding:licenceOptional")}>
              <Input
                value={d.license_no}
                onChange={(e) => setD({ ...d, license_no: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label={t("onboarding:district")}>
              <Combobox
                value={d.district}
                onValueChange={(v) => setD({ ...d, district: v })}
                options={NEPAL_DISTRICTS.map((x) => ({ value: x, label: x }))}
                placeholder={t("onboarding:selectDistrict")}
              />
            </Field>
            <Field label={t("onboarding:depotAddress")}>
              <Input
                value={d.address}
                onChange={(e) => setD({ ...d, address: e.target.value })}
                maxLength={160}
                placeholder={t("onboarding:depotAddressPlaceholder")}
              />
            </Field>
            <Field label={t("onboarding:contactPhoneOptional")}>
              <Input
                value={d.phone}
                onChange={(e) => setD({ ...d, phone: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
              {t("onboarding:registerDepot")}
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
