import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(appRoot, "../../../../../../plugin-registry.json");

type UpdatePayload = {
  pluginId: string;
  enabled: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdatePayload;
    if (!body?.pluginId) {
      return NextResponse.json(
        { isSuccess: false, message: "Missing pluginId", reasons: [] },
        { status: 400 },
      );
    }

    const raw = await readFile(registryPath, "utf-8");
    const data = JSON.parse(raw) as { plugins: Array<Record<string, unknown>> };

    const plugins = (data.plugins ?? []).map((plugin) => {
      if (plugin.id === body.pluginId) {
        return { ...plugin, enabled: body.enabled };
      }
      return plugin;
    });

    await writeFile(
      registryPath,
      JSON.stringify({ ...data, plugins }, null, 2),
      "utf-8",
    );

    return NextResponse.json({ isSuccess: true, message: "Updated", reasons: [] });
  } catch (error) {
    return NextResponse.json(
      {
        isSuccess: false,
        message: "Failed to update registry",
        reasons: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 },
    );
  }
}
