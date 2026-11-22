"use client";

import { typographyStyle } from "../../ui/section";

import React from "react";

export interface RouteControlsHudProps {
  isPlaying: boolean;
  isFinished: boolean;
  progress: number; // 0 to 1
  currentDistanceKm: number;
  totalDistanceKm: number;
  units?: "us" | "metric";
  isRecordingVideo: boolean;
  recordingProgress?: number; // 0 to 1
  onTogglePlay: () => void;
  onReplay: () => void;
  onSeek: (progress: number) => void;
  onExportVideo: () => void;
  className?: string;
}

export function RouteControlsHud({
  isPlaying,
  isFinished,
  progress,
  currentDistanceKm,
  totalDistanceKm,
  units = "metric",
  isRecordingVideo,
  recordingProgress,
  onTogglePlay,
  onReplay,
  onSeek,
  onExportVideo,
  className = "",
}: RouteControlsHudProps) {
  const percent = Math.round(progress * 100);
  const factor = units === "us" ? 1 / 1.609344 : 1;
  const distanceUnit = units === "us" ? "mi" : "km";

  return (
    <div
      className={`route-controls pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#142b3b]/90 p-2.5 shadow-2xl backdrop-blur-md text-white transition-all ${className}`}
    >
      {/* Single controls row: Play Button, Scrubber, Distance Readout, Export Video */}
      <div className="flex items-center gap-2">
        {/* Play/Pause or Replay button */}
        <button
          type="button"
          onClick={isFinished ? onReplay : onTogglePlay}
          disabled={isRecordingVideo}
          aria-label={isFinished ? "Replay timelapse" : isPlaying ? "Pause timelapse" : "Play timelapse"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--app-action-primary)] text-[#142b3b] shadow transition-transform active:scale-95 hover:bg-[#ffe380] disabled:opacity-50"
        >
          {isFinished ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : isPlaying ? (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Interactive Progress Scrubber */}
        <div className="relative flex-1 min-w-0 flex flex-col justify-center">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            disabled={isRecordingVideo}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Route timelapse scrubber"
            className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-white/20 accent-[var(--app-action-primary)] disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ "--route-progress": `${percent}%` } as React.CSSProperties}
          />
        </div>

        {/* Distance metric */}
        <div className="route-controls-distance shrink-0 text-right text-white/90 tabular-nums" style={typographyStyle("caption")}>
          <span style={typographyStyle("label")}>
            {(currentDistanceKm * factor).toFixed(1)}
          </span>
          <span className="text-white/50"> / {(totalDistanceKm * factor).toFixed(1)} {distanceUnit}</span>
        </div>

        {/* Export Video button */}
        <button
          type="button"
          onClick={onExportVideo}
          disabled={isRecordingVideo}
          aria-label="Export Video"
          className={`route-controls-export flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-all active:scale-95 ${
            isRecordingVideo
              ? "bg-red-500/90 text-white animate-pulse cursor-wait"
              : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
          }`}
          style={typographyStyle("label")}
        >
          {isRecordingVideo ? (
            <>
              <span className="h-2 w-2 rounded-full bg-red-200 animate-ping" />
              <span>
                Recording {recordingProgress !== undefined ? `${Math.round(recordingProgress * 100)}%` : "..."}
              </span>
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Export</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
