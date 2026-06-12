import { Routes, Route } from "react-router-dom";

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold">Skate5</h1>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Classes</h2>
      <p className="text-muted-foreground">Welcome to Skate5. Sign in to view classes.</p>
    </div>
  );
}
