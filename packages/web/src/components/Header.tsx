import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import {
  getRoleLabel,
  userRoleSchema,
  type UserRole,
} from "@skate5/shared";
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
  const { profile, availableRoles, setEffectiveRole, logOut } = useAuth();
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
          showInTopNav: false,
          showInBottomNav: false,
        },
      ];
  const showRoleSwitcher = profile && availableRoles.length > 1;

  const handleRoleChange = (value: string): void => {
    const parsedRole = userRoleSchema.safeParse(value);
    if (!parsedRole.success) return;
    void setEffectiveRole(parsedRole.data);
  };

  const roleSelect = (className: string) => {
    if (!profile || !showRoleSwitcher) return null;

    return (
      <label className={className}>
        <ShieldCheck size={15} className="shrink-0 text-primary" />
        <span className="sr-only">View app as</span>
        <select
          value={profile.role}
          onChange={(event) => {
            handleRoleChange(event.currentTarget.value);
          }}
          className="min-w-0 bg-transparent text-xs font-medium outline-none"
        >
          {availableRoles.map((role: UserRole) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
    );
  };

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

        <nav className="hidden items-center gap-1 rounded-lg border border-border/70 bg-background/60 p-1 sm:flex">
          {visibleNavItems
            .filter((item) => item.showInTopNav)
            .map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
        </nav>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          {roleSelect(
            "hidden h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-background/70 px-2 text-muted-foreground shadow-sm sm:flex"
          )}
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
          {profile && (
            <Link
              to="/profile"
              className="rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="absolute right-0 top-11 w-72 overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-xl shadow-slate-900/10 backdrop-blur dark:shadow-black/30"
            >
              {profile && (
                <div className="border-b border-border/80 bg-muted/40 px-3 py-2.5">
                  <p className="truncate text-sm font-medium">
                    {profile.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                  {profile.actualRole !== profile.role && (
                    <p className="mt-1 text-xs font-medium text-primary">
                      {getRoleLabel(profile.actualRole)} viewing as{" "}
                      {getRoleLabel(profile.role)}
                    </p>
                  )}
                </div>
              )}
              {roleSelect(
                "mx-3 mt-3 flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2 text-muted-foreground sm:hidden"
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
                        "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/80",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
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
