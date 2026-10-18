/** Decode picker JPEG bytes without relying on browser-only Blob/FileReader APIs. */
export function decodePhoto(base64: string): ArrayBuffer {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  )
    throw new Error("Could not read that photo.");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((base64.length / 4) * 3 - padding);
  for (let i = 0, out = 0; i < base64.length; i += 4) {
    const value =
      (chars.indexOf(base64[i]) << 18) |
      (chars.indexOf(base64[i + 1]) << 12) |
      (Math.max(0, chars.indexOf(base64[i + 2])) << 6) |
      Math.max(0, chars.indexOf(base64[i + 3]));
    for (const shift of [16, 8, 0])
      if (out < bytes.length) bytes[out++] = (value >> shift) & 255;
  }
  return bytes.buffer;
}
