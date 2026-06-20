import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  STATIC_PATH: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(1),
  FIREBASE_CLIENT_API_KEY: z.string().min(1),
  FIREBASE_CLIENT_APP_ID: z.string().min(1),
  FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
});

const env = envSchema.parse(process.env);

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
};

export function getConfigDiagnostics(): Array<{
  key: string;
  configured: boolean;
  value: string | null;
}> {
  return diagnosticFields.map(({ key, sensitive }) => {
    const value = env[key];
    const configured = value !== undefined && value !== "";

    return {
      key,
      configured,
      value: formatDiagnosticValue(value, sensitive),
    };
  });
}

function formatDiagnosticValue(
  value: string | number | undefined,
  sensitive: boolean
): string | null {
  if (value === undefined || value === "") return null;
  if (sensitive) return "Set";
  return String(value);
}
