import { expect, it } from "vitest";
import { competeEventCarouselPageIndex } from "./compete-carousel";

it("maps carousel scroll offset to a page index", () => {
  expect(competeEventCarouselPageIndex(0, 320, 3)).toBe(0);
  expect(competeEventCarouselPageIndex(310, 320, 3)).toBe(1);
  expect(competeEventCarouselPageIndex(640, 320, 3)).toBe(2);
  expect(competeEventCarouselPageIndex(100, 0, 3)).toBe(0);
});
