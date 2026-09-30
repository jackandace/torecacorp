import { describe, expect, it } from "vitest";
import { accessFor, laterOf, NOTICES_ROLLOUT_AT, NOTICES_TESTER_START } from "./feature-flags";

describe("accessFor", () => {
  it("testers start at the tester release time", () => {
    expect(accessFor(true)).toEqual({ enabled: true, isTester: true, startAt: NOTICES_TESTER_START });
  });
  it("non-testers get nothing until the rollout time is set", () => {
    if (NOTICES_ROLLOUT_AT === null) {
      expect(accessFor(false)).toEqual({ enabled: false, isTester: false, startAt: null });
    } else {
      expect(accessFor(false).startAt).toBe(NOTICES_ROLLOUT_AT);
    }
  });
});

describe("laterOf", () => {
  it("never lets a cursor move before the start time", () => {
    expect(laterOf("2026-09-01T00:00:00Z", "2026-09-30T07:40:00Z")).toBe("2026-09-30T07:40:00Z");
    expect(laterOf("2026-10-02T00:00:00Z", "2026-09-30T07:40:00Z")).toBe("2026-10-02T00:00:00Z");
    expect(laterOf("2026-10-02T00:00:00Z", null)).toBe("2026-10-02T00:00:00Z");
  });
});
