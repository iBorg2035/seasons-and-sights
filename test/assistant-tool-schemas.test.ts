import { describe, expect, it } from "vitest";
import { asSchema } from "ai";
import { createAssistantTools } from "@/lib/assistant/tools";

/**
 * Every tool's schema is sent with every assistant request, so one schema the
 * provider rejects takes the whole assistant down — which is what a zod tuple
 * did in production: xAI refuses draft-07 tuple `items: [...]`.
 */
function arrayValuedItems(node: unknown, path = "#"): string[] {
  if (!node || typeof node !== "object") return [];
  const found: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "items" && Array.isArray(value)) found.push(`${path}/items`);
    found.push(...arrayValuedItems(value, `${path}/${key}`));
  }
  return found;
}

describe("assistant tool schemas", () => {
  it("never use tuple-style array `items`", async () => {
    const tools = createAssistantTools(null) as Record<string, { inputSchema: unknown }>;
    for (const [name, t] of Object.entries(tools)) {
      const schema = await asSchema(t.inputSchema as never).jsonSchema;
      expect(arrayValuedItems(schema), name).toEqual([]);
    }
  });

  it("assessTrip accepts object stops and scores them", async () => {
    const tools = createAssistantTools(null) as unknown as Record<
      string,
      { execute: (input: unknown, opts: unknown) => Promise<unknown> }
    >;
    const out = (await tools.assessTrip.execute(
      {
        trip: {
          start: 11,
          stops: [{ regionId: "thailand-bangkok", durationMonths: 1 }],
        },
      },
      { toolCallId: "t", messages: [] }
    )) as Record<string, unknown>;
    expect(out).not.toHaveProperty("error");
  });
});
