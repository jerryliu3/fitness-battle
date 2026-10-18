import { describe, expect, it } from "vitest";
import {
  buildLoginHref,
  buildSignupHref,
  resolveSafePostLoginPath,
} from "./login-redirect";

describe("login-redirect", () => {
  describe("resolveSafePostLoginPath", () => {
    it("defaults to /today when candidate path is empty or falsy", () => {
      expect(resolveSafePostLoginPath()).toBe("/today");
      expect(resolveSafePostLoginPath(null)).toBe("/today");
      expect(resolveSafePostLoginPath("")).toBe("/today");
      expect(resolveSafePostLoginPath("   ")).toBe("/today");
    });

    it("normalizes root '/' to '/today'", () => {
      expect(resolveSafePostLoginPath("/")).toBe("/today");
    });

    it("normalizes auth paths back to default /today", () => {
      expect(resolveSafePostLoginPath("/login")).toBe("/today");
      expect(resolveSafePostLoginPath("/login?next=/you")).toBe("/today");
      expect(resolveSafePostLoginPath("/signup")).toBe("/today");
      expect(resolveSafePostLoginPath("/signup?next=/today")).toBe("/today");
    });

    it("allows safe relative paths with query and hash", () => {
      expect(resolveSafePostLoginPath("/you")).toBe("/you");
      expect(resolveSafePostLoginPath("/arena?scene=focus")).toBe("/arena?scene=focus");
      expect(resolveSafePostLoginPath("/field#members")).toBe("/field#members");
      expect(resolveSafePostLoginPath("/design/worlds?concept=flip")).toBe(
        "/design/worlds?concept=flip",
      );
    });

    it("rejects open redirect attempts and falls back to /today", () => {
      expect(resolveSafePostLoginPath("https://evil.com")).toBe("/today");
      expect(resolveSafePostLoginPath("http://attacker.org/steal")).toBe("/today");
      expect(resolveSafePostLoginPath("//evil.com/hack")).toBe("/today");
      expect(resolveSafePostLoginPath("/\\evil.com")).toBe("/today");
      expect(resolveSafePostLoginPath("javascript:alert(1)")).toBe("/today");
    });
  });

  describe("buildLoginHref", () => {
    it("builds safe query string with normalized target", () => {
      expect(buildLoginHref("/you")).toBe("/login?next=%2Fyou");
      expect(buildLoginHref(null)).toBe("/login?next=%2Ftoday");
      expect(buildLoginHref("/")).toBe("/login?next=%2Ftoday");
      expect(buildLoginHref("https://evil.com")).toBe("/login?next=%2Ftoday");
    });
  });

  describe("buildSignupHref", () => {
    it("builds safe query string with normalized target", () => {
      expect(buildSignupHref("/you")).toBe("/signup?next=%2Fyou");
      expect(buildSignupHref(null)).toBe("/signup?next=%2Ftoday");
      expect(buildSignupHref("/")).toBe("/signup?next=%2Ftoday");
      expect(buildSignupHref("https://evil.com")).toBe("/signup?next=%2Ftoday");
    });
  });
});
