import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
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
  type UpdateUserInput,
  type UserRole,
} from "@skate5/shared";
import { Avatar } from "../components/ui/Avatar.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { cn } from "../lib/utils.js";

const editableRoles: ManageableUserRole[] = ["member", "instructor", "admin"];

type DraftUserChange = {
  displayName: string;
  photoUrl: string;
  role: ManageableUserRole | null;
};

type UserSortKey = "lastLoginAt" | "createdAt";
type SortDirection = "asc" | "desc";

type UserSort = {
  key: UserSortKey | null;
  direction: SortDirection;
};

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

const getRoleOptions = (role: UserRole): ManageableUserRole[] => {
  if (role === "developer") return [];
  return editableRoles;
};

const getManageableRole = (role: UserRole): ManageableUserRole | null => {
  const parsedRole = manageableUserRoleSchema.safeParse(role);
  return parsedRole.success ? parsedRole.data : null;
};

const getNormalizedPhotoUrl = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const compareUsersByIdentity = (
  leftUser: ManagedUser,
  rightUser: ManagedUser
): number => {
  const displayNameComparison = leftUser.displayName.localeCompare(
    rightUser.displayName,
    undefined,
    { sensitivity: "base" }
  );
  if (displayNameComparison !== 0) return displayNameComparison;

  return leftUser.email.localeCompare(rightUser.email, undefined, {
    sensitivity: "base",
  });
};

const compareUsersByDate = (
  leftUser: ManagedUser,
  rightUser: ManagedUser,
  key: UserSortKey,
  direction: SortDirection
): number => {
  const leftValue = leftUser[key];
  const rightValue = rightUser[key];

  if (leftValue === null && rightValue === null) {
    return compareUsersByIdentity(leftUser, rightUser);
  }

  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  const leftTimestamp = new Date(leftValue).getTime();
  const rightTimestamp = new Date(rightValue).getTime();

  if (leftTimestamp === rightTimestamp) {
    return compareUsersByIdentity(leftUser, rightUser);
  }

  return direction === "asc"
    ? leftTimestamp - rightTimestamp
    : rightTimestamp - leftTimestamp;
};

const getNextSort = (
  currentSort: UserSort,
  nextKey: UserSortKey
): UserSort => {
  if (currentSort.key !== nextKey) {
    return { key: nextKey, direction: "desc" };
  }

  if (currentSort.direction === "desc") {
    return { key: nextKey, direction: "asc" };
  }

  return { key: null, direction: "desc" };
};

const getSortSelectValue = (sort: UserSort): string => {
  if (sort.key === null) return "default";
  return `${sort.key}:${sort.direction}`;
};

const parseSortSelectValue = (value: string): UserSort => {
  switch (value) {
    case "default":
      return { key: null, direction: "desc" };
    case "lastLoginAt:desc":
      return { key: "lastLoginAt", direction: "desc" };
    case "lastLoginAt:asc":
      return { key: "lastLoginAt", direction: "asc" };
    case "createdAt:desc":
      return { key: "createdAt", direction: "desc" };
    case "createdAt:asc":
      return { key: "createdAt", direction: "asc" };
    default:
      return { key: null, direction: "desc" };
  }
};

const getUserUpdateInput = (
  user: ManagedUser,
  draft: DraftUserChange
): UpdateUserInput | null => {
  const body: UpdateUserInput = {};
  const displayName = draft.displayName.trim();
  const photoUrl = getNormalizedPhotoUrl(draft.photoUrl);

  if (displayName !== user.displayName) {
    body.displayName = displayName;
  }

  if (photoUrl !== user.photoUrl) {
    body.photoUrl = photoUrl;
  }

  if (draft.role !== null && draft.role !== user.role) {
    body.role = draft.role;
  }

  return body.displayName !== undefined ||
    body.photoUrl !== undefined ||
    body.role !== undefined
    ? body
    : null;
};

