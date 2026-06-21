import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clipboard,
  QrCode,
  Server,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { createQrMatrix } from "../lib/qr.js";
import { cn } from "../lib/utils.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Skeleton } from "../components/ui/Skeleton.js";

type DevStatus = {
  status: string;
  checkedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  staticServing: boolean;
  env: Array<{
    key: string;
    configured: boolean;
    value: string | null;
  }>;
};

type DevEnvEntry = DevStatus["env"][number];

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const getDefaultAppUrl = (): string => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_ORIGIN) {
    return import.meta.env.VITE_DEV_ORIGIN;
  }

  return window.location.origin;
};

const getField = (value: unknown, key: string): unknown => {
  if (typeof value !== "object" || value === null) return undefined;
  return Reflect.get(value, key);
};

const getStringField = (value: unknown, key: string): string | null => {
  const field = getField(value, key);
  return typeof field === "string" ? field : null;
};

const getNumberField = (value: unknown, key: string): number | null => {
  const field = getField(value, key);
  return typeof field === "number" ? field : null;
};

const getBooleanField = (value: unknown, key: string): boolean | null => {
  const field = getField(value, key);
  return typeof field === "boolean" ? field : null;
};

const parseDevEnvEntry = (value: unknown): DevEnvEntry | null => {
  const key = getStringField(value, "key");
  const configured = getBooleanField(value, "configured");
  const rawValue = getField(value, "value");

  if (!key || configured === null) return null;

  return {
    key,
    configured,
    value: typeof rawValue === "string" ? rawValue : null,
  };
};

const parseFirebaseClientConfig = (
  value: unknown
): FirebaseClientConfig | null => {
  const apiKey = getStringField(value, "apiKey");
  const authDomain = getStringField(value, "authDomain");
  const projectId = getStringField(value, "projectId");
  const appId = getStringField(value, "appId");

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
  };
};

const parseDevStatus = (value: unknown): DevStatus | null => {
  const status = getStringField(value, "status");
  const checkedAt = getStringField(value, "checkedAt");
  const uptimeSeconds = getNumberField(value, "uptimeSeconds");
  const nodeVersion = getStringField(value, "nodeVersion");
  const environment = getStringField(value, "environment");
  const staticServing = getBooleanField(value, "staticServing");
  const envValue = getField(value, "env");

  if (
    !status ||
    !checkedAt ||
    uptimeSeconds === null ||
    !nodeVersion ||
    !environment ||
    staticServing === null ||
    !Array.isArray(envValue)
  ) {
    return null;
  }

  return {
    status,
    checkedAt,
    uptimeSeconds,
    nodeVersion,
    environment,
    staticServing,
    env: envValue
      .map(parseDevEnvEntry)
      .filter((item): item is DevEnvEntry => item !== null),
  };
};

