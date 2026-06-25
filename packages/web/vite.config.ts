import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import os from "node:os";

const isPrivateIpv4 = (address: string): boolean =>
  address.startsWith("10.") ||
  address.startsWith("192.168.") ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(address);

const getPrivateIpv4Address = (): string | null => {
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal);

  return (
    addresses.find((item) => isPrivateIpv4(item.address))?.address ??
    addresses.at(0)?.address ??
    null
  );
};

const getDevNetworkOrigin = (port: number): string => {
  const address = getPrivateIpv4Address() ?? "localhost";
  return `http://${address}:${String(port)}`;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
};

const devPort = parsePort(process.env.SKATE5_WEB_PORT, 5173);
const apiPort = parsePort(process.env.SKATE5_API_PORT, 3000);
const devOrigin = getDevNetworkOrigin(devPort);
const apiTarget =
  process.env.SKATE5_API_TARGET ?? `http://127.0.0.1:${String(apiPort)}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_DEV_ORIGIN": JSON.stringify(devOrigin),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
  },
  server: {
    host: "0.0.0.0",
    port: devPort,
    proxy: {
      "/api": apiTarget,
    },
  },
});
