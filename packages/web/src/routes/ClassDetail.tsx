import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";
import { getClassDateKey } from "../components/ClassCard.js";
import { ClassFullView } from "../components/ClassFullView.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import type { SkateClass } from "@skate5/shared";

export const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [skateClass, setSkateClass] = useState<SkateClass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getClass({ params: { id } })
      .then((cls) => {
        setSkateClass(cls);
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

  return (
    <div className="space-y-6">
      <Link
        to={`/classes/date/${dateKey}`}
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <ClassFullView
        skateClass={skateClass}
        headingLevel="h1"
        onClassUpdated={setSkateClass}
      />
    </div>
  );
};
