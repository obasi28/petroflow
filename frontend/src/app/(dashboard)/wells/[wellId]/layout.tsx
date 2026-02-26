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

  const currentTab = pathname.includes("/material-balance")
    ? "material-balance"
    : pathname.includes("/well-test")
      ? "well-test"
      : pathname.includes("/production")
        ? "production"
        : pathname.includes("/dca")
          ? "dca"
          : pathname.includes("/pvt")
            ? "pvt"
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

  const tabs = [
    { value: "overview", label: "Overview", href: `/wells/${wellId}` },
    { value: "production", label: "Production", href: `/wells/${wellId}/production` },
    { value: "dca", label: "DCA Analysis", href: `/wells/${wellId}/dca` },
    { value: "pvt", label: "PVT", href: `/wells/${wellId}/pvt` },
    { value: "material-balance", label: "Material Balance", href: `/wells/${wellId}/material-balance` },
    { value: "well-test", label: "Well Test", href: `/wells/${wellId}/well-test` },
    { value: "import", label: "Import Data", href: `/wells/${wellId}/import` },
  ];

  return (
    <div className="space-y-6">
      <WellHeader well={well} />

      <Tabs value={currentTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
