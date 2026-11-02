import { PrivateRouteGuard } from "@/components/auth/private-route-guard";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/context/workspace-context";
import { TutorialProvider } from "@/context/tutorial-context";
import { SpotlightTour } from "@/components/tutorial/spotlight-tour";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivateRouteGuard>
      <WorkspaceProvider>
        <TutorialProvider>
          <SpotlightTour />
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </TutorialProvider>
      </WorkspaceProvider>
    </PrivateRouteGuard>
  );
}
