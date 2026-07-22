import { useRef, useState, type SyntheticEvent } from "react";
import { Navigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/Button.js";
import brandBanner from "../assets/skate-journeys-banner.png";

type LoginMode = "sign-in" | "sign-up" | "reset-password";

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
  if (import.meta.env.DEV && err instanceof Error) {
    return `Sign-in failed after Firebase Auth: ${err.message}`;
  }

  return "Something went wrong. Please try again.";
};

const getPasswordResetErrorMessage = (err: unknown): string => {
  const code = getAuthErrorCode(err);

  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }
  if (code === "auth/missing-email") {
    return "Enter the email address for your Skate5 account.";
  }
  if (code === "auth/user-not-found") {
    return "We could not find a Skate5 account for that email. Check the Issaquah pilot invite address or sign in with Google.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Password reset is not enabled for this Firebase project.";
  }
  if (code === "auth/network-request-failed") {
    return "Could not reach Firebase Auth. Check your connection and try again.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many reset attempts. Wait a bit and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This local domain is not authorized in Firebase Auth settings.";
  }

  if (import.meta.env.DEV && code) return `Firebase Auth error: ${code}`;
  if (import.meta.env.DEV && err instanceof Error) {
    return `Password reset failed after Firebase Auth: ${err.message}`;
  }

  return "Could not send a reset email. Please try again.";
};

