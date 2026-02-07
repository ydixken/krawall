import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * Integration tests for API route handlers.
 *
 * These tests import the route handlers directly and call them with
 * NextRequest objects, using the real PostgreSQL database.
 *
 * Requires: Docker PostgreSQL container running on port 5432.
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
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// Valid target payload for reuse across tests
function validTargetPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Target",
    description: "Integration test target",
    connectorType: "HTTP_REST",
    endpoint: "http://localhost:3001/chat",
    authType: "NONE",
    authConfig: {},
    requestTemplate: {
      messagePath: "$.message",
      structure: { message: "" },
    },
    responseTemplate: {
      contentPath: "$.response",
    },
    ...overrides,
  };
}

// Valid scenario payload for reuse across tests
function validScenarioPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Scenario",
    description: "Integration test scenario",
    category: "test",
    flowConfig: [
      { id: "step1", type: "message", config: { message: "Hello" } },
    ],
    repetitions: 1,
    concurrency: 1,
    delayBetweenMs: 0,
    verbosityLevel: "normal",
    messageTemplates: {},
    ...overrides,
  };
}

// ---------- test data tracking for cleanup ----------

const createdTargetIds: string[] = [];
const createdScenarioIds: string[] = [];
const createdSessionIds: string[] = [];

afterAll(async () => {
  // Clean up in reverse dependency order
  if (createdSessionIds.length > 0) {
    await prisma.session.deleteMany({
      where: { id: { in: createdSessionIds } },
    });
  }
  if (createdScenarioIds.length > 0) {
    await prisma.scenario.deleteMany({
      where: { id: { in: createdScenarioIds } },
    });
  }
  if (createdTargetIds.length > 0) {
    await prisma.target.deleteMany({
      where: { id: { in: createdTargetIds } },
    });
  }
});

// ============================================================
// /api/health
// ============================================================

describe("GET /api/health", () => {
  it("should return health status with services", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.services).toBeDefined();
    expect(body.services.api).toBeDefined();
    expect(body.services.database).toBeDefined();
    expect(body.services.redis).toBeDefined();
    expect(body.services.database.status).toBe("healthy");
  });
});

// ============================================================
// /api/targets
// ============================================================

