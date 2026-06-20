import { Link, NavLink } from "react-router-dom";
import { cn } from "../lib/utils.js";
import { useAuth } from "../hooks/useAuth.js";
import { Avatar } from "./ui/Avatar.js";

export function Header() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold">
          Skate5
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "text-sm transition-colors",
                isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            Classes
          </NavLink>
          {profile && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  "text-sm transition-colors",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              Profile
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {profile && (
            <Link to="/profile">
              <Avatar
                src={profile.photoUrl}
                name={profile.displayName}
                className="h-8 w-8"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
