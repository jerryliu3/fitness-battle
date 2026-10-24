"use client";

/**
 * Probe client MediaRecorder support to prefer AVC1/H.264 MP4 on Safari/iOS
 * and VP9 WebM on Chrome/Android.
 */
export function getPreferredMediaRecorderMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidateTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const candidate of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    } catch {
      // Continue probing
    }
  }
  return "";
}

/**
 * Capture an instant HD snapshot PNG from the Mapbox WebGL canvas.
 * (Requires preserveDrawingBuffer: true on map initialization).
 */
export async function captureMapSnapshot(
  canvas: HTMLCanvasElement,
  filename?: string,
): Promise<void> {
  const actualFilename = filename || `route-snapshot-${Date.now()}.png`;

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned empty blob"));
          return;
        }

        const file = new File([blob], actualFilename, { type: "image/png" });

        // Native / mobile Web Share API with files
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: "Route HD Snapshot",
              text: "Check out my route view on Everyday Club!",
            });
            resolve();
            return;
          } catch (err: unknown) {
            // User cancelled share or aborted, fallback to download
            if (err instanceof Error && err.name === "AbortError") {
              resolve();
              return;
            }
          }
        }

        // Browser direct download fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = actualFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

export interface VideoRecorderSession {
  stop: () => Promise<Blob>;
}

/**
 * Start recording the WebGL canvas at 60fps using MediaRecorder.
 */
export function startCanvasVideoRecording(
  canvas: HTMLCanvasElement,
): VideoRecorderSession {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not supported in this environment");
  }

  // Capture canvas stream at 60 frames per second
  const stream = canvas.captureStream(60);
  const mimeType = getPreferredMediaRecorderMimeType();

  const options: MediaRecorderOptions = {
    videoBitsPerSecond: 8_000_000, // 8 Mbps high-definition capture
  };
  if (mimeType) {
    options.mimeType = mimeType;
  }

  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start(100); // 100ms slice interval

  return {
    stop: () => {
      return new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          // Release camera/stream tracks to avoid memory leaks
          try {
            stream.getTracks().forEach((track) => track.stop());
          } catch {
            // Ignore
          }
          const actualMime = recorder.mimeType || mimeType || "video/webm";
          const blob = new Blob(chunks, { type: actualMime });
          resolve(blob);
        };
        recorder.onerror = (e) => {
          try {
            stream.getTracks().forEach((track) => track.stop());
          } catch {
            // Ignore
          }
          reject(e);
        };
        try {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        } catch (err) {
          reject(err);
        }
      });
    },
  };
}

/**
 * Trigger download or mobile share for a recorded video blob.
 */
export async function saveOrShareRecordedVideo(
  blob: Blob,
  baseFilename = `route-timelapse-${Date.now()}`,
): Promise<void> {
  const isMp4 = blob.type.includes("mp4");
  const ext = isMp4 ? "mp4" : "webm";
  const filename = `${baseFilename}.${ext}`;
  const file = new File([blob], filename, { type: blob.type });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "GPS Route Timelapse",
        text: "Check out my 3D route replay on Everyday Club!",
      });
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
    }
  }

  // Browser download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
