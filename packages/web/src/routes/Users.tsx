import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  getRoleLabel,
  manageableUserRoleSchema,
  type ManagedUser,
  type ManageableUserRole,
  type UserRole,
} from "@skate5/shared";
import { Avatar } from "../components/ui/Avatar.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn } from "../lib/utils.js";

const editableRoles: ManageableUserRole[] = ["member", "instructor", "admin"];

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "Never";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Could not update users.";
};

const getRoleClassName = (role: UserRole): string => {
  switch (role) {
    case "developer":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200";
    case "admin":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200";
    case "instructor":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "member":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200";
    default:
      role satisfies never;
      return role;
  }
};

const getRoleOptions = (role: UserRole): UserRole[] => {
  if (role === "developer") return ["developer"];
  return editableRoles;
};

const getManageableRole = (role: UserRole): ManageableUserRole | null => {
  const parsedRole = manageableUserRoleSchema.safeParse(role);
  return parsedRole.success ? parsedRole.data : null;
};

const RoleChangeControl = ({
  user,
  disabled,
  lockedLabel,
  draftRole,
  editing,
  saving,
  onBegin,
  onCancel,
  onDraftRoleChange,
  onSave,
}: {
  user: ManagedUser;
  disabled: boolean;
  lockedLabel: string | null;
  draftRole: ManageableUserRole;
  editing: boolean;
  saving: boolean;
  onBegin: () => void;
  onCancel: () => void;
  onDraftRoleChange: (role: ManageableUserRole) => void;
  onSave: () => void;
}) => {
  if (lockedLabel) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {lockedLabel}
      </span>
    );
  }

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onBegin}
      >
        <Pencil size={14} />
        Change
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={draftRole}
        disabled={saving}
        aria-label={`New role for ${user.displayName}`}
        onChange={(event) => {
          const parsedRole = manageableUserRoleSchema.safeParse(
            event.currentTarget.value
          );
          if (!parsedRole.success) return;
          onDraftRoleChange(parsedRole.data);
        }}
        className="h-9 w-full min-w-32 rounded-md border border-border bg-background/80 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:w-36"
      >
        {getRoleOptions(user.role).map((role) => (
          <option key={role} value={role}>
            {getRoleLabel(role)}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={saving || draftRole === user.role}
      >
        {saving ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Check size={14} />
        )}
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Cancel role change for ${user.displayName}`}
        onClick={onCancel}
        disabled={saving}
        className="h-8 w-8"
      >
        <X size={15} />
      </Button>
    </div>
  );
};

export const Users = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<ManageableUserRole>("member");

  const loadUsers = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setSavedUserId(null);
    setEditingUserId(null);

    try {
      setUsers(await api.getUsers());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      return (
        user.displayName.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.role.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, users]);

  const updateRole = async (
    user: ManagedUser,
    role: ManageableUserRole
  ): Promise<void> => {
    if (role === user.role || savingUserId) return;

    setSavingUserId(user.id);
    setError(null);
    setSavedUserId(null);

    try {
      const updatedUser = await api.updateUserRole({
        params: { id: user.id },
        body: { role },
      });
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser
        )
      );
      setEditingUserId(null);
      setSavedUserId(updatedUser.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingUserId(null);
    }
  };

  const beginRoleChange = (user: ManagedUser): void => {
    const manageableRole = getManageableRole(user.role);
    if (!manageableRole) return;

    setError(null);
    setSavedUserId(null);
    setEditingUserId(user.id);
    setDraftRole(manageableRole);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage account access for the Skate5 crew.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadUsers();
          }}
          disabled={loading}
          className="self-start sm:self-auto"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {savedUserId && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <p>Role updated.</p>
        </div>
      )}

      <Card className="space-y-4">
        <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-background/80 px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
          <Search size={16} className="shrink-0" />
          <span className="sr-only">Search users</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
            placeholder="Search users"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">User</th>
                <th className="px-3 pb-2 font-semibold">Current</th>
                <th className="px-3 pb-2 font-semibold">Role</th>
                <th className="px-3 pb-2 text-right font-semibold">
                  Last login
                </th>
                <th className="pb-2 pl-3 text-right font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const disabled =
                  savingUserId !== null && savingUserId !== user.id;
                const lockedLabel =
                  user.id === profile?.id
                    ? "Current user"
                    : user.role === "developer"
                      ? "Locked"
                      : null;
                const saving = savingUserId === user.id;
                const editing = editingUserId === user.id;

                return (
                  <tr key={user.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex min-w-56 items-center gap-3">
                        <Avatar
                          src={user.photoUrl}
                          name={user.displayName}
                          className="h-9 w-9"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.displayName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          getRoleClassName(user.role)
                        )}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <RoleChangeControl
                        user={user}
                        disabled={disabled}
                        lockedLabel={lockedLabel}
                        draftRole={draftRole}
                        editing={editing}
                        saving={saving}
                        onBegin={() => {
                          beginRoleChange(user);
                        }}
                        onCancel={() => {
                          setEditingUserId(null);
                        }}
                        onDraftRoleChange={setDraftRole}
                        onSave={() => {
                          void updateRole(user, draftRole);
                        }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="py-3 pl-3 text-right text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:hidden">
          {filteredUsers.map((user) => {
            const disabled =
              savingUserId !== null && savingUserId !== user.id;
            const lockedLabel =
              user.id === profile?.id
                ? "Current user"
                : user.role === "developer"
                  ? "Locked"
                  : null;
            const saving = savingUserId === user.id;
            const editing = editingUserId === user.id;

            return (
              <div
                key={user.id}
                className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={user.photoUrl}
                    name={user.displayName}
                    className="h-10 w-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                      getRoleClassName(user.role)
                    )}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <RoleChangeControl
                    user={user}
                    disabled={disabled}
                    lockedLabel={lockedLabel}
                    draftRole={draftRole}
                    editing={editing}
                    saving={saving}
                    onBegin={() => {
                      beginRoleChange(user);
                    }}
                    onCancel={() => {
                      setEditingUserId(null);
                    }}
                    onDraftRoleChange={setDraftRole}
                    onSave={() => {
                      void updateRole(user, draftRole);
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last login {formatDateTime(user.lastLoginAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Joined {formatDate(user.createdAt)}
                </p>
              </div>
            );
          })}
        </div>

        {!loading && filteredUsers.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            No users found.
          </p>
        )}

        {loading && (
          <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            Loading users...
          </p>
        )}
      </Card>
    </div>
  );
};
