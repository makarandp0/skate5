import { Calendar, Settings, User, type LucideIcon } from "lucide-react";

export type AppNavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  showInTopNav: boolean;
  showInBottomNav: boolean;
};

export const appNavItems: AppNavItem[] = [
  {
    to: "/",
    icon: Calendar,
    label: "Classes",
    showInTopNav: true,
    showInBottomNav: true,
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
    showInTopNav: true,
    showInBottomNav: true,
  },
  {
    to: "/config",
    icon: Settings,
    label: "Config",
    showInTopNav: false,
    showInBottomNav: false,
  },
];
