import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "../lib/utils.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  getVisibleNavItems,
  type AppNavItem,
} from "../lib/navigation.js";
import { Avatar } from "./ui/Avatar.js";
import { Button } from "./ui/Button.js";
import { useTheme } from "../hooks/useTheme.js";
import skateJourneysIcon from "../assets/skate-journeys-icon.jpg";

export const Header = () => {
  const { profile, logOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node)) return;

      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const visibleNavItems = getVisibleNavItems(profile?.role ?? null);
  const menuNavItems: AppNavItem[] = profile
    ? visibleNavItems
    : [
        ...visibleNavItems,
        {
          to: "/login",
          icon: LogIn,
          label: "Sign in",
        },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          to="/"
          className="group flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-white p-1 shadow-sm shadow-slate-900/10"
          >
            <img
              src={skateJourneysIcon}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
          <span className="leading-none">
            <span className="block text-base font-bold">Skate5</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">
              Class crew
            </span>
          </span>
        </Link>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className={cn(
              "h-9 w-9",
              profile &&
                "rounded-full p-0 ring-2 ring-background hover:bg-transparent"
            )}
          >
            {profile ? (
              <Avatar
                src={profile.photoUrl}
                name={profile.displayName}
                className={cn(
                  "h-8 w-8",
                  menuOpen && "ring-2 ring-primary/50"
                )}
              />
            ) : menuOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </Button>

          {menuOpen && (
            <div
              id="app-menu"
              role="menu"
              className="absolute right-0 top-11 w-72 overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-xl shadow-slate-900/10 backdrop-blur dark:shadow-black/30"
            >
              <div className="py-1">
                {menuNavItems.map(({ to, icon: Icon, label, minimumRole }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    role="menuitem"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/80",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {minimumRole === "developer" && (
                      <span className="ml-auto rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Dev
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
              {profile && (
                <div className="border-t border-border py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void logOut();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
