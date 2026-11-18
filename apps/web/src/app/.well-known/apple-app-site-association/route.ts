import { serverEnv } from "@/lib/env";

export function GET() {
  const appId = serverEnv.inviteAppleAppId;
  if (!appId) return new Response(null, { status: 404 });

  return Response.json({
    applinks: {
      details: [{ appIDs: [appId], components: [{ "/": "/invite" }] }],
    },
  });
}
