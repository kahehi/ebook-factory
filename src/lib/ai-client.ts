import OpenAI from "openai";
import { settingsService } from "@/services/settings-service";

export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await settingsService.get("openai_api_key");
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Go to Settings and enter your API key."
    );
  }
  return new OpenAI({ apiKey });
}

// Reads the configured model from DB, falls back to gpt-4o-mini.
export async function getModel(): Promise<string> {
  return (await settingsService.get("ai_model")) ?? "gpt-5.4";
}

export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  temperature = 0.7
): Promise<string> {
  const client = await getOpenAIClient();
  const resolvedModel = model ?? (await getModel());
  const response = await client.chat.completions.create({
    model: resolvedModel,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function chatCompleteJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  temperature = 0.3
): Promise<T> {
  const client = await getOpenAIClient();
  const resolvedModel = model ?? (await getModel());
  const response = await client.chat.completions.create({
    model: resolvedModel,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}
