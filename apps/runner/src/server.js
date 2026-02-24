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

const PLUGIN_PUBLIC_PROTOCOL = process.env.RUNNER_PLUGIN_PUBLIC_PROTOCOL ?? "http";
const PLUGIN_PUBLIC_HOST = process.env.RUNNER_PLUGIN_PUBLIC_HOST ?? "localhost";

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

const runDockerRaw = async (args) => {
  const { stdout, stderr } = await execFileAsync("docker", args, {
    env: process.env,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
};

const runDocker = async (args) => {
  const { stdout } = await runDockerRaw(args);
  return stdout;
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

const slugify = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const inferPluginIdFromImage = (image) => {
  const withoutDigest = String(image).split("@")[0];
  const withoutTag = withoutDigest.split(":")[0];
  const repo = withoutTag.split("/").pop() ?? "";
  const stripped = repo
    .replace(/^rainbow-plugin-/, "")
    .replace(/^plugin-/, "")
    .replace(/^rainbow-/, "");
  const id = slugify(stripped || repo);
  if (!id) {
    throw new Error("Unable to infer plugin id from image. Use a slug-like image name.");
  }
  return id;
};

const resolvePluginBaseUrl = (hostPort) =>
  `${PLUGIN_PUBLIC_PROTOCOL}://${PLUGIN_PUBLIC_HOST}:${hostPort}`;

const inspectContainer = async (name) => {
  try {
    const raw = await runDocker(["inspect", name]);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return null;
    }
    return parsed[0];
  } catch {
    return null;
  }
};

const getContainerIp = async (name) => {
  const inspected = await inspectContainer(name);
  if (!inspected?.NetworkSettings?.Networks) {
    return null;
  }
  const networks = Object.values(inspected.NetworkSettings.Networks);
  for (const network of networks) {
    if (network && typeof network.IPAddress === "string" && network.IPAddress) {
      return network.IPAddress;
    }
  }
  return null;
};

const getContainerStatus = async (pluginId, metadata = {}) => {
  const cname = containerName(pluginId);
  const inspected = await inspectContainer(cname);
  if (!inspected) {
    return {
      id: pluginId,
      containerName: cname,
      exists: false,
      running: false,
      status: "not-found",
      metadata,
    };
  }

  const state = inspected.State ?? {};
  const health = state.Health?.Status;

  return {
    id: pluginId,
    containerName: cname,
    exists: true,
    running: Boolean(state.Running),
    status: state.Status ?? "unknown",
    startedAt: state.StartedAt,
    finishedAt: state.FinishedAt,
    exitCode: state.ExitCode,
    restartCount: inspected.RestartCount ?? 0,
    health: typeof health === "string" ? health : undefined,
    metadata,
  };
};

const fetchManifest = async ({ pluginId, internalPort }) => {
  const cname = containerName(pluginId);
  const containerIp = await getContainerIp(cname);
  if (!containerIp) {
    throw new Error("Unable to resolve plugin container network IP.");
  }

  const mountPath = `/plugins/${pluginId}`;
  const url = `http://${containerIp}:${internalPort}${mountPath}/api/plugin-manifest`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Plugin manifest not found at ${url}. Ensure plugin basePath follows /plugins/${pluginId}.`,
    );
  }

  const manifest = await response.json();
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid plugin manifest response.");
  }

  if (manifest.id !== pluginId) {
    throw new Error(
      `Manifest id '${manifest.id}' does not match inferred id '${pluginId}'. Align image naming and manifest id.`,
    );
  }

  if (typeof manifest.name !== "string" || !manifest.name.trim()) {
    throw new Error("Manifest name is required.");
  }

  return manifest;
};

const startPlugin = async (payload) => {
  const registry = await loadRegistry();
  const plugins = Array.isArray(registry.plugins) ? registry.plugins : [];

  const inputId = payload.id ? slugify(payload.id) : undefined;
  const inputImage = typeof payload.image === "string" ? payload.image : undefined;

  const existing = inputId ? plugins.find((item) => item.id === inputId) : null;
  const image = inputImage ?? existing?.image;
  if (!image) {
    throw new Error("image is required.");
  }

  const pluginId = inputId ?? inferPluginIdFromImage(image);
  const internalPort = Number(payload.internalPort ?? existing?.internalPort ?? DEFAULT_INTERNAL_PORT);

  const hostPort = await findAvailablePort();
  const cname = containerName(pluginId);

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

  try {
    const manifest = await fetchManifest({ pluginId, internalPort });
    const mountPath = manifest.mountPath ?? `/plugins/${pluginId}`;
    const defaultPath = manifest.views?.[0]?.route ?? "/";

    const idx = plugins.findIndex((item) => item.id === pluginId);
    const entry = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      image,
      internalPort,
      hostPort,
      mountPath,
      defaultPath,
      baseUrl: resolvePluginBaseUrl(hostPort),
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
  } catch (error) {
    await ensureContainerRemoved(cname);
    throw error;
  }
};

const stopPlugin = async (pluginId) => {
  const cname = containerName(pluginId);
  await runDocker(["stop", cname]);
  return getContainerStatus(pluginId);
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
  return startPlugin({ image });
};

const getPluginStatus = async (query) => {
  const registry = await loadRegistry();
  const pluginMap = new Map((registry.plugins ?? []).map((item) => [item.id, item]));

  const explicitId = query.get("id");
  const explicitIds = (query.get("ids") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const ids = explicitId
    ? [explicitId]
    : explicitIds.length
      ? explicitIds
      : Array.from(pluginMap.keys());

  const items = await Promise.all(
    ids.map(async (id) => getContainerStatus(id, pluginMap.get(id) ?? undefined)),
  );

  return { items };
};

const getPluginLogs = async (pluginId, tail = 200) => {
  if (!pluginId) {
    throw new Error("id is required.");
  }
  const cname = containerName(pluginId);
  const exists = await containerExists(cname);
  if (!exists) {
    return { id: pluginId, lines: [], message: "Container not found." };
  }

  const { stdout, stderr } = await runDockerRaw([
    "logs",
    "--timestamps",
    "--tail",
    String(tail),
    cname,
  ]);

  const merged = [stdout, stderr].filter(Boolean).join("\n").trim();
  const lines = merged ? merged.split("\n") : [];

  return {
    id: pluginId,
    lines,
  };
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
    if (req.method === "GET" && url.pathname === "/plugins/status") {
      const data = await getPluginStatus(url.searchParams);
      return jsonResponse(res, 200, { ok: true, data });
    }
    if (req.method === "GET" && url.pathname === "/plugins/logs") {
      const pluginId = url.searchParams.get("id") ?? "";
      const tail = Number(url.searchParams.get("tail") ?? "200");
      const data = await getPluginLogs(pluginId, Number.isFinite(tail) ? tail : 200);
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
