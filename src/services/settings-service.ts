import { prisma } from "@/lib/prisma";

const SENSITIVE_KEYS = ["openai_api_key"];

function maskValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.includes(key)) return value;
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

export class SettingsService {
  async get(key: string): Promise<string | null> {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async getAll(): Promise<Array<{ key: string; maskedValue: string; isSet: boolean }>> {
    const rows = await prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    return [
      {
        key: "openai_api_key",
        maskedValue: map.has("openai_api_key")
          ? maskValue("openai_api_key", map.get("openai_api_key")!)
          : "",
        isSet: map.has("openai_api_key"),
      },
    ];
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async delete(key: string): Promise<void> {
    await prisma.appSetting.deleteMany({ where: { key } });
  }
}

export const settingsService = new SettingsService();
