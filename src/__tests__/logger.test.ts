import { describe, it, expect } from "vitest";
import { logger } from "../lib/logger";

describe("Logger", () => {
  it("logger object has all required functions", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("info does not throw", () => {
    expect(() => logger.info("test message")).not.toThrow();
  });

  it("warn does not throw", () => {
    expect(() => logger.warn("test warning")).not.toThrow();
  });

  it("error does not throw", () => {
    expect(() => logger.error("test error")).not.toThrow();
  });

  it("debug does not throw", () => {
    expect(() => logger.debug("test debug")).not.toThrow();
  });

  it("info with metadata does not throw", () => {
    expect(() => logger.info("test", { key: "value", count: 42 })).not.toThrow();
  });

  it("error with metadata does not throw", () => {
    expect(() => logger.error("failure", { code: 500, detail: "Internal" })).not.toThrow();
  });
});
