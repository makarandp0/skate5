import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "../lib/api.js";
import {
  getClassDateKey,
  getClassSummaryLabel,
} from "../components/ClassCard.js";
import { ClassFullView } from "../components/ClassFullView.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import type { ClassListItem, SkateClass } from "@skate5/shared";

const compareClassesBySchedule = (
  left: Pick<SkateClass, "date" | "time" | "location">,
  right: Pick<SkateClass, "date" | "time" | "location">
): number => {
  const dateCompare = getClassDateKey(left.date).localeCompare(
    getClassDateKey(right.date)
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return [left.time ?? "", left.location.name].join(" ").localeCompare(
    [right.time ?? "", right.location.name].join(" ")
  );
};

const getNextClass = (
  currentClass: SkateClass,
  classes: ClassListItem[]
): ClassListItem | null => {
  const sortedClasses = [...classes].sort(compareClassesBySchedule);
  const currentIndex = sortedClasses.findIndex(
    (skateClass) => skateClass.id === currentClass.id
  );

  if (currentIndex >= 0) {
    return sortedClasses[currentIndex + 1] ?? null;
  }

  return (
    sortedClasses.find(
      (skateClass) => compareClassesBySchedule(skateClass, currentClass) > 0
    ) ?? null
  );
};

export const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [skateClass, setSkateClass] = useState<SkateClass | null>(null);
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const nextClass = useMemo(
    () => (skateClass ? getNextClass(skateClass, classes) : null),
    [classes, skateClass]
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getClass({ params: { id } }), api.getClasses({})])
      .then(([cls, classList]) => {
        setSkateClass(cls);
        setClasses(classList);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

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

  const dateKey = getClassDateKey(skateClass.date);
  const calendarUrl = `/?month=${dateKey.slice(0, 7)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={calendarUrl}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Calendar
        </Link>

        {nextClass && (
          <Link
            to={`/classes/${nextClass.id}`}
            aria-label={`Open next class: ${getClassSummaryLabel(nextClass)}`}
            title={getClassSummaryLabel(nextClass)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/90 px-3 py-2 text-sm font-bold text-foreground shadow-sm shadow-slate-900/5 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Next class
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      <ClassFullView
        skateClass={skateClass}
        onClassUpdated={setSkateClass}
      />
    </div>
  );
};
