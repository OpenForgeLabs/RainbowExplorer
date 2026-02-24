import { NextRequest, NextResponse } from "next/server";
import {
  loadLocalPluginRegistry,
  saveLocalPluginRegistry,
} from "@/lib/pluginRegistry";
import { appendActivityEvent } from "@/lib/activityLog";

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

    const data = await loadLocalPluginRegistry();
    const plugins = (data.plugins ?? []).map((plugin) => {
      if (plugin.id === body.pluginId) {
        return { ...plugin, enabled: body.enabled };
      }
      return plugin;
    });

    await saveLocalPluginRegistry({ plugins });
    await appendActivityEvent({
      category: "plugins",
      action: "toggle",
      target: body.pluginId,
      status: "success",
      message: `Plugin ${body.enabled ? "enabled" : "disabled"}.`,
      metadata: { pluginId: body.pluginId, enabled: body.enabled },
    });

    return NextResponse.json({ isSuccess: true, message: "Updated", reasons: [] });
  } catch (error) {
    await appendActivityEvent({
      category: "plugins",
      action: "toggle",
      status: "error",
      message: "Failed to update plugin registry.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });
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
