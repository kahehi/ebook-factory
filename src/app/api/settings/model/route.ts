export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { settingsService } from "@/services/settings-service";

// GET /api/settings/model — returns the currently configured AI model
export async function GET() {
  const value = await settingsService.get("ai_model");
  return NextResponse.json({ value: value ?? "gpt-4o" });
}
