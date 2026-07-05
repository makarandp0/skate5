import "dotenv/config";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const requiredNonEmptyStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1)
);

const optionalNonEmptyStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional()
);

const portSchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().int().positive().default(3000)
);

const nodeEnvSchema = z.preprocess(
  emptyStringToUndefined,
  z.enum(["development", "test", "production"]).default("development")
);

const databaseUrlSchema = requiredNonEmptyStringSchema.superRefine((value, ctx) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      ctx.addIssue({
        code: "custom",
        message: "Expected a postgres:// or postgresql:// URL",
      });
    }
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Expected a valid postgres:// or postgresql:// URL",
    });
  }
});

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: portSchema,
  STATIC_PATH: optionalNonEmptyStringSchema,
  DATABASE_URL: databaseUrlSchema,
  FIREBASE_SERVICE_ACCOUNT_BASE64: requiredNonEmptyStringSchema,
  FIREBASE_CLIENT_API_KEY: requiredNonEmptyStringSchema,
  FIREBASE_CLIENT_APP_ID: requiredNonEmptyStringSchema,
  FIREBASE_AUTH_DOMAIN: optionalNonEmptyStringSchema,
  RESEND_API_KEY: optionalNonEmptyStringSchema,
  RESEND_FROM_EMAIL: optionalNonEmptyStringSchema,
  RESEND_REPLY_TO: optionalNonEmptyStringSchema,
  RAILWAY_GIT_COMMIT_SHA: optionalNonEmptyStringSchema,
  GIT_COMMIT_SHA: optionalNonEmptyStringSchema,
  COMMIT_SHA: optionalNonEmptyStringSchema,
  SOURCE_VERSION: optionalNonEmptyStringSchema,
});

export class StartupConfigurationError extends Error {
  readonly issues: ReadonlyArray<string>;

  constructor(error: z.ZodError) {
    const issues = error.issues.map((issue) => {
      const key = issue.path.join(".") || "environment";
      return `${key}: ${issue.message}`;
    });

    super(`Invalid startup configuration: ${issues.join("; ")}`);
    this.name = "StartupConfigurationError";
    this.issues = issues;
  }
}

const parseEnv = (source: unknown): z.infer<typeof envSchema> => {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  const error = new StartupConfigurationError(result.error);

  console.error("FATAL startup: invalid environment configuration.");
  console.error(
    "Required Railway variables: DATABASE_URL, FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_CLIENT_API_KEY, FIREBASE_CLIENT_APP_ID."
  );
  console.error(
    "Optional variables may be omitted; empty FIREBASE_AUTH_DOMAIN, STATIC_PATH, and Resend variables are treated as unset."
  );
  error.issues.forEach((issue) => {
    console.error(` - ${issue}`);
  });

  throw error;
};

const env = parseEnv(process.env);

type EnvKey = keyof typeof env;

interface ConfigDiagnosticField {
  key: EnvKey;
  sensitive: boolean;
}

const diagnosticFields: ConfigDiagnosticField[] = [
  { key: "NODE_ENV", sensitive: false },
  { key: "PORT", sensitive: false },
  { key: "STATIC_PATH", sensitive: false },
  { key: "DATABASE_URL", sensitive: true },
  { key: "FIREBASE_SERVICE_ACCOUNT_BASE64", sensitive: true },
  { key: "FIREBASE_CLIENT_API_KEY", sensitive: true },
  { key: "FIREBASE_CLIENT_APP_ID", sensitive: true },
  { key: "FIREBASE_AUTH_DOMAIN", sensitive: false },
  { key: "RESEND_API_KEY", sensitive: true },
  { key: "RESEND_FROM_EMAIL", sensitive: false },
  { key: "RESEND_REPLY_TO", sensitive: false },
];

export const config = {
  environment: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  staticPath: env.STATIC_PATH,
  databaseUrl: env.DATABASE_URL,
  firebase: {
    serviceAccountBase64: env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    clientApiKey: env.FIREBASE_CLIENT_API_KEY,
    clientAppId: env.FIREBASE_CLIENT_APP_ID,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
  },
  email: {
    resendApiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL ?? "Skate5 <noreply@rivertrail-labs.com>",
    replyTo: env.RESEND_REPLY_TO ?? "skate5-noreply@mail.rivertrail-labs.com",
  },
  commitSha:
    env.RAILWAY_GIT_COMMIT_SHA ??
    env.GIT_COMMIT_SHA ??
    env.COMMIT_SHA ??
    env.SOURCE_VERSION ??
    null,
};

const formatDiagnosticValue = (
  value: string | number | undefined,
  sensitive: boolean
): string | null => {
  if (value === undefined || value === "") return null;
  if (sensitive) return "Set";
  return String(value);
};

export const getConfigDiagnostics = (): Array<{
  key: string;
  configured: boolean;
  value: string | null;
}> => {
  return diagnosticFields.map(({ key, sensitive }) => {
    const value = env[key];
    const configured = value !== undefined && value !== "";

    return {
      key,
      configured,
      value: formatDiagnosticValue(value, sensitive),
    };
  });
};
