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

export const initFirebaseAdmin = (): void => {
  if (getApps().length > 0) return;

  const json = Buffer.from(config.firebase.serviceAccountBase64, "base64").toString(
    "utf-8"
  );
  const serviceAccount = serviceAccountSchema.parse(JSON.parse(json));

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
