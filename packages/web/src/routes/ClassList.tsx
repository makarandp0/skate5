import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { api } from "../lib/api.js";
import { getClassDateKey } from "../components/ClassCard.js";
import { Button } from "../components/ui/Button.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { SkateClass } from "@skate5/shared";

type CalendarDay = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isWeekend: boolean;
  isPast: boolean;
  isToday: boolean;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getCalendarDays = (monthDate: Date, todayKey: string): CalendarDay[] => {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1
  );
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);

    return {
      date,
      key,
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isPast: key < todayKey,
      isToday: key === todayKey,
    };
  });
};

const getSortableDateTime = (value: string): number => {
  const date = new Date(value.includes("T") ? value : value + "T00:00:00");
  const time = date.getTime();

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const compareClassesByDate = (
  left: SkateClass,
  right: SkateClass
): number => {
  const leftTime = getSortableDateTime(left.date);
  const rightTime = getSortableDateTime(right.date);

  if (leftTime === rightTime) {
    return left.title.localeCompare(right.title);
  }

  return leftTime < rightTime ? -1 : 1;
};

const groupClassesByDate = (
  classes: SkateClass[]
): Map<string, SkateClass[]> => {
  const grouped = new Map<string, SkateClass[]>();

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

export const ClassList = () => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [classes, setClasses] = useState<SkateClass[]>([]);
  const [monthDate, setMonthDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
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
  const calendarDays = useMemo(
    () => getCalendarDays(monthDate, todayKey),
    [monthDate, todayKey]
  );

  const moveMonth = (offset: number): void => {
    setMonthDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
              Pick a date to view classes or plan a new session.
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
      </section>

      <section className="overflow-hidden rounded-lg border border-border/80 bg-background/85 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/40">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className={cn(
                "px-2 py-2 text-center text-[11px] font-bold uppercase text-muted-foreground",
                (label === "Sun" || label === "Sat") &&
                  "bg-primary/5 text-primary"
              )}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dateClasses = classesByDate.get(day.key) ?? [];
            const hasClasses = dateClasses.length > 0;

            return (
              <Link
                key={day.key}
                to={`/classes/date/${day.key}`}
                className={cn(
                  "relative min-h-28 border-b border-r border-border/70 p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-32",
                  !day.inCurrentMonth && "bg-muted/25 text-muted-foreground/60",
                  day.isWeekend && day.inCurrentMonth && "bg-primary/[0.035]",
                  day.isPast && "bg-muted/40 text-muted-foreground",
                  day.isToday && "bg-primary/10 ring-2 ring-inset ring-primary",
                  hasClasses && !day.isToday && !day.isPast && "bg-accent/5"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-xl font-black leading-none sm:h-11 sm:w-11 sm:text-2xl",
                      day.isWeekend &&
                        !day.isPast &&
                        day.inCurrentMonth &&
                        "text-primary",
                      day.isPast && "text-muted-foreground",
                      !day.inCurrentMonth && "text-muted-foreground/70",
                      day.isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {hasClasses && (
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        day.isPast
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                      )}
                    >
                      {dateClasses.length}
                    </span>
                  )}
                </div>

                {day.isToday && (
                  <span className="mt-1 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    Today
                  </span>
                )}

                {hasClasses && (
                  <div className="mt-2 space-y-1">
                    {dateClasses.slice(0, 2).map((skateClass) => (
                      <div
                        key={skateClass.id}
                        className={cn(
                          "flex min-w-0 items-center gap-1 text-[11px] font-semibold",
                          day.isPast
                            ? "text-muted-foreground"
                            : "text-foreground"
                        )}
                      >
                        <Circle
                          size={7}
                          className={cn(
                            "shrink-0 fill-current",
                            skateClass.status === "published" && "text-accent",
                            skateClass.status === "draft" &&
                              "text-secondary-foreground",
                            skateClass.status === "cancelled" && "text-red-600",
                            day.isPast && "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{skateClass.title}</span>
                      </div>
                    ))}
                    {dateClasses.length > 2 && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        +{dateClasses.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
