import {
  LayoutDashboard,
  Droplets,
  FolderKanban,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const siteConfig = {
  name: "PetroFlow",
  description: "Professional reservoir engineering analysis platform",
  version: "0.1.0",
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Wells",
    href: "/wells",
    icon: Droplets,
  },
  {
    title: "Multi-Well Analysis",
    href: "/analysis",
    icon: BarChart3,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
