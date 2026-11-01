import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicOnlyGuard } from "@/components/auth/public-only-guard";
import { Button } from "@/components/ui/button";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <PublicOnlyGuard>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-6">
          <div className="w-full max-w-md space-y-4">
            <div>
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Home
                </Link>
              </Button>
            </div>
            {children}
          </div>
        </div>
      </PublicOnlyGuard>
    </Suspense>
  );
}
