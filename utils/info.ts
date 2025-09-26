import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const pkg = JSON.parse(
  await readFile(
    join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
    "utf-8"
  )
);
