import { NextRequest, NextResponse } from "next/server";
import {
  appendActivityEvent,
  clearActivityEvents,
  loadActivityConfig,
  loadActivityEvents,
  saveActivityConfig,
  type ActivityCategory,
  type ActivityStatus,
} from "@/lib/activityLog";

type ActivityActionPayload =
  | {
      action: "log";
      event: {
        category: ActivityCategory;
        action: string;
        target?: string;
        status?: ActivityStatus;
        message: string;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      action: "clear";
    }
  | {
      action: "config";
      config: { retentionHours?: number; maxEntries?: number };
    };

export async function GET() {
  try {
    const [events, config] = await Promise.all([
      loadActivityEvents(),
      loadActivityConfig(),
    ]);
    return NextResponse.json({ isSuccess: true, data: { events, config } });
  } catch (error) {
    return NextResponse.json(
      {
        isSuccess: false,
        message: "Failed to load activity log.",
        reasons: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ActivityActionPayload;

    if (body.action === "clear") {
      await clearActivityEvents();
      return NextResponse.json({ isSuccess: true, message: "Cleared" });
    }

    if (body.action === "config") {
      const config = await saveActivityConfig(body.config ?? {});
      const events = await loadActivityEvents();
      return NextResponse.json({ isSuccess: true, data: { config, events } });
    }

    if (body.action === "log") {
      const event = body.event;
      if (!event?.category || !event?.action || !event?.message) {
        return NextResponse.json(
          {
            isSuccess: false,
            message: "Invalid event payload.",
            reasons: ["category, action and message are required."],
          },
          { status: 400 },
        );
      }

      const saved = await appendActivityEvent({
        category: event.category,
        action: event.action,
        target: event.target,
        status: event.status ?? "info",
        message: event.message,
        metadata: event.metadata,
      });
      return NextResponse.json({ isSuccess: true, data: saved });
    }

    return NextResponse.json(
      { isSuccess: false, message: "Unsupported action.", reasons: [] },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        isSuccess: false,
        message: "Failed to process activity action.",
        reasons: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 400 },
    );
  }
}
