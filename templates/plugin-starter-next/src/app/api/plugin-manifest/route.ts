import { NextResponse } from "next/server";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";

const manifest: PluginManifest = {
  id: "starter",
  name: "Starter Plugin",
  description: "Base starter plugin for RainbowExplorer.",
  connections: {
    summaryEndpoint: "api/starter/connections/summary?name={connectionName}",
    openConnectionPath: "/{connectionName}",
    schema: {
      title: "Add Starter Connection",
      description: "Minimal connection schema for starter plugin.",
      fields: [
        {
          id: "name",
          label: "Display Name",
          type: "text",
          placeholder: "e.g. Local Starter",
          required: true,
        },
        {
          id: "endpoint",
          label: "Endpoint",
          type: "text",
          placeholder: "https://api.example.com",
          required: true,
        },
        {
          id: "apiKey",
          label: "API Key",
          type: "password",
          placeholder: "optional",
        },
      ],
    },
  },
  views: [
    {
      id: "overview",
      title: "Overview",
      route: "/{connectionName}",
      icon: "insights",
      type: "iframe",
    },
  ],
};

export async function GET() {
  return NextResponse.json(manifest);
}
