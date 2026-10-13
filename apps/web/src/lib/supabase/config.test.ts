import { describe, expect, it } from "vitest";
import { isSupabaseConfigured } from "./config";

describe("isSupabaseConfigured", () => {
  it("rejects placeholder local defaults", () => {
    expect(
      isSupabaseConfigured("http://127.0.0.1:54321", "public-anon-key"),
    ).toBe(false);
    expect(
      isSupabaseConfigured("https://example.supabase.co", "your-anon-key"),
    ).toBe(false);
  });

  it("accepts hosted projects with publishable or JWT-shaped anon keys", () => {
    expect(
      isSupabaseConfigured(
        "https://pxruixccvrykhbjzjqga.supabase.co",
        "sb_publishable_qDgv-txtSFPU4VatDc1CGQ_2SwG-Po9",
      ),
    ).toBe(true);
    expect(
      isSupabaseConfigured(
        "https://example.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature",
      ),
    ).toBe(true);
  });

  it("accepts local Supabase only with a real-looking anon key", () => {
    expect(
      isSupabaseConfigured(
        "http://127.0.0.1:54321",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature",
      ),
    ).toBe(true);
  });
});
