"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";

export function PublicOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !user) return;

    // If user is unverified and on /verify-email, let them stay and complete verification
    if (pathname === "/verify-email" && !user.isEmailVerified) {
      return;
    }

    const redirectParam = searchParams.get("redirect");
    const safeRedirect =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";
    router.replace(safeRedirect);
  }, [isLoading, user, router, searchParams, pathname]);

  return <>{children}</>;
}
