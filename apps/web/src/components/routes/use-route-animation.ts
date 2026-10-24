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
  onFinish?: () => void;
}

export function useRouteAnimation({
  map,
  coordinates,
  durationMs = 12000,
  autoPlay = true,
  mode,
  onFinish,
}: UseRouteAnimationOptions) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const progressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Camera damping state
  const smoothedBearingRef = useRef<number>(0);
  const smoothedCenterRef = useRef<LngLat | null>(null);

  // Turf LineString & total distance
  const routeLine = useRef<ReturnType<typeof turf.lineString> | null>(null);
  const totalDistanceKm = useRef<number>(0);

  // Initialize or re-initialize route geometry when coordinates change
  useEffect(() => {
    if (!coordinates || coordinates.length < 2) {
      routeLine.current = null;
      totalDistanceKm.current = 0;
      return;
    }
    const line = turf.lineString(coordinates);
    routeLine.current = line;
    totalDistanceKm.current = turf.length(line, { units: "kilometers" });

    // Initial bearing
    const initialBearing = turf.bearing(
      turf.point(coordinates[0]),
      turf.point(coordinates[1]),
    );
    smoothedBearingRef.current = initialBearing;
    smoothedCenterRef.current = coordinates[0];

    // Reset progress
    progressRef.current = 0;
    setProgress(0);
    setIsFinished(false);

    if (autoPlay) {
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [coordinates, autoPlay]);

  // Apply map visual updates at a given progress t [0..1]
  const applyFrame = useCallback(
    (t: number, instantJump = true) => {
      if (!map || !routeLine.current || totalDistanceKm.current <= 0) return;

      const totalDist = totalDistanceKm.current;
      const currentDist = t * totalDist;

      // 1. Current position along route
      const currentPoint = turf.along(routeLine.current, currentDist, {
        units: "kilometers",
      });
      const [targetLng, targetLat] = currentPoint.geometry.coordinates as LngLat;

      // 2. Lookahead for anti-jerk bearing (200m ahead = 0.2 km)
      let targetBearing = smoothedBearingRef.current;
      if (currentDist < totalDist - 0.05) {
        const lookDist = Math.min(currentDist + 0.2, totalDist);
        const lookPoint = turf.along(routeLine.current, lookDist, {
          units: "kilometers",
        });
        targetBearing = turf.bearing(currentPoint, lookPoint);
      }

      // Smooth damp bearing and center
      if (smoothedCenterRef.current) {
        const dampingCenter = instantJump ? 0.2 : 1.0;
        const dampingBearing = instantJump ? 0.12 : 1.0;

        smoothedCenterRef.current = [
          lerp(smoothedCenterRef.current[0], targetLng, dampingCenter),
          lerp(smoothedCenterRef.current[1], targetLat, dampingCenter),
        ];
        smoothedBearingRef.current = lerpAngle(
          smoothedBearingRef.current,
          targetBearing,
          dampingBearing,
        );
      } else {
        smoothedCenterRef.current = [targetLng, targetLat];
        smoothedBearingRef.current = targetBearing;
      }

      // Hide the unvisited portion [t, 1]; Mapbox trims the interval itself.
      if (map.getLayer("route-active")) {
        // Clamp to avoid edge issues at 0 and 1
        const trimEnd = Math.max(0.0005, Math.min(1.0, t));
        map.setPaintProperty("route-active", "line-trim-offset", [
          trimEnd,
          1,
        ]);
      }

      // 4. Update glowing leading GPS dot
      const leaderSource = map.getSource(
        "leader-source",
      ) as mapboxgl.GeoJSONSource | undefined;
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

      // 5. Anti-Jerk instantaneous camera update via jumpTo (prevents frame queueing)
      if (mode === "3d-flyover") {
        map.jumpTo({
          center: smoothedCenterRef.current,
          bearing: smoothedBearingRef.current,
          pitch: 58,
          zoom: 14.5,
        });
      } else {
        map.jumpTo({
          center: smoothedCenterRef.current,
          bearing: 0,
          pitch: 0,
          zoom: 14.2,
        });
      }
    },
    [map, mode],
  );

  // Transition smoothly to overview framing at completion
  const transitionToOverview = useCallback(() => {
    if (!map || !coordinates || coordinates.length < 2) return;
    const bounds = calculateRouteBounds(coordinates);
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      {
        padding: { top: 70, bottom: 120, left: 40, right: 40 },
        pitch: mode === "3d-flyover" ? 42 : 0,
        bearing: 0,
        duration: 1800,
        essential: false,
      },
    );
  }, [map, coordinates, mode]);

  // Main 60fps animation loop
  useEffect(() => {
    if (!isPlaying || !map || !routeLine.current) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const increment = delta / Math.max(1000, durationMs);
      const nextProgress = Math.min(1.0, progressRef.current + increment);

      progressRef.current = nextProgress;
      setProgress(nextProgress);
      applyFrame(nextProgress, true);

      if (nextProgress >= 1.0) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsFinished(true);
        transitionToOverview();
        onFinish?.();
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
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
    if (progressRef.current >= 1.0) {
      progressRef.current = 0;
      setProgress(0);
      setIsFinished(false);
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
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
    if (smoothedCenterRef.current && coordinates.length > 0) {
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
