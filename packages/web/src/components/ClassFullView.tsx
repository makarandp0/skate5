import {
  useEffect,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  CircleHelp,
  Clock,
  Grid3X3,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Save,
  ShieldCheck,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  canAssumeRole,
  classStatusSchema,
  updateClassSchema,
} from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { CalendarDateTile } from "./CalendarDateTile.js";
import { getClassDateKey, StatusBadge } from "./ClassCard.js";
import { Avatar } from "./ui/Avatar.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { Skeleton } from "./ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type {
  ClassAttendancePerson,
  ClassAttendanceResponse,
  RsvpStatus,
  SkateClass,
  ClassStatus,
} from "@skate5/shared";

const emptyAttendance: ClassAttendanceResponse = {
  counts: {
    yes: 0,
    maybe: 0,
    no: 0,
    none: 0,
  },
  currentUserRsvp: "none",
  people: [],
};

const attendanceTabs: Array<{
  rsvp: RsvpStatus;
  label: string;
  countClassName: string;
  emptyMessage: string;
}> = [
  {
    rsvp: "yes",
    label: "Going",
    countClassName: "text-accent",
    emptyMessage: "No one is going yet.",
  },
  {
    rsvp: "maybe",
    label: "Maybe",
    countClassName: "text-secondary-foreground",
    emptyMessage: "No maybes yet.",
  },
  {
    rsvp: "no",
    label: "No",
    countClassName: "text-red-600",
    emptyMessage: "No one has declined.",
  },
  {
    rsvp: "none",
    label: "No response",
    countClassName: "text-muted-foreground",
    emptyMessage: "Everyone has responded.",
  },
];

const statusOptions: Array<{ status: ClassStatus; label: string }> = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "cancelled", label: "Cancelled" },
];

const adminRsvpOptions: Array<{ rsvp: RsvpStatus; label: string }> = [
  { rsvp: "yes", label: "Yes" },
  { rsvp: "maybe", label: "Maybe" },
  { rsvp: "no", label: "No" },
  { rsvp: "none", label: "None" },
];

const getRsvpLabel = (rsvp: RsvpStatus): string => {
  switch (rsvp) {
    case "yes":
      return "Going";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
    case "none":
      return "No response";
    default:
      rsvp satisfies never;
      return rsvp;
  }
};

const adminActionClassName =
  "border-amber-300/80 bg-amber-50/80 text-amber-950 shadow-sm shadow-amber-900/5 dark:border-amber-400/30 dark:bg-amber-300/10 dark:text-amber-100";

const RsvpButton = ({
  label,
  icon: Icon,
  active,
  activeClass,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  activeClass: string;
  onClick: () => void;
  disabled: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 rounded-md px-3 py-3 text-sm font-semibold transition-all",
        active
          ? activeClass
          : "bg-muted/70 text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground active:translate-y-0",
        disabled && "opacity-50"
      )}
    >
      <span className="flex items-center justify-center gap-2">
        <Icon size={16} />
        {label}
      </span>
    </button>
  );
};

type ClassFullViewProps = {
  skateClass: SkateClass;
  headingLevel?: "h1" | "h2";
  showDateTile?: boolean;
  onClassUpdated?: (skateClass: SkateClass) => void;
};

