import { useMemo, useState } from "react";
import {
  Clipboard,
  Code2,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import skateJourneysIcon from "../assets/skate-journeys-icon.jpg";
import { createQrMatrix } from "../lib/qr.js";

const getDefaultAppUrl = (): string => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_ORIGIN) {
    return import.meta.env.VITE_DEV_ORIGIN;
  }

  return window.location.origin;
};

const QrPreview = ({ matrix }: { matrix: boolean[][] }) => {
  const quietZone = 4;
  const viewBoxSize = matrix.length + quietZone * 2;

  return (
    <svg
      className="aspect-square w-full max-w-[220px] border border-border bg-white"
      viewBox={`0 0 ${String(viewBoxSize)} ${String(viewBoxSize)}`}
      shapeRendering="crispEdges"
      aria-label="QR code for app URL"
      role="img"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="white" />
      {matrix.flatMap((row, y) =>
        row.map((dark, x) =>
          dark ? (
            <rect
              key={`${String(x)}-${String(y)}`}
              x={x + quietZone}
              y={y + quietZone}
              width="1"
              height="1"
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const About = () => {
  const appUrl = getDefaultAppUrl();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const qrMatrix = useMemo(() => {
    try {
      return createQrMatrix(appUrl);
    } catch {
      return null;
    }
  }, [appUrl]);

  const copyAppUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    } finally {
      window.setTimeout(() => {
        setCopyState("idle");
      }, 1800);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-white p-1.5 shadow-sm shadow-slate-900/10"
        >
          <img
            src={skateJourneysIcon}
            alt=""
            className="h-full w-full object-contain"
          />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">SkateJourney</h1>
          <p className="text-sm text-muted-foreground">
            Class coordination for the SkateJourney crew.
          </p>
        </div>
      </div>

      <section>
        <Card className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 self-start">
            <QrCode size={18} />
            <h2 className="font-medium">QR Code</h2>
          </div>
          {qrMatrix ? (
            <QrPreview matrix={qrMatrix} />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-border text-center text-sm text-muted-foreground">
              URL is too long
            </div>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <a
              className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
              href={appUrl}
              rel="noreferrer"
              target="_blank"
            >
              {appUrl}
            </a>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void copyAppUrl();
              }}
            >
              <Clipboard size={16} />
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Failed"
                  : "Copy"}
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Code2 size={18} />
            <h2 className="font-medium">Developer</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Built and maintained by River Trail Labs.</p>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                href="https://www.rivertrail-labs.com/"
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                River Trail Labs
              </a>
              <a
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                href="https://github.com/makarandp0/skate5"
                rel="noreferrer"
                target="_blank"
              >
                <Code2 size={16} />
                Source
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
