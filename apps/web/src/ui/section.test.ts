import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Section, SectionStack, TextAction, AppText, FeatureCard } from "./section";
it("labels semantic sections and preserves full titles and specific action names", () => {
  const html = renderToStaticMarkup(createElement(Section, { title: "Long personal achievement collection", action: createElement(TextAction, { href: "/you/achievements", label: "View all", accessibilityLabel: "View all achievements" }), children: createElement(AppText, { role: "label", children: "Morning run" }) }));
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

it("keeps the selected recipe when a caller supplies typography overrides", () => {
  const html = renderToStaticMarkup(createElement(AppText, { role: "label", style: { fontSize: 99, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: "red" } }, "GPS Tracked"));
  expect(html).toContain("font-size:0.875rem");
  expect(html).toContain("font-weight:600");
  expect(html).toContain("letter-spacing:0em");
  expect(html).toContain("text-transform:none");
  expect(html).toContain("color:red");
  expect(html).not.toContain("99px");
});

it("uses the same card structure and recipes for upcoming and navigable features", () => {
  const upcoming = renderToStaticMarkup(createElement(FeatureCard, { title: "1v1 Head-to-Head", description: "Challenge a friend.", badge: "Coming soon" }));
  const destination = renderToStaticMarkup(createElement(FeatureCard, { title: "Beyond this week", description: "All-time rankings.", href: "/pace" }));
  for (const html of [upcoming, destination]) {
    expect(html).toContain('class="ui-feature-card"');
    expect(html).toMatch(/<h2[^>]*font-size:1.25rem/);
    expect(html).toMatch(/<p[^>]*font-size:1rem/);
  }
  expect(upcoming).toMatch(/^<section/);
  expect(destination).toMatch(/^<a/);
  expect(destination).toContain('href="/pace"');
});

 it("distinguishes a screen title from its subordinate sections without changing default sections", () => {
  const html = renderToStaticMarkup(createElement(Section, { title: "Your training", titleRole: "display", children: createElement(Section, { title: "Personal records", children: "Record" }) }));
  expect(html).toMatch(/<h1[^>]*font-size:2rem[^>]*>Your training<\/h1>/);
  expect(html).toMatch(/<h2[^>]*font-size:1.25rem[^>]*>Personal records<\/h2>/);
 });
