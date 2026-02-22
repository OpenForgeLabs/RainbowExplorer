import { NextRequest, NextResponse } from "next/server";
import { getPluginById, loadPluginRegistry } from "@/lib/pluginRegistry";

const resolveTarget = async (pluginId: string, path: string) => {
  const registry = await loadPluginRegistry();
  const plugin = getPluginById(registry, pluginId);
  if (!plugin?.baseUrl) {
    return null;
  }
  const base = plugin.baseUrl.replace(/\/+$/, "");
  const mountPath = plugin.mountPath ?? `/plugins/${plugin.id}`;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${mountPath}${normalizedPath}`;
};

const forward = async (request: NextRequest, target: string) => {
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const response = await fetch(target, {
    method: request.method,
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { isSuccess: false, message: "Invalid response from plugin.", reasons: [text] },
      { status: 502 },
    );
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> },
) {
  const { pluginId, path } = await params;
  const target = await resolveTarget(pluginId, path.join("/"));
  if (!target) {
    return NextResponse.json(
      { isSuccess: false, message: "Plugin not configured.", reasons: [] },
      { status: 404 },
    );
  }
  return forward(request, target);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> },
) {
  const { pluginId, path } = await params;
  const target = await resolveTarget(pluginId, path.join("/"));
  if (!target) {
    return NextResponse.json(
      { isSuccess: false, message: "Plugin not configured.", reasons: [] },
      { status: 404 },
    );
  }
  return forward(request, target);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> },
) {
  const { pluginId, path } = await params;
  const target = await resolveTarget(pluginId, path.join("/"));
  if (!target) {
    return NextResponse.json(
      { isSuccess: false, message: "Plugin not configured.", reasons: [] },
      { status: 404 },
    );
  }
  return forward(request, target);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> },
) {
  const { pluginId, path } = await params;
  const target = await resolveTarget(pluginId, path.join("/"));
  if (!target) {
    return NextResponse.json(
      { isSuccess: false, message: "Plugin not configured.", reasons: [] },
      { status: 404 },
    );
  }
  return forward(request, target);
}
