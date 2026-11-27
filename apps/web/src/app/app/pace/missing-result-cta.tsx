"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Sheet } from "@/ui/sheet";
import { AppParagraph } from "@/ui/section";
import { playCue } from "@/lib/haptics";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;
const DIRECT_MAX_BASE64_LEN = 2_400_000;
const HARD_MAX_BASE64_LEN = 3_400_000;
const MAX_DIMENSION = 1800;

interface ImagePayload {
  filename: string;
  contentType: string;
  contentBase64: string;
  previewUrl: string;
}

function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function compressDataUrlToJpeg(dataUrl: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Could not load that image."));
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process that image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

async function prepareImageAttachment(file: File): Promise<ImagePayload> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error("Image file is too large (15 MB max before compression).");
  }

  let dataUrl = await readDataUrl(file);
  let contentType = file.type;
  let filename = file.name || "missing-result.png";
  let base64 = dataUrl.split(",")[1] ?? "";

  if (base64.length > DIRECT_MAX_BASE64_LEN) {
    dataUrl = await compressDataUrlToJpeg(dataUrl, 0.85);
    base64 = dataUrl.split(",")[1] ?? "";
    if (base64.length > HARD_MAX_BASE64_LEN) {
      dataUrl = await compressDataUrlToJpeg(dataUrl, 0.7);
      base64 = dataUrl.split(",")[1] ?? "";
    }
    contentType = "image/jpeg";
    filename = filename.replace(/\.[^.]+$/, "") + ".jpg";
  }

  if (!base64 || base64.length > HARD_MAX_BASE64_LEN) {
    throw new Error("Image is too large. Please choose a smaller screenshot (under 2.5 MB).");
  }

  return {
    filename,
    contentType,
    contentBase64: base64,
    previewUrl: dataUrl,
  };
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 12,
  font: "inherit",
};

export function MissingResultCta({
  surface,
  defaultRace = "",
}: {
  surface: "observatory" | "replay";
  defaultRace?: string;
}) {
  const [open, setOpen] = useState(false);
  const [athleteName, setAthleteName] = useState("");
  const [race, setRace] = useState("");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedLink = link.trim();
  const hasValidLink = isValidHttpUrl(trimmedLink);
  const linkInvalid = trimmedLink.length > 0 && !hasValidLink;
  const hasProof = hasValidLink || image !== null;
  const canSubmit =
    athleteName.trim().length >= 2 &&
    race.trim().length >= 2 &&
    !linkInvalid &&
    hasProof;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageBusy(true);
    setError("");
    try {
      const prepared = await prepareImageAttachment(file);
      setImage(prepared);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach that image.");
      void playCue("error");
    } finally {
      setImageBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || imageBusy) return;
    if (!hasProof) {
      setError("Provide a results link or upload an image of the result.");
      return;
    }
    if (linkInvalid) {
      setError("Enter a valid http:// or https:// results link.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rankings/missing-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteName,
          race,
          details,
          link: trimmedLink || undefined,
          image: image
            ? {
                filename: image.filename,
                contentType: image.contentType,
                contentBase64: image.contentBase64,
              }
            : undefined,
          name,
          email,
          website,
          surface,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "We couldn't send your report. Please try again.");
      }
      setSent(true);
      setAthleteName("");
      setDetails("");
      setLink("");
      setImage(null);
      void playCue("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your report. Please try again.");
      void playCue("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="ovt-request-race-wrap">
      <button
        type="button"
        className="ovt-btn primary ovt-request-race-btn"
        title="Missing a finisher's result? Send a link or screenshot to support."
        onClick={() => {
          setSent(false);
          setError("");
          if (!race.trim() && defaultRace) setRace(defaultRace);
          setOpen(true);
        }}
      >
        Report missing result
      </button>
      <span className="ovt-request-race-hint">Missing a result?</span>

      <Sheet
        open={open}
        title="Report missing result"
        body="Tell us who is missing and include either an official results link or a screenshot/photo."
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        {sent ? (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <AppParagraph typographyRole="body" className="fb-note" role="status">
              Report sent to support. Thanks — we&apos;ll review it and follow up on the missing result.
            </AppParagraph>
            <button type="button" className="fb-btn" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`missing-athlete-${surface}`}>Athlete name</label>
                <input
                  id={`missing-athlete-${surface}`}
                  type="text"
                  minLength={2}
                  maxLength={120}
                  required
                  placeholder="Full name on race results"
                  style={inputStyle}
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`missing-race-${surface}`}>Race &amp; year</label>
                <input
                  id={`missing-race-${surface}`}
                  type="text"
                  minLength={2}
                  maxLength={200}
                  required
                  placeholder="e.g. Chicago Marathon 2025"
                  style={inputStyle}
                  value={race}
                  onChange={(e) => setRace(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor={`missing-link-${surface}`}>Official results link (link or image required)</label>
              <input
                id={`missing-link-${surface}`}
                type="url"
                maxLength={1000}
                placeholder="https://results.example.com/..."
                style={inputStyle}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={busy}
              />
              {linkInvalid ? (
                <small style={{ color: "var(--status-error, #b91c1c)" }}>
                  Enter a full URL starting with https:// or http://
                </small>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <span>Result screenshot or photo (link or image required)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={handleFileChange}
              />
              {image ? (
                <div className="ovt-missing-image-preview">
                  <img src={image.previewUrl} alt="Selected result screenshot" />
                  <div className="ovt-missing-image-meta">
                    <span>{image.filename}</span>
                    <button
                      type="button"
                      className="ovt-btn quiet"
                      onClick={() => setImage(null)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="ovt-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy || imageBusy}
                  >
                    {imageBusy ? "Loading image…" : "Upload image"}
                  </button>
                  <small style={{ color: "var(--ovt-muted)" }}>
                    PNG, JPEG, WebP, or GIF
                  </small>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor={`missing-details-${surface}`}>Details (optional)</label>
              <textarea
                id={`missing-details-${surface}`}
                placeholder="Bib number, finish time, division, or anything else helpful"
                style={{ ...inputStyle, padding: 12, resize: "vertical" }}
                rows={3}
                maxLength={1500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                disabled={busy}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`missing-name-${surface}`}>Your name (optional)</label>
                <input
                  id={`missing-name-${surface}`}
                  type="text"
                  maxLength={120}
                  placeholder="Your name"
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`missing-email-${surface}`}>Email (optional)</label>
                <input
                  id={`missing-email-${surface}`}
                  type="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {!hasProof && !error ? (
              <small style={{ color: "var(--ovt-muted)" }}>
                Add either a results link or an image to submit.
              </small>
            ) : null}

            {error ? (
              <AppParagraph typographyRole="body" className="fb-error" role="alert">
                {error}
              </AppParagraph>
            ) : null}

            <button type="submit" className="fb-btn" disabled={busy || imageBusy || !canSubmit}>
              {busy ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </Sheet>
    </span>
  );
}
