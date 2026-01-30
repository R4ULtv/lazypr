import { describe, expect, mock, test } from "bun:test";
import { displayConfigBadge } from "../../utils/badge";

// Mock @clack/prompts
const mockNote = mock(() => {});
mock.module("@clack/prompts", () => ({
  note: mockNote,
}));

// ANSI escape code pattern for matching any color/formatting
const ANSI_PATTERN = /\x1b\[\d+m/;

describe("displayConfigBadge", () => {
  test("should display minimal config with only required fields", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    expect(mockNote).toHaveBeenCalledTimes(1);
    const [badge, title] = mockNote.mock.calls[0];

    // Should always show model and locale
    expect(badge).toContain("groq/llama-3.3-70b");
    expect(badge).toContain("EN");
    expect(title).toBe("Configuration");
  });

  test("should display full config with all optional fields", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "cerebras",
      smartFilter: true,
      locale: "fr",
      template: "pull_request_template.md",
      usage: true,
      ghCli: true,
      model: "llama3.1-8b",
      context: "This is a bug fix",
    });

    expect(mockNote).toHaveBeenCalledTimes(1);
    const [badge] = mockNote.mock.calls[0];

    // Should show all enabled features
    expect(badge).toContain("cerebras/llama3.1-8b");
    expect(badge).toContain("FR");
    expect(badge).toContain("Smart Filter");
    expect(badge).toContain("pull_request_template.md");
    expect(badge).toContain("User Context");
    expect(badge).toContain("Usage Stats");
    expect(badge).toContain("GH CLI");
  });

  test("should uppercase locale", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "es",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("ES");
    expect(badge).not.toContain("es");
  });

  test("should format provider and model together", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "custom-model-v1",
    });

    const [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("groq/custom-model-v1");
  });

  test("should only show smart filter when enabled", () => {
    mockNote.mockClear();

    // Smart filter disabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).not.toContain("Smart Filter");

    mockNote.mockClear();

    // Smart filter enabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: true,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("Smart Filter");
  });

  test("should only show template when provided", () => {
    mockNote.mockClear();

    // No template
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).not.toContain("Template");

    mockNote.mockClear();

    // With template
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      template: "custom_template.md",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("Template");
    expect(badge).toContain("custom_template.md");
  });

  test("should only show context when provided", () => {
    mockNote.mockClear();

    // No context
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).not.toContain("User Context");

    mockNote.mockClear();

    // With context
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      context: "Bug fix for auth",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("User Context");
  });

  test("should only show usage stats when enabled", () => {
    mockNote.mockClear();

    // Usage disabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).not.toContain("Usage Stats");

    mockNote.mockClear();

    // Usage enabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: true,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("Usage Stats");
  });

  test("should only show GH CLI when enabled", () => {
    mockNote.mockClear();

    // GH CLI disabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).not.toContain("GH CLI");

    mockNote.mockClear();

    // GH CLI enabled
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: true,
      model: "llama-3.3-70b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("GH CLI");
  });

  test("should include ANSI color codes for styling", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: true,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];

    // Check for ANSI codes (picocolors uses different codes than raw ANSI)
    expect(badge).toMatch(ANSI_PATTERN);
    expect(badge).toContain("✓"); // Check mark
  });

  test("should separate items with pipe separator", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: true,
      locale: "en",
      template: "template.md",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];

    // Should contain pipe separator
    expect(badge).toContain("|");
  });

  test("should handle different providers", () => {
    mockNote.mockClear();

    // Test Groq
    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    let [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("groq/");

    mockNote.mockClear();

    // Test Cerebras
    displayConfigBadge({
      provider: "cerebras",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama3.1-8b",
    });

    [badge] = mockNote.mock.calls[0];
    expect(badge).toContain("cerebras/");
  });

  test("should handle different locales", () => {
    const locales = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"];

    locales.forEach((locale) => {
      mockNote.mockClear();

      displayConfigBadge({
        provider: "groq",
        smartFilter: false,
        locale,
        usage: false,
        ghCli: false,
        model: "llama-3.3-70b",
      });

      const [badge] = mockNote.mock.calls[0];
      expect(badge).toContain(locale.toUpperCase());
    });
  });

  test("should handle long template names", () => {
    mockNote.mockClear();

    const longTemplate =
      "very_long_pull_request_template_name_with_subdirectory.md";

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      template: longTemplate,
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];
    expect(badge).toContain(longTemplate);
  });

  test("should handle long model names", () => {
    mockNote.mockClear();

    const longModel = "custom-very-long-model-name-v2.5-experimental";

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: longModel,
    });

    const [badge] = mockNote.mock.calls[0];
    expect(badge).toContain(`groq/${longModel}`);
  });

  test("should call note with correct title", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [, title] = mockNote.mock.calls[0];
    expect(title).toBe("Configuration");
  });

  test("should handle all features enabled at once", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "cerebras",
      smartFilter: true,
      locale: "ja",
      template: "template.md",
      usage: true,
      ghCli: true,
      model: "llama3.1-70b",
      context: "Feature implementation",
    });

    const [badge] = mockNote.mock.calls[0];

    // Verify all items are present
    expect(badge).toContain("cerebras/llama3.1-70b");
    expect(badge).toContain("JA");
    expect(badge).toContain("Smart Filter");
    expect(badge).toContain("template.md");
    expect(badge).toContain("User Context");
    expect(badge).toContain("Usage Stats");
    expect(badge).toContain("GH CLI");

    // Should have pipe separators
    expect(badge).toContain("|");
  });
});

