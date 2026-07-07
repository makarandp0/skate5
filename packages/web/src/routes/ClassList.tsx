import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { canAssumeRole } from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  getClassDateKey,
  getClassDateParts,
  StatusBadge,
} from "../components/ClassCard.js";
import { CalendarDateTile } from "../components/CalendarDateTile.js";
import { Button } from "../components/ui/Button.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { ClassListItem, RsvpStatus } from "@skate5/shared";

type WeekendDay = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  classes: ClassListItem[];
};

type WeekendGroup = {
  startKey: string;
  endKey: string;
  isCurrentWeekend: boolean;
  days: WeekendDay[];
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

const getDateRangeLabel = (start: Date, end: Date): string => {
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  });

  return `${startLabel}-${endLabel}`;
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
    return left.title.localeCompare(right.title);
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

const getWeekendGroups = (
  monthDate: Date,
  todayKey: string,
  classesByDate: Map<string, ClassListItem[]>
): WeekendGroup[] => {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1
  );
  const lastOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  );
  const start = new Date(firstOfMonth);
  const daysSinceSaturday = (firstOfMonth.getDay() + 1) % 7;
  start.setDate(firstOfMonth.getDate() - daysSinceSaturday);

  const groups: WeekendGroup[] = [];

  for (
    const saturday = new Date(start);
    saturday <= lastOfMonth;
    saturday.setDate(saturday.getDate() + 7)
  ) {
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    if (
      saturday.getMonth() !== monthDate.getMonth() &&
      sunday.getMonth() !== monthDate.getMonth()
    ) {
      continue;
    }

    const days = [saturday, sunday].map((date) => {
      const dayDate = new Date(date);
      const key = toDateKey(dayDate);

      return {
        date: dayDate,
        key,
        inCurrentMonth: dayDate.getMonth() === monthDate.getMonth(),
        isPast: key < todayKey,
        isToday: key === todayKey,
        classes: classesByDate.get(key) ?? [],
      };
    });
    const startKey = toDateKey(saturday);
    const endKey = toDateKey(sunday);

    groups.push({
      startKey,
      endKey,
      isCurrentWeekend: startKey <= todayKey && todayKey <= endKey,
      days,
    });
  }

  return groups;
};

