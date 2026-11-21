// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useDocumentTitle } from "@/lib/use-document-title";
import { metadata as tripsLayoutMetadata } from "@/app/trips/layout";
import { readFileSync } from "node:fs";
import { TITLE_TEMPLATE } from "@/lib/site";

function Probe({ title }: { title?: string }) {
  useDocumentTitle(title);
  return null;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.head.innerHTML = "<title>Trip</title>";
});
afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
});

describe("useDocumentTitle", () => {
  it("sets the title and puts it back when Next's streamed title overwrites it", async () => {
    render(<Probe title="Winter loop" />);
    expect(document.title).toBe("Winter loop · Seasons & Sights");

    document.title = "Trip · Seasons & Sights";
    await flush();
    expect(document.title).toBe("Winter loop · Seasons & Sights");
  });

  // Regression: a passive-effect cleanup ran after the next page's title
  // landed, so the old trip's name was written onto the new page.
  it("stops the moment the page unmounts", async () => {
    const { unmount } = render(<Probe title="Winter loop" />);
    unmount();
    document.title = "My trips · Seasons & Sights";
    await flush();
    expect(document.title).toBe("My trips · Seasons & Sights");
  });

  it("two callers don't fight: the newest wins", async () => {
    render(
      <>
        <Probe title="First" />
        <Probe title="Second" />
      </>
    );
    await flush();
    expect(document.title).toBe("Second · Seasons & Sights");
  });
});

describe("trip tab title template", () => {
  // Regression: a plain-string title in the /trips layout dropped the root
  // template, so trip and journal tabs read a bare "Trip".
  it("the /trips layout passes the site template down to trip pages", () => {
    const title = tripsLayoutMetadata.title as { template: string };
    expect(title.template).toBe(TITLE_TEMPLATE);
    expect(TITLE_TEMPLATE).toBe("%s · Seasons & Sights");
    // The root layout (not importable here: next/font) uses the same one.
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain(
      "template: TITLE_TEMPLATE"
    );
  });
});
