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
    // Mock user can be controlled via header for test purposes
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
      // Status 200 (NextResponse.next)
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
      // In production, demo cookie is ignored; user is treated as unauthenticated
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
    it("redirects unauthenticated visitor to /login with next param for /admin", async () => {
      const req = new NextRequest("http://localhost:3000/admin");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe("/admin");
    });

    it("redirects unauthenticated visitor to /login with next param for /app/admin", async () => {
      const req = new NextRequest("http://localhost:3000/app/admin");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe("/app/admin");
    });

    it("redirects unauthenticated visitor to /login for obfuscated admin paths", async () => {
      const req1 = new NextRequest("http://localhost:3000//admin");
      const res1 = await middleware(req1);
      expect(res1.status).toBe(307);
      expect(new URL(res1.headers.get("location")!).pathname).toBe("/login");

      const req2 = new NextRequest("http://localhost:3000/%61dmin");
      const res2 = await middleware(req2);
      expect(res2.status).toBe(307);
      expect(new URL(res2.headers.get("location")!).pathname).toBe("/login");

      const req3 = new NextRequest("http://localhost:3000//app//admin/");
      const res3 = await middleware(req3);
      expect(res3.status).toBe(307);
      expect(new URL(res3.headers.get("location")!).pathname).toBe("/login");
    });

    it("redirects signed-in non-admin user away to /app/today?denied=admin for /app/admin", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/app/admin", {
        headers: {
          "x-test-user-email": "bob@example.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/app/today");
      expect(location.searchParams.get("denied")).toBe("admin");
    });

    it("redirects signed-in non-admin user away to /app/today?denied=admin for /admin", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/admin", {
        headers: {
          "x-test-user-email": "stranger@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/app/today");
      expect(location.searchParams.get("denied")).toBe("admin");
    });

    it("allows 3jerryliu@gmail.com on /app/admin in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/app/admin", {
        headers: {
          "x-test-user-email": "3jerryliu@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects 3jerryliu@gmail.com from /admin to /app/admin in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/admin", {
        headers: {
          "x-test-user-email": "3jerryliu@gmail.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/app/admin");
    });

    it("allows alice@example.com on /app/admin in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/app/admin", {
        headers: {
          "x-test-user-email": "alice@example.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects alice@example.com from /admin to /app/admin in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/admin", {
        headers: {
          "x-test-user-email": "alice@example.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/app/admin");
    });

    it("redirects alice@example.com from /admin/scenarios to /app/admin/scenarios in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app/admin/scenarios?target=123", {
        headers: {
          "x-test-user-email": "alice@example.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const url = new URL(res.headers.get("location")!);
      expect(url.pathname).toBe("/app/admin/scenarios");
      expect(url.searchParams.get("target")).toBe("123");
    });

    it("redirects alice@example.com from //admin to /app/admin in production", async () => {
      const req = new NextRequest("https://fitness-battle-one.vercel.app//admin", {
        headers: {
          "x-test-user-email": "alice@example.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/app/admin");
    });

    it("allows alice@example.com on local via demo cookie", async () => {
      const cookieValue = serializeDemoUserCookie({
        id: "demo-alice",
        email: "alice@example.com",
        displayName: "Alice",
      });
      const req = new NextRequest("http://localhost:3000/app/admin", {
        headers: {
          cookie: `${DEMO_USER_COOKIE}=${cookieValue}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("rejects non-admin demo cookie (bob@example.com) on local", async () => {
      const cookieValue = serializeDemoUserCookie({
        id: "demo-bob",
        email: "bob@example.com",
        displayName: "Bob",
      });
      const req = new NextRequest("http://localhost:3000/app/admin", {
        headers: {
          cookie: `${DEMO_USER_COOKIE}=${cookieValue}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/app/today");
      expect(location.searchParams.get("denied")).toBe("admin");
    });

    it("rejects demo cookie for admin email in production and redirects to login", async () => {
      const cookieValue = serializeDemoUserCookie({
        id: "fake-admin",
        email: "alice@example.com",
      });
      const req = new NextRequest("https://fitness-battle-one.vercel.app/app/admin", {
        headers: {
          cookie: `${DEMO_USER_COOKIE}=${cookieValue}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
    });
  });
});