const getOrderedWeekendGroups = (
  groups: WeekendGroup[],
  monthDate: Date,
  today: Date,
  todayKey: string
): WeekendGroup[] => {
  if (getMonthKey(monthDate) !== getMonthKey(today)) {
    return groups;
  }

  return [
    ...groups.filter((group) => group.endKey >= todayKey),
    ...groups.filter((group) => group.endKey < todayKey),
  ];
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

const getClassCountLabel = (count: number): string => {
  return count === 1 ? "1 class" : `${String(count)} classes`;
};

const WeekendDayCard = ({
  canCreateClass,
  day,
}: {
  canCreateClass: boolean;
  day: WeekendDay;
}) => {
  const dateParts = getClassDateParts(day.key);

  if (day.classes.length === 0) {
    const emptyClassName = cn(
      "grid gap-3 rounded-lg border border-border/80 bg-background/90 p-3 text-left shadow-sm shadow-slate-900/5 transition-all sm:grid-cols-[auto_minmax(0,1fr)_auto]",
      canCreateClass &&
        "group hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0",
      day.isToday && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
      day.isPast && "bg-muted/35 text-muted-foreground",
      !day.inCurrentMonth && "bg-muted/20 text-muted-foreground"
    );
    const content = (
      <>
        <CalendarDateTile
          month={dateParts.monthLabel}
          day={dateParts.dayLabel}
          weekday={dateParts.weekdayLabel}
          className="h-24 rounded-lg sm:h-28"
        />

        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-base font-bold leading-snug">
              No class planned
            </h3>
            {day.isToday && (
              <span className="inline-flex rounded-full bg-primary px-2 py-1 text-[11px] font-bold uppercase text-primary-foreground">
                Today
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              {dateParts.formatted}
            </span>
            <span>
              {canCreateClass
                ? "Create the first class for this date."
                : "No class is planned for this date."}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-center sm:justify-end">
          {canCreateClass && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              Create class
              <ArrowRight size={13} />
            </span>
          )}
        </div>
      </>
    );

    if (!canCreateClass) {
      return <div className={emptyClassName}>{content}</div>;
    }

    return (
      <Link
        to={`/classes/new?date=${day.key}`}
        className={emptyClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "grid gap-3 rounded-lg border border-border/80 bg-background/90 p-3 text-left shadow-sm shadow-slate-900/5 sm:grid-cols-[auto_minmax(0,1fr)]",
        day.isToday && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
        day.isPast && "bg-muted/35 text-muted-foreground",
        !day.inCurrentMonth && "bg-muted/20 text-muted-foreground"
      )}
    >
      <CalendarDateTile
        month={dateParts.monthLabel}
        day={dateParts.dayLabel}
        weekday={dateParts.weekdayLabel}
        className="h-24 rounded-lg sm:h-28"
      />

      <div className="min-w-0 space-y-2 self-center">
        <div className="flex flex-wrap items-center gap-2">
          {day.classes.length > 1 && (
            <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
              {getClassCountLabel(day.classes.length)}
            </span>
          )}
          {day.isToday && (
            <span className="inline-flex rounded-full bg-primary px-2 py-1 text-[11px] font-bold uppercase text-primary-foreground">
              Today
            </span>
          )}
        </div>

        {day.classes.map((skateClass) => (
          <Link
            key={skateClass.id}
            to={`/classes/${skateClass.id}`}
            className="group/class grid gap-3 rounded-md border border-border/70 bg-background/80 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 text-base font-bold leading-snug">
                  {skateClass.title}
                </h3>
                <StatusBadge status={skateClass.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {skateClass.time ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} />
                    {skateClass.time}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} />
                    {dateParts.formatted}
                  </span>
                )}
                {skateClass.description && (
                  <span className="line-clamp-1 min-w-0">
                    {skateClass.description}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-center sm:justify-end">
              <span
                className={cn(
                  "inline-flex min-w-24 justify-center rounded-full px-3 py-1.5 text-xs font-extrabold",
                  getRsvpClassName(skateClass.currentUserRsvp)
                )}
              >
                {getRsvpLabel(skateClass.currentUserRsvp)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors group-hover/class:bg-primary group-hover/class:text-primary-foreground">
                {getRsvpActionLabel(skateClass.currentUserRsvp)}
                <ArrowRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </article>
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
  const weekendGroups = useMemo(() => {
    return getOrderedWeekendGroups(
      getWeekendGroups(monthDate, todayKey, classesByDate),
      monthDate,
      today,
      todayKey
    );
  }, [classesByDate, monthDate, today, todayKey]);

  const monthClassCount = countsByMonth.get(getMonthKey(monthDate)) ?? 0;
  const canCreateClass = profile ? canAssumeRole(profile.role, "admin") : false;

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
              Weekend classes with your RSVP at a glance.
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

        {canCreateClass && (
          <div className="mt-4 flex justify-center">
            <Link
              to={`/classes/new?date=${todayKey}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background/70 px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 active:translate-y-0"
            >
              <CalendarPlus size={16} />
              Create class
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label="Weekend class list">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {monthClassCount > 0
              ? `${getClassCountLabel(monthClassCount)} this month`
              : "No classes this month"}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Upcoming weekends appear first.
          </p>
        </div>

        {weekendGroups.map((group) => {
          const startDate = group.days[0].date;
          const endDate = group.days[1].date;
          const rangeLabel = getDateRangeLabel(startDate, endDate);
          const classCount = group.days.reduce(
            (total, day) => total + day.classes.length,
            0
          );

          return (
            <article
              key={group.startKey}
              className={cn(
                "rounded-lg border border-border/80 bg-background/80 p-3 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-4",
                group.isCurrentWeekend &&
                  "border-primary/50 bg-primary/[0.035] shadow-primary/10"
              )}
            >
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {rangeLabel}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {classCount > 0
                      ? getClassCountLabel(classCount)
                      : "No classes scheduled"}
                  </p>
                </div>
                {group.isCurrentWeekend && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                    This weekend
                  </span>
                )}
              </header>

              <div className="grid gap-3">
                {group.days.map((day) => (
                  <WeekendDayCard
                    key={day.key}
                    canCreateClass={canCreateClass}
                    day={day}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
