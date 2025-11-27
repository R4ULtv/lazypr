import { describe, expect, test } from "bun:test";
import { pkg } from "../../utils/info";

describe("Package Info", () => {
  describe("pkg object", () => {
    test("should be defined", () => {
      expect(pkg).toBeDefined();
    });

    test("should be an object", () => {
      expect(typeof pkg).toBe("object");
      expect(pkg).not.toBeNull();
    });
  });

  describe("Required package.json fields", () => {
    test("should have name property", () => {
      expect(pkg).toHaveProperty("name");
      expect(typeof pkg.name).toBe("string");
      expect(pkg.name.length).toBeGreaterThan(0);
    });

    test("should have version property", () => {
      expect(pkg).toHaveProperty("version");
      expect(typeof pkg.version).toBe("string");
      expect(pkg.version.length).toBeGreaterThan(0);
    });

    test("should have description property", () => {
      expect(pkg).toHaveProperty("description");
      expect(typeof pkg.description).toBe("string");
      expect(pkg.description.length).toBeGreaterThan(0);
    });

    test("should have author property", () => {
      expect(pkg).toHaveProperty("author");
      expect(typeof pkg.author).toBe("string");
    });

    test("should have license property", () => {
      expect(pkg).toHaveProperty("license");
      expect(typeof pkg.license).toBe("string");
    });
  });

  describe("Package name validation", () => {
    test("should be named 'lazypr'", () => {
      expect(pkg.name).toBe("lazypr");
    });

    test("should not contain uppercase letters", () => {
      expect(pkg.name).toBe(pkg.name.toLowerCase());
    });

    test("should not contain spaces", () => {
      expect(pkg.name).not.toContain(" ");
    });
  });

  describe("Version format", () => {
    test("should follow semver format (X.Y.Z)", () => {
      const semverRegex =
        /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
      expect(semverRegex.test(pkg.version)).toBe(true);
    });

    test("should have numeric major version", () => {
      const [major] = pkg.version.split(".");
      expect(Number.isNaN(Number(major))).toBe(false);
    });

    test("should have numeric minor version", () => {
      const [, minor] = pkg.version.split(".");
      expect(Number.isNaN(Number(minor))).toBe(false);
    });

    test("should have numeric patch version", () => {
      const [, , patch] = pkg.version.split(".");
      const patchNumber = patch.split("-")[0]; // Handle pre-release versions
      expect(Number.isNaN(Number(patchNumber))).toBe(false);
    });
  });

  describe("Module configuration", () => {
    test("should have type property", () => {
      expect(pkg).toHaveProperty("type");
    });

    test("type should be 'module' for ESM", () => {
      expect(pkg.type).toBe("module");
    });

    test("should have module property", () => {
      expect(pkg).toHaveProperty("module");
      expect(typeof pkg.module).toBe("string");
    });
  });

  describe("Files to publish", () => {
    test("should have files array", () => {
      expect(pkg).toHaveProperty("files");
      expect(Array.isArray(pkg.files)).toBe(true);
    });

    test("files array should not be empty", () => {
      expect(pkg.files.length).toBeGreaterThan(0);
    });

    test("should include dist directory", () => {
      expect(pkg.files).toContain("dist");
    });
  });

  describe("Package metadata completeness", () => {
    test("should have all essential npm fields", () => {
      const essentialFields = [
        "name",
        "version",
        "description",
        "author",
        "license",
      ];
      essentialFields.forEach((field) => {
        expect(pkg).toHaveProperty(field);
      });
    });

    test("should have all CLI-specific fields", () => {
      const cliFields = ["bin", "repository"];
      cliFields.forEach((field) => {
        expect(pkg).toHaveProperty(field);
      });
    });
  });

  describe("Package integrity", () => {
    test("pkg object should be accessible", () => {
      // Test that we can read properties without issues
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
    });

    test("should not have circular references", () => {
      expect(() => JSON.stringify(pkg)).not.toThrow();
    });

    test("should be serializable to JSON", () => {
      const serialized = JSON.stringify(pkg);
      expect(serialized).toBeDefined();
      expect(serialized.length).toBeGreaterThan(0);
    });

    test("should be deserializable from JSON", () => {
      const serialized = JSON.stringify(pkg);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.name).toBe(pkg.name);
      expect(deserialized.version).toBe(pkg.version);
    });
  });
});
