import { NextRequest, NextResponse } from "next/server";
import {
  loadThemeRegistry,
  mergeThemeRegistry,
  resetThemeRegistry,
  saveThemeRegistry,
} from "@/lib/themeRegistry.server";
import { themeRegistrySchema } from "@/lib/themeRegistry";
import { appendActivityEvent } from "@/lib/activityLog";

const importModeSchema = ["replace", "merge"] as const;

type ThemeRegistryActionPayload =
  | { action: "replace"; registry: unknown }
  | { action: "import"; mode?: "replace" | "merge"; registry: unknown }
  | { action: "reset" };

export async function GET() {
  try {
    const registry = await loadThemeRegistry();
    return NextResponse.json({ isSuccess: true, data: registry, message: "OK", reasons: [] });
  } catch (error) {
    return NextResponse.json(
      {
        isSuccess: false,
        data: null,
        message: "Failed to load theme registry.",
        reasons: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { registry?: unknown };
    const parsed = themeRegistrySchema.parse(body.registry);
    const saved = await saveThemeRegistry(parsed);
    await appendActivityEvent({
      category: "themes",
      action: "save",
      status: "success",
      message: "Theme registry saved.",
      metadata: { themes: saved.themes.length },
    });
    return NextResponse.json({ isSuccess: true, data: saved, message: "Saved", reasons: [] });
  } catch (error) {
    await appendActivityEvent({
      category: "themes",
      action: "save",
      status: "error",
      message: "Failed to save theme registry.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });

    return NextResponse.json(
      {
        isSuccess: false,
        data: null,
        message: "Failed to save theme registry.",
        reasons: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ThemeRegistryActionPayload;

    if (body.action === "reset") {
      const reset = await resetThemeRegistry();
      await appendActivityEvent({
        category: "themes",
        action: "reset",
        status: "success",
        message: "Theme registry reset.",
      });
      return NextResponse.json({ isSuccess: true, data: reset, message: "Reset", reasons: [] });
    }

    if (body.action === "replace") {
      const parsed = themeRegistrySchema.parse(body.registry);
      const saved = await saveThemeRegistry(parsed);
      await appendActivityEvent({
        category: "themes",
        action: "replace",
        status: "success",
        message: "Theme registry replaced.",
        metadata: { themes: saved.themes.length },
      });
      return NextResponse.json({ isSuccess: true, data: saved, message: "Replaced", reasons: [] });
    }

    if (body.action === "import") {
      const parsed = themeRegistrySchema.parse(body.registry);
      const mode = body.mode ?? "merge";
      if (!importModeSchema.includes(mode)) {
        return NextResponse.json(
          { isSuccess: false, data: null, message: "Invalid import mode.", reasons: [] },
          { status: 400 },
        );
      }
      const saved = mode === "replace" ? await saveThemeRegistry(parsed) : await mergeThemeRegistry(parsed);
      await appendActivityEvent({
        category: "themes",
        action: "import",
        status: "success",
        message: "Theme registry imported.",
        metadata: { mode, themes: saved.themes.length },
      });
      return NextResponse.json({ isSuccess: true, data: saved, message: "Imported", reasons: [] });
    }

    return NextResponse.json(
      { isSuccess: false, data: null, message: "Unsupported action.", reasons: [] },
      { status: 400 },
    );
  } catch (error) {
    await appendActivityEvent({
      category: "themes",
      action: "import",
      status: "error",
      message: "Failed to process theme registry action.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });
    return NextResponse.json(
      {
        isSuccess: false,
        data: null,
        message: "Failed to process theme registry action.",
        reasons: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 400 },
    );
  }
}
