import { NextRequest, NextResponse } from "next/server";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "Starter";

  const response: ApiResponse<{ connectionName: string; status: string }> = {
    isSuccess: true,
    message: "",
    reasons: [],
    data: {
      connectionName: name,
      status: "ok",
    },
  };

  return NextResponse.json(response);
}
