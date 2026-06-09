import { describe, expect, test, vi } from "vitest";
import { callVisionProvider } from "../src/providers.js";
import type { PreparedImage } from "../src/image.js";

const image: PreparedImage = {
  data: "abc123",
  mimeType: "image/png",
  width: 10,
  height: 8,
  bytes: 6,
  warnings: []
};

describe("vision provider adapters", () => {
  test("calls OpenAI Chat Completions compatible providers with image data URLs", async () => {
    const fetchImpl = vi.fn(async (_input: string, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "A sunset.",
                  description: "The image shows a sunset.",
                  observations: ["orange sky"],
                  ocr_text: "",
                  uncertainties: []
                })
              }
            }
          ],
          usage: { total_tokens: 42 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const result = await callVisionProvider({
      providerName: "openai",
      provider: {
        type: "openai-chat",
        model: "gpt-4.1-mini",
        apiKey: "secret",
        baseUrl: "https://gateway.example/v1"
      },
      image,
      question: "What is shown?",
      detail: "high",
      language: "auto",
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://gateway.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" })
      })
    );
    const firstCall = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(firstCall[1]?.body));
    expect(body.model).toBe("gpt-4.1-mini");
    expect(body.messages[0].content[1]).toMatchObject({
      type: "image_url",
      image_url: {
        url: "data:image/png;base64,abc123",
        detail: "high"
      }
    });
    expect(result.answer).toBe("A sunset.");
    expect(result.usage).toEqual({ total_tokens: 42 });
  });

  test("calls Anthropic Messages providers with base64 image content blocks", async () => {
    const fetchImpl = vi.fn(async (_input: string, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                answer: "A sunset.",
                description: "The image shows a sunset.",
                observations: [],
                ocr_text: "",
                uncertainties: []
              })
            }
          ],
          usage: { input_tokens: 12, output_tokens: 8 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const result = await callVisionProvider({
      providerName: "anthropic",
      provider: {
        type: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "secret"
      },
      image,
      question: "Describe it",
      detail: "auto",
      language: "auto",
      fetchImpl
    });

    const firstCall = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(firstCall[1]?.body));
    expect(firstCall[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(body.messages[0].content[0]).toMatchObject({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "abc123"
      }
    });
    expect(result.provider).toBe("anthropic");
  });
});
