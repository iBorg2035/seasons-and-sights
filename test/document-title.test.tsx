// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useDocumentTitle } from "@/lib/use-document-title";

function Probe({ title }: { title?: string }) {
  useDocumentTitle(title);
  return null;
}

describe("useDocumentTitle", () => {
  it("sets the title and puts it back when something else overwrites it", async () => {
    const t = document.createElement("title");
    t.textContent = "Trip";
    document.head.appendChild(t);

    const { unmount } = render(<Probe title="Winter loop" />);
    expect(document.title).toBe("Winter loop · Seasons & Sights");

    // What Next's streamed metadata does after hydration.
    document.title = "Trip · Seasons & Sights";
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toBe("Winter loop · Seasons & Sights");

    unmount();
    document.title = "Elsewhere";
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toBe("Elsewhere");
  });
});
