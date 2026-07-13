import {
  Calendar,
  Mail,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canAssumeRole, type UserRole } from "@skate5/shared";

export type AppNavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  showInTopNav: boolean;
  showInBottomNav: boolean;
  minimumRole?: UserRole;
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
    to: "/email",
    icon: Mail,
    label: "Email",
    showInTopNav: true,
    showInBottomNav: false,
    minimumRole: "admin",
  },
  {
    to: "/users",
    icon: Users,
    label: "Users",
    showInTopNav: true,
    showInBottomNav: false,
    minimumRole: "admin",
  },
  {
    to: "/config",
    icon: Settings,
    label: "Config",
    showInTopNav: false,
    showInBottomNav: false,
    minimumRole: "developer",
  },
];

export const getVisibleNavItems = (
  effectiveRole: UserRole | null
): AppNavItem[] => {
  if (!effectiveRole) return appNavItems.filter((item) => item.to === "/");

  return appNavItems.filter((item) => {
    if (!item.minimumRole) return true;
    return canAssumeRole(effectiveRole, item.minimumRole);
  });
};
