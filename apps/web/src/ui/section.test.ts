import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Section, SectionStack, TextAction, AppText } from "./section";
it("labels semantic sections and preserves full titles and specific action names", () => {
  const html = renderToStaticMarkup(createElement(Section, { title: "Long personal achievement collection", action: createElement(TextAction, { href: "/you/achievements", label: "View all", accessibilityLabel: "View all achievements" }), children: createElement(AppText, { role: "itemTitle", children: "Morning run" }) }));
  expect(html).toMatch(/<section[^>]+aria-labelledby=/);
  expect(html).toMatch(/<h2 id=/);
  expect(html).toContain('aria-label="View all achievements"');
  expect(html).toContain('href="/you/achievements"');
  expect(html).toContain("Long personal achievement collection");
  expect(html).not.toContain("text-overflow");
});
it("ignores absent children when separating peer sections", () => {
  const html = renderToStaticMarkup(createElement(SectionStack, { children: [null, createElement("p", { key: "one" }, "One"), false, createElement("p", { key: "two" }, "Two")] }));
  expect(html.match(/class="ui-section-boundary"/g)).toHaveLength(1);
});
