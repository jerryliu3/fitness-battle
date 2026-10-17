import { describe, expect, it } from "vitest";
import {
  DEMO_USER_COOKIE,
  isAuthorizedForDesign,
  isDemoAccount,
  isDesignOrUxPath,
  isLocalEnvironment,
  isLocalHost,
  isOwnerEmail,
  LOCAL_DEMO_EMAILS,
  OWNER_EMAIL,
  parseDemoUserFromCookie,
  serializeDemoUserCookie,
} from "./design-access";

describe("design-access", () => {
  describe("isOwnerEmail", () => {
    it("recognizes 3jerryliu@gmail.com regardless of case or whitespace", () => {
      expect(isOwnerEmail("3jerryliu@gmail.com")).toBe(true);
      expect(isOwnerEmail("3JERRYLIU@GMAIL.COM")).toBe(true);
      expect(isOwnerEmail("  3jerryliu@gmail.com  ")).toBe(true);
    });

    it("rejects non-owner emails and falsy inputs", () => {
      expect(isOwnerEmail("jerry@gmail.com")).toBe(false);
      expect(isOwnerEmail("other@example.com")).toBe(false);
      expect(isOwnerEmail("")).toBe(false);
      expect(isOwnerEmail(null)).toBe(false);
      expect(isOwnerEmail(undefined)).toBe(false);
    });
  });

  describe("isDemoAccount", () => {
    it("accepts mode: 'demo'", () => {
      expect(isDemoAccount({ email: "anyone@domain.com", mode: "demo" })).toBe(true);
    });

    it("accepts seeded demo accounts from LOCAL_DEMO_EMAILS", () => {
      for (const email of LOCAL_DEMO_EMAILS) {
        expect(isDemoAccount({ email, mode: "supabase" })).toBe(true);
      }
    });

    it("accepts demo-patterned emails", () => {
      expect(isDemoAccount({ email: "tester@example.com" })).toBe(true);
      expect(isDemoAccount({ email: "runner@demo.local" })).toBe(true);
      expect(isDemoAccount({ email: "demo@domain.com" })).toBe(true);
      expect(isDemoAccount({ email: "demo-user@domain.com" })).toBe(true);
      expect(isDemoAccount({ email: "test+demo@domain.com" })).toBe(true);
    });

    it("rejects non-demo normal emails even if they contain 'demo' as a substring", () => {
      expect(isDemoAccount({ email: "pandemonium@gmail.com", mode: "supabase" })).toBe(false);
      expect(isDemoAccount({ email: "academy@domain.com", mode: "supabase" })).toBe(false);
      expect(isDemoAccount({ email: "stranger@gmail.com", mode: "supabase" })).toBe(false);
      expect(isDemoAccount({ email: "runner@yahoo.com" })).toBe(false);
      expect(isDemoAccount({ email: "" })).toBe(false);
      expect(isDemoAccount({})).toBe(false);
    });
  });

  describe("isDesignOrUxPath", () => {
    it("matches /design and its subpaths", () => {
      expect(isDesignOrUxPath("/design")).toBe(true);
      expect(isDesignOrUxPath("/design/")).toBe(true);
      expect(isDesignOrUxPath("/design/worlds")).toBe(true);
      expect(isDesignOrUxPath("/design/rally")).toBe(true);
      expect(isDesignOrUxPath("/design/home")).toBe(true);
      expect(isDesignOrUxPath("/design/evolution?brand=volt")).toBe(true);
    });

    it("normalizes consecutive slashes and URL-encoded characters", () => {
      expect(isDesignOrUxPath("//design")).toBe(true);
      expect(isDesignOrUxPath("///design/worlds")).toBe(true);
      expect(isDesignOrUxPath("/%64esign/rally")).toBe(true);
      expect(isDesignOrUxPath("/DESIGN/HOME")).toBe(true);
      expect(isDesignOrUxPath("//ux/test")).toBe(true);
    });

    it("matches /ux and its subpaths", () => {
      expect(isDesignOrUxPath("/ux")).toBe(true);
      expect(isDesignOrUxPath("/ux/")).toBe(true);
      expect(isDesignOrUxPath("/ux/prototype")).toBe(true);
    });

    it("matches /api/design and /api/ux", () => {
      expect(isDesignOrUxPath("/api/design")).toBe(true);
      expect(isDesignOrUxPath("/api/design/specs")).toBe(true);
      expect(isDesignOrUxPath("/api/ux")).toBe(true);
    });

    it("does not match unrelated paths or prefixes", () => {
      expect(isDesignOrUxPath("/today")).toBe(false);
      expect(isDesignOrUxPath("/arena")).toBe(false);
      expect(isDesignOrUxPath("/you")).toBe(false);
      expect(isDesignOrUxPath("/design-system")).toBe(false);
      expect(isDesignOrUxPath("/ux-preview")).toBe(false);
      expect(isDesignOrUxPath("")).toBe(false);
    });
  });

  describe("isLocalHost", () => {
    it("identifies localhost and loopbacks", () => {
      expect(isLocalHost("localhost")).toBe(true);
      expect(isLocalHost("localhost:3000")).toBe(true);
      expect(isLocalHost("127.0.0.1")).toBe(true);
      expect(isLocalHost("127.0.0.1:54321")).toBe(true);
      expect(isLocalHost("::1")).toBe(true);
      expect(isLocalHost("[::1]:3000")).toBe(true);
      expect(isLocalHost("dev.local")).toBe(true);
    });

    it("rejects public hosts", () => {
      expect(isLocalHost("fitnessbattle.com")).toBe(false);
      expect(isLocalHost("fitness-battle-one.vercel.app")).toBe(false);
      expect(isLocalHost("")).toBe(false);
      expect(isLocalHost(null)).toBe(false);
    });
  });

  describe("isLocalEnvironment", () => {
    it("returns false for Vercel production deployment", () => {
      expect(
        isLocalEnvironment({
          hostname: "localhost",
          vercelEnv: "production",
        }),
      ).toBe(false);
    });

    it("returns false when running on Vercel preview or production", () => {
      expect(
        isLocalEnvironment({
          hostname: "localhost",
          isVercel: "1",
        }),
      ).toBe(false);
      expect(
        isLocalEnvironment({
          hostname: "fitness-battle-git-test.vercel.app",
          vercelEnv: "preview",
        }),
      ).toBe(false);
    });

    it("returns true in development and test", () => {
      expect(isLocalEnvironment({ nodeEnv: "development" })).toBe(true);
      expect(isLocalEnvironment({ nodeEnv: "test" })).toBe(true);
    });

    it("returns true for localhost hostname in production-mode local run", () => {
      expect(
        isLocalEnvironment({
          hostname: "localhost:3000",
          nodeEnv: "production",
          vercelEnv: undefined,
        }),
      ).toBe(true);
    });

    it("returns false for remote production hostname", () => {
      expect(
        isLocalEnvironment({
          hostname: "fitness-battle-one.vercel.app",
          nodeEnv: "production",
          vercelEnv: undefined,
        }),
      ).toBe(false);

    });
  });

  describe("isAuthorizedForDesign", () => {
    describe("in Production (isLocal = false)", () => {
      const isLocal = false;

      it("allows Jerry Liu via Supabase auth", () => {
        expect(
          isAuthorizedForDesign({
            email: OWNER_EMAIL,
            mode: "supabase",
            isLocal,
          }),
        ).toBe(true);
      });

      it("strictly disallows Jerry Liu with demo mode in production (prevents spoofing)", () => {
        expect(
          isAuthorizedForDesign({
            email: OWNER_EMAIL,
            mode: "demo",
            isLocal,
          }),
        ).toBe(false);
      });

      it("disallows demo accounts in production", () => {
        expect(
          isAuthorizedForDesign({
            email: "alice@example.com",
            mode: "supabase",
            isLocal,
          }),
        ).toBe(false);
        expect(
          isAuthorizedForDesign({
            email: "alice@example.com",
            mode: "demo",
            isLocal,
          }),
        ).toBe(false);
      });

      it("disallows other signed-in users in production", () => {
        expect(
          isAuthorizedForDesign({
            email: "stranger@gmail.com",
            mode: "supabase",
            isLocal,
          }),
        ).toBe(false);
      });

      it("disallows empty/missing email", () => {
        expect(isAuthorizedForDesign({ email: null, isLocal })).toBe(false);
        expect(isAuthorizedForDesign({ email: "", isLocal })).toBe(false);
      });
    });

    describe("on Local (isLocal = true)", () => {
      const isLocal = true;

      it("allows Jerry Liu", () => {
        expect(
          isAuthorizedForDesign({
            email: OWNER_EMAIL,
            mode: "supabase",
            isLocal,
          }),
        ).toBe(true);
        expect(
          isAuthorizedForDesign({
            email: OWNER_EMAIL,
            mode: "demo",
            isLocal,
          }),
        ).toBe(true);
      });

      it("allows seeded demo accounts", () => {
        expect(
          isAuthorizedForDesign({
            email: "alice@example.com",
            mode: "supabase",
            isLocal,
          }),
        ).toBe(true);
        expect(
          isAuthorizedForDesign({
            email: "bob@example.com",
            mode: "supabase",
            isLocal,
          }),
        ).toBe(true);
      });

      it("allows demo mode accounts", () => {
        expect(
          isAuthorizedForDesign({
            email: "local-tester@anything.com",
            mode: "demo",
            isLocal,
          }),
        ).toBe(true);
      });

      it("disallows non-demo, non-owner users", () => {
        expect(
          isAuthorizedForDesign({
            email: "stranger@gmail.com",
            mode: "supabase",
            isLocal,
          }),
        ).toBe(false);
      });

      it("disallows unauthenticated access", () => {
        expect(isAuthorizedForDesign({ email: null, isLocal })).toBe(false);
        expect(isAuthorizedForDesign({ email: "", isLocal })).toBe(false);
      });
    });
  });

  describe("demo cookie serialization", () => {
    it("roundtrips user object safely", () => {
      const user = {
        id: "demo-1234",
        email: "3jerryliu@gmail.com",
        displayName: "Jerry",
      };
      const cookie = serializeDemoUserCookie(user);
      const parsed = parseDemoUserFromCookie(cookie);
      expect(parsed).toEqual({
        id: "demo-1234",
        email: "3jerryliu@gmail.com",
        displayName: "Jerry",
        mode: "demo",
      });
    });

    it("returns null on malformed cookie", () => {
      expect(parseDemoUserFromCookie(null)).toBeNull();
      expect(parseDemoUserFromCookie("invalid-json")).toBeNull();
      expect(parseDemoUserFromCookie(encodeURIComponent(JSON.stringify({})))).toBeNull();
    });
  });
});
