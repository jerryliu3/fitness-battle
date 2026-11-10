import { NextResponse } from "next/server";
import { competitionAuthorityDatabase } from "@/lib/competition-authority";
import type { EntryPassProvider, EntryPassStatus, EntryPassTier } from "@fitness-battle/shared";

interface RevenueCatWebhookEvent {
  api_version?: string;
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    store?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    original_transaction_id?: string;
    transaction_id?: string;
  };
}

function mapStoreToProvider(store?: string): EntryPassProvider {
  switch (store?.toUpperCase()) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "apple";
    case "PLAY_STORE":
      return "google";
    case "STRIPE":
      return "stripe";
    default:
      return "apple";
  }
}

function mapProductToTier(productId: string, eventType: string): EntryPassTier {
  if (
    eventType === "NON_RENEWING_PURCHASE" ||
    productId.includes("lifetime") ||
    productId.includes("4900")
  ) {
    return "lifetime_pass";
  }
  if (productId.includes("annual") || productId.includes("999")) {
    return "annual_pass";
  }
  return "monthly_pass";
}

export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedKey = process.env.REVENUECAT_WEBHOOK_AUTH_KEY?.trim();

  if (expectedKey && (!authHeader || authHeader.replace(/^Bearer\s+/i, "") !== expectedKey)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as RevenueCatWebhookEvent | null;
  if (!payload?.event?.type) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Handle RevenueCat Dashboard test connection ping
  if (payload.event.type === "TEST") {
    return NextResponse.json({ ok: true, test: true });
  }

  if (!payload.event.app_user_id) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const {
    type,
    app_user_id: userId,
    product_id: productId,
    store,
    purchased_at_ms: purchasedMs,
    expiration_at_ms: expirationMs,
    original_transaction_id: originalTxId,
    transaction_id: txId,
  } = payload.event;

  // Basic UUID verification for Supabase user_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    // Ignore anonymous RevenueCat IDs or non-UUID test events gracefully
    return NextResponse.json({ ok: true, ignored: "non_user_id" });
  }

  const tier = mapProductToTier(productId || "", type);
  const provider = mapStoreToProvider(store);

  let status: EntryPassStatus = "active";
  let cancelAtPeriodEnd = false;

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
      status = "active";
      cancelAtPeriodEnd = false;
      break;
    case "CANCELLATION":
      // A canceled subscription remains active until the end of its current paid period
      status = expirationMs && expirationMs > Date.now() ? "active" : "canceled";
      cancelAtPeriodEnd = true;
      break;
    case "EXPIRATION":
      status = "expired";
      break;
    case "BILLING_ISSUE":
      status = "past_due";
      break;
    default:
      // Other events (e.g. transfer, test) keep existing state
      break;
  }

  const expiresAt =
    tier === "lifetime_pass"
      ? null
      : expirationMs
      ? new Date(expirationMs).toISOString()
      : null;

  const currentPeriodStart = purchasedMs
    ? new Date(purchasedMs).toISOString()
    : new Date().toISOString();

  try {
    const db = competitionAuthorityDatabase();
    const { error } = await db.from("athlete_entitlements").upsert(
      {
        user_id: userId,
        tier,
        status,
        provider,
        product_id: productId || null,
        original_transaction_id: originalTxId || null,
        latest_transaction_id: txId || null,
        current_period_start: currentPeriodStart,
        expires_at: expiresAt,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json({ ok: false, error: "profile_not_found" }, { status: 404 });
      }
      console.error("RevenueCat webhook DB upsert failed:", error.message);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user_id: userId, status, tier });
  } catch (error) {
    console.error("RevenueCat webhook handler failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
