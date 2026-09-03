import { describe, expect, it } from "vitest";
import { formatProjectIndex, getLatestCreation, projectLinkLabel, projects, projectStatusLabel } from "./projects";

describe("projectStatusLabel", () => {
  it("maps every project status to its display label", () => {
    expect(projectStatusLabel("live")).toBe("live");
    expect(projectStatusLabel("in-progress")).toBe("in progress");
    expect(projectStatusLabel("open-source")).toBe("open source");
  });
});

describe("projectLinkLabel", () => {
  it("uses the custom label when present", () => {
    expect(projectLinkLabel(projects[0])).toBe("Open modeltable.dev");
  });

  it("falls back to a generic label otherwise", () => {
    expect(projectLinkLabel(projects[1])).toBe("View repository");
  });
});

describe("getLatestCreation", () => {
  it("picks the first project flagged for the home page", () => {
    expect(getLatestCreation()?.id).toBe("modeltable");
  });

  it("falls back to the first project when none is flagged", () => {
    const [first, second] = projects;
    expect(getLatestCreation([first, second])?.id).toBe(first.id);
  });

  it("returns undefined for an empty list", () => {
    expect(getLatestCreation([])).toBeUndefined();
  });
});

describe("formatProjectIndex", () => {
  it("pads both index and total to two digits", () => {
    expect(formatProjectIndex(0)).toBe("01 / 06");
    expect(formatProjectIndex(5)).toBe("06 / 06");
  });

  it("adapts to the length of the provided list", () => {
    expect(formatProjectIndex(0, 1)).toBe("01 / 01");
  });
});
