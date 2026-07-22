import { useState } from "react";
import { Calendar, Clock, MapPin, Plus, Tag, X } from "lucide-react";
import { ClassIcon } from "./ClassCard.js";
import { Skeleton } from "./ui/Skeleton.js";
import { cn } from "../lib/utils.js";
import type { EditableClassStatus, Location } from "@skate5/shared";

export type ClassFormValues = {
  date: string;
  time: string;
  locationSlug: string;
  pills: string[];
  status: EditableClassStatus;
};

const statusOptions: Array<{ status: EditableClassStatus; label: string }> = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "cancelled", label: "Cancelled" },
];

const pillSuggestions = [
  "Labor Day Weekend",
  "Free classes",
  "Mothers Day Weekend",
  "No Classes",
  "No Beginner Class",
  "No Advanced Class",
  "Depends on Snow",
];

const maxClassPills = 8;

const normalizePill = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const addPill = (pills: string[], value: string): string[] => {
  if (pills.length >= maxClassPills) return pills;

  const pill = normalizePill(value);
  if (!pill) return pills;

  const exists = pills.some(
    (existing) => existing.toLocaleLowerCase() === pill.toLocaleLowerCase()
  );

  return exists ? pills : [...pills, pill];
};

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
  const [customPill, setCustomPill] = useState("");

  const updateValues = (nextValues: Partial<ClassFormValues>): void => {
    onValuesChange({ ...values, ...nextValues });
  };

  const handleAddCustomPill = (): void => {
    const nextPills = addPill(values.pills, customPill);
    updateValues({ pills: nextPills });
    setCustomPill("");
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

        <div
          className={cn(
            "grid gap-3",
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

        <div className="mt-4 space-y-3 rounded-md border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Tag size={14} />
            Class pills
          </div>

          {values.pills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {values.pills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => {
                    updateValues({
                      pills: values.pills.filter((current) => current !== pill),
                    });
                  }}
                  className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-950 shadow-sm shadow-slate-900/5 transition-colors hover:bg-emerald-100 dark:border-emerald-300/45 dark:bg-emerald-300/15 dark:text-emerald-50 dark:hover:bg-emerald-300/25"
                >
                  <Tag
                    size={12}
                    className="shrink-0 text-emerald-700 dark:text-emerald-200"
                  />
                  <span className="truncate">{pill}</span>
                  <X size={13} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Regular classes do not need pills.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {pillSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  updateValues({
                    pills: addPill(values.pills, suggestion),
                  });
                }}
                disabled={values.pills.some(
                  (pill) =>
                    pill.toLocaleLowerCase() ===
                    suggestion.toLocaleLowerCase()
                ) || values.pills.length >= maxClassPills}
                className="inline-flex min-h-8 items-center rounded-full border border-border bg-background/70 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 disabled:opacity-45"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`${idPrefix}-custom-pill`}>
              Custom pill
            </label>
            <input
              id={`${idPrefix}-custom-pill`}
              value={customPill}
              onChange={(event) => {
                setCustomPill(event.target.value);
              }}
              maxLength={40}
              placeholder="Custom pill"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddCustomPill}
              disabled={
                !normalizePill(customPill) ||
                values.pills.length >= maxClassPills
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background/70 px-4 text-sm font-medium transition-colors hover:bg-muted/70 disabled:opacity-50"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
