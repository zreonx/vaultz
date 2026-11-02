"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronLeft, Mail } from "lucide-react";
import { useForgotPasswordMutation } from "@/hooks/use-auth";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useForgotPasswordMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setSubmitted(true);
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
            Account Recovery
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-bold tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Enter the email address associated with your Vaultz account and we’ll send you a password reset code.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {forgotPasswordMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Request Failed</AlertTitle>
            <AlertDescription className="text-xs">
              {forgotPasswordMutation.error instanceof Error
                ? forgotPasswordMutation.error.message
                : "Unable to process password reset request."}
            </AlertDescription>
          </Alert>
        )}

        {submitted ? (
          <div className="space-y-4">
            <Alert variant="default" className="border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="font-semibold">Reset Code Dispatched</AlertTitle>
              <AlertDescription className="text-xs">
                If an account exists with <strong>{email}</strong>, a single-use 6-digit recovery code has been sent. It expires in 15 minutes.
              </AlertDescription>
            </Alert>

            <Button asChild className="w-full h-10 font-medium">
              <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                Enter Reset Code
              </Link>
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-[var(--muted-foreground)] hover:text-foreground inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="h-10 text-sm pl-9"
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={forgotPasswordMutation.isPending || !email.trim()}
            >
              {forgotPasswordMutation.isPending ? "Sending code…" : "Send Reset Code"}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-[var(--muted-foreground)] hover:text-foreground inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
