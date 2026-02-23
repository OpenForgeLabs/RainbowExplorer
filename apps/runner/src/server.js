import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.RUNNER_PORT ?? 5099);
const HOST = process.env.RUNNER_HOST ?? "0.0.0.0";
const PORT_RANGE_START = Number(process.env.RUNNER_PORT_START ?? 4100);
const PORT_RANGE_END = Number(process.env.RUNNER_PORT_END ?? 4999);
const DEFAULT_INTERNAL_PORT = Number(process.env.RUNNER_DEFAULT_INTERNAL_PORT ?? 3000);
const SHARED_DATA_DIR =
  process.env.RAINBOW_SHARED_DIR ?? path.join(os.homedir(), ".rainbow");

const getRegistryPath = () => {
  const override = process.env.RAINBOW_REGISTRY_PATH;
  if (override) {
    return override;
  }
  return path.join(os.homedir(), ".rainbow", "plugin-registry.json");
};

const getSeedRegistryPath = () => {
  const override = process.env.RAINBOW_REGISTRY_SEED;
  if (override) {
    return override;
  }
  return path.join(process.cwd(), "..", "shell", "plugin-registry.json");
};

const ensureDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const loadRegistry = async () => {
  const filePath = getRegistryPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    await ensureDir(filePath);
    let seed = { plugins: [] };
    try {
      const seedRaw = await fs.readFile(getSeedRegistryPath(), "utf8");
      seed = JSON.parse(seedRaw);
    } catch {
      // ignore missing seed
    }
    await fs.writeFile(filePath, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
};

const saveRegistry = async (registry) => {
  const filePath = getRegistryPath();
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(registry, null, 2), "utf8");
};

const findAvailablePort = async () => {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => resolve(false));
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
    });
    if (available) {
      return port;
    }
  }
  throw new Error("No available ports found in runner range.");
};

const runDocker = async (args) => {
  const { stdout } = await execFileAsync("docker", args, {
    env: process.env,
  });
  return stdout.trim();
};

const containerName = (pluginId) => `rainbow-plugin-${pluginId}`;

const containerExists = async (name) => {
  const result = await runDocker(["ps", "-a", "--filter", `name=${name}`, "--format", "{{.ID}}"]);
  return Boolean(result);
};

const ensureContainerRemoved = async (name) => {
  if (await containerExists(name)) {
    await runDocker(["rm", "-f", name]);
  }
};

const startPlugin = async (payload) => {
  const { id } = payload;
  if (!id) {
    throw new Error("id is required.");
  }

  const registry = await loadRegistry();
  const plugins = Array.isArray(registry.plugins) ? registry.plugins : [];
  const existing = plugins.find((item) => item.id === id);

  const image = payload.image ?? existing?.image;
  if (!image) {
    throw new Error("image is required.");
  }
  const name = payload.name ?? existing?.name ?? id;
  const internalPort =
    Number(payload.internalPort ?? existing?.internalPort ?? DEFAULT_INTERNAL_PORT);

  const hostPort = await findAvailablePort();
  const cname = containerName(id);
  await ensureContainerRemoved(cname);
  await ensureDir(path.join(SHARED_DATA_DIR, "plugin-registry.json"));
  await runDocker([
    "run",
    "-d",
    "--name",
    cname,
    "--pull",
    "always",
    "-e",
    `PORT=${internalPort}`,
    "-e",
    "HOSTNAME=0.0.0.0",
    "-v",
    `${SHARED_DATA_DIR}:/root/.rainbow`,
    "-p",
    `${hostPort}:${internalPort}`,
    image,
  ]);

  const idx = plugins.findIndex((item) => item.id === id);
  const entry = {
    id,
    name,
    image,
    internalPort,
    hostPort,
    baseUrl: `http://localhost:${hostPort}`,
    enabled: true,
  };
  if (idx >= 0) {
    plugins[idx] = { ...plugins[idx], ...entry };
  } else {
    plugins.push(entry);
  }
  registry.plugins = plugins;
  await saveRegistry(registry);
  return entry;
};

const stopPlugin = async (pluginId) => {
  const cname = containerName(pluginId);
  await runDocker(["stop", cname]);
  return { id: pluginId, status: "stopped" };
};

const removePlugin = async (pluginId) => {
  const cname = containerName(pluginId);
  await ensureContainerRemoved(cname);
  const registry = await loadRegistry();
  registry.plugins = (registry.plugins ?? []).filter((item) => item.id !== pluginId);
  await saveRegistry(registry);
  return { id: pluginId, status: "removed" };
};

const installPlugin = async (payload) => {
  const { image } = payload;
  if (!image) {
    throw new Error("image is required.");
  }
  await runDocker(["pull", image]);
  return startPlugin(payload);
};

const jsonResponse = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(data));
};

const handleRequest = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const chunks = [];
  if (req.method === "POST") {
    for await (const chunk of req) {
      chunks.push(chunk);
    }
  }
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return jsonResponse(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/plugins/install") {
      const data = await installPlugin(body);
      return jsonResponse(res, 200, { ok: true, data });
    }
    if (req.method === "POST" && url.pathname === "/plugins/start") {
      const data = await startPlugin(body);
      return jsonResponse(res, 200, { ok: true, data });
    }
    if (req.method === "POST" && url.pathname === "/plugins/stop") {
      const data = await stopPlugin(body.id);
      return jsonResponse(res, 200, { ok: true, data });
    }
    if (req.method === "POST" && url.pathname === "/plugins/remove") {
      const data = await removePlugin(body.id);
      return jsonResponse(res, 200, { ok: true, data });
    }
    if (req.method === "GET" && url.pathname === "/plugins/registry") {
      const data = await loadRegistry();
      return jsonResponse(res, 200, { ok: true, data });
    }

    return jsonResponse(res, 404, { ok: false, message: "Not found" });
  } catch (error) {
    return jsonResponse(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  process.stdout.write(`Runner listening on http://${HOST}:${PORT}\n`);
});
