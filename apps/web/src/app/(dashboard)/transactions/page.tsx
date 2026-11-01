import { Suspense } from "react";
import { TransactionsFeatureView } from "@/features/transactions";

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsFeatureView />
    </Suspense>
  );
}
