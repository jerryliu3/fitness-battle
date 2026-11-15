"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as turf from "@turf/turf";
import {
  calculateRouteBounds,
  lerp,
  lerpAngle,
  type LngLat,
} from "@fitness-battle/shared";
import type mapboxgl from "mapbox-gl";

export interface UseRouteAnimationOptions {
  map: mapboxgl.Map | null;
  coordinates: LngLat[];
  durationMs?: number;
  autoPlay?: boolean;
  mode: "3d-flyover" | "2d-overview";
  leaderMarker?: mapboxgl.Marker | null;
  hudInsets?: { top: number; bottom: number };
  onFinish?: () => void;
}

interface RouteDistanceTable {
  coordinates: LngLat[];
  cumDistKm: number[];
  totalDistKm: number;
}

const HUD_SYNC_INTERVAL_MS = 65;

function buildDistanceTable(coordinates: LngLat[]): RouteDistanceTable | null {
  if (!coordinates || coordinates.length < 2) return null;
  const cumDistKm = new Array<number>(coordinates.length);
  cumDistKm[0] = 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += turf.distance(coordinates[i - 1], coordinates[i], { units: "kilometers" });
    cumDistKm[i] = total;
  }
  return { coordinates, cumDistKm, totalDistKm: total };
}

function sampleTableAtDistance(table: RouteDistanceTable, distKm: number): LngLat {
  const { coordinates, cumDistKm, totalDistKm } = table;
  if (distKm <= 0 || totalDistKm <= 0) return coordinates[0];
  if (distKm >= totalDistKm) return coordinates[coordinates.length - 1];

  let lo = 0;
  let hi = cumDistKm.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cumDistKm[mid] <= distKm) lo = mid;
    else hi = mid;
  }

  const segStart = cumDistKm[lo];
  const segLen = cumDistKm[hi] - segStart;
  if (segLen <= 1e-9) return coordinates[lo];
  const ratio = (distKm - segStart) / segLen;
  const a = coordinates[lo];
  const b = coordinates[hi];
  return [lerp(a[0], b[0], ratio), lerp(a[1], b[1], ratio)];
}

