export const maxDuration = 60;

import { receiveGarminPush } from "@/lib/garmin-push-handler";

export async function POST(request: Request) {
  return receiveGarminPush(request, new URL(request.url).searchParams.get("key"));
}
