import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { cn } from "../lib/utils.js";
import { useAuth } from "../hooks/useAuth.js";
import { appNavItems, type AppNavItem } from "../lib/navigation.js";
import { Avatar } from "./ui/Avatar.js";
import { Button } from "./ui/Button.js";

export function Header() {
  const { profile, logOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;

      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const visibleNavItems = profile
    ? appNavItems
    : appNavItems.filter((item) => item.to === "/");
  const menuNavItems: AppNavItem[] = profile
    ? appNavItems
    : [
        ...visibleNavItems,
        {
          to: "/login",
          icon: LogIn,
          label: "Sign in",
          showInTopNav: false,
          showInBottomNav: false,
        },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold">
          Skate5
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {visibleNavItems
            .filter((item) => item.showInTopNav)
            .map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "text-sm transition-colors",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
        </nav>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          {profile && (
            <Link
              to="/profile"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open profile"
            >
              <Avatar
                src={profile.photoUrl}
                name={profile.displayName}
                className="h-8 w-8"
              />
            </Link>
          )}
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
            className="h-9 w-9"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          {menuOpen && (
            <div
              id="app-menu"
              role="menu"
              className="absolute right-0 top-11 w-56 overflow-hidden rounded-md border border-border bg-background shadow-lg"
            >
              {profile && (
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-medium">
                    {profile.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              )}
              <div className="py-1">
                {menuNavItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    role="menuitem"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted",
                        isActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
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
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
}
