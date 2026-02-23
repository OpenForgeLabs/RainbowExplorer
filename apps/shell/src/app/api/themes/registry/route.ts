import { NextRequest, NextResponse } from "next/server";
import {
  loadThemeRegistry,
  mergeThemeRegistry,
  resetThemeRegistry,
  saveThemeRegistry,
} from "@/lib/themeRegistry.server";
import { themeRegistrySchema } from "@/lib/themeRegistry";

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
    return NextResponse.json({ isSuccess: true, data: saved, message: "Saved", reasons: [] });
  } catch (error) {
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
      return NextResponse.json({ isSuccess: true, data: reset, message: "Reset", reasons: [] });
    }

    if (body.action === "replace") {
      const parsed = themeRegistrySchema.parse(body.registry);
      const saved = await saveThemeRegistry(parsed);
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
      return NextResponse.json({ isSuccess: true, data: saved, message: "Imported", reasons: [] });
    }

    return NextResponse.json(
      { isSuccess: false, data: null, message: "Unsupported action.", reasons: [] },
      { status: 400 },
    );
  } catch (error) {
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
