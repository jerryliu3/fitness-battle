"use client";

import { typographyStyle } from "../../ui/section";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./routes.css";
import {
  normalizeRouteReplay, routeReplayAt, type RouteReplaySample,
  calculateRouteBounds,
  decodePolyline,
  type LngLat,
} from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import { RouteStaticPreview } from "./route-static-preview";
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
  routeReplay?: RouteReplaySample[];
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
  units?: "us" | "metric";
  onFinish?: () => void;
  onUnavailable?: () => void;
}

export function RouteTimelapseMap({
  coordinates,
  routeReplay,
  mode: initialMode = "3d-flyover",
  durationMs = 12000,
  accentColor = "#f7c948",
  autoPlay = true,
  mapStyle = "mapbox://styles/mapbox/outdoors-v12",
  mapboxToken,
  className = "",
  onFinish,
  units = "metric",
  onUnavailable,
}: RouteTimelapseMapProps) {
  const replaySamples = useMemo(() => normalizeRouteReplay(routeReplay), [routeReplay]);
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
      setTokenError(true);
      onUnavailable?.();
      return;
    }

    setTokenError(false);
    mapboxgl.accessToken = activeToken;

    const startCoord = rawCoords[0];
    const initialBearing = 0;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapStyle,
        center: startCoord,
        zoom: 14.5,
        pitch: mode === "3d-flyover" ? 58 : 0,
        bearing: initialBearing,
        // CRITICAL for captureStream() video recording and toBlob() HD snapshots:
        preserveDrawingBuffer: true,
        antialias: true,
        attributionControl: true,
      });

    } catch {
      setTokenError(true);
      onUnavailable?.();
      return;
    }
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(containerRef.current);
    const timeout = window.setTimeout(() => {
      if (!map.loaded()) { setTokenError(true); onUnavailable?.(); }
    }, 15000);

    map.on("load", () => {
      window.clearTimeout(timeout);
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
          "line-trim-offset": autoPlay ? [0, 1] : [1, 1],
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
      window.clearTimeout(timeout);
      resize.disconnect();
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
      { padding: { top: 60, bottom: 160, left: 40, right: 40 }, duration: 0 },
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

  const activeSample = routeReplayAt(replaySamples, progress);

  return (
    <div
      className={`route-ui relative w-full h-[450px] sm:h-[540px] overflow-hidden rounded-2xl bg-[#142b3b] shadow-xl border border-[#e3e9e7]/30 ${className}`}
    >
      {/* Mapbox WebGL Canvas Container */}
      <div ref={containerRef} className="h-full w-full" />
      {!mapLoaded && !tokenError && (
        <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#142b3b] text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/20 border-t-[#f7c948]" />
          <span className="text-white/90" style={typographyStyle("label")}>Loading route map…</span>
        </div>
      )}

      {/* Floating Header Metadata HUD */}
      {replaySamples.length > 0 ? (
        <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex justify-center">
          <div className="route-recorded-metrics pointer-events-auto w-full rounded-2xl border border-white/10 bg-[#142b3b]/90 px-4 py-2.5 shadow-2xl backdrop-blur-md text-white" aria-label="Recorded measurements at the replay position">
            <span><small>Recorded time</small><b>{activeSample ? `${Math.floor(activeSample.elapsedSec / 60)}:${String(Math.floor(activeSample.elapsedSec) % 60).padStart(2, "0")}` : "—"}</b></span>
            <span><small>Speed</small><b>{activeSample?.speedMps != null ? `${(activeSample.speedMps * (units === "us" ? 2.236936 : 3.6)).toFixed(1)} ${units === "us" ? "mph" : "km/h"}` : "—"}</b></span>
            <span><small>Heart rate</small><b>{activeSample?.heartRate != null ? `${Math.round(activeSample.heartRate)} bpm` : "—"}</b></span>
            <span><small>Cadence</small><b>{activeSample?.cadence != null ? `${Math.round(activeSample.cadence)} ${activeSample.cadenceUnit || "spm"}` : "—"}</b></span>
          </div>
        </div>
      ) : null}

      {/* Floating Mobile Control HUD */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-10">
          <RouteControlsHud
            isPlaying={isPlaying}
            isFinished={isFinished}
            progress={progress}
            replaySample={activeSample}
            hasReplaySamples={false}
            currentDistanceKm={currentDistanceKm}
            totalDistanceKm={totalDistanceKm}
            mode={mode}
            units={units}
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

      {tokenError && <div className="absolute inset-0 bg-[#142b3b]">
        <RouteStaticPreview coordinates={rawCoords} showPlayBadge={false} mapboxToken="" strokeColor="f7c948" className="h-full" />
        <p role="status" className="absolute top-4 left-4 right-4 rounded-xl bg-[#142b3b] p-3  text-white" style={typographyStyle("caption")}>Route outline only. Interactive maps and flyovers are currently unavailable.</p>
      </div>}
    </div>
  );
}
