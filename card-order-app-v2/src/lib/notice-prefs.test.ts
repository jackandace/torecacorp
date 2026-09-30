import { describe, expect, it } from "vitest";
import { matchesTitlePref } from "./notice-prefs";

describe("matchesTitlePref", () => {
  it("passes everything in 'all' mode", () => {
    expect(matchesTitlePref({ title_mode: "all", title_ids: [] }, null)).toBe(true);
    expect(matchesTitlePref({ title_mode: "all", title_ids: [] }, "t1")).toBe(true);
  });
  it("passes only chosen titles in 'selected' mode", () => {
    const prefs = { title_mode: "selected" as const, title_ids: ["pokemon", "weiss"] };
    expect(matchesTitlePref(prefs, "pokemon")).toBe(true);
    expect(matchesTitlePref(prefs, "yugioh")).toBe(false);
    expect(matchesTitlePref(prefs, null)).toBe(false);
  });
});
