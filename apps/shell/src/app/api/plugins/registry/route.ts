import { NextResponse } from "next/server";
import { loadPluginRegistry } from "@/lib/pluginRegistry";

export async function GET() {
  const registry = await loadPluginRegistry();
  return NextResponse.json(registry);
}
