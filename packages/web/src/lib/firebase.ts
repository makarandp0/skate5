import { z } from "zod";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const appConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  appId: z.string(),
});

let app: FirebaseApp;
let auth: Auth;

export async function initFirebase(): Promise<void> {
  const res = await fetch("/api/config");
  const config = appConfigSchema.parse(await res.json());
  app = initializeApp(config);
  auth = getAuth(app);
}

export function getFirebaseAuth(): Auth {
  return auth;
}
