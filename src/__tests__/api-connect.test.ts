import { describe, it, expect } from "vitest";

// We test the connect API by importing the route handler directly
// Since it uses fetch internally, we test the validation logic
describe("API Connect - Input Validation", () => {
  // The POST handler expects { url, type }
  // We can import and call it directly
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../app/api/connect/route");
    POST = mod.POST;
  });

  it("missing URL returns 400 error", async () => {
    const req = new Request("http://localhost/api/connect", {
      method: "POST",
      body: JSON.stringify({ type: "api" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("missing type returns 400 error", async () => {
    const req = new Request("http://localhost/api/connect", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("invalid URL returns 400 error", async () => {
    const req = new Request("http://localhost/api/connect", {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url", type: "api" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid URL");
  });

  it("non-HTTP URL returns 400 error", async () => {
    const req = new Request("http://localhost/api/connect", {
      method: "POST",
      body: JSON.stringify({ url: "ftp://example.com/file", type: "api" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("HTTP");
  });
});

import { beforeAll } from "vitest";
