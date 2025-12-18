import { describe, expect, test } from "bun:test";
import {
  CUSTOM_LABEL_COLORS,
  DEFAULT_COLOR,
  DEFAULT_LABELS,
  formatLabels,
  getAvailableLabels,
  getLabelColor,
  LABEL_COLORS,
  parseCustomLabels,
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
    expect(result).toContain(LABEL_COLORS.bug ?? "");
    expect(result).toContain(LABEL_COLORS.enhancement ?? "");
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
    expect(result).toContain(LABEL_COLORS.enhancement ?? "");
    expect(result).toContain(LABEL_COLORS.bug ?? "");
    expect(result).toContain(LABEL_COLORS.documentation ?? "");

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
    expect(result.startsWith(LABEL_COLORS.bug ?? "")).toBe(true);

    // Should end with reset code
    expect(result.endsWith(RESET)).toBe(true);
  });
});

describe("DEFAULT_LABELS", () => {
  test("should contain the three default labels", () => {
    expect(DEFAULT_LABELS).toEqual(["enhancement", "bug", "documentation"]);
  });
});

describe("CUSTOM_LABEL_COLORS", () => {
  test("should have at least 5 colors in palette", () => {
    expect(CUSTOM_LABEL_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  test("should have valid ANSI color codes", () => {
    CUSTOM_LABEL_COLORS.forEach((color) => {
      expect(color).toMatch(/^\x1b\[\d+;?\d*m$/);
    });
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

describe("getLabelColor", () => {
  test("should return correct color for default labels", () => {
    expect(getLabelColor("enhancement", [])).toBe(LABEL_COLORS.enhancement);
    expect(getLabelColor("bug", [])).toBe(LABEL_COLORS.bug);
    expect(getLabelColor("documentation", [])).toBe(LABEL_COLORS.documentation);
  });

  test("should return custom palette color for custom labels", () => {
    const customLabels = ["feature", "security"];
    expect(getLabelColor("feature", customLabels)).toBe(CUSTOM_LABEL_COLORS[0]);
    expect(getLabelColor("security", customLabels)).toBe(CUSTOM_LABEL_COLORS[1]);
  });

  test("should cycle through palette for many custom labels", () => {
    const manyLabels = Array.from({ length: 15 }, (_, i) => `label${i}`);
    const color = getLabelColor("label10", manyLabels);
    expect(color).toBe(
      CUSTOM_LABEL_COLORS[10 % CUSTOM_LABEL_COLORS.length],
    );
  });

  test("should return DEFAULT_COLOR for unknown labels", () => {
    expect(getLabelColor("unknown", [])).toBe(DEFAULT_COLOR);
  });
});

describe("formatLabels with custom labels config", () => {
  test("should use custom palette colors for custom labels", () => {
    const result = formatLabels(["feature"], "feature,security");
    expect(result).toContain(CUSTOM_LABEL_COLORS[0]);
    expect(result).toContain("feature");
  });

  test("should still use default colors for default labels", () => {
    const result = formatLabels(["bug"], "feature,security");
    expect(result).toContain(LABEL_COLORS.bug);
  });

  test("should handle mixed default and custom labels", () => {
    const result = formatLabels(["bug", "feature"], "feature,security");
    expect(result).toContain(LABEL_COLORS.bug);
    expect(result).toContain(CUSTOM_LABEL_COLORS[0]);
  });
});
