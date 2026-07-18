import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  LoaderCircle,
  MapPin,
  Save,
} from "lucide-react";
import { createClassSchema, classStatusSchema } from "@skate5/shared";
import { api } from "../lib/api.js";
import { CalendarDateTile } from "../components/CalendarDateTile.js";
import { Button } from "../components/ui/Button.js";
import { cn } from "../lib/utils.js";
import type { ClassStatus, Location } from "@skate5/shared";

const toDateKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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
  const valid = !Number.isNaN(date.getTime());

  if (!valid) {
    return {
      formatted: "Pick a date",
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
    weekdayLabel: date.toLocaleDateString(undefined, { weekday: "long" }),
  };
};

const statusOptions: Array<{ status: ClassStatus; label: string }> = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "cancelled", label: "Cancelled" },
];

export const ClassCreate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialDate = searchParams.get("date") ?? toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationSlug, setSelectedLocationSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ClassStatus>("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateParts = useMemo(() => getDateParts(selectedDate), [selectedDate]);
  const backDate = dateKeyPattern.test(selectedDate)
    ? selectedDate
    : toDateKey(new Date());
  const calendarUrl = `/?month=${backDate.slice(0, 7)}`;

  useEffect(() => {
    api
      .getLocations({})
      .then((data) => {
        setLocations(data);
        setSelectedLocationSlug((current) => current || (data[0]?.slug ?? ""));
      })
      .catch((err: unknown) => {
        console.error("getLocations failed:", err);
        setError("Could not load locations. Try again.");
      });
  }, []);

  const saveClass = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      const body = createClassSchema.parse({
        title: title.trim(),
        date: selectedDate,
        time: time.trim() || undefined,
        locationSlug: selectedLocationSlug,
        description: description.trim() || undefined,
        status: classStatusSchema.parse(status),
      });
      const skateClass = await api.createClass({ body });
      void navigate(`/classes/${skateClass.id}`);
    } catch (err) {
      console.error("createClass failed:", err);
      setError("Could not create class. Check the details and try again.");
      setSaving(false);
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void saveClass();
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Link
        to={calendarUrl}
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Calendar
      </Link>

      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <CalendarDateTile
            month={dateParts.monthLabel}
            day={dateParts.dayLabel}
            weekday={dateParts.weekdayLabel}
            size="large"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const active = status === option.status;

                return (
                  <button
                    key={option.status}
                    type="button"
                    onClick={() => {
                      setStatus(option.status);
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

            <label className="sr-only" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              required
              maxLength={120}
              placeholder="Class title"
              className="w-full rounded-md border border-transparent bg-transparent px-0 text-2xl font-black leading-tight outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-background/80 focus-visible:px-3 focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
            />

            <div className="mt-3 flex max-w-44 text-sm font-medium text-muted-foreground">
              <label className="flex min-w-0 items-center gap-1.5">
                <Calendar size={14} />
                <span className="sr-only">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                  }}
                  required
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background/80 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            <div className="mt-3 flex max-w-xs text-sm font-medium text-muted-foreground">
              <label className="flex min-w-0 items-center gap-1.5">
                <Clock size={14} />
                <span className="sr-only">Time</span>
                <input
                  type="text"
                  value={time}
                  onChange={(event) => {
                    setTime(event.target.value);
                  }}
                  placeholder="10 - 11 AM"
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background/80 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            <div className="mt-3 flex max-w-xs text-sm font-medium text-muted-foreground">
              <label className="flex min-w-0 items-center gap-1.5">
                <MapPin size={14} />
                <span className="sr-only">Location</span>
                <select
                  value={selectedLocationSlug}
                  onChange={(event) => {
                    setSelectedLocationSlug(event.target.value);
                  }}
                  required
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background/80 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {locations.map((location) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="sr-only" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              rows={5}
              placeholder="Add the class description, notes, or focus for the session."
              className="mt-4 min-h-32 w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground/80 outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-background/80 focus-visible:px-3 focus-visible:py-2 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="sticky bottom-20 z-30 flex flex-col-reverse gap-2 rounded-lg border border-border/80 bg-background/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:bottom-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigate(calendarUrl);
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
          Create class
        </Button>
      </div>
    </form>
  );
};
