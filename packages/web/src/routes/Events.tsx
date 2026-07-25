import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  systemEventTypeSchema,
  type SystemEvent,
  type SystemEventType,
} from "@skate5/shared";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { api } from "../lib/api.js";
import { cn } from "../lib/utils.js";

type EventFilter = SystemEventType | "all";

const systemEventTypes = systemEventTypeSchema.options;

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Could not load system events.";
};

const formatEventType = (type: SystemEventType): string => {
  return type
    .split(/[._]/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const stringifyMetadataValue = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stringifyMetadataValue).join(", ");
  }

  return JSON.stringify(value);
};

const getEventIcon = (eventType: SystemEventType): LucideIcon => {
  switch (eventType) {
    case "auth.login":
    case "auth.logout":
      return ShieldCheck;
    case "class.created":
    case "class.deleted":
    case "class.updated":
    case "grid.published":
    case "grid.unpublished":
      return Calendar;
    case "email.sent":
      return Mail;
    case "user.created":
    case "user.deleted":
    case "user.role_changed":
    case "user.updated":
      return User;
    default:
      eventType satisfies never;
      return Activity;
  }
};

const getEventToneClassName = (eventType: SystemEventType): string => {
  switch (eventType) {
    case "auth.login":
    case "auth.logout":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200";
    case "class.created":
    case "class.deleted":
    case "class.updated":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200";
    case "grid.published":
    case "grid.unpublished":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "email.sent":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200";
    case "user.created":
    case "user.deleted":
    case "user.role_changed":
    case "user.updated":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200";
    default:
      eventType satisfies never;
      return "border-border bg-muted text-muted-foreground";
  }
};

const eventMatchesQuery = (event: SystemEvent, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    event.type,
    event.summary,
    event.entityType ?? "",
    event.entityId ?? "",
    event.actorUserId ?? "",
    event.subjectUserId ?? "",
    JSON.stringify(event.metadata),
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
};

const EventTypeBadge = ({ type }: { type: SystemEventType }) => {
  const Icon = getEventIcon(type);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        getEventToneClassName(type)
      )}
    >
      <Icon size={14} />
      {formatEventType(type)}
    </span>
  );
};

const MetadataGrid = ({ metadata }: { metadata: Record<string, unknown> }) => {
  const entries = Object.entries(metadata).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  if (entries.length === 0) return null;

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0 rounded-md bg-muted/60 px-3 py-2">
          <dt className="truncate text-xs font-medium text-muted-foreground">
            {key}
          </dt>
          <dd className="mt-1 min-w-0 break-words font-mono text-xs">
            {stringifyMetadataValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const EventItem = ({ event }: { event: SystemEvent }) => {
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <EventTypeBadge type={event.type} />
          <p className="break-words text-sm font-medium">{event.summary}</p>
        </div>
        <time
          className="shrink-0 text-xs text-muted-foreground"
          dateTime={event.occurredAt}
        >
          {formatDateTime(event.occurredAt)}
        </time>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span className="min-w-0 truncate">
          Actor: {event.actorUserId ?? "System"}
        </span>
        <span className="min-w-0 truncate">
          Subject: {event.subjectUserId ?? "None"}
        </span>
        <span className="min-w-0 truncate">
          Entity:{" "}
          {event.entityType && event.entityId
            ? `${event.entityType}:${event.entityId}`
            : "None"}
        </span>
      </div>

      <MetadataGrid metadata={event.metadata} />
    </Card>
  );
};

export const Events = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async ({ quiet }: { quiet: boolean }): Promise<void> => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      setEvents(await api.getSystemEvents());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadEvents({ quiet: false });
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filter !== "all" && event.type !== filter) return false;
      return eventMatchesQuery(event, query);
    });
  }, [events, filter, query]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">System Events</h1>
          <p className="text-sm text-muted-foreground">
            Recent developer-visible activity
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadEvents({ quiet: true });
          }}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={cn(refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <section className="grid gap-3 rounded-lg border border-border/80 bg-background/80 p-3 sm:grid-cols-[minmax(0,1fr)_240px]">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <span className="sr-only">Search events</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
            placeholder="Search events"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label>
          <span className="sr-only">Filter event type</span>
          <select
            value={filter}
            onChange={(event) => {
              const value = event.currentTarget.value;
              const parsed = systemEventTypeSchema.safeParse(value);
              setFilter(parsed.success ? parsed.data : "all");
            }}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All event types</option>
            {systemEventTypes.map((type) => (
              <option key={type} value={type}>
                {formatEventType(type)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{String(filteredEvents.length)} shown</span>
        <span>{String(events.length)} loaded</span>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card className="py-10 text-center text-sm text-muted-foreground">
          No system events match the current filters.
        </Card>
      )}
    </div>
  );
};
