import { NextRequest, NextResponse } from "next/server";
import {
  loadPendingInstallEntries,
  savePendingInstallEntries,
} from "@/lib/pendingInstallsStore";

export async function GET() {
  try {
    const entries = await loadPendingInstallEntries();
    return NextResponse.json({ ok: true, data: { entries } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load pending installs.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { entries?: unknown };
    const entries = await savePendingInstallEntries(body.entries ?? []);
    return NextResponse.json({ ok: true, data: { entries } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to save pending installs.",
      },
      { status: 400 },
    );
  }
}
