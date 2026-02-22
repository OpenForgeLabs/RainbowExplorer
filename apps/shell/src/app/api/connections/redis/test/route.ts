import { NextRequest, NextResponse } from "next/server";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import { getPluginById, loadPluginRegistry } from "@/lib/pluginRegistry";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

const PLUGIN_ID = "redis";

const loadManifest = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/api/plugin-manifest`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load plugin manifest.");
  }
  return (await response.json()) as PluginManifest;
};

export async function POST(request: NextRequest) {
  const registry = await loadPluginRegistry();
  const plugin = getPluginById(registry, PLUGIN_ID);
  if (!plugin) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Redis plugin not configured.",
      reasons: [],
      data: null,
    };
    return NextResponse.json(response, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  try {
    const manifest = await loadManifest(plugin.baseUrl);
    const pluginTest =
      manifest.connections.pluginTestEndpoint ??
      (manifest.connections.provider === "plugin"
        ? manifest.connections.testEndpoint
        : null);
    if (!pluginTest) {
      const response: ApiResponse<null> = {
        isSuccess: false,
        message: "Redis plugin does not expose a test endpoint.",
        reasons: [],
        data: null,
      };
      return NextResponse.json(response, { status: 400 });
    }
    const trimmed = pluginTest.replace(/^\//, "");
    const testResponse = await fetch(`${plugin.baseUrl}/${trimmed}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await testResponse.text();
    let data: ApiResponse<unknown>;
    try {
      data = JSON.parse(text) as ApiResponse<unknown>;
    } catch {
      data = {
        isSuccess: false,
        message: "Invalid response from Redis plugin test endpoint.",
        reasons: [text],
        data: null,
      };
    }
    return NextResponse.json(data, { status: testResponse.status });
  } catch (error) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Failed to test connection.",
      reasons: [error instanceof Error ? error.message : "Unknown error."],
      data: null,
    };
    return NextResponse.json(response, { status: 500 });
  }
}
