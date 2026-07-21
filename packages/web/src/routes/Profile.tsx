import { Navigate } from "react-router-dom";
import { getRoleLabel, userRoleSchema } from "@skate5/shared";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { Avatar } from "../components/ui/Avatar.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";

export const Profile = () => {
  const { profile, loading, availableRoles, setEffectiveRole, logOut } =
    useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;

  const canChooseEffectiveRole =
    profile.actualRole === "admin" || profile.actualRole === "developer";
  const showRoleSwitcher = canChooseEffectiveRole && availableRoles.length > 1;

  const handleRoleChange = (value: string): void => {
    const parsedRole = userRoleSchema.safeParse(value);
    if (!parsedRole.success) return;
    void setEffectiveRole(parsedRole.data);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <UserRound size={13} />
          Account
        </div>
        <h1 className="text-2xl font-black">Profile</h1>
      </div>

      <Card className="flex items-center gap-4 overflow-hidden">
        <Avatar
          src={profile.photoUrl}
          name={profile.displayName}
          className="h-16 w-16 text-xl ring-4 ring-primary/10"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{profile.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-3 rounded-md bg-muted/70 px-3 py-2">
          <Mail size={16} className="text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Email
            </p>
            <p className="truncate text-sm">{profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md bg-accent/10 px-3 py-2">
          <ShieldCheck size={16} className="text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Access
            </p>
            {showRoleSwitcher ? (
              <label className="mt-1 block">
                <span className="sr-only">View app as</span>
                <select
                  value={profile.role}
                  onChange={(event) => {
                    handleRoleChange(event.currentTarget.value);
                  }}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm">{getRoleLabel(profile.role)}</p>
            )}
            {profile.actualRole !== profile.role && (
              <p className="mt-1 text-xs text-muted-foreground">
                Account role: {getRoleLabel(profile.actualRole)}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Button
        variant="outline"
        onClick={() => void logOut()}
        className="w-full"
      >
        <LogOut size={16} />
        Sign out
      </Button>
    </div>
  );
};
