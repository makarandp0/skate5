import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils.js";
import { appNavItems } from "../lib/navigation.js";

const links = appNavItems.filter((item) => item.showInBottomNav);

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background sm:hidden">
      <div className="flex h-14">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
                isActive
                  ? "text-primary font-medium"
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
