import { describe, expect, it } from "vitest";
import { validateAvatarFile } from "./avatar-upload";

describe("web avatar upload helpers", () => {
  it("accepts valid image files under 5MB", () => {
    const file = new File(["dummy content"], "avatar.jpg", {
      type: "image/jpeg",
    });
    expect(validateAvatarFile(file)).toBeNull();
  });

  it("rejects non-image files", () => {
    const file = new File(["dummy text"], "document.pdf", {
      type: "application/pdf",
    });
    expect(validateAvatarFile(file)).toBe(
      "Please select an image file (JPEG, PNG, WebP).",
    );
  });

  it("rejects files larger than 5MB", () => {
    const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)]);
    const file = new File([largeBlob], "huge.png", { type: "image/png" });
    expect(validateAvatarFile(file)).toBe(
      "Profile photo must be 5 MB or smaller.",
    );
  });
});
