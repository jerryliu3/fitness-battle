const encoder = new TextEncoder();

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeParams(
  params: Record<string, string>,
): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? "")}`)
    .join("&");
}

export function oauth1BaseString(
  method: string,
  url: string,
  params: Record<string, string>,
): string {
  const parsed = new URL(url);
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const query: Record<string, string> = { ...params };
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(normalizeParams(query)),
  ].join("&");
}

async function hmacSha1(key: string, text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("oauth1_crypto_unavailable");
  const cryptoKey = await subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", cryptoKey, encoder.encode(text));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function oauth1Nonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Authorization header for an OAuth 1.0a HMAC-SHA1 request. */
export async function oauth1AuthorizationHeader(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  extra: Record<string, string> = {},
): Promise<string> {
  const oauth: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: oauth1Nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extra,
  };
  if (credentials.token) oauth.oauth_token = credentials.token;
  const signature = await hmacSha1(
    `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret ?? "")}`,
    oauth1BaseString(method, url, oauth),
  );
  oauth.oauth_signature = signature;
  const header = Object.keys(oauth)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauth[key] ?? "")}"`)
    .join(", ");
  return `OAuth ${header}`;
}

export function parseOAuth1Body(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
