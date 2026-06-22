import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Sparkles } from "lucide-react";
import { api } from "../lib/api.js";
import { CalendarDateTile } from "../components/CalendarDateTile.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { z } from "zod";
import type { skateClassSchema } from "@skate5/shared";

type SkateClass = z.infer<typeof skateClassSchema>;

const getSortableDateTime = (value: string): number => {
  const date = new Date(value.includes("T") ? value : value + "T00:00:00");
  const time = date.getTime();

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const getStartOfTodayTime = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today.getTime();
};

const compareNumbers = (left: number, right: number): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const compareClassesByDate = (
  left: SkateClass,
  right: SkateClass,
  todayTime: number
): number => {
  const leftTime = getSortableDateTime(left.date);
  const rightTime = getSortableDateTime(right.date);
  const leftIsUpcoming = leftTime >= todayTime;
  const rightIsUpcoming = rightTime >= todayTime;

  if (leftIsUpcoming !== rightIsUpcoming) {
    return leftIsUpcoming ? -1 : 1;
  }

  if (leftIsUpcoming) {
    return compareNumbers(leftTime, rightTime);
  }

  return compareNumbers(rightTime, leftTime);
};

const StatusBadge = ({ status }: { status: SkateClass["status"] }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase leading-none",
        status === "published" && "bg-accent/10 text-accent",
        status === "draft" && "bg-secondary/25 text-secondary-foreground",
        status === "cancelled" && "bg-red-100 text-red-700"
      )}
    >
      {status}
    </span>
  );
};

const ClassCard = ({ skateClass }: { skateClass: SkateClass }) => {
  const raw = skateClass.date;
  const date = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  const isValidDate = !Number.isNaN(date.getTime());
  const formatted = isValidDate
    ? date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : skateClass.date;
  const monthLabel = isValidDate
    ? date.toLocaleDateString(undefined, { month: "short" })
    : "-";
  const dayLabel = isValidDate ? String(date.getDate()) : "-";
  const weekdayLabel = isValidDate
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : "TBD";

  return (
    <Link to={`/classes/${skateClass.id}`} className="block">
      <Card className="group flex min-h-32 items-start gap-4 overflow-hidden p-0 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:shadow-sm">
        <CalendarDateTile
          month={monthLabel}
          day={dayLabel}
          weekday={weekdayLabel}
          className="h-32 self-start rounded-r-none border-y-0 border-l-0"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between py-4 pr-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-base font-semibold leading-snug">
              {skateClass.title}
            </h3>
            <StatusBadge status={skateClass.status} />
          </div>

          {skateClass.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {skateClass.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatted}
            </span>
            {skateClass.time && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {skateClass.time}
              </span>
            )}
            <span className="ml-auto hidden items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
              Open
              <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export const ClassList = () => {
  const [classes, setClasses] = useState<SkateClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClasses({}).then((data) => {
      setClasses(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar size={48} className="text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">No classes yet</p>
        <p className="text-sm text-muted-foreground">
          Check back soon for upcoming sessions
        </p>
      </div>
    );
  }

  const todayTime = getStartOfTodayTime();
  const sorted = [...classes].sort((a, b) =>
    compareClassesByDate(a, b, todayTime)
  );
  const publishedCount = classes.filter((item) => item.status === "published")
    .length;
  const draftCount = classes.filter((item) => item.status === "draft").length;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary/25 px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Sparkles size={13} />
              Class schedule
            </div>
            <h1 className="text-2xl font-black tracking-normal sm:text-3xl">
              Upcoming sessions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Find the next class, check the details, and update your RSVP.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-primary/10 px-3 py-2">
              <p className="text-lg font-bold text-primary">{classes.length}</p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Total
              </p>
            </div>
            <div className="rounded-md bg-accent/10 px-3 py-2">
              <p className="text-lg font-bold text-accent">{publishedCount}</p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Live
              </p>
            </div>
            <div className="rounded-md bg-secondary/25 px-3 py-2">
              <p className="text-lg font-bold text-secondary-foreground">
                {draftCount}
              </p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Draft
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((cls) => (
          <ClassCard key={cls.id} skateClass={cls} />
        ))}
      </div>
    </div>
  );
};
