"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useLoginMutation, useVerifyTwoFactorMutation } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const searchParams = useSearchParams();
  const loginMutation = useLoginMutation();
  const verify2FaMutation = useVerifyTwoFactorMutation();

  // 2FA state
  const [twoFactorData, setTwoFactorData] = useState<{
    email: string;
    twoFactorToken: string;
    type?: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const getTargetUrl = () => {
    const redirectParam = searchParams.get("redirect");
    return redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";
  };

  const onSubmit = async (values: LoginFormValues) => {
    const res = await loginMutation.mutateAsync(values);

    if (res.requiresTwoFactor && res.twoFactorToken) {
      setTwoFactorData({
        email: values.email,
        twoFactorToken: res.twoFactorToken,
        type: res.twoFactorType,
      });
      return;
    }

    if (!res.isEmailVerified) {
      window.location.href = `/verify-email?email=${encodeURIComponent(values.email)}`;
      return;
    }

    window.location.href = getTargetUrl();
  };

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorData || !twoFactorCode.trim()) return;

    await verify2FaMutation.mutateAsync({
      email: twoFactorData.email,
      code: twoFactorCode.trim(),
      twoFactorToken: twoFactorData.twoFactorToken,
      isRecoveryCode: useRecoveryCode,
    });

    window.location.href = getTargetUrl();
  };

  const fillDemoCredentials = () => {
    setValue("email", "demo@vaultz.local");
    setValue("password", "Password123");
  };

  return (
    <Card className="mx-auto w-full max-w-md border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarFallback className="rounded-lg bg-[var(--accent)] text-xs text-[var(--accent-foreground)] font-bold">
                V
              </AvatarFallback>
            </Avatar>
            <span>Vaultz</span>
          </Link>
          <Badge variant="default" className="text-[11px] font-medium">
            {twoFactorData ? "2-Factor Verification" : "Secure Sign In"}
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-bold tracking-tight">
          {twoFactorData ? "Two-Factor Authentication" : "Welcome back"}
        </CardTitle>
        <CardDescription className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {twoFactorData
            ? useRecoveryCode
              ? "Enter one of your 8-character emergency backup recovery codes."
              : `Enter the 6-digit verification code from your ${twoFactorData.type === "EmailOtp" ? "email" : "authenticator app"}.`
            : "Sign in to view your accounts, budgets, and financial records."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {twoFactorData ? (
          <form onSubmit={handleVerify2Fa} className="space-y-4">
            {verify2FaMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">Verification Failed</AlertTitle>
                <AlertDescription className="text-xs">
                  {verify2FaMutation.error instanceof Error
                    ? verify2FaMutation.error.message
                    : "Invalid authentication code. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="twoFactorCode" className="text-xs font-medium">
                {useRecoveryCode ? "Backup Recovery Code" : "6-Digit Security Code"}
              </Label>
              <div className="relative">
                <Input
                  id="twoFactorCode"
                  type="text"
                  maxLength={useRecoveryCode ? 16 : 6}
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(
                      useRecoveryCode
                        ? e.target.value.toUpperCase()
                        : e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                  placeholder={useRecoveryCode ? "XXXX-XXXX" : "123456"}
                  autoFocus
                  required
                  className="h-11 text-center font-mono text-lg tracking-widest pl-9"
                />
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={verify2FaMutation.isPending || !twoFactorCode.trim()}
            >
              {verify2FaMutation.isPending ? "Verifying…" : "Authenticate & Continue"}
            </Button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode((prev) => !prev);
                  setTwoFactorCode("");
                }}
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {useRecoveryCode ? "Use Authenticator app code" : "Use a backup recovery code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorData(null);
                  setTwoFactorCode("");
                }}
                className="text-[var(--muted-foreground)] hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {loginMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">Authentication Failed</AlertTitle>
                <AlertDescription className="text-xs">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : "Sign in failed. Please check your credentials."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@vaultz.local"
                autoComplete="email"
                {...register("email")}
                className="h-10 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className="h-10 text-sm pl-9"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in…" : "Sign In"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full h-9 text-xs"
                onClick={fillDemoCredentials}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-[var(--accent)]" />
                Fill Demo Credentials (demo@vaultz.local)
              </Button>
            </div>

            <p className="text-center text-xs text-[var(--muted-foreground)] pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Create an account
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
