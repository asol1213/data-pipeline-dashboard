import { describe, it, expect, beforeAll } from "vitest";

describe("API Demo", () => {
  let GET: () => Promise<Response>;
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("../app/api/demo/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  it("GET returns 3 companies", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(3);
    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).toContain("revolut");
    expect(ids).toContain("siemens");
    expect(ids).toContain("deloitte");
  });

  it("each company has required metadata fields", async () => {
    const res = await GET();
    const data = await res.json();
    for (const company of data) {
      expect(company).toHaveProperty("id");
      expect(company).toHaveProperty("name");
      expect(company).toHaveProperty("industry");
      expect(company).toHaveProperty("datasetCount");
      expect(company).toHaveProperty("description");
      expect(company.datasetCount).toBeGreaterThan(0);
    }
  });

  it("POST with invalid company returns 400 error", async () => {
    const req = new Request("http://localhost/api/demo", {
      method: "POST",
      body: JSON.stringify({ company: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
    expect(data.error).toContain("Invalid company");
  });

  it("POST with missing company returns 400 error", async () => {
    const req = new Request("http://localhost/api/demo", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
