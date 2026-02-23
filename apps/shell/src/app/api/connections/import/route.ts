import { NextRequest, NextResponse } from "next/server";
import { importConnections } from "@openforgelabs/rainbow-connections";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { store?: unknown; mode?: string };
    const store = body?.store;
    if (!store || typeof store !== "object") {
      const response: ApiResponse<null> = {
        isSuccess: false,
        message: "Invalid import payload.",
        reasons: ["Expected { store } JSON payload."],
        data: null,
      };
      return NextResponse.json(response, { status: 400 });
    }
    const mode = body?.mode === "replace" ? "replace" : "merge";
    const typedStore = store as Parameters<typeof importConnections>[0];
    await importConnections(typedStore, mode);
    const response: ApiResponse<null> = {
      isSuccess: true,
      message: "Connections imported.",
      reasons: [],
      data: null,
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      isSuccess: false,
      message: "Failed to import connections.",
      reasons: [error instanceof Error ? error.message : "Unknown error."],
      data: null,
    };
    return NextResponse.json(response, { status: 500 });
  }
}
