import { Link } from "react-router-dom";
import { ArrowRight, Clock, ExternalLink, MapPin } from "lucide-react";
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
    weekdayLabel: date.toLocaleDateString(undefined, { weekday: "long" }),
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

export const shouldShowClassStatus = (
  status: SkateClass["status"],
  canManage: boolean
): boolean => {
  switch (status) {
    case "draft":
    case "published":
      return canManage;
    case "cancelled":
      return true;
    default:
      status satisfies never;
      return false;
  }
};

export const getClassDefaultTitle = (
  skateClass: Pick<SkateClass, "date" | "location">
): string => {
  const date = getClassDate(skateClass.date);
  const locationName = skateClass.location.name.trim();
  const locationLabel = locationName.length > 0 ? locationName : "class";

  if (Number.isNaN(date.getTime())) {
    return `Skate at ${locationLabel}`;
  }

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return `${dateLabel} Skate at ${locationLabel}`;
};

export const getClassDisplayTitle = (skateClass: SkateClass): string => {
  const title = skateClass.title.trim();
  return title.length > 0 ? title : getClassDefaultTitle(skateClass);
};

export const getClassSummaryLabel = (skateClass: SkateClass): string => {
  const dateParts = getClassDateParts(skateClass.date);

  return [
    dateParts.formatted,
    skateClass.time?.trim(),
    skateClass.location.name,
  ]
    .filter((part) => part && part.length > 0)
    .join(" · ");
};

export const getClassLinkLabel = (skateClass: SkateClass): string => {
  return `Open ${getClassDisplayTitle(skateClass)} - ${getClassSummaryLabel(
    skateClass
  )}`;
};

export const LocationBadge = ({
  location,
  showAddress = false,
  openInMaps = false,
}: {
  location: Location;
  showAddress?: boolean;
  openInMaps?: boolean;
}) => {
  const content = (
    <>
      <MapPin size={13} style={{ color: location.color }} />
      <span className="truncate">{location.name}</span>
      {showAddress && (
        <span className="hidden truncate text-muted-foreground sm:inline">
          {location.address}
        </span>
      )}
      {openInMaps && (
        <ExternalLink
          size={12}
          className="shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </>
  );
  const className = cn(
    "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground",
    openInMaps &&
      "transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  );
  const title = showAddress
    ? `Open ${location.name} in maps: ${location.address}`
    : `Open ${location.name} in maps`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${location.name} ${location.address}`
  )}`;

  if (openInMaps) {
    return (
      <a
        className={className}
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        title={title}
        aria-label={title}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={className}
      title={showAddress ? location.address : undefined}
    >
      {content}
    </span>
  );
};

type ClassIconProps = {
  skateClass: Pick<SkateClass, "date" | "location" | "time">;
  size?: "compact" | "large";
  className?: string;
};

export const ClassIcon = ({
  skateClass,
  size = "compact",
  className,
}: ClassIconProps) => {
  const dateParts = getClassDateParts(skateClass.date);
  const large = size === "large";
  const timeLabel = skateClass.time?.trim() || "Time TBD";
  const date = getClassDate(skateClass.date);
  const monthLabel = Number.isNaN(date.getTime())
    ? dateParts.monthLabel
    : date.toLocaleDateString(undefined, { month: "long" });

  return (
    <div
      className={cn(
        "flex flex-shrink-0 flex-col overflow-hidden rounded-lg border-2 border-border bg-calendar-paper text-calendar-paper-foreground shadow-md shadow-slate-900/10",
        large ? "w-44" : "w-36",
        className
      )}
    >
      <div
        className={cn(
          "bg-primary px-2 text-center font-bold uppercase tracking-[0.16em] text-primary-foreground",
          large ? "py-2 text-xs" : "py-1.5 text-[10px]"
        )}
      >
        {monthLabel}
      </div>
      <div
        className={cn(
          "grid place-items-center bg-calendar-paper px-2 text-center",
          large ? "min-h-24 py-3" : "min-h-20 py-2.5"
        )}
      >
        <span
          className={cn(
            "font-black leading-none",
            large ? "text-5xl" : "text-4xl"
          )}
        >
          {dateParts.dayLabel}
        </span>
        <span
          className={cn(
            "mt-1 font-bold uppercase tracking-[0.12em] text-calendar-footer-foreground",
            large ? "text-[11px]" : "text-[9px]"
          )}
        >
          {dateParts.weekdayLabel}
        </span>
      </div>
      <div
        className={cn(
          "space-y-1.5 border-t border-calendar-footer-border bg-calendar-footer px-2 font-semibold text-calendar-footer-foreground",
          large ? "py-2 text-xs" : "py-1.5 text-[11px]"
        )}
      >
        <div
          className="flex min-w-0 items-start gap-1.5 px-1.5 text-calendar-paper-foreground"
          title={skateClass.location.address}
        >
          <MapPin
            size={large ? 13 : 11}
            className="mt-0.5 shrink-0"
            style={{ color: skateClass.location.color }}
          />
          <span
            className={cn(
              "min-w-0 break-words font-extrabold leading-tight",
              large ? "text-sm" : "text-xs"
            )}
          >
            {skateClass.location.name}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 px-1.5">
          <Clock size={large ? 13 : 11} className="shrink-0" />
          <span className="truncate">{timeLabel}</span>
        </div>
      </div>
    </div>
  );
};

export const ClassCard = ({
  skateClass,
  canManageClasses = false,
}: {
  skateClass: SkateClass;
  canManageClasses?: boolean;
}) => {
  return (
    <Card className="group relative flex min-h-32 items-start gap-4 overflow-hidden p-0 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:shadow-sm">
      <Link
        to={`/classes/${skateClass.id}`}
        aria-label={getClassLinkLabel(skateClass)}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative z-10 flex min-h-32 w-full items-start gap-4">
        <ClassIcon skateClass={skateClass} className="self-start rounded-r-none border-y-0 border-l-0" />

        <div className="flex min-w-0 flex-1 flex-col justify-between py-4 pr-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-base font-semibold leading-snug">
              {getClassDisplayTitle(skateClass)}
            </h3>
            {shouldShowClassStatus(skateClass.status, canManageClasses) && (
              <StatusBadge status={skateClass.status} />
            )}
          </div>

          {skateClass.description && (
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {skateClass.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <LocationBadge location={skateClass.location} />
            <span className="ml-auto hidden items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
              Open
              <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
