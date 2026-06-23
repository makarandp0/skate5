import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  Info,
  LoaderCircle,
  MessageCircle,
  Send,
} from "lucide-react";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { cn } from "../lib/utils.js";
import { Avatar } from "./ui/Avatar.js";
import { Button } from "./ui/Button.js";
import { Skeleton } from "./ui/Skeleton.js";
import type { ChatMessage, SkateClass } from "@skate5/shared";

type ClassChatWindowProps = {
  skateClass: SkateClass;
};

const formatMessageTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const ClassChatWindow = ({ skateClass }: ClassChatWindowProps) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getClassChat({ params: { id: skateClass.id } })
      .then((response) => {
        if (cancelled) return;
        setMessages(response.messages);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load chat.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [skateClass.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      const message = await api.sendClassChatMessage({
        params: { id: skateClass.id },
        body: { text },
      });
      setMessages((current) => [...current, message]);
      setDraft("");
    } catch {
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-label={`Chat for ${skateClass.title}`}
      className="flex h-[calc(100dvh-9rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm shadow-slate-900/5"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle size={18} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Class chat</h2>
            <p className="truncate text-xs text-muted-foreground">
              {skateClass.title}
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => {
            const fromCurrentUser = profile?.id === message.userId;
            const time = formatMessageTime(message.createdAt);

            if (message.kind === "system") {
              return (
                <div
                  key={message.id}
                  className="mx-auto flex max-w-[92%] items-start gap-2 rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground"
                >
                  <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="break-words">{message.text}</p>
                    {time && <p className="mt-1 font-medium">{time}</p>}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  fromCurrentUser && "flex-row-reverse"
                )}
              >
                <Avatar
                  src={message.userPhotoUrl}
                  name={message.userDisplayName}
                  className="h-8 w-8"
                />
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg px-3 py-2",
                    fromCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {!fromCurrentUser && (
                    <p className="mb-1 truncate text-xs font-semibold text-muted-foreground">
                      {message.userDisplayName}
                    </p>
                  )}
                  <p className="break-words text-sm leading-relaxed">
                    {message.text}
                  </p>
                  {time && (
                    <p
                      className={cn(
                        "mt-1 text-right text-[11px] font-medium",
                        fromCurrentUser
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {time}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md bg-muted/50 px-3 py-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p className="mx-4 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        className="flex items-end gap-2 border-t border-border px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label className="sr-only" htmlFor={`class-chat-${skateClass.id}`}>
          Message
        </label>
        <textarea
          id={`class-chat-${skateClass.id}`}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          rows={2}
          maxLength={1000}
          placeholder="Message the class"
          className="min-h-10 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || draft.trim().length === 0}
          aria-label="Send message"
        >
          {sending ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </Button>
      </form>
    </section>
  );
};
