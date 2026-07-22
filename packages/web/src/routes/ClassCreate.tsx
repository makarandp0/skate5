import { useEffect, useState, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { createClassSchema } from "@skate5/shared";
import { api } from "../lib/api.js";
import {
  ClassFormFields,
  type ClassFormValues,
} from "../components/ClassFormFields.js";
import { Button } from "../components/ui/Button.js";
import type { Location } from "@skate5/shared";

const toDateKey = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const ClassCreate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialDate = searchParams.get("date") ?? toDateKey(new Date());
  const [formValues, setFormValues] = useState<ClassFormValues>({
    date: initialDate,
    time: "",
    locationSlug: "",
    pills: [],
    status: "draft",
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backDate = dateKeyPattern.test(formValues.date)
    ? formValues.date
    : toDateKey(new Date());
  const calendarUrl = `/?month=${backDate.slice(0, 7)}`;

  useEffect(() => {
    api
      .getLocations({})
      .then((data) => {
        setLocations(data);
        setFormValues((current) => ({
          ...current,
          locationSlug: current.locationSlug || (data[0]?.slug ?? ""),
        }));
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
        date: formValues.date,
        time: formValues.time.trim() || undefined,
        locationSlug: formValues.locationSlug,
        pills: formValues.pills,
        status: formValues.status,
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
        <ClassFormFields
          values={formValues}
          locations={locations}
          onValuesChange={setFormValues}
          idPrefix="class-create"
          allowDateEdit
        />
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
