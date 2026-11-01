import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";
import { ApiError } from "./errors";

describe("apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON payload on 200 OK", async () => {
    const mockPayload = {
      service: "Vaultz.Api",
      status: "Healthy",
      version: "0.1.0",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await apiClient.get<typeof mockPayload>("/api/v1/health");
    expect(response).toEqual(mockPayload);
  });

  it("throws ApiError with RFC 9457 ProblemDetails on non-2xx response", async () => {
    const problemDetails = {
      title: "Validation failed",
      status: 400,
      detail: "Currency code is required.",
      errors: {
        currencyCode: ["Currency code must be 3 letters."],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(problemDetails), {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      })
    );

    await expect(apiClient.post("/api/v1/test", {})).rejects.toBeInstanceOf(
      ApiError
    );
  });
});