export const Login = () => {
  const {
    profile,
    loading,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
  } = useAuth();
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);

  if (loading) return null;
  if (profile) return <Navigate to="/" replace />;

  const appendDebug = (message: string): void => {
    if (!import.meta.env.DEV) return;

    const timestamp = new Date().toLocaleTimeString();
    setDebugEvents((events) => [`${timestamp} ${message}`, ...events].slice(0, 8));
  };

  const requestPasswordReset = async (
    form: HTMLFormElement,
    source: string
  ): Promise<void> => {
    appendDebug(`Password reset requested from ${source}.`);

    const formData = new FormData(form);
    const emailValue = formData.get("email");

    if (typeof emailValue !== "string") {
      appendDebug("FormData did not contain a string email value.");
      setResetSuccess(null);
      setError("Enter the email address for your Skate5 account.");
      return;
    }

    const submittedEmail = emailValue.trim();
    if (!submittedEmail) {
      appendDebug("Client validation failed: missing reset email.");
      setResetSuccess(null);
      setError("Enter the email address for your Skate5 account.");
      return;
    }

    setEmail(submittedEmail);
    setPassword("");
    setError(null);
    setResetSuccess(null);
    setSubmitting(true);
    try {
      appendDebug("Calling Firebase sendPasswordResetEmail.");
      await resetPassword(submittedEmail);
      appendDebug("Firebase password reset email call resolved.");
      setResetSuccess(
        `Password reset email sent to ${submittedEmail}. Use the link in that email, then return here to sign in.`
      );
    } catch (err) {
      appendDebug(
        `Password reset failed: ${
          getAuthErrorCode(err) ??
          (err instanceof Error ? err.message : "unknown error")
        }.`
      );
      setError(getPasswordResetErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCredentials = async (
    form: HTMLFormElement,
    source: string
  ): Promise<void> => {
    appendDebug(`Submit requested from ${source}.`);

    const formData = new FormData(form);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");

    if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
      appendDebug("FormData did not contain string email/password values.");
      setError("Enter an email and password.");
      return;
    }

    const submittedEmail = emailValue.trim();
    const submittedPassword = passwordValue;
    appendDebug(
      `Read form values: email=${submittedEmail || "(blank)"}, password=${
        submittedPassword ? "present" : "blank"
      }.`
    );

    if (!submittedEmail || !submittedPassword) {
      appendDebug("Client validation failed: missing email or password.");
      setError("Enter an email and password.");
      return;
    }

    if (submittedPassword.length < 6) {
      appendDebug("Client validation failed: password is shorter than 6 characters.");
      setError("Use a password with at least 6 characters.");
      return;
    }

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    setError(null);
    setSubmitting(true);
    try {
      appendDebug(
        mode === "sign-up"
          ? "Calling Firebase createUserWithEmailAndPassword."
          : "Calling Firebase signInWithEmailAndPassword."
      );
      if (mode === "sign-up") {
        await signUpWithEmail(submittedEmail, submittedPassword);
      } else {
        await signInWithEmail(submittedEmail, submittedPassword);
      }
      appendDebug("Firebase auth call resolved; waiting for profile redirect.");
    } catch (err) {
      appendDebug(
        `Auth failed: ${
          getAuthErrorCode(err) ??
          (err instanceof Error ? err.message : "unknown error")
        }.`
      );
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    appendDebug("Native form submit event fired.");
    if (mode === "reset-password") {
      await requestPasswordReset(event.currentTarget, "form submit");
      return;
    }
    await submitCredentials(event.currentTarget, "form submit");
  };

  const handleSubmitClick = (): void => {
    appendDebug("Primary auth button click handler fired.");
    if (!formRef.current) {
      appendDebug("No form ref was available.");
      setError("Login form is not ready yet.");
      return;
    }

    if (!formRef.current.checkValidity()) {
      appendDebug("Browser validity check failed.");
      formRef.current.reportValidity();
      return;
    }

    if (mode === "reset-password") {
      void requestPasswordReset(formRef.current, "button click");
      return;
    }

    void submitCredentials(formRef.current, "button click");
  };

  const isSignUp = mode === "sign-up";
  const isPasswordReset = mode === "reset-password";
  const title = isPasswordReset
    ? "Reset your password"
    : isSignUp
      ? "Create your Skate5 account"
      : "Skate5";
  const description = isPasswordReset
    ? "Enter the email you use for the Issaquah pilot and Firebase will send a password reset link."
    : isSignUp
      ? "Create an account for class RSVPs and crew coordination."
      : "Sign in to view classes and RSVP.";
  const primaryActionLabel = submitting
    ? "Please wait..."
    : isPasswordReset
      ? resetSuccess
        ? "Send another reset email"
        : "Send reset email"
      : isSignUp
        ? "Create account"
        : "Sign in";

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
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {description}
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
                if (isPasswordReset) {
                  setResetSuccess(null);
                }
              }}
              required
              aria-invalid={Boolean(error && isPasswordReset)}
              aria-describedby={
                error ? "login-error" : resetSuccess ? "login-success" : undefined
              }
              className="h-11 w-full rounded-md border border-border bg-background/80 px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {!isPasswordReset && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      appendDebug("Forgot password button clicked.");
                      setError(null);
                      setResetSuccess(null);
                      setPassword("");
                      setMode("reset-password");
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
                aria-invalid={Boolean(error && !isPasswordReset)}
                aria-describedby={error ? "login-error" : undefined}
                className="h-11 w-full rounded-md border border-border bg-background/80 px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {error && (
            <p
              id="login-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          {resetSuccess && (
            <p
              id="login-success"
              className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent"
              role="status"
              aria-live="polite"
            >
              {resetSuccess}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={submitting}
            onPointerDown={() => {
              appendDebug("Primary auth button pointer down.");
            }}
            onClick={handleSubmitClick}
          >
            {primaryActionLabel}
          </Button>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => {
              setError(null);
              setResetSuccess(null);
              setMode(
                isPasswordReset ? "sign-in" : isSignUp ? "sign-in" : "sign-up"
              );
            }}
          >
            {isPasswordReset
              ? "Back to sign in"
              : isSignUp
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
              appendDebug("Google sign-in button clicked.");
              void signIn();
            }}
          >
            Sign in with Google
          </Button>

          {import.meta.env.DEV && (
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Login debug</p>
              <p>
                Mode: {mode} · Submitting:{" "}
                {submitting ? "yes" : "no"} · Email state:{" "}
                {email ? "present" : "blank"}
              </p>
              <ul className="mt-1 space-y-1">
                {debugEvents.length > 0 ? (
                  debugEvents.map((event) => <li key={event}>{event}</li>)
                ) : (
                  <li>Waiting for a login action.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
