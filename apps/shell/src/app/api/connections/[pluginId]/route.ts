import { NextRequest, NextResponse } from "next/server";
import { listConnections, upsertConnection } from "@openforgelabs/rainbow-connections";

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

  try {
    const saved = await upsertConnection(pluginId, body);
    const response: ApiResponse<unknown> = {
      isSuccess: true,
      message: "Connection saved.",
      reasons: [],
      data: saved,
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Failed to save connection.",
      reasons: [error instanceof Error ? error.message : "Unknown error."],
      data: null,
    };
    return NextResponse.json(response, { status: 400 });
  }
}
