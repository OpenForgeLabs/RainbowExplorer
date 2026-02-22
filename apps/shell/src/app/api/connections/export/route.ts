import { NextResponse } from "next/server";
import { exportConnections } from "@openforgelabs/rainbow-connections";

export async function GET() {
  const data = await exportConnections();
  return NextResponse.json(data);
}
