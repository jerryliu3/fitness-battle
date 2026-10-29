import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_EMAILS,
  getAdminEmails,
  isAdminEmail,
  isAdminPath,
  isAuthorizedForAdmin,
  normalizeAdminPath,
} from "./admin-access";

describe("admin-access", () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ADMIN_EMAILS = originalEnv;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  });

  describe("isAdminEmail", () => {
    it("recognizes default admin emails case-insensitively and trimmed", () => {
      expect(isAdminEmail("3jerryliu@gmail.com")).toBe(true);
      expect(isAdminEmail("3JERRYLIU@GMAIL.COM")).toBe(true);
      expect(isAdminEmail("  3jerryliu@gmail.com  ")).toBe(true);

      expect(isAdminEmail("alice@example.com")).toBe(true);
      expect(isAdminEmail("ALICE@EXAMPLE.COM")).toBe(true);
      expect(isAdminEmail("  alice@example.com  ")).toBe(true);
    });

    it("rejects non-admin emails", () => {
      expect(isAdminEmail("bob@example.com")).toBe(false);
      expect(isAdminEmail("carla@example.com")).toBe(false);
      expect(isAdminEmail("random@example.com")).toBe(false);
      expect(isAdminEmail("jerry@gmail.com")).toBe(false);
      expect(isAdminEmail("")).toBe(false);
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it("supports additional emails configured via ADMIN_EMAILS environment variable", () => {
      process.env.ADMIN_EMAILS = "partner@domain.com, lead@overtaek.com ";
      expect(isAdminEmail("partner@domain.com")).toBe(true);
      expect(isAdminEmail("lead@overtaek.com")).toBe(true);
      expect(isAdminEmail("3jerryliu@gmail.com")).toBe(true);
      expect(isAdminEmail("alice@example.com")).toBe(true);
      expect(isAdminEmail("other@domain.com")).toBe(false);
    });
  });

  describe("normalizeAdminPath", () => {
    it("handles standard paths and cleans trailing slashes", () => {
      expect(normalizeAdminPath("/admin")).toBe("/admin");
      expect(normalizeAdminPath("/admin/")).toBe("/admin");
      expect(normalizeAdminPath("/app/admin")).toBe("/app/admin");
      expect(normalizeAdminPath("/app/admin/")).toBe("/app/admin");
      expect(normalizeAdminPath("/app/admin/subpath/")).toBe("/app/admin/subpath");
    });

    it("strips queries and hashes", () => {
      expect(normalizeAdminPath("/admin?foo=bar#section")).toBe("/admin");
      expect(normalizeAdminPath("/app/admin?target=123")).toBe("/app/admin");
    });

    it("collapses multiple slashes and decodes percent-encoding", () => {
      expect(normalizeAdminPath("//app//admin//")).toBe("/app/admin");
      expect(normalizeAdminPath("/%61dmin")).toBe("/admin");
      expect(normalizeAdminPath("/%61pp/%61dmin")).toBe("/app/admin");
    });
  });

  describe("isAdminPath", () => {
    it("matches /admin and /app/admin and their subpaths", () => {
      expect(isAdminPath("/admin")).toBe(true);
      expect(isAdminPath("/admin/")).toBe(true);
      expect(isAdminPath("/admin/scenarios")).toBe(true);
      expect(isAdminPath("/app/admin")).toBe(true);
      expect(isAdminPath("/app/admin/")).toBe(true);
      expect(isAdminPath("/app/admin/routes")).toBe(true);
      expect(isAdminPath("//admin")).toBe(true);
      expect(isAdminPath("//app/admin/")).toBe(true);
      expect(isAdminPath("/%61dmin")).toBe(true);
      expect(isAdminPath("/app/%61dmin")).toBe(true);
    });

    it("rejects non-admin paths and lookalikes", () => {
      expect(isAdminPath("/today")).toBe(false);
      expect(isAdminPath("/app/today")).toBe(false);
      expect(isAdminPath("/you")).toBe(false);
      expect(isAdminPath("/administrator")).toBe(false);
      expect(isAdminPath("/app/administrator")).toBe(false);
      expect(isAdminPath("/admin-dashboard")).toBe(false);
      expect(isAdminPath("")).toBe(false);
    });
  });

  describe("isAuthorizedForAdmin", () => {
    it("rejects unauthenticated/empty requests", () => {
      expect(isAuthorizedForAdmin({ email: null, isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: "", isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: undefined, isLocal: true })).toBe(false);
    });

    it("rejects authenticated non-admin users in any environment", () => {
      expect(
        isAuthorizedForAdmin({
          email: "bob@example.com",
          mode: "supabase",
          isLocal: false,
        }),
      ).toBe(false);
      expect(
        isAuthorizedForAdmin({
          email: "bob@example.com",
          mode: "demo",
          isLocal: true,
        }),
      ).toBe(false);
      expect(
        isAuthorizedForAdmin({
          email: "stranger@gmail.com",
          mode: "supabase",
          isLocal: true,
        }),
      ).toBe(false);
    });

    it("allows admin users in production with real Supabase sessions", () => {
      expect(
        isAuthorizedForAdmin({
          email: "3jerryliu@gmail.com",
          mode: "supabase",
          isLocal: false,
        }),
      ).toBe(true);
      expect(
        isAuthorizedForAdmin({
          email: "alice@example.com",
          mode: "supabase",
          isLocal: false,
        }),
      ).toBe(true);
    });

    it("rejects demo mode for admin emails in production", () => {
      expect(
        isAuthorizedForAdmin({
          email: "3jerryliu@gmail.com",
          mode: "demo",
          isLocal: false,
        }),
      ).toBe(false);
      expect(
        isAuthorizedForAdmin({
          email: "alice@example.com",
          mode: "demo",
          isLocal: false,
        }),
      ).toBe(false);
    });

    it("allows admin emails in local development with demo or supabase mode", () => {
      expect(
        isAuthorizedForAdmin({
          email: "3jerryliu@gmail.com",
          mode: "supabase",
          isLocal: true,
        }),
      ).toBe(true);
      expect(
        isAuthorizedForAdmin({
          email: "alice@example.com",
          mode: "demo",
          isLocal: true,
        }),
      ).toBe(true);
    });
  });
});
