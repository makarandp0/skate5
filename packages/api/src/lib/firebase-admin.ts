import { initializeApp, cert, getApps } from "firebase-admin/app";
import { firebaseClientConfigSchema, type FirebaseClientConfig } from "@skate5/shared";
import { z } from "zod";
import { config } from "../config.js";

const serviceAccountSchema = z.object({
  project_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
});

let cachedClientConfig: FirebaseClientConfig | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const parseServiceAccount = (): z.infer<typeof serviceAccountSchema> => {
  try {
    const json = Buffer.from(config.firebase.serviceAccountBase64, "base64").toString(
      "utf-8"
    );
    const parsed: unknown = JSON.parse(json);
    return serviceAccountSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      [
        "Invalid FIREBASE_SERVICE_ACCOUNT_BASE64.",
        "Expected a base64-encoded Firebase service account JSON object with project_id, private_key, and client_email.",
        `Cause: ${getErrorMessage(error)}`,
      ].join(" ")
    );
  }
};

export const initFirebaseAdmin = (): void => {
  if (getApps().length > 0) return;

  const serviceAccount = parseServiceAccount();

  initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      privateKey: serviceAccount.private_key,
      clientEmail: serviceAccount.client_email,
    }),
  });

  cachedClientConfig = firebaseClientConfigSchema.parse({
    apiKey: config.firebase.clientApiKey,
    authDomain:
      config.firebase.authDomain ??
      `${serviceAccount.project_id}.firebaseapp.com`,
    projectId: serviceAccount.project_id,
    appId: config.firebase.clientAppId,
    commitSha: config.commitSha,
  });
};

export const getClientConfig = (): FirebaseClientConfig => {
  if (!cachedClientConfig) {
    throw new Error("Firebase not initialized — call initFirebaseAdmin() first");
  }
  return cachedClientConfig;
};
