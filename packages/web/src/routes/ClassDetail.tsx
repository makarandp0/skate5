import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleHelp,
  Clock,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { CalendarDateTile } from "../components/CalendarDateTile.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { z } from "zod";
import type { skateClassSchema, signupSchema, rsvpStatusSchema } from "@skate5/shared";

type SkateClass = z.infer<typeof skateClassSchema>;
type Signup = z.infer<typeof signupSchema>;
type RsvpStatus = z.infer<typeof rsvpStatusSchema>;

const noSignups: Signup[] = [];

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

export const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [skateClass, setSkateClass] = useState<SkateClass | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getClass({ params: { id } }),
      api.getClassSignups({ params: { id } }).catch(() => noSignups),
    ]).then(([cls, sigs]) => {
      setSkateClass(cls);
      setSignups(sigs);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id]);

  const mySignup = signups.find((s) => s.userId === profile?.id);
  const currentRsvp: RsvpStatus = mySignup?.rsvp ?? "none";

  const handleRsvp = async (rsvp: RsvpStatus): Promise<void> => {
    if (!id || rsvpLoading) return;
    setRsvpLoading(true);
    try {
      await api.rsvp({ params: { id }, body: { rsvp } });
      const updated = await api.getClassSignups({ params: { id } });
      setSignups(updated);
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!skateClass) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Class not found</p>
        <Link to="/" className="mt-2 text-sm text-muted-foreground underline">
          Back to classes
        </Link>
      </div>
    );
  }

  const rawDate = skateClass.date;
  const date = new Date(rawDate.includes("T") ? rawDate : rawDate + "T00:00:00");
  const isValidDate = !Number.isNaN(date.getTime());
  const formatted = isValidDate
    ? date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : skateClass.date;
  const monthLabel = isValidDate
    ? date.toLocaleDateString(undefined, { month: "short" })
    : "TBD";
  const dayLabel = isValidDate ? String(date.getDate()) : "-";
  const weekdayLabel = isValidDate
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : "Date";

  const yesCount = signups.filter((s) => s.rsvp === "yes").length;
  const maybeCount = signups.filter((s) => s.rsvp === "maybe").length;

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <CalendarDateTile
            month={monthLabel}
            day={dayLabel}
            weekday={weekdayLabel}
            size="large"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
              {skateClass.status}
            </div>
            <h1 className="text-2xl font-black leading-tight sm:text-3xl">
              {skateClass.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatted}
              </span>
              {skateClass.time && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {skateClass.time}
                </span>
              )}
            </div>
            {skateClass.description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
                {skateClass.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {profile && skateClass.status === "published" && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Your RSVP</h2>
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
              onClick={() => void handleRsvp("yes")}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="Maybe"
              icon={CircleHelp}
              active={currentRsvp === "maybe"}
              activeClass="bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20"
              onClick={() => void handleRsvp("maybe")}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="No"
              icon={XCircle}
              active={currentRsvp === "no"}
              activeClass="bg-red-500 text-white"
              onClick={() => void handleRsvp("no")}
              disabled={rsvpLoading}
            />
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <UsersRound size={17} className="text-primary" />
          <h2 className="text-sm font-semibold">Attendance</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:max-w-sm">
          <span className="rounded-md bg-accent/10 px-3 py-2 text-muted-foreground">
            <strong className="mr-1 text-lg text-accent">{yesCount}</strong>
            {" "}going
          </span>
          <span className="rounded-md bg-secondary/25 px-3 py-2 text-muted-foreground">
            <strong className="mr-1 text-lg text-secondary-foreground">
              {maybeCount}
            </strong>
            {" "}maybe
          </span>
        </div>
      </Card>
    </div>
  );
};
