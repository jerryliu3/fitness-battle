"use client";

import React from "react";

export interface RouteControlsHudProps {
  isPlaying: boolean;
  isFinished: boolean;
  progress: number; // 0 to 1
  currentDistanceKm: number;
  totalDistanceKm: number;
  mode: "3d-flyover" | "2d-overview";
  isRecordingVideo: boolean;
  recordingProgress?: number; // 0 to 1
  onTogglePlay: () => void;
  onReplay: () => void;
  onSeek: (progress: number) => void;
  onToggleMode: () => void;
  onExportVideo: () => void;
  onSnapImage: () => void;
  className?: string;
}

export function RouteControlsHud({
  isPlaying,
  isFinished,
  progress,
  currentDistanceKm,
  totalDistanceKm,
  mode,
  isRecordingVideo,
  recordingProgress,
  onTogglePlay,
  onReplay,
  onSeek,
  onToggleMode,
  onExportVideo,
  onSnapImage,
  className = "",
}: RouteControlsHudProps) {
  const percent = Math.round(progress * 100);

  return (
    <div
      className={`pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#142b3b]/90 p-3 shadow-2xl backdrop-blur-md text-white transition-all ${className}`}
    >
      {/* Top row: Scrubber and Distance Readout */}
      <div className="flex items-center gap-3 px-1">
        {/* Play/Pause or Replay button */}
        <button
          type="button"
          onClick={isFinished ? onReplay : onTogglePlay}
          disabled={isRecordingVideo}
          aria-label={isFinished ? "Replay timelapse" : isPlaying ? "Pause timelapse" : "Play timelapse"}
          className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[#f7c948] text-[#142b3b] shadow transition-transform active:scale-95 hover:bg-[#ffe380] disabled:opacity-50"
        >
          {isFinished ? (
            // Replay icon
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : isPlaying ? (
            // Pause icon
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg className="h-4 w-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Interactive Progress Scrubber */}
        <div className="relative flex-1 flex flex-col justify-center">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            disabled={isRecordingVideo}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Route timelapse scrubber"
            className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-white/20 accent-[#f7c948] disabled:cursor-not-allowed focus:outline-none"
            style={{
              background: `linear-gradient(to right, #f7c948 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`,
            }}
          />
        </div>

        {/* Distance metric */}
        <div className="shrink-0 text-right font-mono text-xs text-white/90">
          <span className="font-semibold text-[#f7c948]">
            {currentDistanceKm.toFixed(1)}
          </span>
          <span className="text-white/50"> / {totalDistanceKm.toFixed(1)} km</span>
        </div>
      </div>

      {/* Bottom row: Mode Toggle, Video Export & HD Snapshot buttons */}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
        {/* 2D / 3D Mode Toggle Pill */}
        <div className="flex items-center rounded-xl bg-white/10 p-0.5">
          <button
            type="button"
            onClick={mode === "2d-overview" ? undefined : onToggleMode}
            disabled={isRecordingVideo}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              mode === "2d-overview"
                ? "bg-[#f7c948] text-[#142b3b] shadow-sm font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={mode === "3d-flyover" ? undefined : onToggleMode}
            disabled={isRecordingVideo}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              mode === "3d-flyover"
                ? "bg-[#f7c948] text-[#142b3b] shadow-sm font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            3D Flyover
          </button>
        </div>

        {/* Action Buttons: Snap & Export */}
        <div className="flex items-center gap-2">
          {/* Snap Image button */}
          <button
            type="button"
            onClick={onSnapImage}
            disabled={isRecordingVideo}
            title="Capture Instant HD Snapshot"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 font-medium text-white/90 transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50"
          >
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
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="hidden sm:inline">Snap</span>
          </button>

          {/* Export Video button */}
          <button
            type="button"
            onClick={onExportVideo}
            disabled={isRecordingVideo}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all active:scale-95 ${
              isRecordingVideo
                ? "bg-red-500/90 text-white animate-pulse cursor-wait"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
            }`}
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
                  className="h-3.5 w-3.5 text-[#f7c948]"
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
                <span>Export Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
