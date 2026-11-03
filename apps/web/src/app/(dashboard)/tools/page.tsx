import type { Metadata } from "next";
import { ToolsFeatureView } from "@/features/tools";

export const metadata: Metadata = {
  title: "Calculators & Tools | Vaultz",
  description:
    "Financial calculators, real-time currency conversion, loan repayment and compound savings projector.",
};

export default function ToolsPage() {
  return <ToolsFeatureView />;
}
