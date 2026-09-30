import { describe, expect, it } from "vitest";
import { accessFor, isRolledOut, laterOf, NOTICES_ROLLOUT_AT, NOTICES_TESTER_START } from "./feature-flags";

describe("accessFor", () => {
  it("testers start at the tester release time", () => {
    expect(accessFor(true)).toEqual({ enabled: true, isTester: true, startAt: NOTICES_TESTER_START });
  });
  it("non-testers get nothing before the rollout time", () => {
    const before = NOTICES_ROLLOUT_AT ? Date.parse(NOTICES_ROLLOUT_AT) - 1 : Date.now();
    expect(accessFor(false, before)).toEqual({ enabled: false, isTester: false, startAt: null });
    expect(isRolledOut(before)).toBe(false);
  });
  it("non-testers start exactly at the rollout time", () => {
    if (!NOTICES_ROLLOUT_AT) return;
    const at = Date.parse(NOTICES_ROLLOUT_AT);
    expect(accessFor(false, at)).toEqual({ enabled: true, isTester: false, startAt: NOTICES_ROLLOUT_AT });
    expect(isRolledOut(at)).toBe(true);
  });
});

describe("laterOf", () => {
  it("never lets a cursor move before the start time", () => {
    expect(laterOf("2026-09-01T00:00:00Z", "2026-09-30T07:40:00Z")).toBe("2026-09-30T07:40:00Z");
    expect(laterOf("2026-10-02T00:00:00Z", "2026-09-30T07:40:00Z")).toBe("2026-10-02T00:00:00Z");
    expect(laterOf("2026-10-02T00:00:00Z", null)).toBe("2026-10-02T00:00:00Z");
  });
});
