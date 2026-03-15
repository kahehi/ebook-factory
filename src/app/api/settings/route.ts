import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { settingsService } from "@/services/settings-service";

const UpdateSettingSchema = z.object({
  key: z.enum(["openai_api_key", "ai_model"]),
  value: z.string().min(1, "Value cannot be empty"),
});

// GET /api/settings — returns all settings with masked values
export async function GET() {
  try {
    const settings = await settingsService.getAll();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings — upsert a setting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateSettingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await settingsService.set(parsed.data.key, parsed.data.value);
    return NextResponse.json({ success: true, data: { saved: true } });
  } catch (error) {
    console.error("[POST /api/settings]", error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to save setting" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings — remove a setting
export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key) {
      return NextResponse.json(
        { success: false, data: null, error: "Key required" },
        { status: 400 }
      );
    }
    await settingsService.delete(key);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/settings]", error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
