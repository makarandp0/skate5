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
  createGridEntrySchema,
  sendEmailSchema,
  updateGridEntrySchema,
} from "@skate5/shared";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  ClassPills,
  getClassDateKey,
  LocationBadge,
} from "../components/ClassCard.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { splitEmailList } from "../lib/email.js";
import { cn } from "../lib/utils.js";
import type {
  Badge,
  ClassGridResponse,
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

const BadgePill = ({ badge }: { badge: Badge | null }) => {
  if (!badge) {
    return (
      <span className="inline-flex min-h-7 items-center rounded-full bg-muted px-3 text-xs font-semibold text-muted-foreground">
        No badge
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-border bg-background/80 px-3 text-xs font-semibold">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: badge.color }}
      />
      <span>{badge.text}</span>
      {badge.group && (
        <span className="text-muted-foreground">({badge.group})</span>
      )}
    </span>
  );
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

const getBadgeLabel = (
  entry: GridEntry,
  badgeById: Map<string, Badge>
): string => {
  if (!entry.badgeId) return "No badge";
  const badge = badgeById.get(entry.badgeId);
  if (!badge) return "No badge";
  return badge.group ? `${badge.group}: ${badge.text}` : badge.text;
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
  badgeById,
  instructorById,
  gridUrl,
}: {
  grid: ClassGridResponse;
  message: string;
  badgeById: Map<string, Badge>;
  instructorById: Map<string, GridInstructor>;
  gridUrl: string;
}): string => {
  const rows = grid.entries.map((entry) => {
    const instructors = getInstructorNames(entry, instructorById).join(", ");
    return [
      entry.time ?? `Row ${String(entry.order + 1)}`,
      getBadgeLabel(entry, badgeById),
      entry.description ?? "No description",
      instructors || "Unassigned",
    ].join(" | ");
  });

  return [
    message,
    "",
    getDateLabel(grid.class.date),
    grid.class.pills.length > 0 ? `Notes: ${grid.class.pills.join(", ")}` : "",
    `Location: ${grid.class.location.name} (${grid.class.location.address})`,
    "",
    "Time | Badge | Description | Instructors",
    ...rows,
    "",
    `View the grid in Skate5: ${gridUrl}`,
  ].join("\n");
};

const buildGridEmailHtml = ({
  grid,
  message,
  badgeById,
  instructorById,
  gridUrl,
  generatedBy,
}: {
  grid: ClassGridResponse;
  message: string;
  badgeById: Map<string, Badge>;
  instructorById: Map<string, GridInstructor>;
  gridUrl: string;
  generatedBy: string;
}): string => {
  const rows = grid.entries
    .map((entry) => {
      const instructors =
        getInstructorNames(entry, instructorById).join(", ") || "Unassigned";
      const description = entry.description ?? "No description";
      const time = entry.time ?? `Row ${String(entry.order + 1)}`;

      return `
        <tr>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;font-weight:600;">${escapeHtml(time)}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;">${escapeHtml(getBadgeLabel(entry, badgeById))}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;white-space:pre-line;">${escapeHtml(description)}</td>
          <td style="border:1px solid #d4d4d8;padding:10px;vertical-align:top;">${escapeHtml(instructors)}</td>
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
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Badge</th>
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Description</th>
            <th style="border:1px solid #d4d4d8;padding:10px;text-align:left;">Instructors</th>
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
  badges,
  instructors,
  badgeById,
  instructorById,
  saving,
  onSave,
  onCancel,
}: {
  entry: GridEntry;
  badges: Badge[];
  instructors: GridInstructor[];
  badgeById: Map<string, Badge>;
  instructorById: Map<string, GridInstructor>;
  saving: boolean;
  onSave: (entry: GridEntry) => Promise<void>;
  onCancel: () => void;
}) => {
  const [time, setTime] = useState(entry.time ?? "");
  const [description, setDescription] = useState(entry.description ?? "");
  const [badgeId, setBadgeId] = useState(entry.badgeId ?? "");
  const [instructorIds, setInstructorIds] = useState(entry.instructorIds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTime(entry.time ?? "");
    setDescription(entry.description ?? "");
    setBadgeId(entry.badgeId ?? "");
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
        badgeId: badgeId || null,
        time: time.trim() || null,
        description: description.trim() || null,
        instructorIds,
      });
      await onSave({
        ...entry,
        order: body.order,
        badgeId: body.badgeId ?? null,
        time: body.time ?? null,
        description: body.description ?? null,
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
          <div className="mt-2">
            <BadgePill badge={entry.badgeId ? badgeById.get(entry.badgeId) ?? null : null} />
          </div>
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
          Badge
          <select
            value={badgeId}
            onChange={(event) => {
              setBadgeId(event.target.value);
            }}
            className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No badge</option>
            {badges.map((badge) => (
              <option key={badge.id} value={badge.id}>
                {badge.group ? `${badge.group}: ${badge.text}` : badge.text}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        Description
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          rows={3}
          placeholder="Class focus, space, or assignment notes"
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
  badgeById,
  instructorById,
  generatedBy,
  onClose,
}: {
  grid: ClassGridResponse;
  badgeById: Map<string, Badge>;
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
        badgeById,
        instructorById,
        gridUrl,
      }),
    [grid, message, badgeById, instructorById, gridUrl]
  );

  const html = useMemo(
    () =>
      buildGridEmailHtml({
        grid,
        message,
        badgeById,
        instructorById,
        gridUrl,
        generatedBy,
      }),
    [grid, message, badgeById, instructorById, gridUrl, generatedBy]
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

  const badgeById = useMemo(() => {
    const map = new Map<string, Badge>();
    for (const badge of grid?.badges ?? []) {
      map.set(badge.id, badge);
    }
    return map;
  }, [grid?.badges]);

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
    const firstBadgeId = grid.badges.length > 0 ? grid.badges[0].id : null;
    const body = createGridEntrySchema.parse({
      order: grid.entries.length,
      badgeId: firstBadgeId,
      time: "10AM - 11AM",
      description: null,
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
          badgeId: entry.badgeId,
          time: entry.time,
          description: entry.description,
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

  const handleDuplicate = async (): Promise<void> => {
    if (!id) return;
    await setGridFromAction("duplicate", () =>
      api.duplicatePreviousClassGrid({ params: { id } })
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
              {grid.entries.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void handleDuplicate();
                  }}
                  disabled={savingAny}
                  className={cn("border", adminActionClassName)}
                >
                  {busyAction === "duplicate" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Copy size={16} />
                  )}
                  Duplicate
                </Button>
              )}
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
          badgeById={badgeById}
          instructorById={instructorById}
          generatedBy={profile?.displayName ?? "Skate5"}
          onClose={() => {
            setEmailDialogOpen(false);
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="w-24 px-4 py-3">Time</th>
                  <th className="w-48 px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="w-64 px-4 py-3">Instructors</th>
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
                        <td className="px-4 py-3">
                          <BadgePill
                            badge={
                              entry.badgeId
                                ? badgeById.get(entry.badgeId) ?? null
                                : null
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {entry.description ? (
                            <p className="line-clamp-3 whitespace-pre-line leading-relaxed">
                              {entry.description}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">
                              No description
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
                      {canManage && expanded && (
                        <tr className="border-t border-primary/20 bg-primary/5">
                          <td
                            colSpan={5}
                            className="px-4 py-4"
                          >
                            <GridEntryEditor
                              entry={entry}
                              badges={grid.badges}
                              instructors={grid.instructors}
                              badgeById={badgeById}
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
              Add a row or duplicate last week to start assigning instructors.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
