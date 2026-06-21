import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils.js";
import { appNavItems } from "../lib/navigation.js";

const links = appNavItems.filter((item) => item.showInBottomNav);

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/90 backdrop-blur-xl sm:hidden">
      <div className="flex h-16 px-2 py-1.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted/60"
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
};
