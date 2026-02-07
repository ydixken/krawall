import { describe, it, expect } from "vitest";
import {
  signPayload,
  verifySignature,
  generateWebhookSecret,
  buildSignedHeaders,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from "@/lib/webhooks/signer";

describe("Webhook Signer", () => {
  const testSecret = "test-secret-key-for-hmac-signing";
  const testPayload = JSON.stringify({
    event: "session.completed",
    payload: { sessionId: "abc123" },
  });

  describe("signPayload", () => {
    it("should produce a sha256 signature", () => {
      const result = signPayload(testPayload, testSecret);

      expect(result.signature).toMatch(/^sha256=[0-9a-f]{64}$/);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("should produce deterministic signatures for same input", () => {
      const ts = 1700000000;
      const sig1 = signPayload(testPayload, testSecret, ts);
      const sig2 = signPayload(testPayload, testSecret, ts);

      expect(sig1.signature).toBe(sig2.signature);
    });

    it("should produce different signatures for different payloads", () => {
      const ts = 1700000000;
      const sig1 = signPayload('{"a":1}', testSecret, ts);
      const sig2 = signPayload('{"a":2}', testSecret, ts);

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it("should produce different signatures for different secrets", () => {
      const ts = 1700000000;
      const sig1 = signPayload(testPayload, "secret-a", ts);
      const sig2 = signPayload(testPayload, "secret-b", ts);

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it("should produce different signatures for different timestamps", () => {
      const sig1 = signPayload(testPayload, testSecret, 1700000000);
      const sig2 = signPayload(testPayload, testSecret, 1700000001);

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it("should use current time when timestamp is omitted", () => {
      const before = Math.floor(Date.now() / 1000);
      const result = signPayload(testPayload, testSecret);
      const after = Math.floor(Date.now() / 1000);

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const ts = Math.floor(Date.now() / 1000);
      const { signature } = signPayload(testPayload, testSecret, ts);

      const isValid = verifySignature(testPayload, testSecret, signature, ts);
      expect(isValid).toBe(true);
    });

    it("should reject a tampered payload", () => {
      const ts = Math.floor(Date.now() / 1000);
      const { signature } = signPayload(testPayload, testSecret, ts);

      const isValid = verifySignature(
        '{"tampered":true}',
        testSecret,
        signature,
        ts
      );
      expect(isValid).toBe(false);
    });

    it("should reject a wrong secret", () => {
      const ts = Math.floor(Date.now() / 1000);
      const { signature } = signPayload(testPayload, testSecret, ts);

      const isValid = verifySignature(
        testPayload,
        "wrong-secret",
        signature,
        ts
      );
      expect(isValid).toBe(false);
    });

    it("should reject an expired timestamp", () => {
      const oldTs = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const { signature } = signPayload(testPayload, testSecret, oldTs);

      const isValid = verifySignature(
        testPayload,
        testSecret,
        signature,
        oldTs,
        300 // 5 min tolerance
      );
      expect(isValid).toBe(false);
    });

    it("should accept timestamp within tolerance", () => {
      const recentTs = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const { signature } = signPayload(testPayload, testSecret, recentTs);

      const isValid = verifySignature(
        testPayload,
        testSecret,
        signature,
        recentTs,
        300 // 5 min tolerance
      );
      expect(isValid).toBe(true);
    });

    it("should reject a signature with wrong format", () => {
      const ts = Math.floor(Date.now() / 1000);
      const isValid = verifySignature(
        testPayload,
        testSecret,
        "not-a-valid-signature",
        ts
      );
      expect(isValid).toBe(false);
    });
  });

  describe("generateWebhookSecret", () => {
    it("should generate a 64-character hex string", () => {
      const secret = generateWebhookSecret();

      expect(secret).toMatch(/^[0-9a-f]{64}$/);
      expect(secret.length).toBe(64);
    });

    it("should generate unique secrets", () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe("buildSignedHeaders", () => {
    it("should return headers with signature and timestamp", () => {
      const headers = buildSignedHeaders(testPayload, testSecret);

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers[SIGNATURE_HEADER]).toMatch(/^sha256=[0-9a-f]{64}$/);
      expect(headers[TIMESTAMP_HEADER]).toMatch(/^\d+$/);
    });

    it("should produce verifiable headers", () => {
      const headers = buildSignedHeaders(testPayload, testSecret);

      const signature = headers[SIGNATURE_HEADER];
      const timestamp = parseInt(headers[TIMESTAMP_HEADER], 10);

      const isValid = verifySignature(
        testPayload,
        testSecret,
        signature,
        timestamp
      );
      expect(isValid).toBe(true);
    });
  });
});
