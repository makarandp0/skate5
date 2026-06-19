import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { initFirebaseAdmin, getClientConfig } from "./lib/firebase-admin.js";
import { classRoutes } from "./routes/classes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initFirebaseAdmin();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/api/config", () => {
  return getClientConfig();
});

app.get("/health", () => {
  return { status: "ok" };
});

await app.register(classRoutes, { prefix: "/api" });

// In production, serve the built frontend
if (process.env.NODE_ENV === "production") {
  const staticPath =
    process.env.STATIC_PATH ?? path.join(__dirname, "../../web/dist");

  await app.register(fastifyStatic, {
    root: staticPath,
    prefix: "/",
  });

  // SPA fallback — serve index.html for non-API routes
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
}

const port = parseInt(process.env.PORT ?? "3000", 10);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`Server listening on port ${String(port)}`);
