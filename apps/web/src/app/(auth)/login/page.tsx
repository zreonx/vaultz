"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { useLoginMutation } from "@/hooks/use-auth";
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    await loginMutation.mutateAsync(values);
    const redirectParam = searchParams.get("redirect");
    const target =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";
    window.location.href = target;
  };

  const fillDemoCredentials = () => {
    setValue("email", "demo@vaultz.local");
    setValue("password", "Password123");
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
          <Badge variant="default">Secure Sign In</Badge>
        </div>
        <CardTitle className="pt-2 text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to view your accounts, budgets, and savings goals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {loginMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : "Sign in failed. Please check your credentials."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="demo@vaultz.local"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[var(--danger)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-[var(--danger)]">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={fillDemoCredentials}
            >
              Fill Demo Credentials (demo@vaultz.local)
            </Button>
          </div>

          <p className="text-center text-xs text-[var(--muted-foreground)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
