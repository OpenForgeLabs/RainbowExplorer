import { NextResponse } from "next/server";
import { exportConnections } from "@openforgelabs/rainbow-connections";
import { appendActivityEvent } from "@/lib/activityLog";

export async function GET() {
  const data = await exportConnections();
  await appendActivityEvent({
    category: "connections",
    action: "export",
    status: "success",
    message: "Connections exported.",
    metadata: {
      pluginCount: Object.keys(data.plugins ?? {}).length,
    },
  });
  return NextResponse.json(data);
}
