import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("passes through same-origin paths", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/g/abc")).toBe("/g/abc");
    expect(safeNext("/join/tok?x=1")).toBe("/join/tok?x=1");
  });

  it("falls back to / for missing values", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("rejects off-origin destinations", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});
