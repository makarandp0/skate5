import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initFirebase } from "./lib/firebase.js";
import { App } from "./App.js";
import "./app.css";

await initFirebase();

if (import.meta.env.DEV) {
  document.title = "Skate5 (local)";
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
