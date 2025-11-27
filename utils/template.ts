import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Interface representing a PR template
 */
export interface PRTemplate {
  name: string;
  path: string;
  content: string;
}

/**
 * Common locations where PR templates might be stored
 */
const TEMPLATE_LOCATIONS = [
  ".github/pull_request_template.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/pull_request_template/",
  ".github/PULL_REQUEST_TEMPLATE/",
  "docs/pull_request_template.md",
  "docs/PULL_REQUEST_TEMPLATE.md",
];

/**
 * Checks if a path exists and is a file
 */
async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if a path exists and is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads a template file and returns its content
 */
async function readTemplateFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch (_error) {
    throw new Error(`Failed to read template file: ${path}`);
  }
}

/**
 * Gets the display name for a template from its filename
 */
function getTemplateName(filename: string): string {
  // Remove .md extension and convert to title case
  return filename
    .replace(/\.md$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Finds all PR templates in the repository
 * @param {string} cwd - Current working directory (repository root)
 * @returns {Promise<PRTemplate[]>} Array of found templates
 */
export async function findPRTemplates(
  cwd: string = process.cwd(),
): Promise<PRTemplate[]> {
  const templates: PRTemplate[] = [];
  const seenPaths = new Set<string>();
  const seenContents = new Map<string, string>(); // content hash -> path mapping to detect duplicates

  for (const location of TEMPLATE_LOCATIONS) {
    const fullPath = join(cwd, location);

    if (!existsSync(fullPath)) {
      continue;
    }

    // Check if it's a file
    if (await isFile(fullPath)) {
      // Normalize path for case-insensitive comparison
      const normalizedLocation = location.toLowerCase();
      if (seenPaths.has(normalizedLocation)) {
        continue;
      }

      const content = await readTemplateFile(fullPath);
      // Check if we've already seen this exact content (handles case-insensitive FS)
      const contentHash = `${content.substring(0, 200)}-${content.substring(Math.floor(content.length / 2), Math.floor(content.length / 2) + 100)}-${content.substring(Math.max(0, content.length - 100))}-${content.length}`;
      if (seenContents.has(contentHash)) {
        continue;
      }

      templates.push({
        name: getTemplateName(location.split("/").pop() || "Default"),
        path: location,
        content,
      });
      seenPaths.add(normalizedLocation);
      seenContents.set(contentHash, location);
    }
    // Check if it's a directory
    else if (await isDirectory(fullPath)) {
      try {
        const files = await readdir(fullPath);
        const markdownFiles = files.filter(
          (file) => file.endsWith(".md") || file.endsWith(".MD"),
        );

        for (const file of markdownFiles) {
          const templatePath = join(location, file);
          const normalizedPath = templatePath.toLowerCase();
          if (seenPaths.has(normalizedPath)) {
            continue;
          }

          const filePath = join(fullPath, file);
          const content = await readTemplateFile(filePath);
          // Check if we've already seen this exact content
          const contentHash = `${content.substring(0, 200)}-${content.substring(Math.floor(content.length / 2), Math.floor(content.length / 2) + 100)}-${content.substring(Math.max(0, content.length - 100))}-${content.length}`;
          if (seenContents.has(contentHash)) {
            continue;
          }

          templates.push({
            name: getTemplateName(file),
            path: templatePath,
            content,
          });
          seenPaths.add(normalizedPath);
          seenContents.set(contentHash, templatePath);
        }
      } catch (_error) {}
    }
  }

  return templates;
}

/**
 * Gets a specific PR template by name or path
 * @param {string} nameOrPath - Template name or path
 * @param {string} cwd - Current working directory
 * @returns {Promise<PRTemplate | null>} The template if found, null otherwise
 */
export async function getPRTemplate(
  nameOrPath: string,
  cwd: string = process.cwd(),
): Promise<PRTemplate | null> {
  // Validate input
  if (!nameOrPath || typeof nameOrPath !== "string") {
    return null;
  }

  const templates = await findPRTemplates(cwd);

  // Try to find by exact name match (case-insensitive)
  const byName = templates.find(
    (t) => t.name.toLowerCase() === nameOrPath.toLowerCase(),
  );
  if (byName) return byName;

  // Try to find by path match (normalize path separators)
  const normalizedInput = nameOrPath.replace(/\\/g, "/");
  const byPath = templates.find(
    (t) => t.path.replace(/\\/g, "/") === normalizedInput,
  );
  if (byPath) return byPath;

  // Try to find by partial name match
  const byPartialName = templates.find((t) =>
    t.name.toLowerCase().includes(nameOrPath.toLowerCase()),
  );
  if (byPartialName) return byPartialName;

  return null;
}

/**
 * Checks if there are any PR templates available
 * @param {string} cwd - Current working directory
 * @returns {Promise<boolean>} True if templates exist
 */
export async function hasPRTemplates(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const templates = await findPRTemplates(cwd);
  return templates.length > 0;
}
