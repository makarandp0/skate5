import { initializeApp, cert, getApps } from "firebase-admin/app";
import { z } from "zod";

const serviceAccountSchema = z.object({
  project_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
});

interface ClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

let cachedClientConfig: ClientConfig | null = null;

export function initFirebaseAdmin(): void {
  if (getApps().length > 0) return;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is required");
  }

  const json = Buffer.from(base64, "base64").toString("utf-8");
  const serviceAccount = serviceAccountSchema.parse(JSON.parse(json));

  initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      privateKey: serviceAccount.private_key,
      clientEmail: serviceAccount.client_email,
    }),
  });

  const apiKey = process.env.FIREBASE_CLIENT_API_KEY;
  const appId = process.env.FIREBASE_CLIENT_APP_ID;
  if (!apiKey || !appId) {
    throw new Error("FIREBASE_CLIENT_API_KEY and FIREBASE_CLIENT_APP_ID are required");
  }

  cachedClientConfig = {
    apiKey,
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ??
      `${serviceAccount.project_id}.firebaseapp.com`,
    projectId: serviceAccount.project_id,
    appId,
  };
}

export function getClientConfig(): ClientConfig {
  if (!cachedClientConfig) {
    throw new Error("Firebase not initialized — call initFirebaseAdmin() first");
  }
  return cachedClientConfig;
}
