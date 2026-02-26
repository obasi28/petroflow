"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorFallbackProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
}

export function ErrorFallback({
  error,
  onRetry,
  title = "Something went wrong",
}: ErrorFallbackProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        {onRetry && (
          <Button className="mt-6" variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
