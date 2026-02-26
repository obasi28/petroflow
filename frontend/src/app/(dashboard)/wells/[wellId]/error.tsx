"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

export default function WellDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} onRetry={reset} title="Failed to load well data" />;
}
