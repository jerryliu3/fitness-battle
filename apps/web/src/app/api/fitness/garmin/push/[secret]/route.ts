export const maxDuration = 60;

import { receiveGarminPush } from "@/lib/garmin-push-handler";

export async function POST(request: Request, context: { params: Promise<{ secret: string }> }) {
  const { secret } = await context.params;
  return receiveGarminPush(request, secret);
}
