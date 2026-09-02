import { describe, expect, it } from "vitest";
import { displayUrl } from "./resume";

describe("displayUrl", () => {
  it("strips scheme, www, and trailing slash", () => {
    expect(displayUrl("https://www.example.com/")).toBe("example.com");
  });

  it("strips the scheme case-insensitively", () => {
    expect(displayUrl("HTTP://example.com")).toBe("example.com");
  });

  it("strips www case-insensitively but keeps the host's case", () => {
    expect(displayUrl("https://WWW.Example.com/")).toBe("Example.com");
  });

  it("keeps the path after the host", () => {
    expect(displayUrl("https://github.com/ebreen/shield-airplay/")).toBe("github.com/ebreen/shield-airplay");
  });

  it("leaves bare domains and non-http URLs untouched", () => {
    expect(displayUrl("example.com")).toBe("example.com");
    expect(displayUrl("ftp://example.com")).toBe("ftp://example.com");
  });
});
