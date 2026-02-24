import { NextRequest, NextResponse } from "next/server";
import { listConnections, upsertConnection } from "@openforgelabs/rainbow-connections";
import { appendActivityEvent } from "@/lib/activityLog";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params;
  const data = await listConnections(pluginId);
  const response: ApiResponse<unknown[]> = {
    isSuccess: true,
    message: "",
    reasons: [],
    data,
  };
  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const normalizedName =
    typeof body.name === "string" ? body.name.trim() : "";
  const normalizedBody: Record<string, unknown> = {
    ...body,
    name: normalizedName,
    environment:
      typeof body.environment === "string" && body.environment.trim().length > 0
        ? body.environment
        : "development",
    source:
      typeof body.source === "string" && body.source.trim().length > 0
        ? body.source
        : "local",
    isEditable: typeof body.isEditable === "boolean" ? body.isEditable : true,
  };

  try {
    const saved = await upsertConnection(pluginId, normalizedBody);
    await appendActivityEvent({
      category: "connections",
      action: "upsert",
      target: `${pluginId}:${String((normalizedBody.name as string | undefined) ?? "")}`,
      status: "success",
      message: "Connection saved.",
      metadata: { pluginId, name: normalizedBody.name },
    });

    const response: ApiResponse<unknown> = {
      isSuccess: true,
      message: "Connection saved.",
      reasons: [],
      data: saved,
    };
    return NextResponse.json(response);
  } catch (error) {
    await appendActivityEvent({
      category: "connections",
      action: "upsert",
      target: pluginId,
      status: "error",
      message: "Failed to save connection.",
      metadata: { reason: error instanceof Error ? error.message : "Unknown error" },
    });

    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Failed to save connection.",
      reasons: [error instanceof Error ? error.message : "Unknown error."],
      data: null,
    };
    return NextResponse.json(response, { status: 400 });
  }
}
