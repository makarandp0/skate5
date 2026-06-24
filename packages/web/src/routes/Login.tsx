import { useRef, useState, type SyntheticEvent } from "react";
import { Navigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/Button.js";
import brandBanner from "../assets/skate-journeys-banner.png";

const getAuthErrorCode = (err: unknown): string | null => {
  if (err instanceof FirebaseError) return err.code;

  if (!(err instanceof Error)) return null;

  const match = /\((auth\/[^)]+)\)/.exec(err.message);
  return match ? match[1] : null;
};

const getAuthErrorMessage = (err: unknown): string => {
  const code = getAuthErrorCode(err);

  if (code === "auth/email-already-in-use") {
    return "That email already has an account. Try signing in instead.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "No account matched those credentials. Create an account or check the email and password.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Email/password sign-in is not enabled for this Firebase project.";
  }
  if (code === "auth/admin-restricted-operation") {
    return "This Firebase project is not allowing this sign-in method.";
  }
  if (code === "auth/weak-password") {
    return "Use a password with at least 6 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }
  if (code === "auth/missing-password") {
    return "Enter a password.";
  }
  if (code === "auth/network-request-failed") {
    return "Could not reach Firebase Auth. Check your connection and try again.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a bit and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This local domain is not authorized in Firebase Auth settings.";
  }

  if (import.meta.env.DEV && code) return `Firebase Auth error: ${code}`;

  return "Something went wrong. Please try again.";
};

export const Login = () => {
  const {
    profile,
    loading,
    signIn,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  if (loading) return null;
  if (profile) return <Navigate to="/" replace />;

  const submitCredentials = async (form: HTMLFormElement): Promise<void> => {
    const formData = new FormData(form);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");

    if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
      setError("Enter an email and password.");
      return;
    }

    const submittedEmail = emailValue.trim();
    const submittedPassword = passwordValue;

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        await signUpWithEmail(submittedEmail, submittedPassword);
      } else {
        await signInWithEmail(submittedEmail, submittedPassword);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    await submitCredentials(event.currentTarget);
  };

  const handleSubmitClick = (): void => {
    if (!formRef.current || !formRef.current.reportValidity()) return;
    void submitCredentials(formRef.current);
  };

  const isSignUp = mode === "sign-up";

  return (
    <div className="mx-auto grid min-h-[68vh] max-w-3xl items-center gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="hidden md:block">
        <div className="rounded-lg border border-border/80 bg-background/75 p-5 shadow-lg shadow-slate-900/10 backdrop-blur">
          <img
            src={brandBanner}
            alt="Skate Journeys"
            className="h-auto w-full rounded-md bg-white p-3"
          />
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium text-muted-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-2 text-primary">
              Classes
            </span>
            <span className="rounded-md bg-secondary/25 px-2 py-2 text-secondary-foreground">
              RSVPs
            </span>
            <span className="rounded-md bg-accent/10 px-2 py-2 text-accent">
              Crews
            </span>
          </div>
        </div>
      </div>

      <form
        ref={formRef}
        className="rounded-lg border border-border/80 bg-background/90 p-5 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-6"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="mb-5">
          <img
            src={brandBanner}
            alt="Skate Journeys"
            className="mb-5 h-auto w-48 rounded-md bg-white p-2 shadow-sm md:hidden"
          />
          <h1 className="text-2xl font-bold">Skate5</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to view classes and RSVP.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              required
              className="h-11 w-full rounded-md border border-border bg-background/80 px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
              minLength={6}
              className="h-11 w-full rounded-md border border-border bg-background/80 px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={submitting}
            onClick={handleSubmitClick}
          >
            {submitting
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </Button>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => {
              setError(null);
              setMode(isSignUp ? "sign-in" : "sign-up");
            }}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => {
              void signIn();
            }}
          >
            Sign in with Google
          </Button>
        </div>
      </form>
    </div>
  );
};
