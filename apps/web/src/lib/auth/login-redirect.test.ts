import { describe, expect, it } from "vitest";
import {
  buildLoginHref,
  buildSignupHref,
  resolveSafePostLoginPath,
} from "./login-redirect";

describe("login-redirect", () => {
  describe("resolveSafePostLoginPath", () => {
    it("defaults to /app/today when candidate path is empty or falsy", () => {
      expect(resolveSafePostLoginPath()).toBe("/app/today");
      expect(resolveSafePostLoginPath(null)).toBe("/app/today");
      expect(resolveSafePostLoginPath("")).toBe("/app/today");
      expect(resolveSafePostLoginPath("   ")).toBe("/app/today");
    });

    it("normalizes root '/' to '/app/today'", () => {
      expect(resolveSafePostLoginPath("/")).toBe("/app/today");
    });

    it("normalizes auth paths back to default /app/today", () => {
      expect(resolveSafePostLoginPath("/login")).toBe("/app/today");
      expect(resolveSafePostLoginPath("/login?next=/you")).toBe("/app/today");
      expect(resolveSafePostLoginPath("/signup")).toBe("/app/today");
      expect(resolveSafePostLoginPath("/signup?next=/today")).toBe("/app/today");
    });

    it("allows safe relative paths with query and hash under /app", () => {
      expect(resolveSafePostLoginPath("/you")).toBe("/app/you");
      expect(resolveSafePostLoginPath("/arena?scene=focus")).toBe(
        "/app/arena?scene=focus",
      );
      expect(resolveSafePostLoginPath("/field#members")).toBe("/app/field#members");
      expect(resolveSafePostLoginPath("/design/worlds?concept=flip")).toBe(
        "/design/worlds?concept=flip",
      );
      expect(resolveSafePostLoginPath("/support")).toBe("/support");
      expect(resolveSafePostLoginPath("/support#delete-account")).toBe(
        "/support#delete-account",
      );
    });

    it("rejects open redirect attempts and falls back to /app/today", () => {
      expect(resolveSafePostLoginPath("https://evil.com")).toBe("/app/today");
      expect(resolveSafePostLoginPath("http://attacker.org/steal")).toBe("/app/today");
      expect(resolveSafePostLoginPath("//evil.com/hack")).toBe("/app/today");
      expect(resolveSafePostLoginPath("/\\evil.com")).toBe("/app/today");
      expect(resolveSafePostLoginPath("javascript:alert(1)")).toBe("/app/today");
    });
  });

  describe("buildLoginHref", () => {
    it("builds safe query string with normalized target", () => {
      expect(buildLoginHref("/you")).toBe("/login?next=%2Fapp%2Fyou");
      expect(buildLoginHref(null)).toBe("/login?next=%2Fapp%2Ftoday");
      expect(buildLoginHref("/")).toBe("/login?next=%2Fapp%2Ftoday");
      expect(buildLoginHref("https://evil.com")).toBe("/login?next=%2Fapp%2Ftoday");
    });
  });

  describe("buildSignupHref", () => {
    it("builds safe query string with normalized target", () => {
      expect(buildSignupHref("/you")).toBe("/signup?next=%2Fapp%2Fyou");
      expect(buildSignupHref(null)).toBe("/signup?next=%2Fapp%2Ftoday");
      expect(buildSignupHref("/")).toBe("/signup?next=%2Fapp%2Ftoday");
      expect(buildSignupHref("https://evil.com")).toBe("/signup?next=%2Fapp%2Ftoday");
    });
  });
});
