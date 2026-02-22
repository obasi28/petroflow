import {
  LayoutDashboard,
  Droplets,
  FolderKanban,
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
    title: "Wells",
    href: "/wells",
    icon: Droplets,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
