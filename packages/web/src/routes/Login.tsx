import { useState, type SyntheticEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/Button.js";

export function Login() {
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

  if (loading) return null;
  if (profile) return <Navigate to="/" replace />;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isSignUp = mode === "sign-up";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-bold">Skate5</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view classes and RSVP
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            required
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
            minLength={6}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting
            ? "Please wait..."
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
        size="lg"
        variant="outline"
        onClick={() => {
          void signIn();
        }}
      >
        Sign in with Google
      </Button>
    </div>
  );
}

function getAuthErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("auth/email-already-in-use")) {
      return "That email already has an account. Try signing in instead.";
    }
    if (err.message.includes("auth/invalid-credential")) {
      return "The email or password is incorrect.";
    }
    if (err.message.includes("auth/operation-not-allowed")) {
      return "Email/password sign-in is not enabled for this Firebase project.";
    }
    if (err.message.includes("auth/weak-password")) {
      return "Use a password with at least 6 characters.";
    }
  }
  return "Something went wrong. Please try again.";
}
