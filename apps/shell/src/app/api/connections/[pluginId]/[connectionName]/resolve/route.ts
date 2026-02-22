import { NextRequest, NextResponse } from "next/server";
import { resolveConnection } from "@openforgelabs/rainbow-connections";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ pluginId: string; connectionName: string }> },
) {
  const { pluginId, connectionName } = await params;
  const payload = await resolveConnection(pluginId, connectionName);
  if (!payload) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Connection not found.",
      reasons: [],
      data: null,
    };
    return NextResponse.json(response, { status: 404 });
  }

  const response: ApiResponse<unknown> = {
    isSuccess: true,
    message: "",
    reasons: [],
    data: payload,
  };
  return NextResponse.json(response);
}
