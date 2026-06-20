import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.js";
import { Header } from "./components/Header.js";
import { BottomNav } from "./components/BottomNav.js";
import { Login } from "./routes/Login.js";
import { ClassList } from "./routes/ClassList.js";
import { ClassDetail } from "./routes/ClassDetail.js";
import { Profile } from "./routes/Profile.js";
import { Config } from "./routes/Config.js";
import type { ReactNode } from "react";

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pb-8">
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
              path="/config"
              element={
                <RequireAuth>
                  <Config />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
        <AuthBottomNav />
      </div>
    </AuthProvider>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthBottomNav() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <BottomNav />;
}
