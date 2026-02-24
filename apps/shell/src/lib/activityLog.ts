import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

export type ActivityCategory =
  | "plugins"
  | "connections"
  | "themes"
  | "environment"
  | "system";

export type ActivityStatus = "success" | "error" | "info";

export type ActivityEvent = {
  id: string;
  timestamp: string;
  category: ActivityCategory;
  action: string;
  target?: string;
  status: ActivityStatus;
  message: string;
  metadata?: Record<string, unknown>;
};

export type ActivityConfig = {
  retentionHours: number;
  maxEntries: number;
};

const DEFAULT_CONFIG: ActivityConfig = {
  retentionHours: 24,
  maxEntries: 2000,
};

const resolveRainbowDir = () => {
  const explicitLog = process.env.RAINBOW_ACTIVITY_LOG_PATH;
  if (explicitLog) {
    return path.dirname(explicitLog);
  }
  return path.join(os.homedir(), ".rainbow");
};

const getActivityLogPath = () => {
  const override = process.env.RAINBOW_ACTIVITY_LOG_PATH;
  if (override) {
    return override;
  }
  return path.join(resolveRainbowDir(), "activity-log.json");
};

const getActivityConfigPath = () => {
  const override = process.env.RAINBOW_ACTIVITY_CONFIG_PATH;
  if (override) {
    return override;
  }
  return path.join(resolveRainbowDir(), "activity-config.json");
};

const ensureDir = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const stableId = () => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizeConfig = (raw: Partial<ActivityConfig> | undefined): ActivityConfig => {
  const retentionHours = Number(raw?.retentionHours);
  const maxEntries = Number(raw?.maxEntries);

  return {
    retentionHours:
      Number.isFinite(retentionHours) && retentionHours >= 1 && retentionHours <= 168
        ? Math.floor(retentionHours)
        : DEFAULT_CONFIG.retentionHours,
    maxEntries:
      Number.isFinite(maxEntries) && maxEntries >= 100 && maxEntries <= 50000
        ? Math.floor(maxEntries)
        : DEFAULT_CONFIG.maxEntries,
  };
};

export const loadActivityConfig = async (): Promise<ActivityConfig> => {
  const filePath = getActivityConfigPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ActivityConfig>;
    return sanitizeConfig(parsed);
  } catch {
    await ensureDir(filePath);
    await fs.writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return DEFAULT_CONFIG;
  }
};

export const saveActivityConfig = async (
  incoming: Partial<ActivityConfig>,
): Promise<ActivityConfig> => {
  const next = sanitizeConfig(incoming);
  const filePath = getActivityConfigPath();
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
};

const normalizeEvents = (value: unknown): ActivityEvent[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const events: ActivityEvent[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.timestamp !== "string" ||
      typeof raw.category !== "string" ||
      typeof raw.action !== "string" ||
      typeof raw.status !== "string" ||
      typeof raw.message !== "string"
    ) {
      continue;
    }

    events.push({
      id: raw.id,
      timestamp: raw.timestamp,
      category: raw.category as ActivityCategory,
      action: raw.action,
      target: typeof raw.target === "string" ? raw.target : undefined,
      status: raw.status as ActivityStatus,
      message: raw.message,
      metadata:
        raw.metadata && typeof raw.metadata === "object"
          ? (raw.metadata as Record<string, unknown>)
          : undefined,
    });
  }

  return events;
};

const pruneEvents = (events: ActivityEvent[], config: ActivityConfig): ActivityEvent[] => {
  const threshold = Date.now() - config.retentionHours * 60 * 60 * 1000;
  const byTime = events.filter((event) => {
    const ts = Date.parse(event.timestamp);
    return Number.isFinite(ts) && ts >= threshold;
  });

  byTime.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return byTime.slice(0, config.maxEntries);
};

const writeEvents = async (events: ActivityEvent[]) => {
  const filePath = getActivityLogPath();
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(events, null, 2), "utf8");
};

export const loadActivityEvents = async (): Promise<ActivityEvent[]> => {
  const config = await loadActivityConfig();
  const filePath = getActivityLogPath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = normalizeEvents(JSON.parse(raw));
    const pruned = pruneEvents(parsed, config);
    if (pruned.length !== parsed.length) {
      await writeEvents(pruned);
    }
    return pruned;
  } catch {
    await writeEvents([]);
    return [];
  }
};

export const appendActivityEvent = async (
  payload: Omit<ActivityEvent, "id" | "timestamp"> & { timestamp?: string },
): Promise<ActivityEvent> => {
  const current = await loadActivityEvents();
  const event: ActivityEvent = {
    id: stableId(),
    timestamp: payload.timestamp ?? new Date().toISOString(),
    category: payload.category,
    action: payload.action,
    target: payload.target,
    status: payload.status,
    message: payload.message,
    metadata: payload.metadata,
  };

  const config = await loadActivityConfig();
  const next = pruneEvents([event, ...current], config);
  await writeEvents(next);
  return event;
};

export const clearActivityEvents = async () => {
  await writeEvents([]);
};

export const importActivityEvents = async (
  incoming: ActivityEvent[],
  mode: "replace" | "merge" = "replace",
): Promise<ActivityEvent[]> => {
  const current = mode === "merge" ? await loadActivityEvents() : [];
  const map = new Map<string, ActivityEvent>();

  for (const event of [...current, ...incoming]) {
    if (!event?.id) {
      continue;
    }
    map.set(event.id, event);
  }

  const config = await loadActivityConfig();
  const merged = pruneEvents(Array.from(map.values()), config);
  await writeEvents(merged);
  return merged;
};
