import { type ReactNode, useEffect, useState } from "react";
import {
  firebaseClientConfigSchema,
  type FirebaseClientConfig,
} from "@skate5/shared";
import {
  Activity,
  CheckCircle2,
  Server,
  XCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getApiAuthHeaders } from "../lib/api.js";
import { cn } from "../lib/utils.js";
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
  const parsed = firebaseClientConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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

const formatCommitSha = (commitSha: string | null | undefined): string => {
  return commitSha ? commitSha.slice(0, 12) : "Unavailable";
};

const getCommitUrl = (commitSha: string): string => {
  return `https://github.com/makarandp0/skate5/commit/${encodeURIComponent(commitSha)}`;
};

const CommitValue = ({
  commitSha,
}: {
  commitSha: string | null | undefined;
}) => {
  if (!commitSha) return "Unavailable";

  const shortSha = formatCommitSha(commitSha);

  return (
    <a
      className="font-medium text-primary underline-offset-4 hover:underline"
      href={getCommitUrl(commitSha)}
      rel="noreferrer"
      target="_blank"
      title={commitSha}
    >
      {shortSha}
    </a>
  );
};

const InfoGrid = ({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) => {
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

export const Config = () => {
  const { profile } = useAuth();
  const [devStatus, setDevStatus] = useState<DevStatus | null>(null);
  const [firebaseConfig, setFirebaseConfig] =
    useState<FirebaseClientConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async (): Promise<void> => {
      try {
        const statusHeaders = await getApiAuthHeaders();
        const [configRes, statusRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/dev/status", { headers: statusHeaders }),
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

  const clientRows = [
    { label: "Mode", value: import.meta.env.MODE },
    { label: "Dev build", value: String(import.meta.env.DEV) },
    { label: "Prod build", value: String(import.meta.env.PROD) },
    { label: "Base URL", value: import.meta.env.BASE_URL },
    { label: "Authenticated as", value: profile?.email ?? "Unknown" },
  ];

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

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity size={18} />
          <h2 className="font-medium">Client</h2>
        </div>
        <InfoGrid rows={clientRows} />
      </Card>

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
                label: "Commit",
                value: <CommitValue commitSha={firebaseConfig?.commitSha} />,
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
