import { firebaseClientConfigSchema } from "@skate5/shared";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

let app: FirebaseApp;
let auth: Auth;

export const initFirebase = async (): Promise<void> => {
  const res = await fetch("/api/config");
  const { apiKey, authDomain, projectId, appId } =
    firebaseClientConfigSchema.parse(await res.json());
  app = initializeApp({ apiKey, authDomain, projectId, appId });
  auth = getAuth(app);
};

export const getFirebaseAuth = (): Auth => {
  return auth;
};
