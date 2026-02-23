import { NextRequest, NextResponse } from "next/server";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  const response: ApiResponse<{ received: Record<string, unknown> }> = {
    isSuccess: name.length > 0,
    message: name.length > 0 ? "Connection test succeeded." : "Display Name is required.",
    reasons: name.length > 0 ? [] : ["Field 'name' is required."],
    data: { received: body },
  };

  return NextResponse.json(response, { status: response.isSuccess ? 200 : 400 });
}
