import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Repeat,
  BarChart3,
  Settings,
  Rocket,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Shared between the desktop sidebar and the mobile sheet nav — one source
// of truth for the 7 sections from the product spec.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/savings", label: "Épargne", icon: Target },
  { href: "/projects", label: "Projets", icon: Rocket },
  { href: "/subscriptions", label: "Abonnements", icon: Repeat },
  { href: "/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/settings", label: "Paramètres", icon: Settings },
];
