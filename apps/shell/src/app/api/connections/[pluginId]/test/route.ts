import { NextRequest, NextResponse } from "next/server";
import { getPluginById, loadPluginRegistry } from "@/lib/pluginRegistry";
import { appendActivityEvent } from "@/lib/activityLog";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params;
  const registry = await loadPluginRegistry();
  const plugin = getPluginById(registry, pluginId);
  if (!plugin) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Plugin not configured.",
      reasons: [],
      data: null,
    };
    return NextResponse.json(response, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  try {
    const mountPath = plugin.mountPath ?? `/plugins/${pluginId}`;
    const base = plugin.baseUrl.replace(/\/+$/, "");
    const target = `${base}${mountPath}/api/${pluginId}/connections/test`;
    const testResponse = await fetch(target, {
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
        message: "Invalid response from plugin test endpoint.",
        reasons: [text],
        data: null,
      };
    }

    await appendActivityEvent({
      category: "connections",
      action: "test",
      target: `${pluginId}:${String(body.name ?? "")}`,
      status: data.isSuccess ? "success" : "error",
      message: data.message || "Connection tested.",
      metadata: { pluginId, isSuccess: data.isSuccess },
    });

    return NextResponse.json(data, { status: testResponse.status });
  } catch (error) {
    await appendActivityEvent({
      category: "connections",
      action: "test",
      target: pluginId,
      status: "error",
      message: "Failed to test connection.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });

    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Failed to test connection.",
      reasons: [error instanceof Error ? error.message : "Unknown error."],
      data: null,
    };
    return NextResponse.json(response, { status: 500 });
  }
}
