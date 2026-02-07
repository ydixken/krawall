import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Integration tests for Presets and Template Validation API endpoints.
 *
 * Tests:
 * - GET /api/presets returns all presets with correct shape
 * - POST /api/templates/validate with valid, invalid, and edge-case templates
 */

// ---------- helpers ----------

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  const init: RequestInit = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as RequestInit & { signal?: AbortSignal });
}

// ============================================================
// GET /api/presets
// ============================================================

describe("GET /api/presets", () => {
  it("should return all presets with correct shape", async () => {
    const { GET } = await import("@/app/api/presets/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(6);

    // Verify each preset has the required fields
    for (const preset of body.data) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.connectorType).toBeTruthy();
      expect(preset.defaultEndpoint).toBeTruthy();
      expect(preset.authType).toBeTruthy();
      expect(Array.isArray(preset.authFields)).toBe(true);
      expect(preset.requestTemplate).toBeDefined();
      expect(preset.requestTemplate.messagePath).toBeTruthy();
      expect(preset.responseTemplate).toBeDefined();
      expect(preset.responseTemplate.responsePath).toBeTruthy();
      expect(preset.documentation).toBeTruthy();
      expect(preset.exampleResponse).toBeDefined();
    }
  });

  it("should include known preset IDs", async () => {
    const { GET } = await import("@/app/api/presets/route");
    const response = await GET();
    const body = await response.json();

    const ids = body.data.map((p: any) => p.id);
    expect(ids).toContain("openai-chat");
    expect(ids).toContain("anthropic-messages");
    expect(ids).toContain("google-gemini");
    expect(ids).toContain("azure-openai");
    expect(ids).toContain("ollama");
    expect(ids).toContain("custom-http");
  });
});

// ============================================================
// POST /api/templates/validate
// ============================================================

describe("POST /api/templates/validate", () => {
  describe("valid templates", () => {
    it("should validate a valid request template with structure", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          requestTemplate: {
            messagePath: "messages.0.content",
            structure: {
              model: "gpt-4",
              messages: [{ role: "user", content: "" }],
            },
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.results.length).toBeGreaterThanOrEqual(1);
      expect(body.data.results[0].field).toBe("requestTemplate.messagePath");
      expect(body.data.results[0].valid).toBe(true);
    });

    it("should validate a valid response template with sample response", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "choices.0.message.content",
            tokenUsagePath: "usage",
          },
          sampleResponse: {
            choices: [
              { message: { role: "assistant", content: "Hello!" } },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);

      const contentResult = body.data.results.find(
        (r: any) => r.field === "responseTemplate.responsePath"
      );
      expect(contentResult).toBeDefined();
      expect(contentResult.valid).toBe(true);
      expect(contentResult.message).toContain("Hello!");

      const tokenResult = body.data.results.find(
        (r: any) => r.field === "responseTemplate.tokenUsagePath"
      );
      expect(tokenResult).toBeDefined();
      expect(tokenResult.valid).toBe(true);
    });

    it("should validate both request and response templates together", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          requestTemplate: {
            messagePath: "message",
            structure: { message: "" },
          },
          responseTemplate: {
            responsePath: "response",
          },
          sampleResponse: {
            response: "Test reply",
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.results.length).toBe(2);
    });
  });

  describe("invalid templates", () => {
    it("should report invalid responsePath", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "nonexistent.deeply.nested.path",
          },
          sampleResponse: {
            data: { text: "Hello" },
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(false);

      const contentResult = body.data.results.find(
        (r: any) => r.field === "responseTemplate.responsePath"
      );
      expect(contentResult).toBeDefined();
      expect(contentResult.valid).toBe(false);
      expect(contentResult.suggestion).toBeDefined();
      expect(Array.isArray(contentResult.suggestion)).toBe(true);
    });

    it("should report invalid tokenUsagePath", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "content",
            tokenUsagePath: "nonexistent.usage",
          },
          sampleResponse: {
            content: "Hello",
            tokens: { total: 10 },
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.valid).toBe(false);

      const tokenResult = body.data.results.find(
        (r: any) => r.field === "responseTemplate.tokenUsagePath"
      );
      expect(tokenResult).toBeDefined();
      expect(tokenResult.valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept request template without structure", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          requestTemplate: {
            messagePath: "content",
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.results[0].message).toContain("no structure to validate against");
    });

    it("should accept response template without sample response", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "choices.0.message.content",
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.results[0].message).toContain("no sample response");
    });

    it("should handle errorPath validation in response template", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "content",
            errorPath: "error.message",
          },
          sampleResponse: {
            content: "Success response",
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      const errorResult = body.data.results.find(
        (r: any) => r.field === "responseTemplate.errorPath"
      );
      expect(errorResult).toBeDefined();
      expect(errorResult.valid).toBe(true);
      expect(errorResult.message).toContain("structurally valid");
    });

    it("should return 400 for missing required fields in schema", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          requestTemplate: {
            // messagePath is required but missing
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation error");
      expect(body.details).toBeDefined();
    });

    it("should accept empty body (no templates to validate)", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {},
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.results.length).toBe(0);
    });

    it("should handle deeply nested paths in sample response", async () => {
      const { POST } = await import("@/app/api/templates/validate/route");
      const req = makeRequest("http://localhost:3000/api/templates/validate", {
        method: "POST",
        body: {
          responseTemplate: {
            responsePath: "candidates.0.content.parts.0.text",
          },
          sampleResponse: {
            candidates: [
              {
                content: {
                  parts: [{ text: "Deeply nested content" }],
                  role: "model",
                },
              },
            ],
          },
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.valid).toBe(true);
      expect(body.data.results[0].message).toContain("Deeply nested content");
    });
  });
});
