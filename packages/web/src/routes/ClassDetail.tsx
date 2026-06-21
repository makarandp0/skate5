import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
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
  active,
  activeClass,
  onClick,
  disabled,
}: {
  label: string;
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
        "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
        active ? activeClass : "bg-muted text-muted-foreground hover:bg-muted/80",
        disabled && "opacity-50"
      )}
    >
      {label}
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
  const formatted = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const yesCount = signups.filter((s) => s.rsvp === "yes").length;
  const maybeCount = signups.filter((s) => s.rsvp === "maybe").length;

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{skateClass.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
          <p className="mt-3 text-sm leading-relaxed">{skateClass.description}</p>
        )}
      </div>

      {profile && skateClass.status === "published" && (
        <Card>
          <h2 className="mb-3 text-sm font-medium">Your RSVP</h2>
          <div className="flex gap-2">
            <RsvpButton
              label="Yes"
              active={currentRsvp === "yes"}
              activeClass="bg-green-600 text-white"
              onClick={() => void handleRsvp("yes")}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="Maybe"
              active={currentRsvp === "maybe"}
              activeClass="bg-yellow-500 text-white"
              onClick={() => void handleRsvp("maybe")}
              disabled={rsvpLoading}
            />
            <RsvpButton
              label="No"
              active={currentRsvp === "no"}
              activeClass="bg-red-500 text-white"
              onClick={() => void handleRsvp("no")}
              disabled={rsvpLoading}
            />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-medium">Attendance</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{yesCount}</strong> going
          </span>
          <span>
            <strong className="text-foreground">{maybeCount}</strong> maybe
          </span>
        </div>
      </Card>
    </div>
  );
};
