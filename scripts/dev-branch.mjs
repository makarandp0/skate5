#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const devRoot = path.join(repoRoot, ".dev");
const restartRequested = process.argv.includes("--restart") || process.argv.includes("--force");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`
    );
  }

  return result.stdout.trim();
};

const getBranchName = () => {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "HEAD") return branch;

  const commit = run("git", ["rev-parse", "--short", "HEAD"]);
  return `detached-${commit}`;
};

const sanitize = (value) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

// Keep branch ports stable without needing a registry. The ranges avoid the
// default API/web ports while staying easy to recognize in process listings.
const derivePorts = (branchName) => {
  const hash = createHash("sha256").update(branchName).digest();
  const slot = hash.readUInt32BE(0) % 1000;

  return {
    apiPort: 3300 + slot,
    webPort: 5300 + slot,
  };
};

const getLanAddress = () => {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
};

const getProcessRows = () => {
  const output = run("ps", ["-axo", "pid=,ppid=,command="]);
  return output
    .split("\n")
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3],
      };
    })
    .filter(Boolean);
};

const readPid = (filePath) => {
  try {
    const value = Number(readFileSync(filePath, "utf8").trim());
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const fetchOk = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
};

const descendantsOf = (rows, pid) => {
  const childrenByParent = new Map();
  for (const row of rows) {
    const children = childrenByParent.get(row.ppid) ?? [];
    children.push(row.pid);
    childrenByParent.set(row.ppid, children);
  }

  const result = [];
  const stack = [...(childrenByParent.get(pid) ?? [])];
  while (stack.length > 0) {
    const child = stack.pop();
    if (!child) continue;
    result.push(child);
    stack.push(...(childrenByParent.get(child) ?? []));
  }
  return result;
};

// pnpm, tsx, and Vite each spawn children. When a port is owned by a child
// process, preserve or stop the whole repo-local process family together.
const relatedRepoPids = (rows, pids) => {
  const rowByPid = new Map(rows.map((row) => [row.pid, row]));
  const result = new Set();

  for (const pid of pids) {
    let current = rowByPid.get(pid);
    if (current) result.add(current.pid);

    for (const child of descendantsOf(rows, pid)) {
      result.add(child);
    }

    while (current) {
      const parent = rowByPid.get(current.ppid);
      if (!parent || !parent.command.includes(repoRoot)) break;
      result.add(parent.pid);
      current = parent;
    }
  }

  return result;
};

const killPids = async (pids) => {
  const rows = getProcessRows();
  const expanded = new Set();

  for (const pid of pids) {
    expanded.add(pid);
    for (const child of descendantsOf(rows, pid)) {
      expanded.add(child);
    }
  }

  const ordered = [...expanded].sort((left, right) => right - left);
  for (const pid of ordered) {
    if (pid === process.pid || !isAlive(pid)) continue;
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 700));

  for (const pid of ordered) {
    if (pid === process.pid || !isAlive(pid)) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
};

// Only target dev servers that clearly belong to this checkout. That keeps the
// script from disturbing another repo or a manually launched unrelated service.
const matchingRepoDevPids = () => {
  const apiMarkers = [
    `${repoRoot}/packages/api`,
    `${repoRoot}/node_modules/.pnpm/tsx`,
  ];
  const webMarkers = [`${repoRoot}/packages/web`, "vite"];

  return getProcessRows()
    .filter((row) => {
      const command = row.command;
      const isApi =
        command.includes("src/server.ts") &&
        apiMarkers.some((marker) => command.includes(marker));
      const isWeb =
        command.includes("vite") &&
        webMarkers.every((marker) => command.includes(marker));
      return isApi || isWeb;
    })
    .map((row) => row.pid);
};

const staleBranchRecordedPids = (currentBranchKey) => {
  let entries = [];
  try {
    entries = readdirSync(devRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== currentBranchKey)
    .flatMap((entry) => {
      const branchDir = path.join(devRoot, entry.name);
      return [
        readPid(path.join(branchDir, "api.pid")),
        readPid(path.join(branchDir, "web.pid")),
      ];
    })
    .filter((pid) => pid && isAlive(pid));
};

const pidsOnPort = (port) => {
  const result = spawnSync("lsof", ["-ti", `tcp:${String(port)}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`lsof failed for port ${String(port)}: ${result.stderr}`);
  }

  return result.stdout
    .split("\n")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
};

const startProcess = ({ name, command, args, cwd, env, logPath, pidPath }) => {
  const out = openSync(logPath, "a");
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", out, out],
  });

  child.unref();
  writeFileSync(pidPath, `${String(child.pid)}\n`);
  return { name, pid: child.pid };
};

const waitFor = async ({ label, url }) => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await fetchOk(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`${label} did not become ready at ${url}`);
};

