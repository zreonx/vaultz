"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useResetPasswordMutation } from "@/hooks/use-auth";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const initialToken = searchParams.get("token") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetPasswordMutation = useResetPasswordMutation();

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = hasMinLength && hasLetter && hasNumber && passwordsMatch && token.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !email.trim()) return;

    resetPasswordMutation.mutate(
      {
        email: email.trim(),
        token: token.trim(),
        newPassword,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
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
            Set New Password
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-bold tracking-tight">
          Create new password
        </CardTitle>
        <CardDescription className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Enter the 6-digit code sent to your email and select a strong new password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {success && (
          <Alert variant="default" className="border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="font-semibold">Password Successfully Reset</AlertTitle>
            <AlertDescription className="text-xs">
              Your password has been changed. Old sessions have been invalidated. Redirecting to dashboard…
            </AlertDescription>
          </Alert>
        )}

        {resetPasswordMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Reset Failed</AlertTitle>
            <AlertDescription className="text-xs">
              {resetPasswordMutation.error instanceof Error
                ? resetPasswordMutation.error.message
                : "Invalid or expired reset code."}
            </AlertDescription>
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-10 text-sm pl-9"
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-token" className="text-xs font-medium">
                6-Digit Recovery Code
              </Label>
              <Input
                id="reset-token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="h-11 text-center font-mono text-lg tracking-widest"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reset-new-password" className="text-xs font-medium">
                  New Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-foreground inline-flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  className="h-10 text-sm pl-9"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm-password" className="text-xs font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                  className="h-10 text-sm pl-9"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-3 text-xs">
              <div className="mb-2 font-medium text-[var(--muted-foreground)]">Requirements</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={hasMinLength ? "default" : "neutral"} className="text-[10px]">
                  {hasMinLength ? "✓" : "•"} 8+ chars
                </Badge>
                <Badge variant={hasLetter ? "default" : "neutral"} className="text-[10px]">
                  {hasLetter ? "✓" : "•"} 1+ letter
                </Badge>
                <Badge variant={hasNumber ? "default" : "neutral"} className="text-[10px]">
                  {hasNumber ? "✓" : "•"} 1+ number
                </Badge>
                <Badge variant={passwordsMatch ? "default" : "neutral"} className="text-[10px]">
                  {passwordsMatch ? "✓" : "•"} Passwords match
                </Badge>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={resetPasswordMutation.isPending || !isValid}
            >
              {resetPasswordMutation.isPending ? "Resetting Password…" : "Reset Password & Sign In"}
            </Button>

            <div className="text-center pt-1">
              <Link
                href="/login"
                className="text-xs text-[var(--muted-foreground)] hover:text-foreground inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
