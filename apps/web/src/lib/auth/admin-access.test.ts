import { afterEach, describe, expect, it } from "vitest";
import {
  isAdminEmail,
  isAdminPath,
  isAuthorizedForAdmin,
  normalizeAdminPath,
} from "./admin-access";

describe("admin-access", () => {
  const originalEnv = process.env.ADMIN_EMAILS;
  afterEach(() => {
    if (originalEnv !== undefined) process.env.ADMIN_EMAILS = originalEnv;
    else delete process.env.ADMIN_EMAILS;
  });

  describe("isAdminEmail", () => {
    it("recognizes default admin emails case-insensitively and trimmed", () => {
      for (const email of ["3jerryliu@gmail.com", "3JERRYLIU@GMAIL.COM", "  3jerryliu@gmail.com  ", "alice@example.com", "ALICE@EXAMPLE.COM", "  alice@example.com  "]) {
        expect(isAdminEmail(email)).toBe(true);
      }
    });

    it("rejects non-admin emails and invalid inputs", () => {
      for (const email of ["bob@example.com", "carla@example.com", "random@example.com", "jerry@gmail.com", "", null, undefined]) {
        expect(isAdminEmail(email)).toBe(false);
      }
    });

    it("supports additional emails configured via ADMIN_EMAILS environment variable", () => {
      process.env.ADMIN_EMAILS = "partner@domain.com, lead@overtaek.com ";
      expect(isAdminEmail("partner@domain.com")).toBe(true);
      expect(isAdminEmail("lead@overtaek.com")).toBe(true);
      expect(isAdminEmail("other@domain.com")).toBe(false);
    });
  });

  describe("normalizeAdminPath & isAdminPath", () => {
    it("normalizes and identifies admin paths", () => {
      expect(normalizeAdminPath("/admin/")).toBe("/admin");
      expect(normalizeAdminPath("/app/admin?target=123#hash")).toBe("/app/admin");
      expect(normalizeAdminPath("//app//admin//")).toBe("/app/admin");
      expect(normalizeAdminPath("/%61dmin")).toBe("/admin");

      for (const path of ["/admin", "/admin/", "/admin/scenarios", "/app/admin", "/app/admin/", "/app/admin/routes", "//admin", "//app/admin/", "/%61dmin", "/app/%61dmin"]) {
        expect(isAdminPath(path)).toBe(true);
      }
      for (const path of ["/today", "/app/today", "/you", "/administrator", "/app/administrator", "/admin-dashboard", ""]) {
        expect(isAdminPath(path)).toBe(false);
      }
    });
  });

  describe("isAuthorizedForAdmin", () => {
    it("rejects unauthenticated/empty or non-admin requests", () => {
      expect(isAuthorizedForAdmin({ email: null, isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: "", isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: "bob@example.com", mode: "supabase", isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: "bob@example.com", mode: "demo", isLocal: true })).toBe(false);
    });

    it("allows admin users in production with real Supabase sessions", () => {
      expect(isAuthorizedForAdmin({ email: "3jerryliu@gmail.com", mode: "supabase", isLocal: false })).toBe(true);
      expect(isAuthorizedForAdmin({ email: "alice@example.com", mode: "supabase", isLocal: false })).toBe(true);
    });

    it("rejects demo mode for admin emails in production", () => {
      expect(isAuthorizedForAdmin({ email: "3jerryliu@gmail.com", mode: "demo", isLocal: false })).toBe(false);
      expect(isAuthorizedForAdmin({ email: "alice@example.com", mode: "demo", isLocal: false })).toBe(false);
    });

    it("allows admin emails in local development with demo or supabase mode", () => {
      expect(isAuthorizedForAdmin({ email: "3jerryliu@gmail.com", mode: "supabase", isLocal: true })).toBe(true);
      expect(isAuthorizedForAdmin({ email: "alice@example.com", mode: "demo", isLocal: true })).toBe(true);
    });
  });
});
