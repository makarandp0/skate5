import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { canAssumeRole } from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  ClassPills,
  ClassIcon,
  getClassDateKey,
  getClassLinkLabel,
  StatusBadge,
  shouldShowClassStatus,
} from "../components/ClassCard.js";
import { Button } from "../components/ui/Button.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { ClassListItem, RsvpStatus } from "@skate5/shared";

type ClassListDay = {
  key: string;
  isPast: boolean;
  isToday: boolean;
  classes: ClassListItem[];
};

const toDateKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const monthKeyPattern = /^\d{4}-\d{2}$/;

const getInitialMonthDate = (monthKey: string | null, fallback: Date): Date => {
  if (!monthKey || !monthKeyPattern.test(monthKey)) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  const parsed = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  return parsed;
};

const getMonthLabel = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getSortableDateTime = (value: string): number => {
  const date = new Date(value.includes("T") ? value : value + "T00:00:00");
  const time = date.getTime();

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const compareClassesByDate = (
  left: ClassListItem,
  right: ClassListItem
): number => {
  const leftTime = getSortableDateTime(left.date);
  const rightTime = getSortableDateTime(right.date);

  if (leftTime === rightTime) {
    return [left.time ?? "", left.location.name].join(" ").localeCompare(
      [right.time ?? "", right.location.name].join(" ")
    );
  }

  return leftTime < rightTime ? -1 : 1;
};

const groupClassesByDate = (
  classes: ClassListItem[]
): Map<string, ClassListItem[]> => {
  const grouped = new Map<string, ClassListItem[]>();

  for (const skateClass of classes) {
    const dateKey = getClassDateKey(skateClass.date);
    const dateClasses = grouped.get(dateKey) ?? [];
    dateClasses.push(skateClass);
    grouped.set(dateKey, dateClasses);
  }

  for (const dateClasses of grouped.values()) {
    dateClasses.sort(compareClassesByDate);
  }

  return grouped;
};

const countClassesByMonth = (classes: ClassListItem[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const skateClass of classes) {
    const key = getClassDateKey(skateClass.date).slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

const getClassListDays = (
  monthDate: Date,
  todayKey: string,
  classesByDate: Map<string, ClassListItem[]>
): ClassListDay[] => {
  const monthKey = getMonthKey(monthDate);

  return [...classesByDate.entries()]
    .filter(([key]) => key.startsWith(monthKey))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, dateClasses]) => ({
      key,
      isPast: key < todayKey,
      isToday: key === todayKey,
      classes: dateClasses,
    }));
};

const getRsvpLabel = (rsvp: RsvpStatus): string => {
  switch (rsvp) {
    case "yes":
      return "Going";
    case "maybe":
      return "Maybe";
    case "no":
      return "Not going";
    case "none":
      return "No RSVP";
    default:
      rsvp satisfies never;
      return rsvp;
  }
};

const getRsvpActionLabel = (rsvp: RsvpStatus): string => {
  switch (rsvp) {
    case "yes":
      return "Open";
    case "maybe":
    case "no":
      return "Change";
    case "none":
      return "RSVP";
    default:
      rsvp satisfies never;
      return rsvp;
  }
};

const getRsvpClassName = (rsvp: RsvpStatus): string => {
  switch (rsvp) {
    case "yes":
      return "bg-accent text-accent-foreground";
    case "maybe":
      return "bg-secondary/25 text-secondary-foreground";
    case "no":
      return "bg-red-100 text-red-700";
    case "none":
      return "bg-muted text-muted-foreground";
    default:
      rsvp satisfies never;
      return rsvp;
  }
};

const countClassesInDays = (days: ClassListDay[]): number => {
  return days.reduce((total, day) => total + day.classes.length, 0);
};