export const ClassFullView = ({
  skateClass,
  headingLevel = "h2",
  showDateTile = true,
  onClassUpdated,
}: ClassFullViewProps) => {
  const { profile } = useAuth();
  const rawDate = getClassDateKey(skateClass.date);
  const canEdit = profile ? canAssumeRole(profile.role, "admin") : false;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(skateClass.title);
  const [editTime, setEditTime] = useState(skateClass.time ?? "");
  const [editDescription, setEditDescription] = useState(
    skateClass.description ?? ""
  );
  const [editStatus, setEditStatus] = useState<ClassStatus>(skateClass.status);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [attendancePeople, setAttendancePeople] = useState<
    ClassAttendancePerson[]
  >([]);
  const [attendanceCounts, setAttendanceCounts] = useState<
    ClassAttendanceResponse["counts"]
  >(emptyAttendance.counts);
  const [currentRsvp, setCurrentRsvp] = useState<RsvpStatus>("none");
  const [selectedAttendanceRsvp, setSelectedAttendanceRsvp] =
    useState<RsvpStatus>("yes");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [adminRsvpSavingUserId, setAdminRsvpSavingUserId] = useState<
    string | null
  >(null);
  const [activeAdminRsvpUserId, setActiveAdminRsvpUserId] = useState<
    string | null
  >(null);
  const [adminRsvpError, setAdminRsvpError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setEditTitle(skateClass.title);
    setEditTime(skateClass.time ?? "");
    setEditDescription(skateClass.description ?? "");
    setEditStatus(skateClass.status);
    setEditError(null);
    setActiveAdminRsvpUserId(null);
    setAdminRsvpError(null);
  }, [
    rawDate,
    skateClass.description,
    skateClass.id,
    skateClass.status,
    skateClass.time,
    skateClass.title,
  ]);

  useEffect(() => {
    setSelectedAttendanceRsvp("yes");
    api
      .getClassAttendance({
        params: { id: skateClass.id, rsvp: "yes" },
      })
      .then((attendanceResponse) => {
        setAttendanceCounts(attendanceResponse.counts);
        setAttendancePeople(attendanceResponse.people);
        setCurrentRsvp(attendanceResponse.currentUserRsvp);
      })
      .catch(() => {
        setAttendanceCounts(emptyAttendance.counts);
        setAttendancePeople([]);
        setCurrentRsvp("none");
      });
  }, [skateClass.id]);

  const loadAttendance = async (rsvp: RsvpStatus): Promise<void> => {
    setAttendanceLoading(true);
    setActiveAdminRsvpUserId(null);
    setAdminRsvpError(null);
    try {
      const attendanceResponse = await api.getClassAttendance({
        params: { id: skateClass.id, rsvp },
      });
      setAttendanceCounts(attendanceResponse.counts);
      setAttendancePeople(attendanceResponse.people);
      setCurrentRsvp(attendanceResponse.currentUserRsvp);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleRsvp = async (rsvp: RsvpStatus): Promise<void> => {
    if (rsvpLoading) return;
    setRsvpLoading(true);
    try {
      await api.rsvp({ params: { id: skateClass.id }, body: { rsvp } });
      const updated = await api.getClassAttendance({
        params: { id: skateClass.id, rsvp: selectedAttendanceRsvp },
      });
      setAttendanceCounts(updated.counts);
      setAttendancePeople(updated.people);
      setCurrentRsvp(updated.currentUserRsvp);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleAdminRsvp = async (
    person: ClassAttendancePerson,
    rsvp: RsvpStatus
  ): Promise<void> => {
    if (adminRsvpSavingUserId) return;
    setAdminRsvpSavingUserId(person.userId);
    setAdminRsvpError(null);

    try {
      await api.setUserRsvp({
        params: { id: skateClass.id, userId: person.userId },
        body: { rsvp },
      });
      const updated = await api.getClassAttendance({
        params: { id: skateClass.id, rsvp: selectedAttendanceRsvp },
      });
      setAttendanceCounts(updated.counts);
      setAttendancePeople(updated.people);
      setCurrentRsvp(updated.currentUserRsvp);
      setActiveAdminRsvpUserId(null);
    } catch (err) {
      console.error("setUserRsvp failed:", err);
      setAdminRsvpError("Could not update that RSVP. Try again.");
    } finally {
      setAdminRsvpSavingUserId(null);
    }
  };

  const handleAdminRsvpSelect = (
    event: ChangeEvent<HTMLSelectElement>,
    person: ClassAttendancePerson
  ): void => {
    const selected = adminRsvpOptions.find(
      (option) => option.rsvp === event.target.value
    );
    if (!selected) return;
    setAdminRsvpError(null);
    if (selected.rsvp === person.rsvp) {
      setActiveAdminRsvpUserId(null);
      return;
    }
    void handleAdminRsvp(person, selected.rsvp);
  };

  const resetEditForm = (): void => {
    setEditTitle(skateClass.title);
    setEditTime(skateClass.time ?? "");
    setEditDescription(skateClass.description ?? "");
    setEditStatus(skateClass.status);
    setEditError(null);
  };

  const handleUpdate = async (): Promise<void> => {
    setSaving(true);
    setEditError(null);

    try {
      const body = updateClassSchema.parse({
        title: editTitle.trim(),
        time: editTime.trim() || undefined,
        description: editDescription.trim() || undefined,
        status: classStatusSchema.parse(editStatus),
      });
      const updated = await api.updateClass({
        params: { id: skateClass.id },
        body,
      });
      onClassUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      console.error("updateClass failed:", err);
      setEditError("Could not update class. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleUpdate();
  };

  const date = new Date(rawDate + "T00:00:00");
  const isValidDate = !Number.isNaN(date.getTime());
  const monthLabel = isValidDate
    ? date.toLocaleDateString(undefined, { month: "short" })
    : "TBD";
  const dayLabel = isValidDate ? String(date.getDate()) : "-";
  const weekdayLabel = isValidDate
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : "Date";
  const selectedTab = attendanceTabs.find(
    (tab) => tab.rsvp === selectedAttendanceRsvp
  );
  const invitedCount =
    attendanceCounts.yes +
    attendanceCounts.maybe +
    attendanceCounts.no +
    attendanceCounts.none;
  const headingClassName = "text-2xl font-black leading-tight sm:text-3xl";
  const canManageAttendance = canEdit;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        {editing ? (
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {showDateTile && (
                <CalendarDateTile
                  month={monthLabel}
                  day={dayLabel}
                  weekday={weekdayLabel}
                  size="large"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const active = editStatus === option.status;

                    return (
                      <button
                        key={option.status}
                        type="button"
                        onClick={() => {
                          setEditStatus(option.status);
                        }}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <label className="sr-only" htmlFor={`class-title-${skateClass.id}`}>
                  Title
                </label>
                <input
                  id={`class-title-${skateClass.id}`}
                  value={editTitle}
                  onChange={(event) => {
                    setEditTitle(event.target.value);
                  }}
                  required
                  maxLength={120}
                  placeholder="Class title"
                  className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-2xl font-black leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
                />

                <div className="mt-3 max-w-44">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    Time
                    <input
                      type="time"
                      value={editTime}
                      onChange={(event) => {
                        setEditTime(event.target.value);
                      }}
                      className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>

                <label
                  className="sr-only"
                  htmlFor={`class-description-${skateClass.id}`}
                >
                  Description
                </label>
                <textarea
                  id={`class-description-${skateClass.id}`}
                  value={editDescription}
                  onChange={(event) => {
                    setEditDescription(event.target.value);
                  }}
                  rows={5}
                  placeholder="Add the class description, notes, or focus for the session."
                  className="mt-4 min-h-32 w-full resize-y rounded-md border border-border bg-background/80 px-3 py-2 text-sm leading-relaxed text-foreground/80 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />

                {editError && (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {editError}
                  </p>
                )}

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetEditForm();
                      setEditing(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {showDateTile && (
              <CalendarDateTile
                month={monthLabel}
                day={dayLabel}
                weekday={weekdayLabel}
                size="large"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={skateClass.status} />
                <div className="flex items-center gap-2">
                  {profile && (
                    <Link
                      to={`/classes/${skateClass.id}/chat`}
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background/70 px-3 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 active:translate-y-0"
                    >
                      <MessageCircle size={14} />
                      Chat
                    </Link>
                  )}
                  {(canEdit || skateClass.gridPublished) && (
                    <Link
                      to={`/classes/${skateClass.id}/grid`}
                      className={cn(
                        "inline-flex h-8 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                        canEdit
                          ? adminActionClassName
                          : "border-border bg-background/70 hover:bg-muted/70"
                      )}
                    >
                      <Grid3X3 size={14} />
                      Grid
                    </Link>
                  )}
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(true);
                      }}
                      className={cn("border", adminActionClassName)}
                    >
                      <ShieldCheck size={14} />
                      <Pencil size={14} />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              {headingLevel === "h1" ? (
                <h1 className={headingClassName}>{skateClass.title}</h1>
              ) : (
                <h2 className={headingClassName}>{skateClass.title}</h2>
              )}
              {skateClass.time && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {skateClass.time}
                  </span>
                </div>
              )}
              {skateClass.description && (
                <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {skateClass.description}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {profile && skateClass.status === "published" && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Your RSVP</h3>
              <p className="text-xs text-muted-foreground">
                Current response: {currentRsvp}
              </p>
            </div>
            {rsvpLoading && (
              <span className="text-xs font-medium text-muted-foreground">
                Saving...
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <RsvpButton
              label="Yes"
              icon={CheckCircle2}
              active={currentRsvp === "yes"}
              activeClass="bg-accent text-accent-foreground shadow-sm shadow-accent/20"
              onClick={() => {
                void handleRsvp("yes");
              }}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="Maybe"
              icon={CircleHelp}
              active={currentRsvp === "maybe"}
              activeClass="bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20"
              onClick={() => {
                void handleRsvp("maybe");
              }}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="No"
              icon={XCircle}
              active={currentRsvp === "no"}
              activeClass="bg-red-500 text-white"
              onClick={() => {
                void handleRsvp("no");
              }}
              disabled={rsvpLoading}
            />
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UsersRound size={17} className="text-primary" />
            <h3 className="text-sm font-semibold">Attendance</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {invitedCount} invited
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Attendance responses"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {attendanceTabs.map((tab) => {
            const active = selectedAttendanceRsvp === tab.rsvp;

            return (
              <button
                key={tab.rsvp}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedAttendanceRsvp(tab.rsvp);
                  void loadAttendance(tab.rsvp);
                }}
                className={cn(
                  "rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  active && "border-primary/40 bg-primary/10 shadow-sm"
                )}
              >
                <strong
                  className={cn("mr-1 text-lg leading-none", tab.countClassName)}
                >
                  {attendanceCounts[tab.rsvp]}
                </strong>
                <span className="font-medium text-muted-foreground">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {adminRsvpError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {adminRsvpError}
          </p>
        )}

        <div className="space-y-2">
          {attendanceLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : attendancePeople.length > 0 ? (
            attendancePeople.map((person) => {
              const adminRsvpActive =
                activeAdminRsvpUserId === person.userId;
              const saving = adminRsvpSavingUserId === person.userId;

              return (
                <div
                  key={person.userId}
                  className={cn(
                    "flex flex-col gap-2 rounded-md bg-muted/45 px-3 py-2 sm:flex-row sm:items-center",
                    adminRsvpActive && "border",
                    adminRsvpActive && adminActionClassName
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      src={person.photoUrl}
                      name={person.displayName}
                      className="h-9 w-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {person.displayName}
                        {person.userId === profile?.id && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRsvpLabel(person.rsvp)}
                      </p>
                    </div>
                  </div>
                  {canManageAttendance && (
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                      {saving ? (
                        <span className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-300/80 bg-background/90 px-3 text-xs font-medium text-muted-foreground">
                          <LoaderCircle size={14} className="animate-spin" />
                          Saving
                        </span>
                      ) : adminRsvpActive ? (
                        <>
                          <label>
                            <span className="sr-only">
                              Set RSVP for {person.displayName}
                            </span>
                            <select
                              value=""
                              onChange={(event) => {
                                handleAdminRsvpSelect(event, person);
                              }}
                              disabled={adminRsvpSavingUserId !== null}
                              className="h-9 rounded-md border border-amber-300/80 bg-background/90 px-2 text-xs font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            >
                              <option value="" disabled>
                                Choose RSVP
                              </option>
                              {adminRsvpOptions.map((option) => (
                                <option key={option.rsvp} value={option.rsvp}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveAdminRsvpUserId(null);
                            }}
                            disabled={saving}
                            className="h-9"
                          >
                            <XCircle size={14} />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdminRsvpError(null);
                            setActiveAdminRsvpUserId(person.userId);
                          }}
                          disabled={adminRsvpSavingUserId !== null}
                          className={cn("h-9 border", adminActionClassName)}
                        >
                          <ShieldCheck size={14} />
                          Change RSVP
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="rounded-md bg-muted/45 px-3 py-6 text-center text-sm text-muted-foreground">
              {selectedTab?.emptyMessage ?? "No responses in this group."}
            </p>
          )}
        </div>
      </Card>

    </div>
  );
};
