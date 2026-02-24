import { NextResponse } from "next/server";
import { exportConnections } from "@openforgelabs/rainbow-connections";
import { loadLocalPluginRegistry } from "@/lib/pluginRegistry";
import { loadThemeRegistry } from "@/lib/themeRegistry.server";
import { appendActivityEvent, loadActivityConfig, loadActivityEvents } from "@/lib/activityLog";

const SCHEMA_VERSION = 1;

export async function GET() {
  try {
    const [plugins, themes, connections, activityEvents, activityConfig] = await Promise.all([
      loadLocalPluginRegistry(),
      loadThemeRegistry(),
      exportConnections(),
      loadActivityEvents(),
      loadActivityConfig(),
    ]);

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      plugins,
      themes,
      connections,
      activity: {
        events: activityEvents,
        config: activityConfig,
      },
      meta: {
        source: "RainbowExplorer",
      },
    };

    await appendActivityEvent({
      category: "environment",
      action: "export",
      status: "success",
      message: "Environment freeze exported.",
      metadata: {
        pluginCount: plugins.plugins.length,
        themeCount: themes.themes.length,
      },
    });

    return NextResponse.json({ isSuccess: true, data: payload });
  } catch (error) {
    await appendActivityEvent({
      category: "environment",
      action: "export",
      status: "error",
      message: "Failed to export environment freeze.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });

    return NextResponse.json(
      {
        isSuccess: false,
        message: "Failed to export environment.",
        reasons: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
  }
}
