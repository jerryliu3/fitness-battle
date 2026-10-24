import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { RouteControlsHud } from "./route-controls-hud";
import { getPreferredMediaRecorderMimeType } from "./video-export";

describe("RouteControlsHud", () => {
  it("renders controls and handles play, pause, replay, and seek", async () => {
    const onTogglePlay = vi.fn();
    const onReplay = vi.fn();
    const onSeek = vi.fn();
    const onToggleMode = vi.fn();
    const onExportVideo = vi.fn();
    const onSnapImage = vi.fn();

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(RouteControlsHud, {
          isPlaying: true,
          isFinished: false,
          progress: 0.45,
          currentDistanceKm: 3.8,
          totalDistanceKm: 8.4,
          mode: "3d-flyover",
          isRecordingVideo: false,
          onTogglePlay,
          onReplay,
          onSeek,
          onToggleMode,
          onExportVideo,
          onSnapImage,
        }),
      );
    });

    // 1. Check scrubber slider
    const slider = renderer!.root.findByType("input");
    expect(slider.props.value).toBe(0.45);
    await act(async () => {
      slider.props.onChange({ target: { value: "0.75" } });
    });
    expect(onSeek).toHaveBeenCalledWith(0.75);

    // 2. Check play/pause toggle button
    const playBtn = renderer!.root.findByProps({ "aria-label": "Pause timelapse" });
    await act(async () => {
      playBtn.props.onClick();
    });
    expect(onTogglePlay).toHaveBeenCalledTimes(1);

    // 3. Check 2D / 3D mode switch
    const mode2dBtn = renderer!.root.findByProps({ children: "2D" });
    await act(async () => {
      mode2dBtn.props.onClick();
    });
    expect(onToggleMode).toHaveBeenCalledTimes(1);

    // 4. Check snap image button
    const snapBtn = renderer!.root.findByProps({ title: "Capture Instant HD Snapshot" });
    await act(async () => {
      snapBtn.props.onClick();
    });
    expect(onSnapImage).toHaveBeenCalledTimes(1);

    // 5. Check export video button
    const exportBtn = renderer!.root.findByProps({ children: "Export Video" });
    await act(async () => {
      exportBtn.parent?.props.onClick();
    });
    expect(onExportVideo).toHaveBeenCalledTimes(1);
  });

  it("shows recording state and replay button when finished", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(RouteControlsHud, {
          isPlaying: false,
          isFinished: true,
          progress: 1.0,
          currentDistanceKm: 8.4,
          totalDistanceKm: 8.4,
          mode: "3d-flyover",
          isRecordingVideo: true,
          recordingProgress: 0.65,
          onTogglePlay: vi.fn(),
          onReplay: vi.fn(),
          onSeek: vi.fn(),
          onToggleMode: vi.fn(),
          onExportVideo: vi.fn(),
          onSnapImage: vi.fn(),
        }),
      );
    });

    // Replay button when finished
    const replayBtn = renderer!.root.findByProps({ "aria-label": "Replay timelapse" });
    expect(replayBtn).toBeDefined();

    // Recording status badge
    const spans = renderer!.root.findAllByType("span");
    const recordingSpan = spans.find((s) => {
      const c = s.props.children;
      return Array.isArray(c) ? c.join("").includes("Recording") : typeof c === "string" && c.includes("Recording");
    });
    expect(recordingSpan).toBeDefined();
  });
});

describe("video-export", () => {
  it("detects preferred MediaRecorder mime type gracefully in node/vitest", () => {
    const mime = getPreferredMediaRecorderMimeType();
    expect(typeof mime).toBe("string");
  });
});