const maskValue = (value: string): string => {
  if (value.length <= 8) return `${String(value.length)} chars`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const formatUptime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${String(hours)}h ${String(minutes)}m`;
  if (minutes > 0) return `${String(minutes)}m ${String(seconds)}s`;
  return `${String(seconds)}s`;
};

const InfoGrid = ({ rows }: { rows: Array<{ label: string; value: string }> }) => {
  return (
    <dl className="grid gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 rounded-md bg-muted/60 px-3 py-2 sm:grid-cols-[140px_minmax(0,1fr)]"
        >
          <dt className="text-xs font-medium text-muted-foreground">
            {row.label}
          </dt>
          <dd className="min-w-0 break-words text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};

const StatusBadge = ({ online }: { online: boolean }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
        online
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      )}
    >
      {online ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {online ? "API online" : "API offline"}
    </span>
  );
};

const QrPreview = ({ matrix }: { matrix: boolean[][] }) => {
  const quietZone = 4;
  const viewBoxSize = matrix.length + quietZone * 2;

  return (
    <svg
      className="aspect-square w-full max-w-[180px] border border-border bg-white"
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

export const Config = () => {
  const { profile } = useAuth();
  const [appUrl, setAppUrl] = useState(getDefaultAppUrl);
  const [devStatus, setDevStatus] = useState<DevStatus | null>(null);
  const [firebaseConfig, setFirebaseConfig] =
    useState<FirebaseClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async (): Promise<void> => {
      try {
        const [configRes, statusRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/dev/status"),
        ]);

        if (cancelled) return;

        const configBody: unknown = configRes.ok ? await configRes.json() : null;
        const statusBody: unknown = statusRes.ok ? await statusRes.json() : null;

        setFirebaseConfig(parseFirebaseClientConfig(configBody));
        setDevStatus(parseDevStatus(statusBody));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const qrMatrix = useMemo(() => {
    try {
      return createQrMatrix(appUrl);
    } catch {
      return null;
    }
  }, [appUrl]);

  const clientRows = [
    { label: "Mode", value: import.meta.env.MODE },
    { label: "Dev build", value: String(import.meta.env.DEV) },
    { label: "Prod build", value: String(import.meta.env.PROD) },
    { label: "Base URL", value: import.meta.env.BASE_URL },
    { label: "Authenticated as", value: profile?.email ?? "Unknown" },
  ];

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Config</h1>
          <p className="text-sm text-muted-foreground">
            Runtime state and developer diagnostics
          </p>
        </div>
        <StatusBadge online={devStatus?.status === "ok"} />
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone size={18} />
            <h2 className="font-medium">Mobile URL</h2>
          </div>
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="app-url"
            >
              App URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="app-url"
                value={appUrl}
                onChange={(event) => {
                  setAppUrl(event.target.value);
                }}
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
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
          </div>
          <InfoGrid rows={clientRows} />
        </Card>

        <Card className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 self-start">
            <QrCode size={18} />
            <h2 className="font-medium">QR</h2>
          </div>
          {qrMatrix ? (
            <QrPreview matrix={qrMatrix} />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-border text-center text-sm text-muted-foreground">
              URL is too long
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <h2 className="font-medium">App Status</h2>
          </div>
          <InfoGrid
            rows={[
              { label: "API health", value: devStatus?.status ?? "Unavailable" },
              { label: "Runtime", value: devStatus?.environment ?? "Unknown" },
              {
                label: "Static serving",
                value: devStatus ? String(devStatus.staticServing) : "Unknown",
              },
              {
                label: "Uptime",
                value: devStatus
                  ? formatUptime(devStatus.uptimeSeconds)
                  : "Unavailable",
              },
              { label: "Node", value: devStatus?.nodeVersion ?? "Unavailable" },
              {
                label: "Checked",
                value: devStatus
                  ? new Date(devStatus.checkedAt).toLocaleString()
                  : "Unavailable",
              },
            ]}
          />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Server size={18} />
            <h2 className="font-medium">Firebase Client</h2>
          </div>
          <InfoGrid
            rows={[
              {
                label: "Project",
                value: firebaseConfig?.projectId ?? "Unavailable",
              },
              {
                label: "Auth domain",
                value: firebaseConfig?.authDomain ?? "Unavailable",
              },
              {
                label: "API key",
                value: firebaseConfig?.apiKey
                  ? maskValue(firebaseConfig.apiKey)
                  : "Unavailable",
              },
              {
                label: "App ID",
                value: firebaseConfig?.appId
                  ? maskValue(firebaseConfig.appId)
                  : "Unavailable",
              },
            ]}
          />
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Server size={18} />
          <h2 className="font-medium">Server Environment</h2>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {devStatus?.env.map((item) => (
            <div
              key={item.key}
              className="grid gap-2 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_110px_120px]"
            >
              <code className="min-w-0 truncate font-mono text-xs">
                {item.key}
              </code>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  item.configured ? "text-green-600" : "text-red-500"
                )}
              >
                {item.configured ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {item.configured ? "Configured" : "Missing"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {item.value ?? "No value"}
              </span>
            </div>
          )) ?? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Server status unavailable
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
