import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { CalendarDateTile } from "./CalendarDateTile.js";
import { Card } from "./ui/Card.js";
import { cn } from "../lib/utils.js";
import type { Location, SkateClass } from "@skate5/shared";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}/;

const toLocalDateKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getClassDateKey = (value: string): string => {
  if (value.includes("T")) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return toLocalDateKey(date);
    }
  }

  return dateKeyPattern.exec(value)?.[0] ?? value;
};

export const getClassDate = (value: string): Date => {
  return new Date(getClassDateKey(value) + "T00:00:00");
};

export const getClassDateParts = (
  value: string
): {
  formatted: string;
  monthLabel: string;
  dayLabel: string;
  weekdayLabel: string;
} => {
  const date = getClassDate(value);
  const isValidDate = !Number.isNaN(date.getTime());

  if (!isValidDate) {
    return {
      formatted: getClassDateKey(value),
      monthLabel: "-",
      dayLabel: "-",
      weekdayLabel: "TBD",
    };
  }

  return {
    formatted: date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    monthLabel: date.toLocaleDateString(undefined, { month: "short" }),
    dayLabel: String(date.getDate()),
    weekdayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
  };
};

export const StatusBadge = ({ status }: { status: SkateClass["status"] }) => {
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

export const LocationBadge = ({
  location,
  showAddress = false,
}: {
  location: Location;
  showAddress?: boolean;
}) => {
  return (
    <span
      className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground"
      title={showAddress ? location.address : undefined}
    >
      <MapPin size={13} style={{ color: location.color }} />
      <span className="truncate">{location.name}</span>
      {showAddress && (
        <span className="hidden truncate text-muted-foreground sm:inline">
          {location.address}
        </span>
      )}
    </span>
  );
};

export const ClassCard = ({ skateClass }: { skateClass: SkateClass }) => {
  const dateParts = getClassDateParts(skateClass.date);

  return (
    <Link to={`/classes/${skateClass.id}`} className="block">
      <Card className="group flex min-h-32 items-start gap-4 overflow-hidden p-0 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:shadow-sm">
        <CalendarDateTile
          month={dateParts.monthLabel}
          day={dateParts.dayLabel}
          weekday={dateParts.weekdayLabel}
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
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {skateClass.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {dateParts.formatted}
            </span>
            {skateClass.time && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {skateClass.time}
              </span>
            )}
            <LocationBadge location={skateClass.location} />
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
