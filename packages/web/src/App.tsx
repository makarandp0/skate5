import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { canAssumeRole, type UserRole } from "@skate5/shared";
import { cn } from "./lib/utils.js";
import { AuthProvider, useAuth } from "./hooks/useAuth.js";
import { ThemeProvider } from "./hooks/useTheme.js";
import { Header } from "./components/Header.js";
import { BottomNav } from "./components/BottomNav.js";
import { Login } from "./routes/Login.js";
import { ClassList } from "./routes/ClassList.js";
import { ClassCreate } from "./routes/ClassCreate.js";
import { ClassDetail } from "./routes/ClassDetail.js";
import { ClassGrid } from "./routes/ClassGrid.js";
import { ClassChat } from "./routes/ClassChat.js";
import { Profile } from "./routes/Profile.js";
import { Email } from "./routes/Email.js";
import { Config } from "./routes/Config.js";
import type { ReactNode } from "react";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RequireRole = ({
  minimumRole,
  children,
}: {
  minimumRole: UserRole;
  children: ReactNode;
}) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (!canAssumeRole(profile.role, minimumRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AuthBottomNav = () => {
  const { profile } = useAuth();
  const location = useLocation();
  if (!profile) return null;
  if (/^\/classes\/[^/]+\/chat$/.test(location.pathname)) return null;
  return <BottomNav />;
};

export const App = () => {
  const location = useLocation();
  const isChatRoute = /^\/classes\/[^/]+\/chat$/.test(location.pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 h-52 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(245,184,46,0.16)_45%,rgba(31,157,135,0.12))] dark:bg-[linear-gradient(135deg,rgba(96,165,250,0.16),rgba(246,196,81,0.12)_45%,rgba(53,189,165,0.12))]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,rgba(37,99,235,0.08),transparent)] dark:bg-[linear-gradient(0deg,rgba(96,165,250,0.09),transparent)]"
          />
          <Header />
          <main
            className={cn(
              "relative mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pb-10",
              isChatRoute ? "pb-4" : "pb-24"
            )}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <ClassList />
                  </RequireAuth>
                }
              />
              <Route
                path="/classes/new"
                element={
                  <RequireRole minimumRole="admin">
                    <ClassCreate />
                  </RequireRole>
                }
              />
              <Route
                path="/classes/:id/chat"
                element={
                  <RequireAuth>
                    <ClassChat />
                  </RequireAuth>
                }
              />
              <Route
                path="/classes/:id/grid"
                element={
                  <RequireAuth>
                    <ClassGrid />
                  </RequireAuth>
                }
              />
              <Route
                path="/classes/:id"
                element={
                  <RequireAuth>
                    <ClassDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="/email"
                element={
                  <RequireRole minimumRole="admin">
                    <Email />
                  </RequireRole>
                }
              />
              <Route
                path="/config"
                element={
                  <RequireRole minimumRole="developer">
                    <Config />
                  </RequireRole>
                }
              />
            </Routes>
          </main>
          <AuthBottomNav />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};
