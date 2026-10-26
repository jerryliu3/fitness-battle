import { describe, expect, it } from "vitest";
import {
  WEB_PRODUCT_PREFIX,
  stripWebProductPrefix,
  webProductPath,
} from "./product-routes";

describe("web product routes", () => {
  it("prefixes shell paths for the web app", () => {
    expect(webProductPath("/today")).toBe("/app/today");
    expect(webProductPath("/app/arena")).toBe("/app/arena");
  });

  it("strips the web prefix for tab resolution", () => {
    expect(stripWebProductPrefix("/app/you/history")).toBe("/you/history");
    expect(stripWebProductPrefix("/today")).toBe("/today");
    expect(stripWebProductPrefix(WEB_PRODUCT_PREFIX)).toBe("/");
  });
});
