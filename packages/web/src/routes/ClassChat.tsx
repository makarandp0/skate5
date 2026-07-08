import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";
import { ClassChatWindow } from "../components/ClassChatWindow.js";
import { getClassDateKey } from "../components/ClassCard.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import type { SkateClass } from "@skate5/shared";

export const ClassChat = () => {
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
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[calc(100dvh-9rem)] min-h-[28rem] w-full" />
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
    <div className="space-y-3">
      <Link
        to={calendarUrl}
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Calendar
      </Link>

      <ClassChatWindow skateClass={skateClass} />
    </div>
  );
};
