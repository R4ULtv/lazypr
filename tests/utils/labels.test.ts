import { describe, expect, test } from "bun:test";
import {
  DEFAULT_LABELS,
  formatLabels,
  getAvailableLabels,
  parseCustomLabels,
} from "../../utils/labels";

// ANSI escape code pattern for matching any color
const ANSI_PATTERN = /\x1b\[\d+m/;

describe("formatLabels", () => {
  test("should return empty string for empty array", () => {
    const result = formatLabels([]);
    expect(result).toBe("");
  });

  test("should return empty string for null/undefined input", () => {
    const result1 = formatLabels(null as any);
    expect(result1).toBe("");

    const result2 = formatLabels(undefined as any);
    expect(result2).toBe("");
  });

  test("should format single enhancement label with color", () => {
    const result = formatLabels(["enhancement"]);
    expect(result).toContain("enhancement");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should format single bug label with color", () => {
    const result = formatLabels(["bug"]);
    expect(result).toContain("bug");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should format single documentation label with color", () => {
    const result = formatLabels(["documentation"]);
    expect(result).toContain("documentation");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should format multiple labels with colors", () => {
    const result = formatLabels(["enhancement", "bug", "documentation"]);
    expect(result).toContain("enhancement");
    expect(result).toContain("bug");
    expect(result).toContain("documentation");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should format unknown labels with default color", () => {
    const result = formatLabels(["custom-label"]);
    expect(result).toContain("custom-label");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should mix known and unknown labels correctly", () => {
    const result = formatLabels(["enhancement", "custom", "bug"]);
    expect(result).toContain("enhancement");
    expect(result).toContain("custom");
    expect(result).toContain("bug");
  });

  test("should handle labels with special characters", () => {
    const result = formatLabels(["feature-request", "bug-fix"]);
    expect(result).toContain("feature-request");
    expect(result).toContain("bug-fix");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should separate multiple labels with spaces", () => {
    const result = formatLabels(["bug", "enhancement"]);
    // Labels should be separated by space
    expect(result).toMatch(/bug.*enhancement/);
  });

  test("should preserve label order", () => {
    const labels = ["documentation", "bug", "enhancement"];
    const result = formatLabels(labels);

    const docIndex = result.indexOf("documentation");
    const bugIndex = result.indexOf("bug");
    const enhancementIndex = result.indexOf("enhancement");

    expect(docIndex).toBeLessThan(bugIndex);
    expect(bugIndex).toBeLessThan(enhancementIndex);
  });
});

describe("DEFAULT_LABELS", () => {
  test("should contain the three default labels", () => {
    expect(DEFAULT_LABELS).toEqual(["enhancement", "bug", "documentation"]);
  });
});

describe("parseCustomLabels", () => {
  test("should return empty array for empty string", () => {
    expect(parseCustomLabels("")).toEqual([]);
  });

  test("should return empty array for whitespace-only string", () => {
    expect(parseCustomLabels("   ")).toEqual([]);
  });

  test("should parse single label", () => {
    expect(parseCustomLabels("feature")).toEqual(["feature"]);
  });

  test("should parse comma-separated labels", () => {
    expect(parseCustomLabels("feature,refactor,security")).toEqual([
      "feature",
      "refactor",
      "security",
    ]);
  });

  test("should trim whitespace from labels", () => {
    expect(parseCustomLabels(" feature , refactor , security ")).toEqual([
      "feature",
      "refactor",
      "security",
    ]);
  });

  test("should filter out empty entries", () => {
    expect(parseCustomLabels("feature,,refactor,")).toEqual([
      "feature",
      "refactor",
    ]);
  });
});

describe("getAvailableLabels", () => {
  test("should return only defaults when no custom labels", () => {
    const result = getAvailableLabels("");
    expect(result).toEqual(["enhancement", "bug", "documentation"]);
  });

  test("should extend defaults with custom labels", () => {
    const result = getAvailableLabels("feature,security");
    expect(result).toContain("feature");
    expect(result).toContain("security");
    expect(result).toContain("enhancement");
    expect(result).toContain("bug");
    expect(result).toContain("documentation");
  });

  test("should put custom labels first", () => {
    const result = getAvailableLabels("feature,security");
    expect(result[0]).toBe("feature");
    expect(result[1]).toBe("security");
  });

  test("should not duplicate if custom label matches default", () => {
    const result = getAvailableLabels("bug,feature");
    const bugCount = result.filter((l) => l === "bug").length;
    expect(bugCount).toBe(1);
  });

  test("should handle empty custom labels string", () => {
    const result = getAvailableLabels("");
    expect(result).toEqual([...DEFAULT_LABELS]);
  });
});

describe("formatLabels - Integration", () => {
  test("should create display-ready string for CLI output", () => {
    const labels = ["bug", "enhancement"];
    const result = formatLabels(labels);

    // Verify it contains all necessary components
    expect(result).toContain("bug");
    expect(result).toContain("enhancement");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should handle all valid label types from schema", () => {
    const validLabels = ["enhancement", "bug", "documentation"];
    const result = formatLabels(validLabels);

    // All labels should be present
    validLabels.forEach((label) => {
      expect(result).toContain(label);
    });
  });

  test("should produce string safe for log output", () => {
    const result = formatLabels(["bug"]);

    // Should be a string
    expect(typeof result).toBe("string");

    // Should not be empty
    expect(result.length).toBeGreaterThan(0);

    // Should contain the label
    expect(result).toContain("bug");

    // Should have color formatting
    expect(result).toMatch(ANSI_PATTERN);
  });
});

describe("formatLabels with custom labels config", () => {
  test("should format custom labels with colors", () => {
    const result = formatLabels(["feature"], "feature,security");
    expect(result).toContain("feature");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should still format default labels", () => {
    const result = formatLabels(["bug"], "feature,security");
    expect(result).toContain("bug");
    expect(result).toMatch(ANSI_PATTERN);
  });

  test("should handle mixed default and custom labels", () => {
    const result = formatLabels(["bug", "feature"], "feature,security");
    expect(result).toContain("bug");
    expect(result).toContain("feature");
    expect(result).toMatch(ANSI_PATTERN);
  });
});
