import {
  Calendar,
  History,
  Info,
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
  minimumRole?: UserRole;
  public?: boolean;
};

export const appNavItems: AppNavItem[] = [
  {
    to: "/",
    icon: Calendar,
    label: "Classes",
    public: true,
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
  },
  {
    to: "/email",
    icon: Mail,
    label: "Email",
    minimumRole: "developer",
  },
  {
    to: "/events",
    icon: History,
    label: "Events",
    minimumRole: "developer",
  },
  {
    to: "/users",
    icon: Users,
    label: "Users",
    minimumRole: "admin",
  },
  {
    to: "/config",
    icon: Settings,
    label: "Config",
    minimumRole: "developer",
  },
  {
    to: "/about",
    icon: Info,
    label: "About",
    public: true,
  },
];

export const getVisibleNavItems = (
  effectiveRole: UserRole | null
): AppNavItem[] => {
  if (!effectiveRole) return appNavItems.filter((item) => item.public === true);

  return appNavItems.filter((item) => {
    if (!item.minimumRole) return true;
    return canAssumeRole(effectiveRole, item.minimumRole);
  });
};
