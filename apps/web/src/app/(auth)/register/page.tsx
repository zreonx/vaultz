"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Lock, Mail, User } from "lucide-react";
import { useRegisterMutation } from "@/hooks/use-auth";
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

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters with letters and digits")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    await registerMutation.mutateAsync({
      ...values,
      defaultCurrencyCode: "USD",
    });
    // Direct user to verify their email address via the 6-digit OTP sent by Resend
    window.location.href = `/verify-email?email=${encodeURIComponent(values.email)}`;
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
            Free Account
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-bold tracking-tight">
          Create your Vaultz account
        </CardTitle>
        <CardDescription className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Sign up to get started. A 6-digit confirmation code will be sent to verify your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {registerMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Registration Failed</AlertTitle>
              <AlertDescription className="text-xs">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : "Registration failed. Please verify your details."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-medium">
              Full Name
            </Label>
            <div className="relative">
              <Input
                id="fullName"
                placeholder="Alex Morgan"
                {...register("fullName")}
                className="h-10 text-sm pl-9"
              />
              <User className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
            {errors.fullName && (
              <p className="text-xs text-[var(--danger)]">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="alex@example.com"
                autoComplete="email"
                {...register("email")}
                className="h-10 text-sm pl-9"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
            {errors.email && (
              <p className="text-xs text-[var(--danger)]">
                {errors.email.message}
              </p>
            )}
            <p className="text-[11px] text-[var(--muted-foreground)]">
              This email will be permanently locked to your account for security.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
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

          <Button
            type="submit"
            className="w-full h-10 font-medium"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Creating Account…" : "Create Account & Verify"}
          </Button>

          <p className="text-center text-xs text-[var(--muted-foreground)] pt-2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