describe("displayConfigBadge - ANSI formatting", () => {
  test("should use color for check marks", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];
    // Check for green color code (picocolors uses \x1b[32m for green)
    expect(badge).toContain("\x1b[32m");
    expect(badge).toContain("✓");
  });

  test("should use bold for labels", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];
    // picocolors uses \x1b[1m for bold
    expect(badge).toContain("\x1b[1m");
  });

  test("should use dim for separators", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: true,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];
    // picocolors uses \x1b[2m for dim
    expect(badge).toContain("\x1b[2m");
    expect(badge).toContain("|");
  });

  test("should have proper formatting codes", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: false,
      locale: "en",
      usage: false,
      ghCli: false,
      model: "llama-3.3-70b",
    });

    const [badge] = mockNote.mock.calls[0];

    // Should have ANSI formatting codes
    expect(badge).toMatch(ANSI_PATTERN);
  });
});

describe("displayConfigBadge - Integration", () => {
  test("should produce valid badge string for CLI display", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "groq",
      smartFilter: true,
      locale: "en",
      template: "pr_template.md",
      usage: true,
      ghCli: false,
      model: "llama-3.3-70b",
      context: "Bug fix",
    });

    expect(mockNote).toHaveBeenCalledTimes(1);

    const [badge, title] = mockNote.mock.calls[0];

    // Should be valid strings
    expect(typeof badge).toBe("string");
    expect(typeof title).toBe("string");

    // Badge should not be empty
    expect(badge.length).toBeGreaterThan(0);

    // Should contain essential components
    expect(badge).toContain("groq");
    expect(badge).toContain("llama-3.3-70b");
    expect(badge).toContain("EN");
  });

  test("should match format used in actual CLI", () => {
    mockNote.mockClear();

    displayConfigBadge({
      provider: "cerebras",
      smartFilter: true,
      locale: "es",
      usage: false,
      ghCli: true,
      model: "llama3.1-8b",
    });

    const [badge] = mockNote.mock.calls[0];

    // Should follow the pattern: ✓ Label: Value | ✓ Label | ...
    expect(badge).toMatch(/✓.*cerebras\/llama3\.1-8b/);
    expect(badge).toMatch(/✓.*ES/);
    expect(badge).toMatch(/✓.*Smart Filter/);
    expect(badge).toMatch(/✓.*GH CLI/);
  });
});
