import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "convex/react";
import { Copy, Eye, EyeOff, Loader2, LogOut, Store } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
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
import { consumerQrValue, depotQrValue, maskCitizenship, NEPAL_DISTRICTS } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — YoGas" },
      {
        name: "description",
        content: "Manage your YoGas details, district and personal collection code.",
      },
      { property: "og:title", content: "Your profile — YoGas" },
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
  const { user, profile, role, dealer, signOut, refresh, sessionToken } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.app.updateProfile);
  const isDealer = role === "dealer";
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    if (!isDealer && (!parsed.data.citizenship_no || !parsed.data.address)) {
      toast.error("Citizenship number and address are required");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        sessionToken: sessionToken ?? undefined,
        fullName: parsed.data.full_name,
        citizenshipNo: parsed.data.citizenship_no || undefined,
        address: parsed.data.address || undefined,
        district: parsed.data.district,
        phone: parsed.data.phone || undefined,
      });
      toast.success("Profile updated");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setBusy(false);
    }
  };

  const code = isDealer ? (dealer?.code ?? "") : (profile?.collection_code ?? "");
  const qrValue = isDealer
    ? dealer
      ? depotQrValue(dealer.code)
      : null
    : user
      ? consumerQrValue(user.accountId)
      : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy — write it down instead");
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
          {isDealer
            ? "Your personal details and your depot's public code."
            : "Keep these accurate — depots verify you against them at the counter."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
            <p className="text-xs text-muted-foreground">This is auto-generated for your account.</p>
          </div>
          {!isDealer ? (
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
          ) : null}
          <div className="space-y-2">
            <Label>District</Label>
            <Select
              value={form.district}
              onValueChange={(v) => setForm({ ...form, district: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {NEPAL_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isDealer ? (
              <p className="text-xs text-muted-foreground">
                Depot search opens on this district by default.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
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

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="font-semibold">{isDealer ? "Depot QR" : "Your collection code"}</h2>
          <p className="text-sm text-muted-foreground">
            {isDealer
              ? "Print this and display it at your counter."
              : "The dealer scans this — or types the code below — to verify you."}
          </p>
          {qrValue ? (
            <div className="mx-auto w-fit rounded-2xl bg-white p-4">
              <QRCodeSVG value={qrValue} size={168} level="M" />
            </div>
          ) : null}
          <p className="font-display text-2xl font-bold tracking-widest">{code || "—"}</p>
          <Button variant="outline" className="w-full" onClick={() => void copy()}>
            <Copy className="size-4" /> Copy code
          </Button>
          {isDealer ? (
            <Button asChild variant="ghost" className="w-full">
              <Link to="/dealer/stock">
                <Store className="size-4" /> Depot settings
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