describe("/api/targets", () => {
  let targetId: string;

  describe("POST /api/targets", () => {
    it("should create a target with valid data", async () => {
      const { POST } = await import("@/app/api/targets/route");
      const req = makeRequest("http://localhost:3000/api/targets", {
        method: "POST",
        body: validTargetPayload(),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe("Test Target");
      expect(body.data.connectorType).toBe("HTTP_REST");
      expect(body.data.endpoint).toBe("http://localhost:3001/chat");
      expect(body.data.authType).toBe("NONE");
      expect(body.data.isActive).toBe(true);
      expect(body.message).toBe("Target created successfully");

      targetId = body.data.id;
      createdTargetIds.push(targetId);
    });

    it("should return 400 for missing required fields", async () => {
      const { POST } = await import("@/app/api/targets/route");
      const req = makeRequest("http://localhost:3000/api/targets", {
        method: "POST",
        body: { name: "Incomplete" },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation error");
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("should return 400 for invalid endpoint URL", async () => {
      const { POST } = await import("@/app/api/targets/route");
      const req = makeRequest("http://localhost:3000/api/targets", {
        method: "POST",
        body: validTargetPayload({ endpoint: "not-a-url" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation error");
    });

    it("should return 400 for invalid connector type", async () => {
      const { POST } = await import("@/app/api/targets/route");
      const req = makeRequest("http://localhost:3000/api/targets", {
        method: "POST",
        body: validTargetPayload({ connectorType: "INVALID_TYPE" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("GET /api/targets", () => {
    it("should list targets", async () => {
      const { GET } = await import("@/app/api/targets/route");
      const req = makeRequest("http://localhost:3000/api/targets");

      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(1);

      // Verify our created target is in the list
      const found = body.data.find((t: any) => t.id === targetId);
      expect(found).toBeDefined();
      expect(found.name).toBe("Test Target");
      // authConfig should NOT be in list response (sensitive)
      expect(found.authConfig).toBeUndefined();
    });

    it("should filter targets by connectorType", async () => {
      const { GET } = await import("@/app/api/targets/route");
      const req = makeRequest(
        "http://localhost:3000/api/targets?connectorType=HTTP_REST"
      );

      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      body.data.forEach((t: any) => {
        expect(t.connectorType).toBe("HTTP_REST");
      });
    });
  });

  describe("GET /api/targets/[id]", () => {
    it("should get a target by ID", async () => {
      const { GET } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(`http://localhost:3000/api/targets/${targetId}`);

      const response = await GET(req, {
        params: Promise.resolve({ id: targetId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(targetId);
      expect(body.data.name).toBe("Test Target");
      expect(body.data.sessionCount).toBeDefined();
      expect(body.data.scenarioCount).toBeDefined();
    });

    it("should return 404 for non-existent ID", async () => {
      const { GET } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/targets/clxxxxxxxxxxxxxxxxxx"
      );

      const response = await GET(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Target not found");
    });
  });

  describe("PUT /api/targets/[id]", () => {
    it("should update a target", async () => {
      const { PUT } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(`http://localhost:3000/api/targets/${targetId}`, {
        method: "PUT",
        body: {
          name: "Updated Target Name",
          description: "Updated description",
        },
      });

      const response = await PUT(req, {
        params: Promise.resolve({ id: targetId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Updated Target Name");
      expect(body.message).toBe("Target updated successfully");
    });

    it("should return 404 for non-existent target", async () => {
      const { PUT } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/targets/clxxxxxxxxxxxxxxxxxx",
        {
          method: "PUT",
          body: { name: "No target" },
        }
      );

      const response = await PUT(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Target not found");
    });

    it("should return 400 for invalid update data", async () => {
      const { PUT } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(`http://localhost:3000/api/targets/${targetId}`, {
        method: "PUT",
        body: { endpoint: "not-a-valid-url" },
      });

      const response = await PUT(req, {
        params: Promise.resolve({ id: targetId }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation error");
    });
  });

  describe("DELETE /api/targets/[id]", () => {
    it("should return 404 for non-existent target", async () => {
      const { DELETE } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/targets/clxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Target not found");
    });

    it("should delete a target with no sessions", async () => {
      // Create a disposable target for deletion
      const { POST } = await import("@/app/api/targets/route");
      const createReq = makeRequest("http://localhost:3000/api/targets", {
        method: "POST",
        body: validTargetPayload({ name: "To Be Deleted" }),
      });
      const createRes = await POST(createReq);
      const createBody = await createRes.json();
      const deleteTargetId = createBody.data.id;

      const { DELETE } = await import("@/app/api/targets/[id]/route");
      const req = makeRequest(
        `http://localhost:3000/api/targets/${deleteTargetId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(req, {
        params: Promise.resolve({ id: deleteTargetId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Target deleted successfully");

      // Verify it's actually gone
      const { GET } = await import("@/app/api/targets/[id]/route");
      const getReq = makeRequest(
        `http://localhost:3000/api/targets/${deleteTargetId}`
      );
      const getRes = await GET(getReq, {
        params: Promise.resolve({ id: deleteTargetId }),
      });
      expect(getRes.status).toBe(404);
    });
  });
});

// ============================================================
// /api/scenarios
// ============================================================

describe("/api/scenarios", () => {
  let scenarioId: string;

  describe("POST /api/scenarios", () => {
    it("should create a scenario with valid data", async () => {
      const { POST } = await import("@/app/api/scenarios/route");
      const req = makeRequest("http://localhost:3000/api/scenarios", {
        method: "POST",
        body: validScenarioPayload(),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe("Test Scenario");
      expect(body.data.category).toBe("test");
      expect(body.data.repetitions).toBe(1);
      expect(body.message).toBe("Scenario created successfully");

      scenarioId = body.data.id;
      createdScenarioIds.push(scenarioId);
    });

    it("should return 400 for missing required fields", async () => {
      const { POST } = await import("@/app/api/scenarios/route");
      const req = makeRequest("http://localhost:3000/api/scenarios", {
        method: "POST",
        body: { description: "No name or flow" },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation error");
    });

    it("should return 400 for invalid flow step type", async () => {
      const { POST } = await import("@/app/api/scenarios/route");
      const req = makeRequest("http://localhost:3000/api/scenarios", {
        method: "POST",
        body: validScenarioPayload({
          flowConfig: [
            { id: "bad", type: "INVALID_TYPE", config: {} },
          ],
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 400 for repetitions out of range", async () => {
      const { POST } = await import("@/app/api/scenarios/route");
      const req = makeRequest("http://localhost:3000/api/scenarios", {
        method: "POST",
        body: validScenarioPayload({ repetitions: 5000 }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("GET /api/scenarios", () => {
    it("should list scenarios", async () => {
      const { GET } = await import("@/app/api/scenarios/route");
      const req = makeRequest("http://localhost:3000/api/scenarios");

      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(1);
    });

    it("should filter scenarios by category", async () => {
      const { GET } = await import("@/app/api/scenarios/route");
      const req = makeRequest(
        "http://localhost:3000/api/scenarios?category=test"
      );

      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((s: any) => {
        expect(s.category).toBe("test");
      });
    });
  });

  describe("GET /api/scenarios/[id]", () => {
    it("should get a scenario by ID", async () => {
      const { GET } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        `http://localhost:3000/api/scenarios/${scenarioId}`
      );

      const response = await GET(req, {
        params: Promise.resolve({ id: scenarioId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(scenarioId);
      expect(body.data.name).toBe("Test Scenario");
      expect(body.data.sessionCount).toBeDefined();
    });

    it("should return 404 for non-existent scenario", async () => {
      const { GET } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/scenarios/clxxxxxxxxxxxxxxxxxx"
      );

      const response = await GET(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Scenario not found");
    });
  });

  describe("PUT /api/scenarios/[id]", () => {
    it("should update a scenario", async () => {
      const { PUT } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        `http://localhost:3000/api/scenarios/${scenarioId}`,
        {
          method: "PUT",
          body: { name: "Updated Scenario", repetitions: 5 },
        }
      );

      const response = await PUT(req, {
        params: Promise.resolve({ id: scenarioId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Updated Scenario");
      expect(body.data.repetitions).toBe(5);
      expect(body.message).toBe("Scenario updated successfully");
    });

    it("should return 404 for non-existent scenario", async () => {
      const { PUT } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/scenarios/clxxxxxxxxxxxxxxxxxx",
        {
          method: "PUT",
          body: { name: "Nope" },
        }
      );

      const response = await PUT(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  describe("DELETE /api/scenarios/[id]", () => {
    it("should return 404 for non-existent scenario", async () => {
      const { DELETE } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        "http://localhost:3000/api/scenarios/clxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(req, {
        params: Promise.resolve({ id: "clxxxxxxxxxxxxxxxxxx" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it("should delete a scenario with no sessions", async () => {
      // Create a disposable scenario
      const { POST } = await import("@/app/api/scenarios/route");
      const createReq = makeRequest("http://localhost:3000/api/scenarios", {
        method: "POST",
        body: validScenarioPayload({ name: "To Be Deleted Scenario" }),
      });
      const createRes = await POST(createReq);
      const createBody = await createRes.json();
      const deleteScenarioId = createBody.data.id;

      const { DELETE } = await import("@/app/api/scenarios/[id]/route");
      const req = makeRequest(
        `http://localhost:3000/api/scenarios/${deleteScenarioId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(req, {
        params: Promise.resolve({ id: deleteScenarioId }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Scenario deleted successfully");
    });
  });
});

// ============================================================
// /api/execute
// ============================================================

describe("POST /api/execute", () => {
  let execTargetId: string;

  beforeAll(async () => {
    // Create a target for execution tests
    const { POST } = await import("@/app/api/targets/route");
    const req = makeRequest("http://localhost:3000/api/targets", {
      method: "POST",
      body: validTargetPayload({ name: "Execute Test Target" }),
    });
    const res = await POST(req);
    const body = await res.json();
    execTargetId = body.data.id;
    createdTargetIds.push(execTargetId);
  });

  it("should queue a session with custom messages", async () => {
    const { POST } = await import("@/app/api/execute/route");
    const req = makeRequest("http://localhost:3000/api/execute", {
      method: "POST",
      body: {
        targetId: execTargetId,
        executionConfig: {
          customMessages: ["Hello", "How are you?"],
          repetitions: 1,
          verbosityLevel: "normal",
        },
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.status).toBe("QUEUED");

    createdSessionIds.push(body.data.sessionId);
  });

  it("should return 404 for non-existent target", async () => {
    const { POST } = await import("@/app/api/execute/route");
    const req = makeRequest("http://localhost:3000/api/execute", {
      method: "POST",
      body: {
        targetId: "clxxxxxxxxxxxxxxxxxx",
        executionConfig: {
          customMessages: ["Test"],
        },
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Target not found");
  });

  it("should return 400 when neither scenario nor custom messages provided", async () => {
    const { POST } = await import("@/app/api/execute/route");
    const req = makeRequest("http://localhost:3000/api/execute", {
      method: "POST",
      body: {
        targetId: execTargetId,
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Either scenarioId or executionConfig.customMessages is required");
  });

  it("should return 400 for invalid targetId format", async () => {
    const { POST } = await import("@/app/api/execute/route");
    const req = makeRequest("http://localhost:3000/api/execute", {
      method: "POST",
      body: {
        targetId: "not-a-cuid",
        executionConfig: { customMessages: ["Test"] },
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation error");
  });
});

// ============================================================
// /api/sessions
// ============================================================

describe("GET /api/sessions", () => {
  it("should list sessions", async () => {
    const { GET } = await import("@/app/api/sessions/route");
    const req = makeRequest("http://localhost:3000/api/sessions");

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(body.pagination.limit).toBeDefined();
    expect(body.pagination.offset).toBeDefined();
    expect(typeof body.pagination.hasMore).toBe("boolean");
  });

  it("should support pagination parameters", async () => {
    const { GET } = await import("@/app/api/sessions/route");
    const req = makeRequest(
      "http://localhost:3000/api/sessions?limit=5&offset=0"
    );

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.offset).toBe(0);
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  it("should filter sessions by status", async () => {
    const { GET } = await import("@/app/api/sessions/route");
    const req = makeRequest(
      "http://localhost:3000/api/sessions?status=QUEUED"
    );

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    body.data.forEach((s: any) => {
      expect(s.status).toBe("QUEUED");
    });
  });
});
