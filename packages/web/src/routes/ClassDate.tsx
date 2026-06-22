import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { canAssumeRole } from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { CalendarDateTile } from "../components/CalendarDateTile.js";
import { getClassDateKey } from "../components/ClassCard.js";
import { ClassFullView } from "../components/ClassFullView.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import type { SkateClass } from "@skate5/shared";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const getDateParts = (
  dateKey: string
): {
  formatted: string;
  monthLabel: string;
  dayLabel: string;
  weekdayLabel: string;
} => {
  const date = new Date(dateKey + "T00:00:00");
  const valid = dateKeyPattern.test(dateKey) && !Number.isNaN(date.getTime());

  if (!valid) {
    return {
      formatted: "Invalid date",
      monthLabel: "TBD",
      dayLabel: "-",
      weekdayLabel: "Date",
    };
  }

  return {
    formatted: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    monthLabel: date.toLocaleDateString(undefined, { month: "short" }),
    dayLabel: String(date.getDate()),
    weekdayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
  };
};

export const ClassDate = () => {
  const { date: dateParam } = useParams<{ date: string }>();
  const { profile } = useAuth();
  const dateKey = dateParam ?? "";
  const dateParts = getDateParts(dateKey);
  const [classes, setClasses] = useState<SkateClass[]>([]);
  const [loading, setLoading] = useState(true);
  const canCreateClass = profile ? canAssumeRole(profile.role, "admin") : false;

  useEffect(() => {
    setLoading(true);
    api
      .getClasses({})
      .then((data) => {
        setClasses(
          data.filter(
            (skateClass) => getClassDateKey(skateClass.date) === dateKey
          )
        );
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [dateKey]);

  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Calendar
      </Link>

      <section className="rounded-lg border border-border/80 bg-background/80 p-3 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarDateTile
              month={dateParts.monthLabel}
              day={dateParts.dayLabel}
              weekday={dateParts.weekdayLabel}
              className="w-16 sm:w-20"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight sm:text-xl">
                {dateParts.formatted}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {classes.length === 1
                  ? "1 class configured"
                  : `${String(classes.length)} classes configured`}
              </p>
            </div>
          </div>

          {canCreateClass && dateKeyPattern.test(dateKey) && (
            <Link
              to={`/classes/new?date=${dateKey}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0"
            >
              <CalendarPlus size={16} />
              Create class
            </Link>
          )}
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="space-y-8">
          {classes.map((skateClass) => (
            <ClassFullView
              key={skateClass.id}
              skateClass={skateClass}
              showDateTile={false}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-12 text-center">
          <p className="text-base font-semibold">No classes on this date</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick another date or create the first class here.
          </p>
          {canCreateClass && dateKeyPattern.test(dateKey) && (
            <Link
              to={`/classes/new?date=${dateKey}`}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0"
            >
              <CalendarPlus size={16} />
              Create class
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
