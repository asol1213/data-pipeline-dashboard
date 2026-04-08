import { describe, it, expect } from "vitest";
import {
  getHeatmapColor,
  getDataBarWidth,
  getSignClass,
} from "@/components/DataTable";

describe("conditional formatting", () => {
  describe("heatmap colors", () => {
    it("should return red-ish for min value", () => {
      const color = getHeatmapColor(0, 0, 100);
      // Min value => red tones => high R, low G
      expect(color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.15\)$/);
      // Extract RGB
      const match = color.match(/rgba\((\d+), (\d+), (\d+)/);
      expect(match).not.toBeNull();
      const r = Number(match![1]);
      const g = Number(match![2]);
      // Red channel should be high (239), green should be low (68)
      expect(r).toBe(239);
      expect(g).toBe(68);
    });

    it("should return green-ish for max value", () => {
      const color = getHeatmapColor(100, 0, 100);
      const match = color.match(/rgba\((\d+), (\d+), (\d+)/);
      expect(match).not.toBeNull();
      const r = Number(match![1]);
      const g = Number(match![2]);
      // Green: low R (~34), high G (~197)
      expect(r).toBe(34);
      expect(g).toBe(197);
    });

    it("should return yellow-ish for midpoint value", () => {
      const color = getHeatmapColor(50, 0, 100);
      const match = color.match(/rgba\((\d+), (\d+), (\d+)/);
      expect(match).not.toBeNull();
      const r = Number(match![1]);
      const g = Number(match![2]);
      // Midpoint (ratio=0.5) is at the boundary of the red-to-yellow ramp
      // R stays at 239, G reaches 204 (yellow zone)
      expect(r).toBe(239);
      expect(g).toBe(204);
    });

    it("should return yellow when all values are the same", () => {
      const color = getHeatmapColor(42, 42, 42);
      expect(color).toBe("rgba(250, 204, 21, 0.15)");
    });
  });

  describe("data bars", () => {
    it("should return width proportional to value", () => {
      const width = getDataBarWidth(50, 0, 100);
      expect(width).toBe(50);
    });

    it("should return 100% for max value", () => {
      const width = getDataBarWidth(100, 0, 100);
      expect(width).toBe(100);
    });

    it("should return 100% when all values are equal", () => {
      const width = getDataBarWidth(42, 42, 42);
      expect(width).toBe(100);
    });

    it("should handle negative values by using absolute value", () => {
      const width = getDataBarWidth(-50, -100, 100);
      expect(width).toBe(50);
    });
  });

  describe("sign classes", () => {
    it("should return cell-negative for negative values", () => {
      expect(getSignClass(-5)).toBe("cell-negative");
    });

    it("should return cell-positive for positive values", () => {
      expect(getSignClass(10)).toBe("cell-positive");
    });

    it("should return empty string for zero", () => {
      expect(getSignClass(0)).toBe("");
    });
  });

  describe("edge cases", () => {
    it("should handle single row (min equals max)", () => {
      const color = getHeatmapColor(99, 99, 99);
      expect(color).toBe("rgba(250, 204, 21, 0.15)");

      const width = getDataBarWidth(99, 99, 99);
      expect(width).toBe(100);
    });

    it("should handle zero range for data bars when value is zero", () => {
      // When min === max === 0, absMax is 0 so width is 0
      const width = getDataBarWidth(0, 0, 0);
      // absMax = max(|0|, |0|) = 0, so returns 0
      expect(width).toBe(0);
    });
  });
});
