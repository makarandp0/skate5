import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
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
import {
  canAssumeRole,
  getAssignableRoles,
  type UserRole,
} from "@skate5/shared";
import {
  setStoredEffectiveRole,
} from "../lib/rolePreference.js";
import type { z } from "zod";
import type { userSchema } from "@skate5/shared";

type AppUser = z.infer<typeof userSchema>;

type AuthState = {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  availableRoles: UserRole[];
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  setEffectiveRole: (role: UserRole) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (): Promise<AppUser> => {
    try {
      return await api.getMe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("400") || message.includes("403")) {
        setStoredEffectiveRole(null);
        return api.getMe();
      }
      throw err;
    }
  }, []);

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
    loadProfile().then((me) => {
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
  }, [firebaseUser, loadProfile]);

  const availableRoles = useMemo(() => {
    if (!profile) return [];
    return getAssignableRoles(profile.actualRole);
  }, [profile]);

  const finishSignIn = async (user: FirebaseUser): Promise<void> => {
    setFirebaseUser(user);
    setLoading(true);

    try {
      await user.getIdToken(true);
      setProfile(await loadProfile());
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    await finishSignIn(credential.user);
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password
    );
    await finishSignIn(credential.user);
  };

  const signUpWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password
    );
    await finishSignIn(credential.user);
  };

  const logOut = async (): Promise<void> => {
    await signOut(getFirebaseAuth());
    setStoredEffectiveRole(null);
    setProfile(null);
  };

  const setEffectiveRole = async (role: UserRole): Promise<void> => {
    if (!profile || !canAssumeRole(profile.actualRole, role)) {
      throw new Error("Role is not available to this user");
    }

    setStoredEffectiveRole(role === profile.actualRole ? null : role);
    setLoading(true);

    try {
      setProfile(await loadProfile());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext
      value={{
        firebaseUser,
        profile,
        loading,
        availableRoles,
        signIn,
        signInWithEmail,
        signUpWithEmail,
        setEffectiveRole,
        logOut,
      }}
    >
      {children}
    </AuthContext>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
