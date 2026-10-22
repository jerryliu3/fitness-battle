import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CrewRelay } from "./crew-relay";
const props={members:[{user_id:"a",display_name:"Maya",avatar_url:"https://example.com/maya.jpg"},{user_id:"b",display_name:"You"},{user_id:"c",display_name:"Leo"}],entries:[{user_id:"a",distance_m:32000,moving_sec:7200,session_count:4},{user_id:"b",distance_m:19200,moving_sec:5400,session_count:3},{user_id:"c",distance_m:24800,moving_sec:6000,session_count:3}],sport:"running" as const,format:"volume",previousDistanceM:100000,targetSessions:3,units:"metric" as const};
describe("dimensional crew ribbon",()=>{
 it("uses last week's distance as the visible finish and keeps each member directly selectable",()=>{
  const html=renderToStaticMarkup(createElement(CrewRelay,props));
  expect(html).toContain("Last week’s distance");expect(html).toContain("100.0 km");expect(html).toContain("24.0 km to match last week");expect(html.match(/class="crew-member-photo"/g)).toHaveLength(3);expect(html).toContain("linearGradient");expect(html).toContain("maya.jpg");
 });
 it("shows the true overflow and preserves a zero-contribution member's selector",()=>{
  const html=renderToStaticMarkup(createElement(CrewRelay,{...props,previousDistanceM:50000,members:[...props.members,{user_id:"d",display_name:"Sam"}]}));
  expect(html).toContain("26.0 km beyond last week");expect(html).toContain("Sam");expect(html).toContain("0.0 km");
 });
 it("does not turn missing history into an invented cooperative target",()=>{
  const html=renderToStaticMarkup(createElement(CrewRelay,{...props,format:"cooperative",previousDistanceM:null}));
  expect(html).toContain("Last-week comparison unavailable");expect(html).not.toContain("to match last week");
 });
});

it("uses the configured cooperative journey as its finish even without prior-week history",()=>{
 const html=renderToStaticMarkup(createElement(CrewRelay,{...props,format:"cooperative",previousDistanceM:null,targetDistanceM:100000}));
 expect(html).toContain("Shared distance target");expect(html).toContain("24.0 km to the target");expect(html).not.toContain("comparison unavailable");expect(html).toContain("stroke-dasharray");
});
