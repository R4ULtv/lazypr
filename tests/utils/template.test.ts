import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findPRTemplates,
  getPRTemplate,
  hasPRTemplates,
} from "../../utils/template";

describe("PR Template Utils", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `lazypr-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("findPRTemplates", () => {
    test("should return empty array when no templates exist", async () => {
      const templates = await findPRTemplates(testDir);
      expect(templates).toEqual([]);
    });

    test("should find single template file", async () => {
      const githubDir = join(testDir, ".github");
      await mkdir(githubDir, { recursive: true });
      await writeFile(
        join(githubDir, "pull_request_template.md"),
        "# PR Template\n\n## Description\n\nDescribe your changes",
      );

      const templates = await findPRTemplates(testDir);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe("Pull Request Template");
      expect(templates[0]?.path).toBe(".github/pull_request_template.md");
      expect(templates[0]?.content).toContain("# PR Template");
    });

    test("should find uppercase template file", async () => {
      const githubDir = join(testDir, ".github");
      await mkdir(githubDir, { recursive: true });
      await writeFile(
        join(githubDir, "PULL_REQUEST_TEMPLATE.md"),
        "# Uppercase Template",
      );

      const templates = await findPRTemplates(testDir);
      expect(templates).toHaveLength(1);
      // On case-insensitive filesystems, the first matching location is used
      expect(templates[0]?.name).toMatch(/Pull Request Template/i);
    });

    test("should find multiple templates in directory", async () => {
      const templateDir = join(testDir, ".github", "pull_request_template");
      await mkdir(templateDir, { recursive: true });
      await writeFile(join(templateDir, "bug_fix.md"), "# Bug Fix Template");
      await writeFile(join(templateDir, "feature.md"), "# Feature Template");

      const templates = await findPRTemplates(testDir);
      expect(templates).toHaveLength(2);
      expect(templates.map((t) => t.name).sort()).toEqual([
        "Bug Fix",
        "Feature",
      ]);
    });

    test("should find templates in docs folder", async () => {
      const docsDir = join(testDir, "docs");
      await mkdir(docsDir, { recursive: true });
      await writeFile(
        join(docsDir, "pull_request_template.md"),
        "# Docs Template",
      );

      const templates = await findPRTemplates(testDir);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.path).toBe("docs/pull_request_template.md");
    });

    test("should handle mixed case MD extensions", async () => {
      const templateDir = join(testDir, ".github", "pull_request_template");
      await mkdir(templateDir, { recursive: true });
      await writeFile(join(templateDir, "lowercase.md"), "# Lowercase");
      await writeFile(join(templateDir, "uppercase.MD"), "# Uppercase");

      const templates = await findPRTemplates(testDir);
      expect(templates).toHaveLength(2);
    });
  });

  describe("getPRTemplate", () => {
    beforeEach(async () => {
      // Set up test templates
      const githubDir = join(testDir, ".github", "pull_request_template");
      await mkdir(githubDir, { recursive: true });
      await writeFile(join(githubDir, "bug_fix.md"), "# Bug Fix Template");
      await writeFile(join(githubDir, "feature.md"), "# Feature Template");
    });

    test("should find template by exact name", async () => {
      const template = await getPRTemplate("Bug Fix", testDir);
      expect(template).not.toBeNull();
      expect(template?.name).toBe("Bug Fix");
      expect(template?.content).toContain("# Bug Fix Template");
    });

    test("should find template by case-insensitive name", async () => {
      const template = await getPRTemplate("bug fix", testDir);
      expect(template).not.toBeNull();
      expect(template?.name).toBe("Bug Fix");
    });

    test("should find template by partial name", async () => {
      const template = await getPRTemplate("bug", testDir);
      expect(template).not.toBeNull();
      expect(template?.name).toBe("Bug Fix");
    });

    test("should find template by path", async () => {
      const template = await getPRTemplate(
        ".github/pull_request_template/bug_fix.md",
        testDir,
      );
      expect(template).not.toBeNull();
      expect(template?.name).toBe("Bug Fix");
    });

    test("should return null for non-existent template", async () => {
      const template = await getPRTemplate("nonexistent", testDir);
      expect(template).toBeNull();
    });
  });

  describe("hasPRTemplates", () => {
    test("should return false when no templates exist", async () => {
      const hasTemplates = await hasPRTemplates(testDir);
      expect(hasTemplates).toBe(false);
    });

    test("should return true when templates exist", async () => {
      const githubDir = join(testDir, ".github");
      await mkdir(githubDir, { recursive: true });
      await writeFile(
        join(githubDir, "pull_request_template.md"),
        "# Template",
      );

      const hasTemplates = await hasPRTemplates(testDir);
      expect(hasTemplates).toBe(true);
    });
  });

  describe("Template name formatting", () => {
    test("should format template names correctly", async () => {
      const templateDir = join(testDir, ".github", "pull_request_template");
      await mkdir(templateDir, { recursive: true });
      await writeFile(join(templateDir, "bug_fix_template.md"), "# Bug Fix");
      await writeFile(
        join(templateDir, "feature_request.md"),
        "# Feature Request",
      );

      const templates = await findPRTemplates(testDir);
      expect(templates.map((t) => t.name).sort()).toEqual([
        "Bug Fix Template",
        "Feature Request",
      ]);
    });
  });
});
