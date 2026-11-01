"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
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
    window.location.href = "/onboarding";
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarFallback className="rounded-lg bg-[var(--accent)] text-xs text-[var(--accent-foreground)]">
                V
              </AvatarFallback>
            </Avatar>
            Vaultz
          </Link>
          <Badge variant="default">Free Account</Badge>
        </div>
        <CardTitle className="pt-2 text-xl">Create your Vaultz account</CardTitle>
        <CardDescription>
          Sign up to get started. You can configure your preferred currency and first account in the next step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {registerMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : "Registration failed. Please verify your details."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Alex Morgan"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-[var(--danger)]">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="alex@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[var(--danger)]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 chars + letters and digit"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-[var(--danger)]">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Creating account…" : "Continue to Setup"}
          </Button>

          <p className="text-center text-xs text-[var(--muted-foreground)]">
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
