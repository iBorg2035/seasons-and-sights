import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The service worker cache used to be a hand-bumped constant. Four releases
 * shipped without the bump, and each time the symptom was the worst kind:
 * everything deployed correctly, no error anywhere, and returning visitors
 * simply kept seeing the old app. These assertions exist because a code review
 * cannot catch a step someone forgot to perform.
 */

const root = process.cwd();
const sw = readFileSync(join(root, "public/sw.js"), "utf8");
const register = readFileSync(
  join(root, "src/components/ServiceWorkerRegister.tsx"),
  "utf8"
);
const config = readFileSync(join(root, "next.config.ts"), "utf8");

describe("the service worker cache name", () => {
  it("is derived from the registration URL, never a hardcoded literal", () => {
    expect(sw).toMatch(/searchParams\.get\(\s*["']v["']\s*\)/);
    // A literal like `const CACHE = "ss-v3"` is exactly the failure mode.
    expect(sw).not.toMatch(/const CACHE\s*=\s*["'][^"'$]+["']/);
  });

  it("is stamped with the build id at registration", () => {
    expect(register).toMatch(/\/sw\.js\?v=\$\{/);
    expect(register).toMatch(/NEXT_PUBLIC_BUILD_ID/);
  });

  it("gets a build id that actually changes between deployments", () => {
    expect(config).toMatch(/NEXT_PUBLIC_BUILD_ID/);
    expect(config).toMatch(/VERCEL_GIT_COMMIT_SHA/);
  });
});

describe("serving a document", () => {
  it("prefers the network, so a live visitor cannot be served a stale page", () => {
    expect(sw).toMatch(/req\.mode\s*===\s*["']navigate["']/);
    expect(sw).toMatch(/if \(documentFirst\) return \(await network\) \|\| cached/);
  });

  it("still falls back to cache, which is the whole point of having one", () => {
    expect(sw).toMatch(/\.catch\(\(\) => cached\)/);
  });
});
