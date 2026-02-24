import { NextRequest, NextResponse } from "next/server";
import { callRunner } from "@/lib/runnerClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await callRunner<{ ok: boolean; message?: string; data?: unknown }>(
      "/plugins/remove",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
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
