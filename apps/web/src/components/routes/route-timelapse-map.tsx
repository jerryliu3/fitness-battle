"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  calculateRouteBounds,
  decodePolyline,
  type LngLat,
} from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import { RouteControlsHud } from "./route-controls-hud";
import { useRouteAnimation } from "./use-route-animation";
import {
  captureMapSnapshot,
  saveOrShareRecordedVideo,
  startCanvasVideoRecording,
} from "./video-export";

export interface RouteTimelapseMapProps {
  /** Array of [lng, lat] coordinates or an encoded polyline string */
  coordinates: LngLat[] | string;
  /** Camera mode: '3d-flyover' or '2d-overview'. Default: '3d-flyover' */
  mode?: "3d-flyover" | "2d-overview";
  /** Animation duration in milliseconds. Default: 12000 (12s) */
  durationMs?: number;
  /** Primary accent color for active line and GPS dot. Default: '#f7c948' (Focus Gold) */
  accentColor?: string;
  /** Whether to start flyover animation immediately on map load. Default: true */
  autoPlay?: boolean;
  /** Mapbox style URL or identifier. Default: 'mapbox://styles/mapbox/outdoors-v12' */
  mapStyle?: string;
  /** Optional token override; defaults to NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN */
  mapboxToken?: string;
  /** Container styling */
  className?: string;
  /** Optional callback fired when animation completes */
  onFinish?: () => void;
}

