import { describe, expect, test } from "bun:test";
import { buildGhPrCommand, escapeShellArg } from "../../utils/shell";

describe("Shell Utilities", () => {
  test("should escape shell-sensitive characters", () => {
    expect(escapeShellArg("feature/$next's `branch`")).toBe("feature/\\$next\\'s \\`branch\\`");
  });

  test("should quote branch names and labels in generated gh commands", () => {
    const command = buildGhPrCommand("release/$next", {
      title: "Prepare release",
      description: "Release notes",
      labels: ["needs review", "bug'fix"],
    });

    expect(command).toContain("-B $'release/\\$next'");
    expect(command).toContain("-l $'needs review'");
    expect(command).toContain("-l $'bug\\'fix'");
  });
});
