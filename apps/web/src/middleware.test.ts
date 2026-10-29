import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { DEMO_USER_COOKIE, serializeDemoUserCookie } from "./lib/auth/design-access";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async (req: NextRequest) => {
    const { NextResponse } = await import("next/server");
    return NextResponse.next({ request: req });
  }),
  updateSessionAndGetUser: vi.fn(async (req: NextRequest) => {
    const { NextResponse } = await import("next/server");
    const mockEmail = req.headers.get("x-test-user-email");
    const user = mockEmail
      ? {
          id: "test-user-id",
          email: mockEmail,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }
      : null;
    return {
      response: NextResponse.next({ request: req }),
      user,
    };
  }),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("legacy tab redirects", () => {
    it("does not redirect the marketing home page", async () => {
      const req = new NextRequest("http://localhost:3000/");
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it("redirects /today to /app/today", async () => {
      const req = new NextRequest("http://localhost:3000/today");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/app/today");
    });

    it("redirects /board to /app/arena", async () => {
      const req = new NextRequest("http://localhost:3000/board");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/app/arena");
    });
  });

  describe("/design and /ux route restriction", () => {
    it("redirects unauthenticated visitor to /login with next param", async () => {
      const req = new NextRequest("http://localhost:3000/design/worlds?concept=flip");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe("/design/worlds?concept=flip");
    });

    it("redirects unauthenticated visitor to /login for /ux", async () => {
      const req = new NextRequest("http://localhost:3000/ux");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe("/ux");
    });

    it("allows Jerry Liu (3jerryliu@gmail.com) on local", async () => {
      const req = new NextRequest("http://localhost:3000/design/rally", {
        headers: {
          "x-test-user-email": "3jerryliu@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows Jerry Liu (3jerryliu@gmail.com) in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/design", {
        headers: {
          "x-test-user-email": "3jerryliu@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows demo account on local via demo cookie", async () => {
      const cookieValue = serializeDemoUserCookie({
        id: "demo-athlete",
        email: "alice@example.com",
        displayName: "Alice",
      });
      const req = new NextRequest("http://localhost:3000/design/spatial", {
        headers: {
          cookie: `${DEMO_USER_COOKIE}=${cookieValue}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects unauthorized signed-in user away to /today in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/design/home", {
        headers: {
          "x-test-user-email": "otherperson@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/app/today");
      expect(location.searchParams.get("denied")).toBe("design");
    });

    it("redirects unauthorized demo cookie in production to login", async () => {
      const cookieValue = serializeDemoUserCookie({
        id: "demo-fake",
        email: "3jerryliu@gmail.com",
      });
      const req = new NextRequest("https://fitness-battle-one.vercel.app/design", {
        headers: {
          cookie: `${DEMO_USER_COOKIE}=${cookieValue}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
    });

    it("intercepts and restricts design static asset requests from unauthenticated visitors", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/design/worlds/flip.png");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
    });

    it("intercepts obfuscated design paths like //design and /%64esign", async () => {
      const req1 = new NextRequest("http://localhost:3000//design/home");
      const res1 = await middleware(req1);
      expect(res1.status).toBe(307);
      expect(new URL(res1.headers.get("location")!).pathname).toBe("/login");

      const req2 = new NextRequest("http://localhost:3000/%64esign/worlds");
      const res2 = await middleware(req2);
      expect(res2.status).toBe(307);
      expect(new URL(res2.headers.get("location")!).pathname).toBe("/login");
    });
  });

  describe("/admin and /app/admin route restriction", () => {
    it("redirects unauthenticated visitors to /login", async () => {
      for (const [path, expectedNext] of [
        ["/admin", "/admin"],
        ["/app/admin", "/app/admin"],
        ["//admin", "//admin"],
        ["/%61dmin", "/%61dmin"],
        ["//app//admin/", "//app//admin/"],
      ]) {
        const res = await middleware(new NextRequest(`http://localhost:3000${path}`));
        expect(res.status).toBe(307);
        const loc = new URL(res.headers.get("location")!);
        expect(loc.pathname).toBe("/login");
        expect(loc.searchParams.get("next")).toBe(expectedNext);
      }
    });

    it("redirects signed-in non-admin user to /app/today?denied=admin", async () => {
      for (const path of ["/app/admin", "/admin"]) {
        const req = new NextRequest(`https://fitness-battle-one.vercel.app${path}`, {
          headers: { "x-test-user-email": "bob@example.com" },
        });
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const loc = new URL(res.headers.get("location")!);
        expect(loc.pathname).toBe("/app/today");
        expect(loc.searchParams.get("denied")).toBe("admin");
      }
    });

    it("handles authorized admins in production", async () => {
      for (const email of ["3jerryliu@gmail.com", "alice@example.com"]) {
        const direct = await middleware(new NextRequest("https://fitness-battle-one.vercel.app/app/admin", {
          headers: { "x-test-user-email": email },
        }));
        expect(direct.status).toBe(200);

        const redirect = await middleware(new NextRequest("https://fitness-battle-one.vercel.app/admin", {
          headers: { "x-test-user-email": email },
        }));
        expect(redirect.status).toBe(307);
        expect(new URL(redirect.headers.get("location")!).pathname).toBe("/app/admin");
      }

      const subpath = await middleware(new NextRequest("https://fitness-battle-one.vercel.app/admin/scenarios?target=123", {
        headers: { "x-test-user-email": "alice@example.com" },
      }));
      expect(subpath.status).toBe(307);
      const url = new URL(subpath.headers.get("location")!);
      expect(url.pathname).toBe("/app/admin/scenarios");
      expect(url.searchParams.get("target")).toBe("123");
    });

    it("handles demo cookies according to environment", async () => {
      const aliceCookie = serializeDemoUserCookie({ id: "demo-alice", email: "alice@example.com", displayName: "Alice" });
      const bobCookie = serializeDemoUserCookie({ id: "demo-bob", email: "bob@example.com", displayName: "Bob" });

      const localAdmin = await middleware(new NextRequest("http://localhost:3000/app/admin", { headers: { cookie: `${DEMO_USER_COOKIE}=${aliceCookie}` } }));
      expect(localAdmin.status).toBe(200);

      const localNonAdmin = await middleware(new NextRequest("http://localhost:3000/app/admin", { headers: { cookie: `${DEMO_USER_COOKIE}=${bobCookie}` } }));
      expect(localNonAdmin.status).toBe(307);
      expect(new URL(localNonAdmin.headers.get("location")!).pathname).toBe("/app/today");

      const prodDemo = await middleware(new NextRequest("https://fitness-battle-one.vercel.app/app/admin", { headers: { cookie: `${DEMO_USER_COOKIE}=${aliceCookie}` } }));
      expect(prodDemo.status).toBe(307);
      expect(new URL(prodDemo.headers.get("location")!).pathname).toBe("/login");
    });
  });
});
