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
  const targetWithQuery = `${target}${request.nextUrl.search ?? ""}`;
  try {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("host");
    requestHeaders.delete("content-length");

    const response = await fetch(targetWithQuery, {
      method: request.method,
      headers: requestHeaders,
      body,
      cache: "no-store",
    });

    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    headers.delete("connection");

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        isSuccess: false,
        message: "Plugin is not reachable.",
        reasons: [error instanceof Error ? error.message : "Unknown error."],
        data: { target: targetWithQuery },
      },
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
