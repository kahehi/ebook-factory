import OpenAI from "openai";
import { settingsService } from "@/services/settings-service";

// Returns an OpenAI client using the key stored in the DB.
// Throws a clear error if no key is configured.
export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await settingsService.get("openai_api_key");
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Go to Settings and enter your API key."
    );
  }
  return new OpenAI({ apiKey });
}

// Convenience wrapper: sends a single user message, returns the text response.
export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  model = "gpt-4o",
  temperature = 0.7
): Promise<string> {
  const client = await getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

// Same as chatComplete but parses the response as JSON.
// The system prompt should instruct the model to respond with valid JSON only.
export async function chatCompleteJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  model = "gpt-4o",
  temperature = 0.3
): Promise<T> {
  const client = await getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
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
