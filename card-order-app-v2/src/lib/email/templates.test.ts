import { describe, expect, it } from "vitest";
import { renderTemplate } from "./templates";

describe("renderTemplate", () => {
  it("{{key}} を置換", () => {
    expect(renderTemplate("こんにちは {{name}} 様", { name: "山田" })).toBe(
      "こんにちは 山田 様",
    );
  });
  it("複数変数を順序問わず置換", () => {
    expect(
      renderTemplate("{{a}} + {{b}} = {{c}}", { c: 3, a: 1, b: 2 }),
    ).toBe("1 + 2 = 3");
  });
  it("未定義変数は空文字", () => {
    expect(renderTemplate("[{{x}}]", {})).toBe("[]");
  });
  it("変数なしのテキストはそのまま", () => {
    expect(renderTemplate("プレーンテキスト", {})).toBe("プレーンテキスト");
  });
});
