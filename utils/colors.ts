import { styleText } from "node:util";

type StyleFormat = Parameters<typeof styleText>[0];

export function colorize(format: StyleFormat, text: string): string {
  return styleText(format, text, { validateStream: false });
}