const UserEditForm = ({
  user,
  roleLockedLabel,
  draft,
  saving,
  onCancel,
  onDraftChange,
  onSave,
}: {
  user: ManagedUser;
  roleLockedLabel: string | null;
  draft: DraftUserChange;
  saving: boolean;
  onCancel: () => void;
  onDraftChange: (draft: DraftUserChange) => void;
  onSave: () => void;
}) => {
  const updateInput = getUserUpdateInput(user, draft);
  const saveDisabled =
    saving || !updateInput || draft.displayName.trim().length === 0;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.4fr)_minmax(8rem,0.75fr)]">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Name
          </span>
          <input
            value={draft.displayName}
            disabled={saving}
            onChange={(event) => {
              onDraftChange({
                ...draft,
                displayName: event.currentTarget.value,
              });
            }}
            placeholder="Name"
            className="h-9 w-full rounded-md border border-border bg-background/80 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Photo URL
          </span>
          <input
            value={draft.photoUrl}
            disabled={saving}
            onChange={(event) => {
              onDraftChange({
                ...draft,
                photoUrl: event.currentTarget.value,
              });
            }}
            placeholder="Photo URL"
            type="url"
            className="h-9 w-full rounded-md border border-border bg-background/80 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Role
          </span>
          {roleLockedLabel ? (
            <span className="flex h-9 items-center text-xs font-medium text-muted-foreground">
              {roleLockedLabel}
            </span>
          ) : (
            <select
              value={draft.role ?? "member"}
              disabled={saving}
              aria-label={`New role for ${user.displayName}`}
              onChange={(event) => {
                const parsedRole = manageableUserRoleSchema.safeParse(
                  event.currentTarget.value
                );
                if (!parsedRole.success) return;
                onDraftChange({ ...draft, role: parsedRole.data });
              }}
              className="h-9 w-full rounded-md border border-border bg-background/80 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {getRoleOptions(user.role).map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saveDisabled}
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
          aria-label={`Cancel changes for ${user.displayName}`}
          onClick={onCancel}
          disabled={saving}
          className="h-8 w-8"
        >
          <X size={15} />
        </Button>
      </div>
    </div>
  );
};

const SortableHeader = ({
  label,
  sort,
  sortKey,
  onToggle,
}: {
  label: string;
  sort: UserSort;
  sortKey: UserSortKey;
  onToggle: (sortKey: UserSortKey) => void;
}) => {
  const active = sort.key === sortKey;
  const ariaSort = active
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th aria-sort={ariaSort} className="px-3 pb-2 text-right font-semibold">
      <button
        type="button"
        onClick={() => {
          onToggle(sortKey);
        }}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{label}</span>
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp size={14} className="shrink-0" />
          ) : (
            <ArrowDown size={14} className="shrink-0" />
          )
        ) : null}
      </button>
    </th>
  );
};

