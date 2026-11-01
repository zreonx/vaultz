import { Suspense } from "react";
import { SettingsFeature } from "@/features/settings";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsFeature />
    </Suspense>
  );
}
