"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";

export function PublicOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && user) {
      const redirectParam = searchParams.get("redirect");
      const safeRedirect =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : "/dashboard";
      router.replace(safeRedirect);
    }
  }, [isLoading, user, router, searchParams]);

  return <>{children}</>;
}
