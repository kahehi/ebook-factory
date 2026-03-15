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

export async function getModel(): Promise<string> {
  return (await settingsService.get("ai_model")) ?? "gpt-5.4";
}

async function createCompletion(
  client: OpenAI,
  params: Parameters<typeof client.chat.completions.create>[0]
): Promise<OpenAI.Chat.ChatCompletion> {
  try {
    return await client.chat.completions.create(params) as OpenAI.Chat.ChatCompletion;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Some models (o1, gpt-5.x, etc.) don't support custom temperature
    if (msg.includes("temperature") && "temperature" in params) {
      const { temperature: _, ...rest } = params;
      return await client.chat.completions.create(rest) as OpenAI.Chat.ChatCompletion;
    }
    throw err;
  }
}

export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  temperature = 0.7
): Promise<string> {
  const client = await getOpenAIClient();
  const resolvedModel = model ?? (await getModel());
  const response = await createCompletion(client, {
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
  const response = await createCompletion(client, {
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
