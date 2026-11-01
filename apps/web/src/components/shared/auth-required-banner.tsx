"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthRequiredBanner({ featureName }: { featureName: string }) {
  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]">
      <CardHeader className="space-y-2">
        <Avatar className="h-9 w-9 rounded-xl">
          <AvatarFallback className="rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Lock className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <CardTitle>Sign in to access {featureName}</CardTitle>
        <CardDescription>
          Your financial information is private to your personal profile. Sign
          in or create an account to manage your {featureName.toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/register">Create Free Account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign In</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
