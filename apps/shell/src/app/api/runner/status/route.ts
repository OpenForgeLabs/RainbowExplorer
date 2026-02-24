import { NextRequest, NextResponse } from "next/server";
import { callRunner } from "@/lib/runnerClient";

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get("ids") ?? "";
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const query = new URLSearchParams();
    if (ids) query.set("ids", ids);
    if (id) query.set("id", id);
    const qs = query.toString();
    const data = await callRunner<{ ok: boolean; message?: string; data?: unknown }>(
      `/plugins/status${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
    return NextResponse.json(data, { status: data.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Runner unavailable",
      },
      { status: 500 },
    );
  }
}
