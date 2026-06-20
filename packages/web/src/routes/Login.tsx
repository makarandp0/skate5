import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/Button.js";

export function Login() {
  const { profile, loading, signIn } = useAuth();

  if (loading) return null;
  if (profile) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Skate5</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view classes and RSVP
        </p>
      </div>
      <Button size="lg" onClick={() => void signIn()}>
        Sign in with Google
      </Button>
    </div>
  );
}
