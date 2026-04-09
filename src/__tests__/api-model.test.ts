import { describe, it, expect, beforeAll } from "vitest";
import { ensureSeedData } from "../lib/seed";

describe("API Model", () => {
  let GET: () => Promise<Response>;

  beforeAll(async () => {
    ensureSeedData();
    const mod = await import("../app/api/model/route");
    GET = mod.GET;
  });

  it("returns datasets and relationships", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("datasets");
    expect(data).toHaveProperty("relationships");
    expect(data).toHaveProperty("schemaType");
    expect(Array.isArray(data.datasets)).toBe(true);
    expect(Array.isArray(data.relationships)).toBe(true);
  });

  it("schemaType is a valid value", async () => {
    const res = await GET();
    const data = await res.json();
    // schemaType should be one of the known types
    const validTypes = ["star", "snowflake", "flat", "normalized", "unknown"];
    expect(validTypes).toContain(data.schemaType);
  });

  it("datasets have required fields", async () => {
    const res = await GET();
    const data = await res.json();
    if (data.datasets.length > 0) {
      const ds = data.datasets[0];
      expect(ds).toHaveProperty("id");
      expect(ds).toHaveProperty("name");
    }
  });
});
