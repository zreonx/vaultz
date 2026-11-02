"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useResendVerificationMutation, useVerifyEmailMutation } from "@/hooks/use-auth";
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

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const initialCode = searchParams.get("code") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const [, startTransition] = useTransition();

  // Auto-verify if code and email are provided in URL query parameters
  useEffect(() => {
    if (initialEmail && initialCode && initialCode.length === 6 && !success) {
      verifyMutation.mutate(
        { email: initialEmail, code: initialCode },
        {
          onSuccess: () => {
            setSuccess(true);
            setTimeout(() => {
              startTransition(() => {
                router.push("/dashboard");
              });
            }, 1500);
          },
        }
      );
    }
  }, [initialEmail, initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;

    verifyMutation.mutate(
      { email: email.trim(), code: code.trim() },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            startTransition(() => {
              router.push("/dashboard");
            });
          }, 1500);
        },
      }
    );
  };

  const handleResend = () => {
    if (!email.trim() || cooldown > 0 || resendMutation.isPending) return;

    resendMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setCooldown(60);
          setResendStatus("A new verification code has been dispatched to your email.");
        },
        onError: (err) => {
          setResendStatus(err instanceof Error ? err.message : "Failed to send verification email.");
        },
      }
    );
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
            Email Verification
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-bold tracking-tight">
          Verify your email address
        </CardTitle>
        <CardDescription className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          We sent a 6-digit confirmation code to your email. Enter it below to unlock all security features.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {success && (
          <Alert variant="default" className="border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="font-semibold">Email Verified!</AlertTitle>
            <AlertDescription className="text-xs">
              Your email has been successfully confirmed. Redirecting you to your dashboard…
            </AlertDescription>
          </Alert>
        )}

        {verifyMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Verification Failed</AlertTitle>
            <AlertDescription className="text-xs">
              {verifyMutation.error instanceof Error
                ? verifyMutation.error.message
                : "Invalid or expired verification code."}
            </AlertDescription>
          </Alert>
        )}

        {resendStatus && (
          <Alert variant="muted" className="text-xs">
            <Mail className="h-4 w-4 text-[var(--accent)]" />
            <AlertDescription>{resendStatus}</AlertDescription>
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="verify-email" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="verify-code" className="text-xs font-medium">
                  6-Digit Verification Code
                </Label>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  Expires in 15 mins
                </span>
              </div>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="h-12 text-center text-xl font-mono tracking-widest"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={verifyMutation.isPending || code.length < 6}
            >
              {verifyMutation.isPending ? "Verifying…" : "Confirm Email Address"}
            </Button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resendMutation.isPending}
                className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)] hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>

              <Link
                href="/dashboard"
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                Go to Dashboard
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
