import { NextRequest, NextResponse } from "next/server";
import { callRunner } from "@/lib/runnerClient";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const tail = request.nextUrl.searchParams.get("tail") ?? "200";
    const query = new URLSearchParams();
    if (id) query.set("id", id);
    if (tail) query.set("tail", tail);
    const data = await callRunner<{ ok: boolean; message?: string; data?: unknown }>(
      `/plugins/logs?${query.toString()}`,
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