export const Users = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<UserSort>({ key: null, direction: "desc" });
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftUser, setDraftUser] = useState<DraftUserChange>({
    displayName: "",
    photoUrl: "",
    role: null,
  });

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

  const displayedUsers = useMemo(() => {
    if (sort.key === null) return filteredUsers;
    const sortKey = sort.key;

    return [...filteredUsers].sort((leftUser, rightUser) =>
      compareUsersByDate(leftUser, rightUser, sortKey, sort.direction)
    );
  }, [filteredUsers, sort]);

  const updateUser = async (
    user: ManagedUser,
    draft: DraftUserChange
  ): Promise<void> => {
    const body = getUserUpdateInput(user, draft);
    if (!body || savingUserId) return;

    setSavingUserId(user.id);
    setError(null);
    setSavedUserId(null);

    try {
      const updatedUser = await api.updateUser({
        params: { id: user.id },
        body,
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

  const beginUserChange = (user: ManagedUser): void => {
    setError(null);
    setSavedUserId(null);
    setEditingUserId(user.id);
    setDraftUser({
      displayName: user.displayName,
      photoUrl: user.photoUrl ?? "",
      role:
        user.id === profile?.id || user.role === "developer"
          ? null
          : getManageableRole(user.role),
    });
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
          <p>User updated.</p>
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

        <div className="flex items-center justify-end">
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/80 px-3 text-xs text-muted-foreground">
            <span>Sort by</span>
            <select
              value={getSortSelectValue(sort)}
              onChange={(event) => {
                setSort(parseSortSelectValue(event.currentTarget.value));
              }}
              aria-label="Sort users"
              className="bg-transparent font-medium text-foreground outline-none"
            >
              <option value="default">Default order</option>
              <option value="lastLoginAt:desc">Last login: newest</option>
              <option value="lastLoginAt:asc">Last login: oldest</option>
              <option value="createdAt:desc">Joined: newest</option>
              <option value="createdAt:asc">Joined: oldest</option>
            </select>
          </label>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">User</th>
                <th className="px-3 pb-2 font-semibold">Role</th>
                <SortableHeader
                  label="Last login"
                  sort={sort}
                  sortKey="lastLoginAt"
                  onToggle={(sortKey) => {
                    setSort((currentSort) => getNextSort(currentSort, sortKey));
                  }}
                />
                <SortableHeader
                  label="Joined"
                  sort={sort}
                  sortKey="createdAt"
                  onToggle={(sortKey) => {
                    setSort((currentSort) => getNextSort(currentSort, sortKey));
                  }}
                />
                <th className="sticky right-0 z-10 bg-background/95 pb-2 pl-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((user) => {
                const disabled =
                  savingUserId !== null && savingUserId !== user.id;
                const roleLockedLabel =
                  user.id === profile?.id
                    ? "Current user"
                    : user.role === "developer"
                      ? "Locked"
                      : null;
                const saving = savingUserId === user.id;
                const editing = editingUserId === user.id;

                return (
                  <Fragment key={user.id}>
                    <tr className="border-b border-border/70 last:border-0">
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
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                      <td className="py-3 pl-3 text-right text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="sticky right-0 z-10 bg-background/95 py-3 pl-3 text-right">
                        <Button
                          type="button"
                          variant={editing ? "secondary" : "outline"}
                          size="icon"
                          aria-label={`Edit ${user.displayName}`}
                          title={`Edit ${user.displayName}`}
                          disabled={disabled}
                          onClick={() => {
                            if (editing) {
                              setEditingUserId(null);
                              return;
                            }
                            beginUserChange(user);
                          }}
                          className="h-8 w-8"
                        >
                          {editing ? <X size={15} /> : <Pencil size={15} />}
                        </Button>
                      </td>
                    </tr>
                    {editing && (
                      <tr className="border-b border-border/70 bg-muted/30">
                        <td colSpan={5} className="px-3 py-3">
                          <UserEditForm
                            user={user}
                            roleLockedLabel={roleLockedLabel}
                            draft={draftUser}
                            saving={saving}
                            onCancel={() => {
                              setEditingUserId(null);
                            }}
                            onDraftChange={setDraftUser}
                            onSave={() => {
                              void updateUser(user, draftUser);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:hidden">
          {displayedUsers.map((user) => {
            const disabled =
              savingUserId !== null && savingUserId !== user.id;
            const roleLockedLabel =
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
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "min-w-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                      getRoleClassName(user.role)
                    )}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                  <Button
                    type="button"
                    variant={editing ? "secondary" : "outline"}
                    size="icon"
                    aria-label={`Edit ${user.displayName}`}
                    title={`Edit ${user.displayName}`}
                    disabled={disabled}
                    onClick={() => {
                      if (editing) {
                        setEditingUserId(null);
                        return;
                      }
                      beginUserChange(user);
                    }}
                    className="h-8 w-8 shrink-0"
                  >
                    {editing ? <X size={15} /> : <Pencil size={15} />}
                  </Button>
                </div>
                {editing && (
                  <div className="mt-3 border-t border-border/70 bg-muted/30 px-3 py-3">
                    <UserEditForm
                      user={user}
                      roleLockedLabel={roleLockedLabel}
                      draft={draftUser}
                      saving={saving}
                      onCancel={() => {
                        setEditingUserId(null);
                      }}
                      onDraftChange={setDraftUser}
                      onSave={() => {
                        void updateUser(user, draftUser);
                      }}
                    />
                  </div>
                )}
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

        {!loading && displayedUsers.length === 0 && (
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
