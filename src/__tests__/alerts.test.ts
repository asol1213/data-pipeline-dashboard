import { describe, it, expect } from "vitest";
import { evaluateAlert, evaluateAlerts } from "../lib/alerts";
import type { AlertRule } from "../lib/alerts";

function makeRule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: "test-1",
    name: "Test Alert",
    datasetId: "ds-1",
    column: "Revenue",
    operator: ">",
    threshold: 100,
    severity: "warning",
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Alerts - greater than threshold triggers", () => {
  it("triggers when current value exceeds threshold", () => {
    const rule = makeRule({ operator: ">", threshold: 100 });
    const rows = [{ Revenue: "50" }, { Revenue: "150" }];
    const result = evaluateAlert(rule, rows);
    expect(result.triggered).toBe(true);
    expect(result.currentValue).toBe(150);
  });
});

describe("Alerts - less than threshold triggers", () => {
  it("triggers when current value is below threshold", () => {
    const rule = makeRule({ operator: "<", threshold: 100 });
    const rows = [{ Revenue: "200" }, { Revenue: "50" }];
    const result = evaluateAlert(rule, rows);
    expect(result.triggered).toBe(true);
    expect(result.currentValue).toBe(50);
  });
});

describe("Alerts - disabled alert does not trigger", () => {
  it("returns triggered false for disabled alerts", () => {
    const rule = makeRule({ enabled: false, operator: ">", threshold: 0 });
    const rows = [{ Revenue: "999" }];
    const result = evaluateAlert(rule, rows);
    expect(result.triggered).toBe(false);
    expect(result.message).toBe("Alert is disabled");
  });
});

describe("Alerts - multiple alerts evaluated", () => {
  it("evaluates all rules against the correct datasets", () => {
    const rule1 = makeRule({ id: "r1", datasetId: "ds-1", operator: ">", threshold: 100 });
    const rule2 = makeRule({ id: "r2", datasetId: "ds-2", column: "Cost", operator: "<", threshold: 50 });
    const datasets = new Map<string, Record<string, string | number>[]>();
    datasets.set("ds-1", [{ Revenue: "200" }]);
    datasets.set("ds-2", [{ Cost: "30" }]);

    const results = evaluateAlerts([rule1, rule2], datasets);
    expect(results).toHaveLength(2);
    expect(results[0].triggered).toBe(true);
    expect(results[1].triggered).toBe(true);
  });
});

describe("Alerts - column not found", () => {
  it("does not trigger and reports column not found", () => {
    const rule = makeRule({ column: "NonExistent", operator: ">", threshold: 0 });
    const rows = [{ Revenue: "100" }];
    const result = evaluateAlert(rule, rows);
    expect(result.triggered).toBe(false);
    expect(result.message).toContain("not found");
  });
});

describe("Alerts - edge cases", () => {
  it("handles equality operator", () => {
    const rule = makeRule({ operator: "=", threshold: 100 });
    const rows = [{ Revenue: "100" }];
    const result = evaluateAlert(rule, rows);
    expect(result.triggered).toBe(true);
  });
});
