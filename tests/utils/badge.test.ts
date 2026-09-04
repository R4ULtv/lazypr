import { beforeEach, describe, expect, mock, test } from "bun:test";
import { displayConfigBadge } from "../../utils/badge";
import { MODEL_NAME, type ProviderType } from "../../utils/provider";

const mockNote = mock((_message: string, _title: string) => {});
mock.module("@clack/prompts", () => ({ note: mockNote }));

const minimalConfig = (provider: ProviderType = "groq") => ({
  provider,
  smartFilter: false,
  locale: "en",
  usage: false,
  ghCli: false,
});

function getBadge(): { badge: string; title: string } {
  const call = mockNote.mock.calls[0];
  expect(call).toBeDefined();

  return {
    badge: String(call?.[0]),
    title: String(call?.[1]),
  };
}

beforeEach(() => {
  mockNote.mockClear();
});

describe("displayConfigBadge", () => {
  test("always displays the selected provider, fixed model, and locale", () => {
    displayConfigBadge(minimalConfig());

    const { badge, title } = getBadge();
    expect(mockNote).toHaveBeenCalledTimes(1);
    expect(badge).toContain("Provider");
    expect(badge).toContain("groq");
    expect(badge).toContain("Model");
    expect(badge).toContain(MODEL_NAME);
    expect(badge).toContain("EN");
    expect(title).toBe("Configuration");
  });

  test("supports Cerebras without changing the model", () => {
    displayConfigBadge(minimalConfig("cerebras"));

    const { badge } = getBadge();
    expect(badge).toContain("cerebras");
    expect(badge).toContain(MODEL_NAME);
  });

  test("displays every enabled optional setting", () => {
    displayConfigBadge({
      ...minimalConfig("cerebras"),
      smartFilter: true,
      locale: "ja",
      template: "pull_request_template.md",
      context: "Focus on the public API",
      usage: true,
      ghCli: true,
    });

    const { badge } = getBadge();
    expect(badge).toContain("JA");
    expect(badge).toContain("Smart Filter");
    expect(badge).toContain("pull_request_template.md");
    expect(badge).toContain("User Context");
    expect(badge).toContain("Usage Stats");
    expect(badge).toContain("GH CLI");
    expect(badge).toContain("|");
  });

  test("omits disabled optional settings", () => {
    displayConfigBadge(minimalConfig());

    const { badge } = getBadge();
    expect(badge).not.toContain("Smart Filter");
    expect(badge).not.toContain("Template");
    expect(badge).not.toContain("User Context");
    expect(badge).not.toContain("Usage Stats");
    expect(badge).not.toContain("GH CLI");
  });

  test("uppercases every supported locale for display", () => {
    for (const locale of ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"]) {
      mockNote.mockClear();
      displayConfigBadge({ ...minimalConfig(), locale });
      expect(getBadge().badge).toContain(locale.toUpperCase());
    }
  });
});
