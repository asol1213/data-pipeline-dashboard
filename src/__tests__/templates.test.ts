import { describe, it, expect } from "vitest";
import { getTemplates, applyTemplate } from "../lib/templates";

describe("Templates", () => {
  it("getTemplates returns all templates", () => {
    const templates = getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has required fields", () => {
    const templates = getTemplates();
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(Array.isArray(t.recommendedDatasets)).toBe(true);
      expect(Array.isArray(t.slots)).toBe(true);
      expect(t.slots.length).toBeGreaterThan(0);
    }
  });

  it("applyTemplate returns valid slot config", () => {
    const templates = getTemplates();
    const slots = applyTemplate(templates[0].id);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.type).toBeTruthy();
      expect(slot.datasetId).toBeTruthy();
      expect(slot.datasetName).toBeTruthy();
    }
  });

  it("slot configs have valid types (kpi/chart/table)", () => {
    const templates = getTemplates();
    const validTypes = ["kpi", "chart", "table"];
    for (const t of templates) {
      for (const slot of t.slots) {
        expect(validTypes).toContain(slot.type);
      }
    }
  });

  it("applyTemplate returns empty for unknown template", () => {
    const slots = applyTemplate("nonexistent-template");
    expect(slots).toEqual([]);
  });
});
