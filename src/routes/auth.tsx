import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, ShieldCheck, Store, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { api } from "../../convex/_generated/api";
import { useAuth, getDeviceId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/Logo";
import { DEMO_ACCOUNTS } from "@/lib/gas";

function authErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("sign in") || message.includes("password") || message.includes("email")) {
      return i18n.t("auth:signInFailed");
    }
    return error.message;
  }
  return i18n.t("auth:somethingWentWrong");
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: i18n.t("auth:titleSignIn") },
      {
        name: "description",
        content: i18n.t("auth:description"),
      },
      { property: "og:title", content: i18n.t("auth:titleSignIn") },
      { property: "og:description", content: i18n.t("auth:ogDescription") },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, i18n.t("auth:fullNameRequired")).max(80),
  email: z.string().trim().email(i18n.t("auth:emailInvalid")).max(255),
  password: z.string().min(8, i18n.t("auth:passwordTooShort")).max(72),
});

function AuthPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"consumer" | "dealer">("consumer");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, role: myRole, loading, setSessionToken } = useAuth();
  const signUp = useMutation(api.app.signUp);
  const signIn = useMutation(api.app.signIn);

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: myRole === "dealer" ? "/dealer" : "/dashboard", replace: true });
    }
  }, [user, myRole, loading, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const deviceId = getDeviceId();
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? t("auth:checkYourDetails"));
          return;
        }
        const result = await signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          role,
          fullName: parsed.data.fullName,
          ...(deviceId ? { deviceId } : {}),
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setSessionToken(result.sessionToken);
        toast.success(t("auth:accountCreated"));
      } else {
        const result = await signIn({
          email: form.email.trim(),
          password: form.password,
          ...(deviceId ? { deviceId } : {}),
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setSessionToken(result.sessionToken);
        toast.success(t("auth:welcomeBack"));
      }
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (kind: "consumer" | "dealer" | "admin") => {
    setBusy(true);
    const deviceId = getDeviceId();
    try {
      const creds = DEMO_ACCOUNTS[kind];
      const result = await signIn({
        email: creds.email,
        password: creds.password,
        ...(deviceId ? { deviceId } : {}),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSessionToken(result.sessionToken);
      const demoLabel =
        kind === "admin"
          ? t("auth:demoAdmin")
          : kind === "dealer"
            ? t("auth:demoDealer")
            : t("auth:demoConsumer");
      toast.success(t("auth:signedInAsDemo", { kind: demoLabel }));
    } catch {
      toast.error(t("auth:demoUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-flame p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-lg font-semibold">YoGas</span>
        </Link>
        <div>
          <h1 className="max-w-sm font-display text-4xl font-bold leading-tight">
            {t("auth:headline")}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/85">
            {t("auth:headlineBody")}
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">{t("auth:madeForNepal")}</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold">
            {mode === "signin" ? t("auth:signIn") : t("auth:createYourAccount")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? t("auth:welcomeBackContinue") : t("auth:takesLessThanAMinute")}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "signup" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { key: "consumer", label: t("auth:iNeedGas"), icon: User },
                      { key: "dealer", label: t("auth:imADealer"), icon: Store },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setRole(opt.key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        role === opt.key
                          ? "border-primary bg-accent"
                          : "border-border hover:bg-secondary",
                      )}
                    >
                      <opt.icon className="size-4 text-primary" />
                      <span className="mt-2 block text-sm font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth:fullName")}</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={set("fullName")}
                    maxLength={80}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth:email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth:password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? t("auth:signIn") : t("auth:createAccount")}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/50 p-4">
            <p className="text-sm font-semibold">{t("auth:tryTheDemo")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("auth:demoHint")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void demoLogin("consumer")}
              >
                <User className="size-4" /> {t("auth:demoConsumer")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void demoLogin("dealer")}
              >
                <Store className="size-4" /> {t("auth:demoDealer")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                className="col-span-2"
                onClick={() => void demoLogin("admin")}
              >
                <ShieldCheck className="size-4" /> {t("auth:demoAdmin")}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("auth:newToYoGas") : t("auth:alreadyHaveAccount")}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? t("auth:createAnAccount") : t("auth:signIn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
