import path from "path";
import { fileURLToPath } from "url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { canAssumeRole } from "@skate5/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown startup error";
};

const reportFatalStartupError = (error: unknown): void => {
  console.error("FATAL startup: API server failed before it became ready.");
  console.error(`Cause: ${getErrorMessage(error)}`);
  console.error(
    "Check Railway variables, Firebase service account formatting, database migration output, and the stack trace below."
  );

  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
};

process.on("unhandledRejection", (reason: unknown) => {
  reportFatalStartupError(reason);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  reportFatalStartupError(error);
  process.exit(1);
});

const start = async (): Promise<void> => {
  const [
    { config, getConfigDiagnostics },
    { initFirebaseAdmin, getClientConfig },
    { classRoutes },
    { authenticate },
    { checkDatabaseConnection },
  ] = await Promise.all([
    import("./config.js"),
    import("./lib/firebase-admin.js"),
    import("./routes/classes.js"),
    import("./middleware/auth.js"),
    import("./db/index.js"),
  ]);

  initFirebaseAdmin();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  app.get("/api/config", () => {
    return getClientConfig();
  });

  app.get("/api/dev/status", { preHandler: authenticate }, (request, reply) => {
    if (!request.user || !canAssumeRole(request.user.role, "developer")) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    return {
      status: "ok",
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: config.environment,
      staticServing: config.isProduction,
      env: getConfigDiagnostics(),
    };
  });

  app.get("/health", () => {
    return { status: "ok" };
  });

  app.get("/ready", async (_request, reply) => {
    const checkedAt = new Date().toISOString();

    try {
      await checkDatabaseConnection();
      return {
        status: "ready",
        checkedAt,
        checks: {
          database: "ok",
        },
      };
    } catch (error) {
      app.log.error(
        { err: error },
        "Readiness check failed: database is not reachable"
      );
      return reply.status(503).send({
        status: "not_ready",
        checkedAt,
        checks: {
          database: "failed",
        },
        message: "Database check failed. See server logs for connection details.",
      });
    }
  });

  await app.register(classRoutes, { prefix: "/api" });

  // In production, serve the built frontend
  if (config.isProduction) {
    const staticPath = config.staticPath ?? path.join(__dirname, "../../web/dist");

    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: "/",
    });

    // SPA fallback - serve index.html for non-API routes
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(
    {
      port: config.port,
      environment: config.environment,
      commitSha: config.commitSha,
    },
    "Server started"
  );

  try {
    await checkDatabaseConnection();
    app.log.info("Startup database readiness check passed");
  } catch (error) {
    app.log.error(
      { err: error },
      "Startup database readiness check failed; /ready will return 503 until the database is reachable"
    );
  }
};

try {
  await start();
} catch (error) {
  reportFatalStartupError(error);
  process.exit(1);
}
