"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";

export function PrivateRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && (!user || isError)) {
      const target =
        pathname && pathname !== "/dashboard"
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login";
      router.replace(target);
    }
  }, [isLoading, user, isError, pathname, router]);

  if (isLoading || !user) {
    return null;
  }

  return <>{children}</>;
}
