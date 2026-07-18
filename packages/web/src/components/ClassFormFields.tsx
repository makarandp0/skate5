import { Calendar, Clock, MapPin } from "lucide-react";
import { ClassIcon } from "./ClassCard.js";
import { Skeleton } from "./ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { ClassStatus, Location } from "@skate5/shared";

export type ClassFormValues = {
  title: string;
  date: string;
  time: string;
  locationSlug: string;
  description: string;
  status: ClassStatus;
};

const statusOptions: Array<{ status: ClassStatus; label: string }> = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "cancelled", label: "Cancelled" },
];

type ClassFormFieldsProps = {
  values: ClassFormValues;
  locations: Location[];
  onValuesChange: (values: ClassFormValues) => void;
  idPrefix: string;
  allowDateEdit?: boolean;
  showPreview?: boolean;
  previewLocation?: Location;
};

export const ClassFormFields = ({
  values,
  locations,
  onValuesChange,
  idPrefix,
  allowDateEdit = false,
  showPreview = true,
  previewLocation,
}: ClassFormFieldsProps) => {
  const selectedLocation =
    locations.find((location) => location.slug === values.locationSlug) ??
    previewLocation;

  const updateValues = (nextValues: Partial<ClassFormValues>): void => {
    onValuesChange({ ...values, ...nextValues });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {showPreview &&
        (selectedLocation ? (
          <ClassIcon
            skateClass={{
              date: values.date,
              location: selectedLocation,
              time: values.time,
            }}
            size="large"
          />
        ) : (
          <Skeleton className="h-44 w-44 flex-shrink-0 rounded-lg" />
        ))}

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const active = values.status === option.status;

            return (
              <button
                key={option.status}
                type="button"
                onClick={() => {
                  updateValues({ status: option.status });
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

        <label className="sr-only" htmlFor={`${idPrefix}-title`}>
          Title
        </label>
        <input
          id={`${idPrefix}-title`}
          value={values.title}
          onChange={(event) => {
            updateValues({ title: event.target.value });
          }}
          required
          maxLength={120}
          placeholder="Class title"
          className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-2xl font-black leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
        />

        <div
          className={cn(
            "mt-3 grid gap-3",
            allowDateEdit
              ? "sm:grid-cols-[minmax(0,11rem)_minmax(0,14rem)_minmax(0,18rem)]"
              : "sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)]"
          )}
        >
          {allowDateEdit && (
            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Date
              </span>
              <input
                type="date"
                value={values.date}
                onChange={(event) => {
                  updateValues({ date: event.target.value });
                }}
                required
                className="h-10 min-w-0 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          )}

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Time
            </span>
            <input
              type="text"
              value={values.time}
              onChange={(event) => {
                updateValues({ time: event.target.value });
              }}
              placeholder="10 - 11 AM"
              className="h-10 min-w-0 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              Location
            </span>
            <select
              value={values.locationSlug}
              onChange={(event) => {
                updateValues({ locationSlug: event.target.value });
              }}
              required
              className="h-10 min-w-0 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {locations.map((location) => (
                <option key={location.slug} value={location.slug}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="sr-only" htmlFor={`${idPrefix}-description`}>
          Description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(event) => {
            updateValues({ description: event.target.value });
          }}
          rows={5}
          placeholder="Add the class description, notes, or focus for the session."
          className="mt-4 min-h-32 w-full resize-y rounded-md border border-border bg-background/80 px-3 py-2 text-sm leading-relaxed text-foreground/80 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
};
