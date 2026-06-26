import { describe, expect, test } from "bun:test";
import { buildGhPrCommand, escapeShellArg } from "../../utils/shell";

describe("Shell Utilities", () => {
  // escapeShellArg replaces every ' with '\'' so the argument can be wrapped in
  // plain POSIX single quotes. No other characters need escaping because
  // single-quoted strings are literal in POSIX shells.
  test("should escape embedded single quotes using POSIX close-escape-reopen", () => {
    expect(escapeShellArg("bug'fix")).toBe("bug'\\''fix");
  });

  test("should leave dollar signs unescaped (safe inside single quotes)", () => {
    expect(escapeShellArg("release/$next")).toBe("release/$next");
  });

  test("should leave backticks unescaped (safe inside single quotes)", () => {
    expect(escapeShellArg("Use `code`")).toBe("Use `code`");
  });

  test("should escape multiple single quotes in one string", () => {
    expect(escapeShellArg("it's a bird's eye view")).toBe("it'\\''s a bird'\\''s eye view");
  });

  test("should leave newlines as-is (gh reads body from literal newlines in single-quoted strings)", () => {
    expect(escapeShellArg("line one\nline two")).toBe("line one\nline two");
  });

  test("should return empty string unchanged", () => {
    expect(escapeShellArg("")).toBe("");
  });

  test("should wrap branch, title, and body in single quotes", () => {
    const command = buildGhPrCommand("main", {
      title: "My PR",
      description: "Some description",
    });

    expect(command).toContain("-B 'main'");
    expect(command).toContain("-t 'My PR'");
    expect(command).toContain("-b 'Some description'");
    expect(command).not.toContain("$'");
  });

  test("should quote branch names with dollar signs in generated gh commands", () => {
    const command = buildGhPrCommand("release/$next", {
      title: "Prepare release",
      description: "Release notes",
    });

    // Dollar sign is literal inside single quotes — no escaping needed
    expect(command).toContain("-B 'release/$next'");
    expect(command).not.toContain("$'");
  });

  test("should quote labels containing spaces and single quotes", () => {
    const command = buildGhPrCommand("main", {
      title: "Prepare release",
      description: "Release notes",
      labels: ["needs review", "bug'fix"],
    });

    expect(command).toContain("-l 'needs review'");
    // Regression: must not emit the old unsafe $'bug\'fix' form
    expect(command).not.toContain("$'bug\\'fix'");
    // Must emit the POSIX close-escape-reopen form
    expect(command).toContain("-l 'bug'\\''fix'");
  });

  test("should handle multiline PR body", () => {
    const command = buildGhPrCommand("main", {
      title: "Release",
      description: "## Summary\n- fix A\n- fix B",
    });

    // The body argument is wrapped in single quotes with literal newlines
    expect(command).toContain("-b '## Summary\n- fix A\n- fix B'");
  });

  test("should omit labels arg when labels array is empty", () => {
    const command = buildGhPrCommand("main", {
      title: "T",
      description: "D",
      labels: [],
    });

    expect(command).not.toContain("-l");
  });

  test("should omit labels arg when labels is undefined", () => {
    const command = buildGhPrCommand("main", {
      title: "T",
      description: "D",
    });

    expect(command).not.toContain("-l");
  });
});
