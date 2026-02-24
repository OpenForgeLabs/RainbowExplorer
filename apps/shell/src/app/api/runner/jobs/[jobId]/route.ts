import { NextRequest, NextResponse } from "next/server";
import { callRunner } from "@/lib/runnerClient";

type RunnerResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  try {
    const data = await callRunner<RunnerResponse<unknown>>(
      `/jobs/${encodeURIComponent(jobId)}`,
      { method: "GET" },
    );
    const statusCode = data.ok ? 200 : 404;
    return NextResponse.json(data, { status: statusCode });
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
