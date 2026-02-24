import { NextRequest, NextResponse } from "next/server";
import { importConnections } from "@openforgelabs/rainbow-connections";
import {
  appendActivityEvent,
  importActivityEvents,
  loadActivityConfig,
  saveActivityConfig,
} from "@/lib/activityLog";
import {
  loadLocalPluginRegistry,
  saveLocalPluginRegistry,
  type PluginRegistry,
} from "@/lib/pluginRegistry";
import {
  loadThemeRegistry,
  mergeThemeRegistry,
  saveThemeRegistry,
} from "@/lib/themeRegistry.server";
import { themeRegistrySchema } from "@/lib/themeRegistry";

type EnvironmentImportPayload = {
  mode?: "replace" | "merge";
  payload?: {
    plugins?: unknown;
    themes?: unknown;
    connections?: unknown;
    activity?: {
      events?: unknown;
      config?: { retentionHours?: number; maxEntries?: number };
    };
  };
};

const asPluginRegistry = (value: unknown): PluginRegistry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { plugins?: unknown };
  if (!Array.isArray(raw.plugins)) {
    return null;
  }
  return { plugins: raw.plugins as PluginRegistry["plugins"] };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EnvironmentImportPayload;
    const mode: "replace" | "merge" = body.mode === "merge" ? "merge" : "replace";
    const payload = body.payload;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        {
          isSuccess: false,
          message: "Invalid import payload.",
          reasons: ["Expected { payload } object."],
        },
        { status: 400 },
      );
    }

    if (payload.plugins) {
      const plugins = asPluginRegistry(payload.plugins);
      if (!plugins) {
        return NextResponse.json(
          {
            isSuccess: false,
            message: "Invalid plugins payload.",
            reasons: ["Expected registry shape with plugins array."],
          },
          { status: 400 },
        );
      }
      if (mode === "replace") {
        await saveLocalPluginRegistry(plugins);
      } else {
        const current = await loadLocalPluginRegistry();
        const map = new Map<string, PluginRegistry["plugins"][number]>();
        for (const plugin of current.plugins) {
          map.set(plugin.id, plugin);
        }
        for (const plugin of plugins.plugins) {
          map.set(plugin.id, plugin);
        }
        await saveLocalPluginRegistry({ plugins: Array.from(map.values()) });
      }
    }

    if (payload.themes) {
      const parsedThemes = themeRegistrySchema.parse(payload.themes);
      if (mode === "replace") {
        await saveThemeRegistry(parsedThemes);
      } else {
        await mergeThemeRegistry(parsedThemes);
      }
    }

    if (payload.connections && typeof payload.connections === "object") {
      await importConnections(
        payload.connections as Parameters<typeof importConnections>[0],
        mode,
      );
    }

    if (payload.activity?.config) {
      await saveActivityConfig(payload.activity.config);
    }

    if (Array.isArray(payload.activity?.events)) {
      await importActivityEvents(
        payload.activity.events as Parameters<typeof importActivityEvents>[0],
        mode,
      );
    }

    const [plugins, themes, activityConfig] = await Promise.all([
      loadLocalPluginRegistry(),
      loadThemeRegistry(),
      loadActivityConfig(),
    ]);

    await appendActivityEvent({
      category: "environment",
      action: "import",
      status: "success",
      message: "Environment freeze imported.",
      metadata: { mode, plugins: plugins.plugins.length, themes: themes.themes.length },
    });

    return NextResponse.json({
      isSuccess: true,
      message: "Environment imported.",
      data: {
        mode,
        plugins: plugins.plugins.length,
        themes: themes.themes.length,
        activityConfig,
      },
    });
  } catch (error) {
    await appendActivityEvent({
      category: "environment",
      action: "import",
      status: "error",
      message: "Failed to import environment freeze.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });

    return NextResponse.json(
      {
        isSuccess: false,
        message: "Failed to import environment.",
        reasons: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 400 },
    );
  }
}
