import { NavLink } from "react-router-dom";
import { Calendar, User } from "lucide-react";
import { cn } from "../lib/utils.js";

const links = [
  { to: "/", icon: Calendar, label: "Classes" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background sm:hidden">
      <div className="flex h-14">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