export function useRouteAnimation({
  map,
  coordinates,
  durationMs = 12000,
  autoPlay = true,
  mode,
  leaderMarker = null,
  hudInsets,
  onFinish,
}: UseRouteAnimationOptions) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const progressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastHudSyncRef = useRef<number>(0);

  // Camera damping state
  const smoothedBearingRef = useRef<number>(0);
  const smoothedCenterRef = useRef<LngLat | null>(null);
  const smoothedPitchRef = useRef<number>(mode === "3d-flyover" ? 52 : 0);
  const userZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map || typeof map.on !== "function" || typeof map.off !== "function") return;
    const trackZoom = (e: { type: string; originalEvent?: unknown }) => {
      if (e.originalEvent && typeof map.getZoom === "function") {
        userZoomRef.current = map.getZoom();
      }
    };
    map.on("zoom", trackZoom);
    map.on("zoomend", trackZoom);
    return () => {
      map.off("zoom", trackZoom);
      map.off("zoomend", trackZoom);
    };
  }, [map]);

  // Precomputed cumulative-distance lookup table
  const routeTableRef = useRef<RouteDistanceTable | null>(null);
  const totalDistanceKm = useRef<number>(0);

  useEffect(() => {
    const table = buildDistanceTable(coordinates);
    routeTableRef.current = table;
    totalDistanceKm.current = table?.totalDistKm ?? 0;

    if (!table) return;

    const initialBearing = turf.bearing(
      coordinates[0],
      sampleTableAtDistance(table, Math.min(0.25, table.totalDistKm)),
    );
    smoothedBearingRef.current = initialBearing;
    smoothedCenterRef.current = coordinates[0];
    smoothedPitchRef.current = mode === "3d-flyover" ? 52 : 0;

    progressRef.current = 0;
    setProgress(0);
    setIsFinished(false);

    if (autoPlay) {
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [coordinates, autoPlay]);

  const applyFrame = useCallback(
    (t: number, instantJump = true, dtSec = 1 / 60, forceLeaderSource = false) => {
      const table = routeTableRef.current;
      if (!map || !table || table.totalDistKm <= 0) return;

      const totalDist = table.totalDistKm;
      const currentDist = Math.max(0, Math.min(1, t)) * totalDist;

      // 1. O(log N) exact interpolated position along route
      const [targetLng, targetLat] = sampleTableAtDistance(table, currentDist);

      // 2. Gentle chord lookahead bearing (both 3D and 2D follow runner POV)
      let targetBearing = smoothedBearingRef.current;
      if (totalDist > 0.02) {
        const backDist = Math.max(0, currentDist - 0.05);
        const lookDist = Math.min(totalDist, Math.max(backDist + 0.06, currentDist + 0.3));
        const backPoint = sampleTableAtDistance(table, backDist);
        const lookPoint = sampleTableAtDistance(table, lookDist);
        targetBearing = turf.bearing(backPoint, lookPoint);
      }

      const targetPitch = mode === "3d-flyover" ? 52 : 0;
      const clampedDt = Math.max(0.001, Math.min(0.05, dtSec));
      const centerAlpha = instantJump ? 1 - Math.exp(-6.5 * clampedDt) : 1;
      const bearingAlpha = instantJump ? 1 - Math.exp(-2.4 * clampedDt) : 1;
      const pitchAlpha = instantJump ? 1 - Math.exp(-5.0 * clampedDt) : 1;

      if (smoothedCenterRef.current) {
        smoothedCenterRef.current = [
          lerp(smoothedCenterRef.current[0], targetLng, centerAlpha),
          lerp(smoothedCenterRef.current[1], targetLat, centerAlpha),
        ];
        smoothedBearingRef.current = lerpAngle(
          smoothedBearingRef.current,
          targetBearing,
          bearingAlpha,
        );
        smoothedPitchRef.current = lerp(
          smoothedPitchRef.current,
          targetPitch,
          pitchAlpha,
        );
      } else {
        smoothedCenterRef.current = [targetLng, targetLat];
        smoothedBearingRef.current = targetBearing;
        smoothedPitchRef.current = targetPitch;
      }

      // 3. Synchronous active trail trim via WebGL line-trim-offset
      if (map.getLayer("route-active")) {
        const trimEnd = Math.max(0.0005, Math.min(1.0, t));
        map.setPaintProperty("route-active", "line-trim-offset", [trimEnd, 1]);
      }

      // 4. Update leader dot: synchronous DOM marker for live playback (no worker lag),
      //    GeoJSON source only during video export or headless fallback.
      if (leaderMarker && !forceLeaderSource) {
        leaderMarker.setLngLat([targetLng, targetLat]);
      } else {
        const leaderSource = map.getSource("leader-source") as mapboxgl.GeoJSONSource | undefined;
        if (leaderSource) {
          leaderSource.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [targetLng, targetLat],
            },
          });
        }
      }

      // 5. Synchronous frame-locked camera update (never overrides user zoom)
      map.jumpTo({
        center: smoothedCenterRef.current,
        bearing: smoothedBearingRef.current,
        pitch: smoothedPitchRef.current,
      });
    },
    [map, mode, leaderMarker],
  );

  const transitionToOverview = useCallback(() => {
    if (!map || !coordinates || coordinates.length < 2) return;
    const bounds = calculateRouteBounds(coordinates);
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      {
        padding: hudInsets
          ? { top: hudInsets.top + 16, bottom: hudInsets.bottom + 20, left: 40, right: 40 }
          : { top: 70, bottom: 120, left: 40, right: 40 },
        pitch: mode === "3d-flyover" ? 42 : 0,
        bearing: 0,
        duration: 1800,
        essential: false,
      },
    );
  }, [map, coordinates, mode, hudInsets?.top, hudInsets?.bottom]);

  useEffect(() => {
    if (!isPlaying || !map || !routeTableRef.current) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    lastHudSyncRef.current = 0;

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const rawDeltaMs = Math.max(0, Math.min(50, now - lastTimeRef.current));
      lastTimeRef.current = now;
      const dtSec = rawDeltaMs / 1000;

      const increment = rawDeltaMs / Math.max(1000, durationMs);
      const nextProgress = Math.min(1.0, progressRef.current + increment);

      progressRef.current = nextProgress;
      applyFrame(nextProgress, true, dtSec);

      if (nextProgress >= 1.0) {
        isPlayingRef.current = false;
        setProgress(1.0);
        setIsPlaying(false);
        setIsFinished(true);
        transitionToOverview();
        onFinish?.();
        return;
      }

      if (now - lastHudSyncRef.current >= HUD_SYNC_INTERVAL_MS) {
        lastHudSyncRef.current = now;
        setProgress(nextProgress);
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, map, durationMs, applyFrame, transitionToOverview, onFinish]);

  const play = useCallback(() => {
    const restarting = progressRef.current >= 1.0 || progressRef.current <= 0;
    if (progressRef.current >= 1.0) {
      progressRef.current = 0;
      setProgress(0);
      setIsFinished(false);
    }
    if (restarting && typeof map?.setZoom === "function") {
      map.setZoom(userZoomRef.current ?? (mode === "3d-flyover" ? 14.5 : 14.2));
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [map, mode]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setProgress(progressRef.current);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const replay = useCallback(() => {
    pause();
    progressRef.current = 0;
    setProgress(0);
    setIsFinished(false);
    if (coordinates.length > 0) {
      smoothedCenterRef.current = coordinates[0];
    }
    applyFrame(0, false);
    play();
  }, [pause, play, applyFrame, coordinates]);

  const seek = useCallback(
    (targetProgress: number) => {
      const clamped = Math.max(0, Math.min(1.0, targetProgress));
      progressRef.current = clamped;
      setProgress(clamped);
      setIsFinished(clamped >= 1.0);
      applyFrame(clamped, false);
      if (clamped >= 1.0) {
        transitionToOverview();
      }
    },
    [applyFrame, transitionToOverview],
  );

  return {
    progress,
    isPlaying,
    isFinished,
    totalDistanceKm: totalDistanceKm.current,
    currentDistanceKm: progress * totalDistanceKm.current,
    play,
    pause,
    replay,
    seek,
    applyFrame,
    transitionToOverview,
  };
}
