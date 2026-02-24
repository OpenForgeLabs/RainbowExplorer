import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const pendingInstallStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);

const pendingInstallEntrySchema = z
  .object({
    localId: z.string().min(1),
    jobId: z.string().min(1),
    image: z.string().min(1),
    status: pendingInstallStatusSchema,
    phase: z.string().min(1).optional(),
    progress: z.number().min(0).max(100).optional(),
    message: z.string().optional(),
    pluginId: z.string().optional(),
    error: z.string().optional(),
    showError: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .strict();

const pendingInstallRegistrySchema = z
  .object({
    entries: z.array(pendingInstallEntrySchema),
  })
  .strict();

export type PendingInstallEntry = z.infer<typeof pendingInstallEntrySchema>;

const clampProgress = (value?: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
};

const getPendingInstallsPath = () => {
  const override = process.env.RAINBOW_PENDING_INSTALLS_PATH;
  if (override) {
    return override;
  }
  return path.join(os.homedir(), ".rainbow", "pending-installs.json");
};

const ensureStoreDir = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const normalizeEntries = (entries: PendingInstallEntry[]): PendingInstallEntry[] => {
  const now = new Date().toISOString();
  const map = new Map<string, PendingInstallEntry>();
  for (const entry of entries) {
    map.set(entry.localId, {
      ...entry,
      progress: clampProgress(entry.progress),
      updatedAt: entry.updatedAt ?? now,
      createdAt: entry.createdAt ?? now,
    });
  }
  return Array.from(map.values());
};

export const loadPendingInstallEntries = async (): Promise<PendingInstallEntry[]> => {
  const filePath = getPendingInstallsPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = pendingInstallRegistrySchema.parse(JSON.parse(raw));
    return normalizeEntries(parsed.entries);
  } catch {
    await ensureStoreDir(filePath);
    await fs.writeFile(filePath, JSON.stringify({ entries: [] }, null, 2), "utf8");
    return [];
  }
};

export const savePendingInstallEntries = async (
  entries: unknown,
): Promise<PendingInstallEntry[]> => {
  const filePath = getPendingInstallsPath();
  await ensureStoreDir(filePath);
  const parsedEntries = z.array(pendingInstallEntrySchema).parse(entries);
  const normalized = normalizeEntries(parsedEntries);
  await fs.writeFile(
    filePath,
    JSON.stringify({ entries: normalized }, null, 2),
    "utf8",
  );
  return normalized;
};
