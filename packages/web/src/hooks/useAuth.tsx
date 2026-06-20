import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebase.js";
import { api } from "../lib/api.js";
import type { z } from "zod";
import type { userSchema } from "@skate5/shared";

type AppUser = z.infer<typeof userSchema>;

type AuthState = {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setFirebaseUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    api.getMe().then((me) => {
      if (!cancelled) {
        setProfile(me);
        setLoading(false);
      }
    }).catch((err: unknown) => {
      console.error("getMe failed:", err);
      if (!cancelled) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [firebaseUser]);

  async function signIn() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signUpWithEmail(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password
    );
    await credential.user.getIdToken(true);
  }

  async function logOut() {
    await signOut(getFirebaseAuth());
    setProfile(null);
  }

  return (
    <AuthContext
      value={{
        firebaseUser,
        profile,
        loading,
        signIn,
        signInWithEmail,
        signUpWithEmail,
        logOut,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
