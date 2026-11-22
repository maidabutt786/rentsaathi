import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import tailwindConfig from "../../tailwind.config.js";

const BRAND = {
  primary: "#A20224",
  primaryHover: "#7D0119",
  primarySoft: "#FBE9ED",
  secondary: "#764002",
  secondarySoft: "#F6EDE2",
  background: "#FFFCFA",
  surface: "#FFFFFF",
  subtle: "#FAF6F3",
  ink: "#2B1B14",
  muted: "#6B5B53",
  border: "#EADFD8",
};

describe("RentSaathi design tokens", () => {
  const colors = tailwindConfig.theme.extend.colors;

  it("matches the sampled logo colours exactly", () => {
    expect(colors.primary.DEFAULT).toBe(BRAND.primary);
    expect(colors.primary.hover).toBe(BRAND.primaryHover);
    expect(colors.primary.soft).toBe(BRAND.primarySoft);
    expect(colors.secondary.DEFAULT).toBe(BRAND.secondary);
    expect(colors.secondary.soft).toBe(BRAND.secondarySoft);
    expect(colors.background).toBe(BRAND.background);
    expect(colors.surface).toBe(BRAND.surface);
    expect(colors.subtle).toBe(BRAND.subtle);
    expect(colors.ink).toBe(BRAND.ink);
    expect(colors.muted).toBe(BRAND.muted);
    expect(colors.line).toBe(BRAND.border);
  });

  it("keeps status colours distinct from the brand red", () => {
    expect(colors.status.verified).toBe("#2E7D32");
    expect(colors.status.suspicious).toBe("#B7791F");
    expect(colors.status.highrisk).toBe("#C62828");
    expect(colors.status.info).toBe("#1F6F8B");
    expect(colors.status.highrisk).not.toBe(colors.primary.DEFAULT);
  });

  it("uses the required chart palette in order", () => {
    expect([colors.chart[1], colors.chart[2], colors.chart[3], colors.chart[4], colors.chart[5], colors.chart[6]]).toEqual([
      "#A20224",
      "#764002",
      "#D9A066",
      "#E8B4BD",
      "#8C6D5A",
      "#2E7D32",
    ]);
  });

  it("defines the CSS variables used outside Tailwind", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8").toLowerCase();
    expect(css).toContain("--color-primary: #a20224");
    expect(css).toContain("--color-primary-hover: #7d0119");
    expect(css).toContain("--color-primary-soft: #fbe9ed");
    expect(css).toContain("--color-secondary: #764002");
    expect(css).toContain("--color-background: #fffcfa");
    expect(css).toContain("--color-high-risk: #c62828");
  });

  it("uses the geometric heading font and Inter body font", () => {
    expect(tailwindConfig.theme.extend.fontFamily.heading[0]).toBe("Poppins");
    expect(tailwindConfig.theme.extend.fontFamily.sans[0]).toBe("Inter");
  });
});
