import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { sendEmailSchema } from "@skate5/shared";
import { api } from "../lib/api.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";

const splitEmailList = (value: string): string[] => {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Could not send email.";
};

export const Email = () => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  const parsedBody = useMemo(() => {
    return sendEmailSchema.safeParse({
      to: splitEmailList(to),
      cc: splitEmailList(cc),
      bcc: splitEmailList(bcc),
      subject,
      text: text.trim() || undefined,
      html: html.trim() || undefined,
    });
  }, [to, cc, bcc, subject, text, html]);

  const validationMessage = parsedBody.success
    ? null
    : parsedBody.error.issues[0]?.message ?? "Check the email details.";

  const send = async (): Promise<void> => {
    setError(null);
    setSentId(null);

    if (!parsedBody.success) {
      setError(validationMessage);
      return;
    }

    setSending(true);
    try {
      const response = await api.sendEmail({ body: parsedBody.data });
      setSentId(response.id);
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setText("");
      setHtml("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Email</h1>
        <p className="text-sm text-muted-foreground">
          Send app emails through Resend using the Skate5 sender domain.
        </p>
      </div>

      <Card className="space-y-4">
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

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            To
            <input
              value={to}
              onChange={(event) => {
                setTo(event.currentTarget.value);
              }}
              placeholder="coach@example.com, parent@example.com"
              className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              CC
              <input
                value={cc}
                onChange={(event) => {
                  setCc(event.currentTarget.value);
                }}
                className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              BCC
              <input
                value={bcc}
                onChange={(event) => {
                  setBcc(event.currentTarget.value);
                }}
                className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            Subject
            <input
              value={subject}
              onChange={(event) => {
                setSubject(event.currentTarget.value);
              }}
              className="h-10 rounded-md border border-border bg-background/80 px-3 text-sm normal-case text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            Plain Text Body
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.currentTarget.value);
              }}
              rows={8}
              placeholder="Write the email body here."
              className="min-h-48 resize-y rounded-md border border-border bg-background/80 px-3 py-2 text-sm normal-case leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <details className="rounded-md border border-border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              HTML body
            </summary>
            <label className="mt-3 grid gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              HTML
              <textarea
                value={html}
                onChange={(event) => {
                  setHtml(event.currentTarget.value);
                }}
                rows={8}
                placeholder="<p>Optional HTML version</p>"
                className="min-h-48 resize-y rounded-md border border-border bg-background/80 px-3 py-2 font-mono text-xs normal-case leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </details>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Recipients can be separated with commas, semicolons, spaces, or new
            lines.
          </p>
          <Button
            type="button"
            onClick={() => {
              void send();
            }}
            disabled={sending}
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
