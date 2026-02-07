import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import MockChatbotServer from "@/tests/mocks/chatbot-server";

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

function chatUrl(path = "/v1/chat/completions") {
  return `${BASE}${path}`;
}

function makeBody(message: string, persona?: string) {
  return {
    model: "mock-gpt-4",
    messages: [{ role: "user", content: message }],
    ...(persona ? { persona } : {}),
  };
}

function headers(persona?: string, sessionId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (persona) h["X-Persona"] = persona;
  if (sessionId) h["X-Session-Id"] = sessionId;
  return h;
}

describe("Mock Chatbot Personas", () => {
  let server: MockChatbotServer;

  beforeAll(async () => {
    server = new MockChatbotServer(PORT, true);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  // ─── Default persona ────────────────────────────────────────────────────

  describe("default persona", () => {
    it("should respond without persona header", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(makeBody("Hello world")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices[0].message.content).toBeTruthy();
      expect(data.usage.total_tokens).toBeGreaterThan(0);
    });

    it("should return XML when asked", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(makeBody("Give me XML format")),
      });

      const data = await res.json();
      expect(data.choices[0].message.content).toContain("<?xml");
      expect(data.choices[0].message.content).toContain("<response>");
    });

    it("should return verbose response when asked for details", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(makeBody("Please elaborate on this topic")),
      });

      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content.length).toBeGreaterThan(200);
      expect(content).toContain("comprehensive");
    });
  });

  // ─── E-Commerce persona ─────────────────────────────────────────────────

  describe("ecommerce persona", () => {
    const sid = "ecom-test-session";

    it("should list products", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sid),
        body: JSON.stringify(makeBody("list products")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("UltraBook Pro 15");
      expect(content).toContain("GameStation X");
      expect(content).toContain("$1299.99");
    });

    it("should compare products", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sid + "-compare"),
        body: JSON.stringify(makeBody("compare products")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("Comparison");
      expect(content).toContain("Price");
      expect(content).toContain("Rating");
    });

    it("should return reviews", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sid + "-reviews"),
        body: JSON.stringify(makeBody("reviews for ultrabook pro 15")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("TechFan42");
      expect(content).toContain("Reviews for");
    });

    it("should return XML format catalog", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sid + "-xml"),
        body: JSON.stringify(makeBody("XML format")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("<?xml");
      expect(content).toContain("<catalog>");
      expect(content).toContain("<product");
    });

    it("should summarize conversation", async () => {
      const sessionId = "ecom-summary-session";

      // Send a first message to build history
      await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sessionId),
        body: JSON.stringify(makeBody("list products")),
      });

      // Now ask for summary
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", sessionId),
        body: JSON.stringify(makeBody("summarize our conversation")),
      });

      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("summary");
      expect(content).toContain("list products");
    });
  });

  // ─── Support persona ────────────────────────────────────────────────────

  describe("support persona", () => {
    it("should return structured responses with ticket numbers", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("support", "support-ticket-test"),
        body: JSON.stringify(makeBody("I need help with my order")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      expect(parsed.ticket).toMatch(/^TKT-\d+$/);
      expect(parsed.status).toBeTruthy();
    });

    it("should match FAQ keywords", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("support", "support-faq-test"),
        body: JSON.stringify(makeBody("What is your return policy?")),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      expect(parsed.status).toBe("resolved");
      expect(parsed.faq_match).toContain("return");
      expect(parsed.message).toContain("30-day");
    });

    it("should escalate after 5 messages", async () => {
      const sessionId = "support-escalation-test";

      // Send 5 messages (requestCount reaches 5 on the 5th)
      for (let i = 0; i < 5; i++) {
        await fetch(chatUrl(), {
          method: "POST",
          headers: headers("support", sessionId),
          body: JSON.stringify(makeBody(`Message ${i + 1}`)),
        });
      }

      // 6th message should be escalated (requestCount >= 5)
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("support", sessionId),
        body: JSON.stringify(makeBody("Another question")),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      expect(parsed.status).toBe("escalated");
      expect(parsed.message).toContain("transfer");
      expect(parsed.priority).toBe("high");
    });
  });

  // ─── Code persona ──────────────────────────────────────────────────────

  describe("code persona", () => {
    it("should return code blocks", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("code", "code-test"),
        body: JSON.stringify(makeBody("write a function")),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("```");
      expect(content).toContain("function");
    });

    it("should return TypeScript code when requested", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("code", "code-ts-test"),
        body: JSON.stringify(makeBody("write a typescript example")),
      });

      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("```typescript");
      expect(content).toContain("Record<string, unknown>");
    });

    it("should return verbose explanations", async () => {
      const res = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("code", "code-explain-test"),
        body: JSON.stringify(makeBody("explain this concept")),
      });

      const data = await res.json();
      const content = data.choices[0].message.content;
      expect(content).toContain("explanation");
      expect(content.length).toBeGreaterThan(100);
    });

    it("should generate increasingly long code examples", async () => {
      const sessionId = "code-growing-test";

      const res1 = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("code", sessionId),
        body: JSON.stringify(makeBody("write a function")),
      });
      const data1 = await res1.json();
      const len1 = data1.choices[0].message.content.length;

      const res2 = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("code", sessionId),
        body: JSON.stringify(makeBody("write another function")),
      });
      const data2 = await res2.json();
      const len2 = data2.choices[0].message.content.length;

      expect(len2).toBeGreaterThan(len1);
    });
  });

  // ─── Rate-Limited persona ──────────────────────────────────────────────

  describe("rate-limited persona", () => {
    it("should return 429 on every 3rd request with Retry-After", async () => {
      const sessionId = "rate-limit-test";
      const statuses: number[] = [];
      let retryAfterValue: string | null = null;

      for (let i = 0; i < 4; i++) {
        const res = await fetch(chatUrl(), {
          method: "POST",
          headers: headers("rate-limited", sessionId),
          body: JSON.stringify(makeBody(`Request ${i + 1}`)),
        });
        statuses.push(res.status);
        if (res.status === 429) {
          retryAfterValue = res.headers.get("Retry-After");
        }
      }

      // 3rd request (index 2) should be 429
      expect(statuses[2]).toBe(429);
      expect(retryAfterValue).toBeTruthy();
      expect(Number(retryAfterValue)).toBeGreaterThanOrEqual(2);

      // 1st, 2nd, 4th should be 200
      expect(statuses[0]).toBe(200);
      expect(statuses[1]).toBe(200);
      expect(statuses[3]).toBe(200);
    });
  });

  // ─── Flaky persona ────────────────────────────────────────────────────

  describe("flaky persona", () => {
    it("should produce a mix of statuses over many requests", async () => {
      const statuses: number[] = [];
      const contents: string[] = [];

      // Use AbortController with short timeout to avoid hanging on the 10s delay outcome
      for (let i = 0; i < 20; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
          const res = await fetch(chatUrl(), {
            method: "POST",
            headers: headers("flaky", `flaky-test-${i}`),
            body: JSON.stringify(makeBody(`Flaky request ${i}`)),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          statuses.push(res.status);
          if (res.status === 200) {
            const data = await res.json();
            contents.push(data.choices[0].message.content);
          }
        } catch {
          clearTimeout(timeout);
          // Aborted requests count as timeout/hang
          statuses.push(0);
        }
      }

      // Should have at least some 200s (60% expected, allow tolerance)
      const ok = statuses.filter((s) => s === 200).length;
      expect(ok).toBeGreaterThanOrEqual(3);

      // Verify we attempted all requests
      expect(statuses.length).toBe(20);

      // Some 200 responses should have content
      const hasContent = contents.some((c) => c.length > 0);
      expect(hasContent).toBe(true);
    }, 60000);
  });

  // ─── Simple chat endpoint ──────────────────────────────────────────────

  describe("/chat endpoint with personas", () => {
    it("should support persona via request body", async () => {
      const res = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": "chat-body-test" },
        body: JSON.stringify({ message: "list products", persona: "ecommerce" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.response).toContain("UltraBook");
      expect(data.tokens.total).toBeGreaterThan(0);
    });

    it("should support persona via header", async () => {
      const res = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: headers("support", "chat-header-test"),
        body: JSON.stringify({ message: "What is your return policy?" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const parsed = JSON.parse(data.response);
      expect(parsed.ticket).toMatch(/^TKT-\d+$/);
    });
  });

  // ─── Session isolation ─────────────────────────────────────────────────

  describe("session isolation", () => {
    it("should maintain separate state per session", async () => {
      // Session A: send to support persona
      await fetch(chatUrl(), {
        method: "POST",
        headers: headers("support", "isolation-a"),
        body: JSON.stringify(makeBody("Hello from session A")),
      });

      // Session B: send to ecommerce persona
      const resB = await fetch(chatUrl(), {
        method: "POST",
        headers: headers("ecommerce", "isolation-b"),
        body: JSON.stringify(makeBody("list products")),
      });

      const dataB = await resB.json();
      // Session B should get ecommerce response, not affected by session A
      expect(dataB.choices[0].message.content).toContain("UltraBook");
    });
  });
});
