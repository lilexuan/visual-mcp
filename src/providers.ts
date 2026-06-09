import { resolveApiKey } from "./config.js";
import type { PreparedImage } from "./image.js";
import type { DetailLevel, ProviderConfig, VisionAnalysis } from "./types.js";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CallVisionProviderOptions {
  providerName: string;
  provider: ProviderConfig;
  image: PreparedImage;
  question: string;
  detail: DetailLevel;
  language: string;
  fetchImpl?: FetchLike;
}

interface PartialAnalysis {
  answer?: unknown;
  description?: unknown;
  observations?: unknown;
  ocr_text?: unknown;
  uncertainties?: unknown;
}

function providerBaseUrl(provider: ProviderConfig): string {
  if (provider.baseUrl) {
    return provider.baseUrl.replace(/\/+$/, "");
  }
  if (provider.type === "anthropic") {
    return "https://api.anthropic.com/v1";
  }
  return "https://api.openai.com/v1";
}

function analysisPrompt(question: string, language: string): string {
  return [
    "Analyze the provided image for a text-only model.",
    `Question: ${question}`,
    `Language policy: ${language === "auto" ? "answer in the same language as the question" : `answer in ${language}`}.`,
    "Return only valid JSON with these fields: answer, description, observations, ocr_text, uncertainties.",
    "Use empty strings or empty arrays when a field has no data. Do not identify private persons."
  ].join("\n");
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Vision provider request failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function extractJsonObject(text: string): PartialAnalysis {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return { answer: candidate, description: candidate, observations: [], ocr_text: "", uncertainties: ["Provider did not return JSON."] };
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as PartialAnalysis;
}

function normalizeAnalysis(partial: PartialAnalysis, providerName: string, model: string, usage: unknown, warnings: string[]): VisionAnalysis {
  const observations = Array.isArray(partial.observations) ? partial.observations.map(String) : [];
  const uncertainties = Array.isArray(partial.uncertainties) ? partial.uncertainties.map(String) : [];
  return {
    answer: typeof partial.answer === "string" ? partial.answer : "",
    description: typeof partial.description === "string" ? partial.description : "",
    observations,
    ocr_text: typeof partial.ocr_text === "string" ? partial.ocr_text : "",
    uncertainties,
    provider: providerName,
    model,
    usage,
    warnings
  };
}

function extractOpenAiChatText(payload: unknown): { text: string; usage: unknown } {
  const data = payload as { choices?: Array<{ message?: { content?: string } }>; usage?: unknown };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage
  };
}

function extractOpenAiResponsesText(payload: unknown): { text: string; usage: unknown } {
  const data = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: unknown };
  const fromOutput = data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text" && item.text)?.text;
  return {
    text: data.output_text ?? fromOutput ?? "",
    usage: data.usage
  };
}

function extractAnthropicText(payload: unknown): { text: string; usage: unknown } {
  const data = payload as { content?: Array<{ type?: string; text?: string }>; usage?: unknown };
  return {
    text: data.content?.find((item) => item.type === "text" && item.text)?.text ?? "",
    usage: data.usage
  };
}

export async function callVisionProvider(options: CallVisionProviderOptions): Promise<VisionAnalysis> {
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike);
  const apiKey = resolveApiKey(options.provider);
  const model = options.provider.model ?? "default";
  const prompt = analysisPrompt(options.question, options.language);
  const dataUrl = `data:${options.image.mimeType};base64,${options.image.data}`;
  const baseUrl = providerBaseUrl(options.provider);
  const maxTokens = options.provider.maxTokens ?? 1200;

  if (options.provider.type === "openai-chat") {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl, detail: options.detail } }
            ]
          }
        ],
        max_tokens: maxTokens,
        temperature: 0
      })
    });
    const { text, usage } = extractOpenAiChatText(await readJsonResponse(response));
    return normalizeAnalysis(extractJsonObject(text), options.providerName, model, usage, options.image.warnings);
  }

  if (options.provider.type === "openai-responses") {
    const response = await fetchImpl(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: dataUrl, detail: options.detail }
            ]
          }
        ],
        max_output_tokens: maxTokens,
        temperature: 0
      })
    });
    const { text, usage } = extractOpenAiResponsesText(await readJsonResponse(response));
    return normalizeAnalysis(extractJsonObject(text), options.providerName, model, usage, options.image.warnings);
  }

  const response = await fetchImpl(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: options.image.mimeType,
                data: options.image.data
              }
            },
            { type: "text", text: prompt }
          ]
        }
      ]
    })
  });
  const { text, usage } = extractAnthropicText(await readJsonResponse(response));
  return normalizeAnalysis(extractJsonObject(text), options.providerName, model, usage, options.image.warnings);
}
