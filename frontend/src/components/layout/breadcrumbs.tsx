"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  wells: "Wells",
  projects: "Projects",
  settings: "Settings",
  new: "New",
  production: "Production",
  dca: "DCA Analysis",
  import: "Import Data",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter((s) => s && !s.startsWith("("));

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = LABEL_MAP[segment] || decodeURIComponent(segment);

        return (
          <Fragment key={href}>
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