const ClassListDayCards = ({
  day,
  canManageClasses,
}: {
  day: ClassListDay;
  canManageClasses: boolean;
}) => {
  return (
    <>
      {day.classes.map((skateClass) => {
        const canRsvp = !day.isPast && skateClass.status === "published";
        const showStatus = shouldShowClassStatus(
          skateClass.status,
          canManageClasses
        );
        const actionLabel = day.isPast
          ? "View"
          : canRsvp
            ? getRsvpActionLabel(skateClass.currentUserRsvp)
            : "Open";
        const showCurrentRsvp =
          canRsvp && skateClass.currentUserRsvp !== "none";

        return (
          <article
            key={skateClass.id}
            className={cn(
              "group/class relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border/80 bg-background/90 p-3 text-left shadow-sm shadow-slate-900/5 transition-all sm:grid-cols-[auto_minmax(0,1fr)_auto]",
              !day.isPast &&
                "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md hover:shadow-primary/10 active:translate-y-0",
              day.isToday &&
                "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
              day.isPast && "bg-muted/30 text-muted-foreground opacity-85"
            )}
          >
            <Link
              to={`/classes/${skateClass.id}`}
              aria-label={getClassLinkLabel(skateClass)}
              className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <ClassIcon
              skateClass={skateClass}
              className={cn(
                "pointer-events-none relative z-10 min-h-32 rounded-lg",
                day.isPast && "grayscale"
              )}
            />

            <div className="pointer-events-none relative z-10 min-w-0 self-center">
              <div className="flex flex-wrap items-center gap-2">
                {showStatus && <StatusBadge status={skateClass.status} />}
                {day.isToday && (
                  <span className="inline-flex rounded-full bg-primary px-2 py-1 text-[11px] font-bold uppercase text-primary-foreground">
                    Today
                  </span>
                )}
                {day.isPast && (
                  <span className="inline-flex rounded-full bg-muted px-2 py-1 text-[11px] font-bold uppercase text-muted-foreground">
                    Past
                  </span>
                )}
              </div>

              <ClassPills pills={skateClass.pills} className="mt-2" />
            </div>

            <div className="pointer-events-none relative z-10 col-span-2 flex flex-wrap items-center gap-2 self-center sm:col-span-1 sm:justify-end">
              {showCurrentRsvp && (
                <span
                  className={cn(
                    "inline-flex min-w-24 justify-center rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm shadow-slate-900/5",
                    getRsvpClassName(skateClass.currentUserRsvp)
                  )}
                >
                  {getRsvpLabel(skateClass.currentUserRsvp)}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  day.isPast
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary group-hover/class:bg-primary group-hover/class:text-primary-foreground"
                )}
              >
                {actionLabel}
                <ArrowRight size={13} />
              </span>
            </div>
          </article>
        );
      })}
    </>
  );
};

export const ClassList = () => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [monthDate, setMonthDate] = useState(
    () => getInitialMonthDate(searchParams.get("month"), today)
  );
  const [loading, setLoading] = useState(true);
  const [showPastClasses, setShowPastClasses] = useState(false);

  useEffect(() => {
    api
      .getClasses({})
      .then((data) => {
        setClasses(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const classesByDate = useMemo(() => groupClassesByDate(classes), [classes]);
  const countsByMonth = useMemo(() => countClassesByMonth(classes), [classes]);
  const classListDays = useMemo(() => {
    return getClassListDays(monthDate, todayKey, classesByDate);
  }, [classesByDate, monthDate, todayKey]);
  const pastClassCount = useMemo(() => {
    return countClassesInDays(classListDays.filter((day) => day.isPast));
  }, [classListDays]);
  const visibleClassListDays = useMemo(() => {
    if (showPastClasses) {
      return classListDays;
    }

    return classListDays.filter((day) => !day.isPast);
  }, [classListDays, showPastClasses]);

  const monthClassCount = countsByMonth.get(getMonthKey(monthDate)) ?? 0;
  const canManageClasses = profile ? canAssumeRole(profile.role, "admin") : false;

  const moveMonth = (offset: number): void => {
    const next = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + offset,
      1
    );
    setMonthDate(next);
    setSearchParams({ month: getMonthKey(next) });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => {
              moveMonth(-1);
            }}
          >
            <ChevronLeft size={18} />
          </Button>

          <div className="min-w-0 text-center">
            <h1 className="text-2xl font-black tracking-normal sm:text-3xl">
              {getMonthLabel(monthDate)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Classes with your RSVP at a glance.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => {
              moveMonth(1);
            }}
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {(canManageClasses || pastClassCount > 0) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {canManageClasses && (
              <Link
                to={`/classes/new?date=${todayKey}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background/70 px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 active:translate-y-0"
              >
                <CalendarPlus size={16} />
                Create class
              </Link>
            )}
            {pastClassCount > 0 && (
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/70 px-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 active:translate-y-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showPastClasses}
                  onChange={(event) => {
                    setShowPastClasses(event.currentTarget.checked);
                  }}
                />
                Show past
              </label>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label="Class list">
        {monthClassCount === 0 && (
          <div className="rounded-md bg-muted/45 px-3 py-8 text-center text-sm text-muted-foreground">
            No classes this month.
          </div>
        )}

        {visibleClassListDays.length === 0 && monthClassCount > 0 && (
          <div className="rounded-md bg-muted/45 px-3 py-8 text-center text-sm text-muted-foreground">
            All classes this month are in the past.
          </div>
        )}

        {visibleClassListDays.map((day) => (
          <ClassListDayCards
            key={day.key}
            day={day}
            canManageClasses={canManageClasses}
          />
        ))}
      </section>
    </div>
  );
};
