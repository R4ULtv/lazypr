import { describe, expect, test } from "bun:test";
import {
  getSystemPrompt,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
} from "../../utils/prompts";

describe("getSystemPrompt", () => {
  const prompt = getSystemPrompt();

  test("keeps the provider-neutral output contract explicit", () => {
    expect(prompt).toContain("valid JSON");
    expect(prompt).toContain('"title", "description", and "labels"');
    expect(prompt).toContain(`${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} characters`);
    expect(prompt).toContain(`At least ${MIN_DESCRIPTION_LENGTH} characters`);
  });

  test("defines grounding, locale, label, and template boundaries", () => {
    expect(prompt).toContain("commit messages as the source of truth");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("never translate them");
    expect(prompt).toContain("leading YAML frontmatter");
    expect(prompt).toContain("instead of guessing");
  });

  test("stays compact for every request", () => {
    expect(prompt.length).toBeLessThan(1_800);
  });
});
