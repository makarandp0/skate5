import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { api } from "../lib/api.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { z } from "zod";
import type { skateClassSchema } from "@skate5/shared";

type SkateClass = z.infer<typeof skateClassSchema>;

const StatusDot = ({ status }: { status: string }) => {
  return (
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full flex-shrink-0",
        status === "published" && "bg-green-500",
        status === "draft" && "bg-yellow-500",
        status === "cancelled" && "bg-red-400"
      )}
      title={status}
    />
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

  return (
    <Link to={`/classes/${skateClass.id}`}>
      <Card className="flex items-center gap-4 transition-colors hover:bg-muted/50 active:bg-muted">
        <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md bg-muted">
          <span className="text-xs font-medium text-muted-foreground">
            {isValidDate ? date.toLocaleDateString(undefined, { month: "short" }) : "—"}
          </span>
          <span className="text-lg font-bold leading-tight">
            {isValidDate ? String(date.getDate()) : "—"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{skateClass.title}</h3>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatted}
            </span>
            {skateClass.time && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {skateClass.time}
              </span>
            )}
          </div>
        </div>
        <StatusDot status={skateClass.status} />
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
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
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

  const sorted = [...classes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-3">
      {sorted.map((cls) => (
        <ClassCard key={cls.id} skateClass={cls} />
      ))}
    </div>
  );
};
