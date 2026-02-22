"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useWell } from "@/hooks/use-wells";
import { WellHeader } from "@/components/wells/well-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function WellDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const wellId = params.wellId as string;
  const { data, isLoading } = useWell(wellId);
  const well = data?.data;

  const currentTab = pathname.includes("/production")
    ? "production"
    : pathname.includes("/dca")
      ? "dca"
      : pathname.includes("/import")
        ? "import"
        : "overview";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!well) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Well not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WellHeader well={well} />

      <Tabs value={currentTab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href={`/wells/${wellId}`}>Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="production" asChild>
            <Link href={`/wells/${wellId}/production`}>Production</Link>
          </TabsTrigger>
          <TabsTrigger value="dca" asChild>
            <Link href={`/wells/${wellId}/dca`}>DCA Analysis</Link>
          </TabsTrigger>
          <TabsTrigger value="import" asChild>
            <Link href={`/wells/${wellId}/import`}>Import Data</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
