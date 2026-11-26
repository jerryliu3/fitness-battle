import { NextResponse } from "next/server";

const LATEST_MOBILE_VERSION = process.env.LATEST_MOBILE_VERSION || "0.4.0";
const IOS_STORE_URL = "itms-apps://apps.apple.com/app/id6822939070";

export function GET() {
  return NextResponse.json(
    {
      latestVersion: LATEST_MOBILE_VERSION,
      iosStoreUrl: IOS_STORE_URL,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
