import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { initializeApp, cert } from "firebase-admin/app";
import { classRoutes } from "./routes/classes.js";

initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(classRoutes, { prefix: "/api" });

app.get("/health", async () => ({ status: "ok" }));

const port = parseInt(process.env.PORT ?? "3000", 10);
await app.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on port ${port}`);
