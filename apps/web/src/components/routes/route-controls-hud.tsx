"use client";

import { typographyStyle } from "../../ui/section";

import React from "react";
import type { RouteReplaySample } from "@fitness-battle/shared";

export interface RouteControlsHudProps {
  replaySample?: RouteReplaySample | null;
  hasReplaySamples?: boolean;
  isPlaying: boolean;
  isFinished: boolean;
  progress: number; // 0 to 1
  currentDistanceKm: number;
  totalDistanceKm: number;
  mode: "3d-flyover" | "2d-overview";
  units?: "us" | "metric";
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
  replaySample,
  hasReplaySamples = false,
  isPlaying,
  isFinished,
  progress,
  currentDistanceKm,
  totalDistanceKm,
  mode,
  units = "metric",
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
  const factor = units === "us" ? 1 / 1.609344 : 1;
  const distanceUnit = units === "us" ? "mi" : "km";

  return (
    <div
      className={`route-controls pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#142b3b]/90 p-3 shadow-2xl backdrop-blur-md text-white transition-all ${className}`}
    >
      {hasReplaySamples && <div className="route-recorded-metrics" aria-label="Recorded measurements at the replay position">
        <span><small>Recorded time</small><b>{replaySample ? `${Math.floor(replaySample.elapsedSec / 60)}:${String(Math.floor(replaySample.elapsedSec) % 60).padStart(2, "0")}` : "—"}</b></span>
        <span><small>Speed</small><b>{replaySample?.speedMps != null ? `${(replaySample.speedMps * (units === "us" ? 2.236936 : 3.6)).toFixed(1)} ${units === "us" ? "mph" : "km/h"}` : "—"}</b></span>
        <span><small>Heart rate</small><b>{replaySample?.heartRate != null ? `${Math.round(replaySample.heartRate)} bpm` : "—"}</b></span>
        <span><small>Cadence</small><b>{replaySample?.cadence != null ? `${Math.round(replaySample.cadence)} ${replaySample.cadenceUnit}` : "—"}</b></span>
      </div>}
      {/* Controls row: Play Button, 2D/3D Dropdown, Scrubber, and Distance Readout */}
      <div className="flex items-center gap-2.5 px-1">
        {/* Play/Pause or Replay button */}
        <button
          type="button"
          onClick={isFinished ? onReplay : onTogglePlay}
          disabled={isRecordingVideo}
          aria-label={isFinished ? "Replay timelapse" : isPlaying ? "Pause timelapse" : "Play timelapse"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f7c948] text-[#142b3b] shadow transition-transform active:scale-95 hover:bg-[#ffe380] disabled:opacity-50"
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

        {/* 2D vs 3D dropdown beside the play button */}
        <div className="relative shrink-0">
          <select
            value={mode}
            disabled={isRecordingVideo}
            onChange={(e) => {
              const next = e.target.value as "2d-overview" | "3d-flyover";
              if (next !== mode) onToggleMode();
            }}
            aria-label="Replay perspective"
            className="h-10 cursor-pointer appearance-none rounded-xl border border-white/20 bg-white/10 pl-2.5 pr-6 text-xs font-bold text-white shadow-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#f7c948]"
          >
            <option value="2d-overview" className="bg-[#142b3b] text-white">2D View</option>
            <option value="3d-flyover" className="bg-[#142b3b] text-white">3D Flyover</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/70">▼</span>
        </div>

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
            className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-white/20 accent-[#f7c948] disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ "--route-progress": `${percent}%` } as React.CSSProperties}
          />
        </div>

        {/* Distance metric */}
        <div className="shrink-0 text-right text-white/90" style={typographyStyle("caption")}>
          <span className=" text-[#f7c948]" style={typographyStyle("label")}>
            {(currentDistanceKm * factor).toFixed(1)}
          </span>
          <span className="text-white/50"> / {(totalDistanceKm * factor).toFixed(1)} {distanceUnit}</span>
        </div>
      </div>

      {/* Bottom row: Mode Toggle, Video Export & HD Snapshot buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 " style={typographyStyle("caption")}>
        {/* 2D / 3D Mode Toggle Pill */}
        <div className="flex items-center rounded-xl bg-white/10 p-0.5">
          <button
            type="button"
            aria-pressed={mode === "2d-overview"}
            onClick={mode === "2d-overview" ? undefined : onToggleMode}
            disabled={isRecordingVideo}
            className={`min-h-11 rounded-lg px-2.5 py-1  transition-colors ${
              mode === "2d-overview"
                ? "bg-[#f7c948] text-[#142b3b] shadow-sm "
                : "text-white/70 hover:text-white"
            }`} style={typographyStyle("label")}
          >
            2D
          </button>
          <button
            type="button"
            aria-pressed={mode === "3d-flyover"}
            onClick={mode === "3d-flyover" ? undefined : onToggleMode}
            disabled={isRecordingVideo}
            className={`min-h-11 rounded-lg px-2.5 py-1  transition-colors ${
              mode === "3d-flyover"
                ? "bg-[#f7c948] text-[#142b3b] shadow-sm "
                : "text-white/70 hover:text-white"
            }`} style={typographyStyle("label")}
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
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5  text-white/90 transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50" style={typographyStyle("label")}
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
            className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-1.5  transition-all active:scale-95 ${
              isRecordingVideo
                ? "bg-red-500/90 text-white animate-pulse cursor-wait"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
            }`} style={typographyStyle("label")}
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
