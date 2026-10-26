import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PolishedRacer } from "./polished-racer";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

it.each([false, true])("preserves the original static wake pixels, including clipping, for gold=%s", async gold => {
  for (const wakeBottom of [undefined, 45]) {
    const render = async (independentWake: boolean) => {
      const markup = renderToStaticMarkup(createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: 90, height: 180, viewBox: "-45 -45 90 180" },
        createElement(PolishedRacer, { x: 0, y: 0, you: true, gold, sizeScale: 1, showWake: true, independentWake, animateWake: false, wakeBottom })));
      return sharp(Buffer.from(markup)).ensureAlpha().raw().toBuffer();
    };
    expect(await render(true)).toEqual(await render(false));
  }
});
