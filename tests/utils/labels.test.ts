import { expect, test, describe } from "bun:test";
import {
  formatLabels,
  LABEL_COLORS,
  DEFAULT_COLOR,
  RESET,
} from "../../utils/labels";

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

  test("should format single enhancement label with correct color", () => {
    const result = formatLabels(["enhancement"]);
    const expected = `${LABEL_COLORS.enhancement} enhancement ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should format single bug label with correct color", () => {
    const result = formatLabels(["bug"]);
    const expected = `${LABEL_COLORS.bug} bug ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should format single documentation label with correct color", () => {
    const result = formatLabels(["documentation"]);
    const expected = `${LABEL_COLORS.documentation} documentation ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should format multiple labels with correct colors", () => {
    const result = formatLabels(["enhancement", "bug", "documentation"]);
    const expected =
      `${LABEL_COLORS.enhancement} enhancement ${RESET} ` +
      `${LABEL_COLORS.bug} bug ${RESET} ` +
      `${LABEL_COLORS.documentation} documentation ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should use default color for unknown labels", () => {
    const result = formatLabels(["custom-label"]);
    const expected = `${DEFAULT_COLOR} custom-label ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should mix known and unknown labels correctly", () => {
    const result = formatLabels(["enhancement", "custom", "bug"]);
    const expected =
      `${LABEL_COLORS.enhancement} enhancement ${RESET} ` +
      `${DEFAULT_COLOR} custom ${RESET} ` +
      `${LABEL_COLORS.bug} bug ${RESET}`;
    expect(result).toBe(expected);
  });

  test("should handle labels with special characters", () => {
    const result = formatLabels(["feature-request", "bug-fix"]);
    expect(result).toContain("feature-request");
    expect(result).toContain("bug-fix");
    expect(result).toContain(DEFAULT_COLOR);
    expect(result).toContain(RESET);
  });

  test("should separate multiple labels with spaces", () => {
    const result = formatLabels(["bug", "enhancement"]);
    const parts = result.split(RESET);
    // Should have 3 parts: bug label, space + enhancement label, and final empty string after last RESET
    expect(parts.length).toBe(3);
    expect(result).toContain(" ");
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

describe("LABEL_COLORS", () => {
  test("should have correct ANSI color code for enhancement", () => {
    expect(LABEL_COLORS.enhancement).toBe("\x1b[30;42m");
  });

  test("should have correct ANSI color code for bug", () => {
    expect(LABEL_COLORS.bug).toBe("\x1b[30;41m");
  });

  test("should have correct ANSI color code for documentation", () => {
    expect(LABEL_COLORS.documentation).toBe("\x1b[30;44m");
  });

  test("should contain exactly three label types", () => {
    const keys = Object.keys(LABEL_COLORS);
    expect(keys.length).toBe(3);
    expect(keys).toContain("enhancement");
    expect(keys).toContain("bug");
    expect(keys).toContain("documentation");
  });
});

describe("DEFAULT_COLOR", () => {
  test("should be correct ANSI color code", () => {
    expect(DEFAULT_COLOR).toBe("\x1b[30;47m");
  });
});

describe("RESET", () => {
  test("should be correct ANSI reset code", () => {
    expect(RESET).toBe("\x1b[0m");
  });
});

describe("formatLabels - Integration", () => {
  test("should create display-ready string for CLI output", () => {
    const labels = ["bug", "enhancement"];
    const result = formatLabels(labels);

    // Verify it contains all necessary components
    expect(result).toContain("bug");
    expect(result).toContain("enhancement");
    expect(result).toContain(LABEL_COLORS["bug"]!);
    expect(result).toContain(LABEL_COLORS["enhancement"]!);
    expect(result).toContain(RESET);
  });

  test("should handle all valid label types from schema", () => {
    const validLabels = ["enhancement", "bug", "documentation"];
    const result = formatLabels(validLabels);

    // All labels should be present
    validLabels.forEach((label) => {
      expect(result).toContain(label);
    });

    // All should have their specific colors
    expect(result).toContain(LABEL_COLORS["enhancement"]!);
    expect(result).toContain(LABEL_COLORS["bug"]!);
    expect(result).toContain(LABEL_COLORS["documentation"]!);

    // Should have proper reset codes
    const resetCount = (
      result.match(
        new RegExp(RESET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      ) || []
    ).length;
    expect(resetCount).toBe(3); // One RESET per label
  });

  test("should produce string safe for log output", () => {
    const result = formatLabels(["bug"]);

    // Should be a string
    expect(typeof result).toBe("string");

    // Should not be empty
    expect(result.length).toBeGreaterThan(0);

    // Should start with color code
    expect(result.startsWith(LABEL_COLORS["bug"]!)).toBe(true);

    // Should end with reset code
    expect(result.endsWith(RESET)).toBe(true);
  });
});