export function RouteTimelapseMap({
  coordinates,
  mode: initialMode = "3d-flyover",
  durationMs = 12000,
  accentColor = "#f7c948",
  autoPlay = true,
  mapStyle = "mapbox://styles/mapbox/outdoors-v12",
  mapboxToken,
  className = "",
  onFinish,
}: RouteTimelapseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mode, setMode] = useState<"3d-flyover" | "2d-overview">(initialMode);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<number | undefined>();
  const [tokenError, setTokenError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const activeToken = mapboxToken || webEnv.mapboxAccessToken;

  // Resolve raw coordinates
  const rawCoords: LngLat[] = useMemo(() => {
    if (typeof coordinates === "string") {
      return decodePolyline(coordinates);
    }
    return coordinates || [];
  }, [coordinates]);

  // Hook driving smooth 60fps timelapse, anti-jerk camera, and line trimming
  const {
    progress,
    isPlaying,
    isFinished,
    totalDistanceKm,
    currentDistanceKm,
    play,
    pause,
    replay,
    seek,
    applyFrame,
    transitionToOverview,
  } = useRouteAnimation({
    map: mapLoaded ? mapRef.current : null,
    coordinates: rawCoords,
    durationMs,
    autoPlay,
    mode,
    onFinish,
  });

  // Initialize Mapbox GL instance with preserveDrawingBuffer: true
  useEffect(() => {
    if (!containerRef.current || !activeToken || rawCoords.length < 2) {
      if (!activeToken) {
        setTokenError(true);
      }
      return;
    }

    setTokenError(false);
    mapboxgl.accessToken = activeToken;

    const startCoord = rawCoords[0];
    const initialBearing = 0;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: startCoord,
      zoom: 14.5,
      pitch: mode === "3d-flyover" ? 58 : 0,
      bearing: initialBearing,
      // CRITICAL for captureStream() video recording and toBlob() HD snapshots:
      preserveDrawingBuffer: true,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // 1. Add 3D Terrain DEM source
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });

      if (mode === "3d-flyover") {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 90.0],
            "sky-atmosphere-sun-intensity": 15,
          },
        });
      }

      // 2. Add full route GeoJSON source with lineMetrics: true (enables line-trim-offset)
      map.addSource("route-source", {
        type: "geojson",
        lineMetrics: true,
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: rawCoords,
          },
        },
      });

      // Layer 1: Muted full-route background line
      map.addLayer({
        id: "route-bg",
        type: "line",
        source: "route-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#142b3b",
          "line-width": 6,
          "line-opacity": 0.25,
        },
      });

      // Layer 2: Active route line animated with line-trim-offset
      map.addLayer({
        id: "route-active",
        type: "line",
        source: "route-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": accentColor,
          "line-width": 6,
          "line-opacity": 0.95,
          "line-trim-offset": [0, 0.0005],
        },
      });

      // Layer 3: Glowing Leading GPS Dot
      map.addSource("leader-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: startCoord,
          },
        },
      });

      // Outer glow circle
      map.addLayer({
        id: "leader-glow",
        type: "circle",
        source: "leader-source",
        paint: {
          "circle-radius": 13,
          "circle-color": accentColor,
          "circle-opacity": 0.4,
          "circle-blur": 0.6,
        },
      });

      // Inner crisp circle dot
      map.addLayer({
        id: "leader-dot",
        type: "circle",
        source: "leader-source",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": accentColor,
          "circle-stroke-width": 3,
        },
      });

      setMapLoaded(true);
    });

    map.on("error", (e) => {
      // Graceful error logging
      console.warn("Mapbox GL event notice:", e.error?.message || e);
    });

    return () => {
      setMapLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, [activeToken, mapStyle]);

  // Dynamically update route geometry on active map without destroying WebGL context
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || rawCoords.length < 2) return;

    const routeSource = map.getSource("route-source") as mapboxgl.GeoJSONSource | undefined;
    if (routeSource) {
      routeSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: rawCoords,
        },
      });
    }

    const leaderSource = map.getSource("leader-source") as mapboxgl.GeoJSONSource | undefined;
    if (leaderSource) {
      leaderSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: rawCoords[0],
        },
      });
    }

    const bounds = calculateRouteBounds(rawCoords);
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 60, duration: 900 },
    );
  }, [mapLoaded, rawCoords]);

  // Handle dynamic switching between 3D terrain and 2D overview
  const toggleMode = useCallback(() => {
    const nextMode = mode === "3d-flyover" ? "2d-overview" : "3d-flyover";
    setMode(nextMode);

    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (nextMode === "3d-flyover") {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
      if (!map.getLayer("sky")) {
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 90.0],
            "sky-atmosphere-sun-intensity": 15,
          },
        });
      }
      map.easeTo({ pitch: 58, duration: 800 });
    } else {
      map.setTerrain(null);
      if (map.getLayer("sky")) {
        map.removeLayer("sky");
      }
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [mode, mapLoaded]);

  // Video Recording Flow
  const handleExportVideo = useCallback(async () => {
    const map = mapRef.current;
    if (!map || isRecordingVideo) return;

    try {
      setIsRecordingVideo(true);
      pause();

      const canvas = map.getCanvas();
      const session = startCanvasVideoRecording(canvas);

      // Reset to start
      seek(0);
      setRecordingProgress(0);

      // Play through route with deterministic frame pacing for export
      const totalSteps = 120; // 120 frames
      const stepDuration = Math.max( durationMs / totalSteps, 30);

      for (let i = 0; i <= totalSteps; i++) {
        if (!isMountedRef.current) break;
        const t = i / totalSteps;
        applyFrame(t, false);
        setRecordingProgress(t);
        // Small delay to let WebGL composite each frame into the stream
        await new Promise((r) => setTimeout(r, stepDuration));
      }

      if (!isMountedRef.current) {
        await session.stop();
        return;
      }

      // Transition to final summary bounds
      transitionToOverview();
      setRecordingProgress(1);

      // Hold for 1 second on final overview framing as requested
      await new Promise((r) => setTimeout(r, 1000));

      const blob = await session.stop();
      await saveOrShareRecordedVideo(blob, `route-flyover-${Date.now()}`);
    } catch (err) {
      console.error("Video export encountered an error:", err);
    } finally {
      setIsRecordingVideo(false);
      setRecordingProgress(undefined);
    }
  }, [
    isRecordingVideo,
    pause,
    seek,
    applyFrame,
    transitionToOverview,
    durationMs,
  ]);

  // Instant HD Snapshot Flow
  const handleSnapImage = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const canvas = map.getCanvas();
      await captureMapSnapshot(canvas, `route-snapshot-${Date.now()}.png`);
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
    }
  }, []);

  return (
    <div
      className={`relative w-full h-[450px] sm:h-[540px] overflow-hidden rounded-2xl bg-[#142b3b] shadow-xl border border-[#e3e9e7]/30 ${className}`}
    >
      {/* Mapbox WebGL Canvas Container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Header Badges */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full bg-[#142b3b]/85 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-[#f7c948] animate-pulse" />
          <span>{mode === "3d-flyover" ? "3D Flyover Replay" : "2D Overview"}</span>
        </div>

        {totalDistanceKm > 0 && (
          <div className="rounded-full bg-[#142b3b]/85 px-3 py-1.5 font-mono text-xs font-medium text-white/90 shadow-md backdrop-blur-md">
            {totalDistanceKm.toFixed(1)} km total
          </div>
        )}
      </div>

      {/* Floating Mobile Control HUD */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-10">
          <RouteControlsHud
            isPlaying={isPlaying}
            isFinished={isFinished}
            progress={progress}
            currentDistanceKm={currentDistanceKm}
            totalDistanceKm={totalDistanceKm}
            mode={mode}
            isRecordingVideo={isRecordingVideo}
            recordingProgress={recordingProgress}
            onTogglePlay={isPlaying ? pause : play}
            onReplay={replay}
            onSeek={seek}
            onToggleMode={toggleMode}
            onExportVideo={handleExportVideo}
            onSnapImage={handleSnapImage}
          />
        </div>
      )}

      {/* Fallback configuration guidance if token is missing */}
      {tokenError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#142b3b]/95 text-white">
          <div className="w-12 h-12 rounded-full bg-[#f7c948]/20 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-[#f7c948]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Mapbox Access Token Needed</h3>
          <p className="mt-1 text-xs text-white/70 max-w-sm">
            To view interactive 3D terrain flyovers and satellite imagery, provide a Mapbox token via{" "}
            <code className="text-[#f7c948]">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> or pass the{" "}
            <code className="text-[#f7c948]">mapboxToken</code> prop.
          </p>
        </div>
      )}
    </div>
  );
}