const main = async () => {
  const branchName = getBranchName();
  const branchKey = sanitize(branchName) || "branch";
  const branchDir = path.join(devRoot, branchKey);
  const { apiPort, webPort } = derivePorts(branchName);
  const apiPidPath = path.join(branchDir, "api.pid");
  const webPidPath = path.join(branchDir, "web.pid");
  const apiLogPath = path.join(branchDir, "api.log");
  const webLogPath = path.join(branchDir, "web.log");

  mkdirSync(branchDir, { recursive: true });

  const recordedApiPid = readPid(apiPidPath);
  const recordedWebPid = readPid(webPidPath);
  const apiUrl = `http://127.0.0.1:${String(apiPort)}`;
  const webUrl = `http://127.0.0.1:${String(webPort)}`;
  const lanAddress = getLanAddress();
  const apiLanUrl = lanAddress ? `http://${lanAddress}:${String(apiPort)}` : null;
  const webLanUrl = lanAddress ? `http://${lanAddress}:${String(webPort)}` : null;
  const apiPortPids = pidsOnPort(apiPort);
  const webPortPids = pidsOnPort(webPort);
  const rows = getProcessRows();
  // Keep any healthy process family that already owns this branch's ports, plus
  // any previously recorded pid that is still alive. Restart mode deliberately
  // keeps nothing so the current API/web processes are replaced.
  const keepPids = restartRequested
    ? new Set()
    : relatedRepoPids(rows, [
        ...apiPortPids,
        ...webPortPids,
        ...[recordedApiPid, recordedWebPid].filter((pid) => pid && isAlive(pid)),
      ]);

  const duplicatePids = matchingRepoDevPids().filter((pid) => !keepPids.has(pid));
  const portConflictPids = [...apiPortPids, ...webPortPids].filter(
    (pid) => !keepPids.has(pid)
  );
  const staleBranchPids = staleBranchRecordedPids(branchKey).filter(
    (pid) => !keepPids.has(pid)
  );

  await killPids([
    ...new Set([...duplicatePids, ...portConflictPids, ...staleBranchPids]),
  ]);

  // Reuse when possible so rerunning `pnpm dev:branch` is idempotent.
  const reusableApi = await fetchOk(`${apiUrl}/health`);
  const reusableWeb = await fetchOk(webUrl);
  const started = [];

  if (!reusableApi) {
    await killPids([
      ...apiPortPids,
      ...[recordedApiPid].filter((pid) => pid && isAlive(pid)),
    ]);
    started.push(
      startProcess({
        name: "api",
        command: "pnpm",
        args: ["--dir", "packages/api", "dev"],
        cwd: repoRoot,
        env: {
          PORT: String(apiPort),
          SKATE5_BRANCH: branchName,
          SKATE5_API_PORT: String(apiPort),
        },
        logPath: apiLogPath,
        pidPath: apiPidPath,
      })
    );
  }

  if (!reusableWeb) {
    await killPids([
      ...webPortPids,
      ...[recordedWebPid].filter((pid) => pid && isAlive(pid)),
    ]);
    started.push(
      startProcess({
        name: "web",
        command: "pnpm",
        args: [
          "--dir",
          "packages/web",
          "dev",
          "--host",
          "0.0.0.0",
          "--port",
          String(webPort),
        ],
        cwd: repoRoot,
        env: {
          SKATE5_BRANCH: branchName,
          SKATE5_API_PORT: String(apiPort),
          SKATE5_WEB_PORT: String(webPort),
          SKATE5_API_TARGET: apiUrl,
        },
        logPath: webLogPath,
        pidPath: webPidPath,
      })
    );
  }

  await waitFor({ label: "API", url: `${apiUrl}/health` });
  await waitFor({ label: "Web", url: webUrl });

  const finalApiPids = pidsOnPort(apiPort);
  const finalWebPids = pidsOnPort(webPort);
  // Store the real listener pids, not just the transient pnpm launcher pids.
  if (finalApiPids[0]) writeFileSync(apiPidPath, `${String(finalApiPids[0])}\n`);
  if (finalWebPids[0]) writeFileSync(webPidPath, `${String(finalWebPids[0])}\n`);

  writeFileSync(
    path.join(branchDir, "ports.json"),
    `${JSON.stringify(
      { branchName, apiPort, webPort, apiUrl, webUrl, apiLanUrl, webLanUrl },
      null,
      2
    )}\n`
  );

  const startedText =
    started.length > 0
      ? `${restartRequested ? "Restarted" : "Started"} ${started.map((item) => `${item.name} pid ${String(item.pid)}`).join(", ")}.`
      : "Reused existing branch dev servers.";

  console.log(startedText);
  console.log(`Branch: ${branchName}`);
  console.log(`API: ${apiUrl}`);
  if (apiLanUrl) console.log(`API (LAN): ${apiLanUrl}`);
  console.log(`Web: ${webUrl}`);
  if (webLanUrl) console.log(`Web (LAN): ${webLanUrl}`);
  console.log(`Logs: ${branchDir}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
