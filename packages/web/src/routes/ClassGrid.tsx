import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  Grid3X3,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  canAssumeRole,
  copyGridEntriesSchema,
  createGridEntrySchema,
  sendEmailSchema,
  updateGridEntrySchema,
} from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  ClassPills,
  ClassIcon,
  getClassDateKey,
  LocationBadge,
} from "../components/ClassCard.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { splitEmailList } from "../lib/email.js";
import { cn } from "../lib/utils.js";
import type {
  ClassGridResponse,
  GridCopySource,
  GridEntry,
  GridInstructor,
} from "@skate5/shared";

const adminActionClassName =
  "border-amber-300/80 bg-amber-50/80 text-amber-950 shadow-sm shadow-amber-900/5 dark:border-amber-400/30 dark:bg-amber-300/10 dark:text-amber-100";

const uniqueStrings = (values: string[]): string[] => {
  return [...new Set(values)];
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const textToHtmlParagraphs = (value: string): string => {
  return value
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`
    )
    .join("");
};

const getDateLabel = (value: string): string => {
  const dateKey = getClassDateKey(value);
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBD";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const InstructorChip = ({
  instructor,
  onRemove,
}: {
  instructor: GridInstructor | null;
  onRemove?: () => void;
}) => {
  const label = instructor?.displayName ?? "Unknown instructor";

  return (
    <span className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full bg-muted px-3 text-xs font-semibold text-foreground">
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X size={13} />
        </button>
      )}
    </span>
  );
};

const getInstructorNames = (
  entry: GridEntry,
  instructorById: Map<string, GridInstructor>
): string[] => {
  return entry.instructorIds.map(
    (instructorId) =>
      instructorById.get(instructorId)?.displayName ?? "Unknown instructor"
  );
};

const getGridEmailRecipients = (
  grid: ClassGridResponse,
  instructorById: Map<string, GridInstructor>
): string[] => {
  const assignedInstructorIds = uniqueStrings(
    grid.entries.flatMap((entry) => entry.instructorIds)
  );

  return uniqueStrings(
    assignedInstructorIds
      .map((instructorId) => instructorById.get(instructorId)?.email ?? "")
      .filter((email) => email.length > 0)
  );
};

const getDefaultGridEmailMessage = (grid: ClassGridResponse): string => {
  return [
    `Hello instructors! The grid is ready for ${getDateLabel(grid.class.date)} at ${grid.class.location.name}.`,
    "If you need any adjustments, please contact the admin team.",
  ].join("\n\n");
};

const buildGridEmailText = ({
  grid,
  message,
  instructorById,
  gridUrl,
}: {
  grid: ClassGridResponse;
  message: string;
  instructorById: Map<string, GridInstructor>;
  gridUrl: string;
}): string => {
  const rows = grid.entries.map((entry) => {
    const instructors = getInstructorNames(entry, instructorById).join(", ");
    return [
      entry.time ?? `Row ${String(entry.order + 1)}`,
      entry.classText ?? "Class TBD",
      instructors || "Unassigned",
      entry.notes ?? "",
    ].join(" | ");
  });

  return [
    message,
    "",
    getDateLabel(grid.class.date),
    grid.class.pills.length > 0 ? `Notes: ${grid.class.pills.join(", ")}` : "",
    `Location: ${grid.class.location.name} (${grid.class.location.address})`,
    "",
    "Time | Class | Instructors | Notes",
    ...rows,
    "",
    `View the grid in Skate5: ${gridUrl}`,
  ].join("\n");
};

const buildGridEmailHtml = ({
  grid,
  message,
  instructorById,
  gridUrl,
  generatedBy,
}: {
  grid: ClassGridResponse;
  message: string;
  instructorById: Map<string, GridInstructor>;
  gridUrl: string;
  generatedBy: string;
}): string => {
  const rows = grid.entries
    .map((entry) => {
      const instructors =
        getInstructorNames(entry, instructorById).join(", ") || "Unassigned";
      const classText = entry.classText ?? "Class TBD";
      const notes = entry.notes ?? "";
      const time = entry.time ?? `Row ${String(entry.order + 1)}`;

      return `
        <tr>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;font-weight:600;">${escapeHtml(time)}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;white-space:pre-line;">${escapeHtml(classText)}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;">${escapeHtml(instructors)}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;white-space:pre-line;">${escapeHtml(notes)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;">
      <h1 style="margin:0 0 4px;font-size:24px;">${escapeHtml(getDateLabel(grid.class.date))}</h1>
      ${
        grid.class.pills.length > 0
          ? `<p style="margin:0;color:#52525b;">${escapeHtml(grid.class.pills.join(", "))}</p>`
          : ""
      }
      <p style="margin:0 0 20px;color:#52525b;">${escapeHtml(grid.class.location.name)} - ${escapeHtml(grid.class.location.address)}</p>
      ${textToHtmlParagraphs(message)}
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
        <thead>
          <tr style="background:#f4f4f5;">
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Time</th>
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Class</th>
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Instructors</th>
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#71717a;">
        This message was generated by ${escapeHtml(generatedBy)}. For the latest assignments, view the
        <a href="${escapeHtml(gridUrl)}" style="color:#2563eb;">grid in Skate5</a>.
      </p>
    </div>
  `;
};

const GridEntryEditor = ({
  entry,
  instructors,
  instructorById,
  saving,
  onSave,
  onCancel,
}: {
  entry: GridEntry;
  instructors: GridInstructor[];
  instructorById: Map<string, GridInstructor>;
  saving: boolean;
  onSave: (entry: GridEntry) => Promise<void>;
  onCancel: () => void;
}) => {
  const [time, setTime] = useState(entry.time ?? "");
  const [classText, setClassText] = useState(entry.classText ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [instructorIds, setInstructorIds] = useState(entry.instructorIds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTime(entry.time ?? "");
    setClassText(entry.classText ?? "");
    setNotes(entry.notes ?? "");
    setInstructorIds(entry.instructorIds);
    setError(null);
  }, [entry]);

  const availableInstructors = instructors.filter(
    (instructor) =>
      instructor.rsvp === "yes" && !instructorIds.includes(instructor.userId)
  );

  const handleInstructorSelect = (
    event: ChangeEvent<HTMLSelectElement>
  ): void => {
    const selectedId = event.target.value;
    if (!selectedId || instructorIds.includes(selectedId)) return;
    setInstructorIds([...instructorIds, selectedId]);
    event.target.value = "";
  };

  const handleSave = async (): Promise<void> => {
    setError(null);

    try {
      const body = updateGridEntrySchema.parse({
        order: entry.order,
        time: time.trim() || null,
        classText: classText.trim() || null,
        notes: notes.trim() || null,
        instructorIds,
      });
      await onSave({
        ...entry,
        order: body.order,
        time: body.time ?? null,
        classText: body.classText ?? null,
        notes: body.notes ?? null,
        instructorIds: body.instructorIds,
      });
      onCancel();
    } catch (err) {
      console.error("save grid entry failed:", err);
      setError("Could not save this row. Check the fields and try again.");
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            Editing row {entry.order + 1}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {entry.classText ?? "Class TBD"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              onCancel();
            }}
          >
            <X size={14} />
            Close
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Time
          <input
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
            }}
            placeholder="10AM - 11AM"
            className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Class
          <textarea
            value={classText}
            onChange={(event) => {
              setClassText(event.target.value);
            }}
            rows={2}
            placeholder="Beginner edges, backwards skating, open skate"
            className="min-h-20 resize-y rounded-md border border-border bg-background/80 px-3 py-2 text-sm normal-case leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        Notes
        <textarea
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          rows={3}
          placeholder="Optional setup, space, or assignment notes"
          className="min-h-24 resize-y rounded-md border border-border bg-background/80 px-3 py-2 text-sm normal-case leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="space-y-2">
        <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Add Instructor
          <select
            value=""
            onChange={handleInstructorSelect}
            disabled={availableInstructors.length === 0}
            className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="" disabled>
              Choose instructor
            </option>
            {availableInstructors.map((instructor) => (
              <option key={instructor.userId} value={instructor.userId}>
                {instructor.displayName}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          {instructorIds.length > 0 ? (
            instructorIds.map((instructorId) => (
              <InstructorChip
                key={instructorId}
                instructor={instructorById.get(instructorId) ?? null}
                onRemove={() => {
                  setInstructorIds(
                    instructorIds.filter((id) => id !== instructorId)
                  );
                }}
              />
            ))
          ) : (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              No instructors assigned.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save row
        </Button>
      </div>
    </div>
  );
};

const GridEmailDialog = ({
  grid,
  instructorById,
  generatedBy,
  onClose,
}: {
  grid: ClassGridResponse;
  instructorById: Map<string, GridInstructor>;
  generatedBy: string;
  onClose: () => void;
}) => {
  const gridUrl = `${window.location.origin}/classes/${grid.class.id}/grid`;
  const [recipients, setRecipients] = useState(
    getGridEmailRecipients(grid, instructorById).join(", ")
  );
  const [subject, setSubject] = useState(
    `Grid for ${getDateLabel(grid.class.date)}`
  );
  const [message, setMessage] = useState(getDefaultGridEmailMessage(grid));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  const text = useMemo(
    () =>
      buildGridEmailText({
        grid,
        message,
        instructorById,
        gridUrl,
      }),
    [grid, message, instructorById, gridUrl]
  );

  const html = useMemo(
    () =>
      buildGridEmailHtml({
        grid,
        message,
        instructorById,
        gridUrl,
        generatedBy,
      }),
    [grid, message, instructorById, gridUrl, generatedBy]
  );

  const parsedEmail = useMemo(() => {
    return sendEmailSchema.safeParse({
      to: splitEmailList(recipients),
      subject,
      text,
      html,
    });
  }, [recipients, subject, text, html]);

  const validationMessage = (() => {
    if (parsedEmail.success) return null;
    const firstIssue = parsedEmail.error.issues[0];
    const firstPath = firstIssue.path[0];

    if (firstPath === "to") {
      return splitEmailList(recipients).length === 0
        ? "Add at least one recipient email address."
        : "Check recipient email addresses.";
    }

    if (firstPath === "subject") {
      return "Add a subject.";
    }

    return firstIssue.message;
  })();

  const handleSend = async (): Promise<void> => {
    setError(null);
    setSentId(null);

    if (!parsedEmail.success) {
      setError(validationMessage);
      return;
    }

    setSending(true);
    try {
      const response = await api.sendEmail({ body: parsedEmail.data });
      setSentId(response.id);
    } catch (err) {
      console.error("send grid email failed:", err);
      setError("Could not send the grid email. Check configuration and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-t-lg border border-border bg-background shadow-2xl shadow-black/25 sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grid-email-title"
        aria-describedby="grid-email-description"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            <h2 id="grid-email-title" className="text-lg font-bold">
              Send grid email
            </h2>
            <p
              id="grid-email-description"
              className="text-sm text-muted-foreground"
            >
              Review recipients, edit the message, then send the generated grid.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close email preview"
            onClick={onClose}
            disabled={sending}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="grid max-h-[calc(95vh-140px)] gap-0 overflow-y-auto lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
          <div className="space-y-4 border-b border-border p-4 lg:border-b-0 lg:border-r">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {sentId && (
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <p>Email sent. Resend id: {sentId}</p>
              </div>
            )}

            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              To
              <textarea
                value={recipients}
                onChange={(event) => {
                  setRecipients(event.currentTarget.value);
                }}
                rows={3}
                className="resize-y rounded-md border border-border bg-background px-3 py-2 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Subject
              <input
                value={subject}
                onChange={(event) => {
                  setSubject(event.currentTarget.value);
                }}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Message
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.currentTarget.value);
                }}
                rows={9}
                className="min-h-52 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm normal-case leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            {validationMessage && (
              <p className="text-sm text-muted-foreground">
                {validationMessage}
              </p>
            )}
          </div>

          <div className="space-y-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 text-sm font-medium">{subject}</p>
            </div>
            <div
              className="overflow-x-auto rounded-md border border-border bg-white p-4 text-slate-950"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Recipients are prefilled from assigned grid instructors.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={sending}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSend();
              }}
              disabled={sending}
            >
              {sending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              {sending ? "Sending..." : "Send grid"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GridCopyDialog = ({
  grid,
  saving,
  onCopy,
  onClose,
}: {
  grid: ClassGridResponse;
  saving: boolean;
  onCopy: (sourceClassId: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [sources, setSources] = useState<GridCopySource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    api
      .getClassGridCopySources({ params: { id: grid.class.id } })
      .then((response) => {
        if (cancelled) return;
        setSources(response);
        setSelectedSourceId(response[0]?.classId ?? "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("get grid copy sources failed:", err);
        if (!cancelled) {
          setError("Could not load old grids.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [grid.class.id]);

  const selectedSource =
    sources.find((source) => source.classId === selectedSourceId) ?? null;

  const handleCopy = async (): Promise<void> => {
    setError(null);
    const parsed = copyGridEntriesSchema.safeParse({
      sourceClassId: selectedSourceId,
    });

    if (!parsed.success) {
      setError("Choose a grid to copy.");
      return;
    }

    try {
      await onCopy(parsed.data.sourceClassId);
      onClose();
    } catch (err) {
      console.error("copy grid failed:", err);
      setError("Could not copy that grid. Try another source.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-lg border border-border bg-background shadow-2xl shadow-black/25 sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grid-copy-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            <h2 id="grid-copy-title" className="text-lg font-bold">
              Copy grid
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose an old grid to replace this one. Instructors will stay unassigned.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close copy grid"
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="max-h-[calc(90vh-140px)] space-y-4 overflow-y-auto p-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : sources.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sources.map((source) => {
                const selected = source.classId === selectedSourceId;

                return (
                  <label
                    key={source.classId}
                    className={cn(
                      "flex cursor-pointer justify-center rounded-md border border-border bg-background p-2 transition-colors",
                      selected && "border-primary bg-primary/5"
                    )}
                  >
                    <input
                      type="radio"
                      name="grid-source"
                      value={source.classId}
                      checked={selected}
                      onChange={() => {
                        setSelectedSourceId(source.classId);
                      }}
                      className="sr-only"
                    />
                    <ClassIcon
                      skateClass={{
                        date: source.date,
                        location: source.location,
                        time: source.time,
                      }}
                      className="rounded-md"
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              No old grids are available to copy.
            </div>
          )}

          {selectedSource && grid.entries.length > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Copying {getDateLabel(selectedSource.date)} will replace the {grid.entries.length} rows currently in this grid.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Times, class text, and notes are copied. Instructors are not copied.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleCopy();
              }}
              disabled={saving || loading || !selectedSourceId}
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Copy size={16} />
              )}
              Copy grid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ClassGrid = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const canManage = profile ? canAssumeRole(profile.role, "admin") : false;
  const [grid, setGrid] = useState<ClassGridResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getClassGrid({ params: { id } })
      .then((response) => {
        setGrid(response);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("getClassGrid failed:", err);
        setError("Could not load the grid.");
        setLoading(false);
      });
  }, [id]);

  const instructorById = useMemo(() => {
    const map = new Map<string, GridInstructor>();
    for (const instructor of grid?.instructors ?? []) {
      map.set(instructor.userId, instructor);
    }
    return map;
  }, [grid?.instructors]);

  const expandedEntry =
    grid?.entries.find((entry) => entry.id === expandedEntryId) ?? null;

  const setGridFromAction = async (
    actionId: string,
    action: () => Promise<ClassGridResponse>
  ): Promise<void> => {
    if (busyAction) return;
    setBusyAction(actionId);
    setError(null);
    try {
      const response = await action();
      setGrid(response);
      if (!response.entries.some((entry) => entry.id === expandedEntryId)) {
        setExpandedEntryId(null);
      }
    } catch (err) {
      console.error("grid action failed:", err);
      setError("That grid update did not go through. Try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddRow = async (): Promise<void> => {
    if (!id || !grid) return;
    const body = createGridEntrySchema.parse({
      order: grid.entries.length,
      time: "10AM - 11AM",
      classText: null,
      notes: null,
      instructorIds: [],
    });
    await setGridFromAction("add", () =>
      api.createClassGridEntry({ params: { id }, body })
    );
  };

  const handleSaveRow = async (entry: GridEntry): Promise<void> => {
    if (!id) return;
    await setGridFromAction(`save-${entry.id}`, () =>
      api.updateClassGridEntry({
        params: { id, entryId: entry.id },
        body: {
          order: entry.order,
          time: entry.time,
          classText: entry.classText,
          notes: entry.notes,
          instructorIds: entry.instructorIds,
        },
      })
    );
  };

  const handleDeleteRow = async (entry: GridEntry): Promise<void> => {
    if (!id) return;
    await setGridFromAction(`delete-${entry.id}`, () =>
      api.deleteClassGridEntry({ params: { id, entryId: entry.id } })
    );
  };

  const handleMoveRow = async (
    entry: GridEntry,
    direction: "up" | "down"
  ): Promise<void> => {
    if (!id || !grid) return;
    const currentIndex = grid.entries.findIndex((item) => item.id === entry.id);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= grid.entries.length
    ) {
      return;
    }

    const nextEntries = [...grid.entries];
    const current = nextEntries[currentIndex];
    const target = nextEntries[targetIndex];
    nextEntries[currentIndex] = target;
    nextEntries[targetIndex] = current;

    await setGridFromAction(`move-${entry.id}`, () =>
      api.reorderClassGridEntries({
        params: { id },
        body: { entryIds: nextEntries.map((item) => item.id) },
      })
    );
  };

  const handleCopyGrid = async (sourceClassId: string): Promise<void> => {
    if (!id) return;
    await setGridFromAction("copy", () =>
      api.copyClassGrid({
        params: { id },
        body: { sourceClassId },
      })
    );
  };

  const handlePublishToggle = async (): Promise<void> => {
    if (!id || !grid) return;
    await setGridFromAction("publish", () =>
      api.publishClassGrid({
        params: { id },
        body: { published: !grid.class.gridPublished },
      })
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-lg font-medium">{error ?? "Grid not found"}</p>
        <Link to="/" className="text-sm text-muted-foreground underline">
          Back to classes
        </Link>
      </div>
    );
  }

  const backDateKey = getClassDateKey(grid.class.date);
  const calendarUrl = `/?month=${backDateKey.slice(0, 7)}`;
  const savingAny = busyAction !== null;
  const showReadyNotice = !canManage && !grid.class.gridPublished;
  const gridColumnCount = canManage ? 4 : 3;

  return (
    <div className="space-y-5">
      <Link
        to={`/classes/${grid.class.id}`}
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <section className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Grid3X3 size={17} />
              <span>Class grid</span>
            </div>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
              {getDateLabel(grid.class.date)}
            </h1>
            <ClassPills pills={grid.class.pills} className="mt-3" />
            <div className="mt-3">
              <LocationBadge location={grid.class.location} showAddress />
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCopyDialogOpen(true);
                }}
                disabled={savingAny}
                className={cn("border", adminActionClassName)}
              >
                {busyAction === "copy" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Copy size={16} />
                )}
                Copy grid
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleAddRow();
                }}
                disabled={savingAny}
                className={cn("border", adminActionClassName)}
              >
                {busyAction === "add" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Add row
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handlePublishToggle();
                }}
                disabled={savingAny}
                variant={grid.class.gridPublished ? "secondary" : "default"}
              >
                {busyAction === "publish" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {grid.class.gridPublished ? "Unpublish" : "Publish"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmailDialogOpen(true);
                }}
                disabled={savingAny || grid.entries.length === 0}
                className={cn("border", adminActionClassName)}
              >
                <Mail size={16} />
                Email grid
              </Button>
            </div>
          )}
        </div>
      </section>

      {canManage && emailDialogOpen && (
        <GridEmailDialog
          grid={grid}
          instructorById={instructorById}
          generatedBy={profile?.displayName ?? "Skate5"}
          onClose={() => {
            setEmailDialogOpen(false);
          }}
        />
      )}

      {canManage && copyDialogOpen && (
        <GridCopyDialog
          grid={grid}
          saving={savingAny}
          onCopy={handleCopyGrid}
          onClose={() => {
            setCopyDialogOpen(false);
          }}
        />
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showReadyNotice ? (
        <Card className="py-8 text-center">
          <p className="font-semibold">Grid is not ready yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back after the administrators publish assignments.
          </p>
          <Link
            to={calendarUrl}
            className="mt-4 inline-flex text-sm font-medium text-primary underline"
          >
            Back to schedule
          </Link>
        </Card>
      ) : grid.entries.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto min-[840px]:overflow-x-clip">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="w-28 px-4 py-3">Time</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="w-60 px-4 py-3">Instructors</th>
                  {canManage && <th className="w-40 px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {grid.entries.map((entry, index) => {
                  const expanded = expandedEntry?.id === entry.id;

                  return (
                    <Fragment key={entry.id}>
                      <tr
                        className={cn(
                          "border-t border-border/80 align-top",
                          expanded && "bg-primary/5"
                        )}
                      >
                        <td className="px-4 py-3 font-semibold">
                          {entry.time ?? `Row ${String(entry.order + 1)}`}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {entry.classText ? (
                            <p className="line-clamp-3 whitespace-pre-line leading-relaxed">
                              {entry.classText}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">
                              Class TBD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {entry.instructorIds.length > 0 ? (
                              entry.instructorIds.map((instructorId) => (
                                <InstructorChip
                                  key={instructorId}
                                  instructor={
                                    instructorById.get(instructorId) ?? null
                                  }
                                />
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Move row up"
                                title="Move row up"
                                disabled={savingAny || index === 0}
                                onClick={() => {
                                  void handleMoveRow(entry, "up");
                                }}
                              >
                                <ArrowUp size={16} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Move row down"
                                title="Move row down"
                                disabled={
                                  savingAny || index === grid.entries.length - 1
                                }
                                onClick={() => {
                                  void handleMoveRow(entry, "down");
                                }}
                              >
                                <ArrowDown size={16} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Edit row"
                                title="Edit row"
                                disabled={savingAny}
                                className={cn(
                                  expanded && "border-primary bg-primary/10"
                                )}
                                onClick={() => {
                                  setExpandedEntryId(expanded ? null : entry.id);
                                }}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Delete row"
                                title="Delete row"
                                disabled={savingAny}
                                onClick={() => {
                                  void handleDeleteRow(entry);
                                }}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {entry.notes && (
                        <tr
                          className={cn(
                            "border-t border-border/40",
                            expanded && "bg-primary/5"
                          )}
                        >
                          <td
                            colSpan={gridColumnCount}
                            className="px-4 pb-3 pt-2 text-foreground/80"
                          >
                            <div className="grid gap-1 rounded-md bg-muted/40 px-3 py-2 sm:grid-cols-[5rem_minmax(0,1fr)]">
                              <span className="text-xs font-bold uppercase text-muted-foreground">
                                Notes
                              </span>
                              <p className="whitespace-pre-line leading-relaxed">
                                {entry.notes}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {canManage && expanded && (
                        <tr className="border-t border-primary/20 bg-primary/5">
                          <td
                            colSpan={gridColumnCount}
                            className="px-4 py-4"
                          >
                            <GridEntryEditor
                              entry={entry}
                              instructors={grid.instructors}
                              instructorById={instructorById}
                              saving={savingAny}
                              onSave={handleSaveRow}
                              onCancel={() => {
                                setExpandedEntryId(null);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="py-8 text-center">
          <p className="font-semibold">No grid rows yet.</p>
          {canManage && (
            <p className="mt-1 text-sm text-muted-foreground">
              Add a row or copy an old grid to start assigning instructors.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
