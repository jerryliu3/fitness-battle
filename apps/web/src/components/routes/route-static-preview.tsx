"use client";

import { useMemo, useState } from "react";
import {
  buildMapboxStaticImageUrl,
  decodePolyline,
  type LngLat,
} from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import "./routes.css";

export interface RouteStaticPreviewProps {
  /** Array of [lng, lat] coordinates or a Google-encoded polyline string. */
  coordinates: LngLat[] | string;
  /** Width in pixels for the image request. Default: 600 */
  width?: number;
  /** Height in pixels for the image request. Default: 400 */
  height?: number;
  /** Mapbox style id (e.g. 'mapbox/outdoors-v12' or 'mapbox/dark-v11'). Default: 'mapbox/outdoors-v12' */
  mapStyle?: string;
  /** Route line stroke hex color without '#' (e.g. 'FF5500' or 'f7c948'). Default: 'FF5500' */
  strokeColor?: string;
  /** Route line width in pixels. Default: 4 */
  strokeWidth?: number;
  /** Route line opacity from 0 to 1. Default: 0.9 */
  strokeOpacity?: number;
  /** Padding around the route bounding box. Default: 40 */
  padding?: number;
  /** Whether to render start and finish pin overlays. Default: true */
  showMarkers?: boolean;
  /** Whether to show the floating 'Play 3D Replay' pill badge overlay. Default: true */
  showPlayBadge?: boolean;
  /** Optional click callback to open the interactive 3D flyover view. */
  onClick?: () => void;
  /** Optional Mapbox access token override; falls back to NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. */
  mapboxToken?: string;
  /** Accessible image alt text. */
  alt?: string;
  /** Extra container styling. */
  className?: string;
}

export function RouteStaticPreview({
  coordinates,
  width = 600,
  height = 400,
  mapStyle = "mapbox/outdoors-v12",
  strokeColor = "FF5500",
  strokeWidth = 4,
  strokeOpacity = 0.9,
  padding = 40,
  showMarkers = true,
  showPlayBadge = true,
  onClick,
  mapboxToken,
  alt = "GPS route thumbnail preview",
  className = "",
}: RouteStaticPreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeToken =
    mapboxToken !== undefined ? mapboxToken : webEnv.mapboxAccessToken;

  // Resolve raw coordinates for fallback SVG and boundary calculations
  const rawCoords: LngLat[] = useMemo(() => {
    if (typeof coordinates === "string") {
      return decodePolyline(coordinates);
    }
    return coordinates || [];
  }, [coordinates]);

  // Construct Mapbox Static API URL
  const imageUrl = useMemo(() => {
    if (!activeToken || rawCoords.length < 2) return null;
    try {
      return buildMapboxStaticImageUrl({
        coordinates,
        width,
        height,
        mapStyle,
        strokeColor: strokeColor.replace("#", ""),
        strokeWidth,
        strokeOpacity,
        padding,
        retina: true,
        showStartEndPins: showMarkers,
        mapboxToken: activeToken,
      });
    } catch {
      return null;
    }
  }, [
    coordinates,
    rawCoords.length,
    width,
    height,
    mapStyle,
    strokeColor,
    strokeWidth,
    strokeOpacity,
    padding,
    showMarkers,
    activeToken,
  ]);

  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : "figure"}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`route-ui group relative w-full overflow-hidden rounded-2xl bg-[#f8f9f6] border border-[#e3e9e7] ${
        isClickable ? "cursor-pointer transition-transform active:scale-[0.99] hover:shadow-md" : ""
      } ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-label={alt}
    >
      {/* 1. Subtle loading skeleton */}
      {imageUrl && !loaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f9f6] animate-pulse">
          <div className="w-12 h-12 rounded-full border-2 border-[#142b3b]/10 border-t-[#f7c948] animate-spin" />
          <span className="mt-2 text-xs font-medium text-[#637482]">Loading map…</span>
        </div>
      )}

      {/* 2. Mapbox Static Image */}
      {imageUrl && !hasError ? (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        /* Fallback: High-Performance SVG Route Rendering if token missing or load failed */
        <FallbackSvgRoute
          coords={rawCoords}
          strokeColor={`#${strokeColor.replace("#", "")}`}
          strokeWidth={strokeWidth}
          showMarkers={showMarkers}
          hasNoToken={!activeToken}
        />
      )}

      {/* 3. Optional "Play 3D Replay" badge overlay */}
      {showPlayBadge && (
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-[#142b3b]/85 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all group-hover:bg-[#142b3b] group-hover:scale-105">
          <svg
            className="h-3.5 w-3.5 fill-[#f7c948]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Play 3D Replay</span>
        </div>
      )}
    </div>
  );
}

/**
 * Fallback SVG renderer for development when MAPBOX_ACCESS_TOKEN is not yet set
 * or when the user is offline, ensuring the component never breaks.
 */
function FallbackSvgRoute({
  coords,
  strokeColor,
  strokeWidth,
  showMarkers,
  hasNoToken,
}: {
  coords: LngLat[];
  strokeColor: string;
  strokeWidth: number;
  showMarkers: boolean;
  hasNoToken: boolean;
}) {
  if (coords.length < 2) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-[#637482]">
        No route data available
      </div>
    );
  }

  // Calculate bounding box and normalize to 0..100 SVG view coordinates
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const deltaLng = maxLng - minLng || 0.001;
  const deltaLat = maxLat - minLat || 0.001;
  const avgLat = (minLat + maxLat) / 2;
  const latFactor = Math.cos((avgLat * Math.PI) / 180);
  const deltaX = deltaLng * latFactor;
  const deltaY = deltaLat;
  const maxDelta = Math.max(deltaX, deltaY) || 0.001;
  const paddingPct = 14;
  const scale = (100 - paddingPct * 2) / maxDelta;

  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  const points = coords
    .map(([lng, lat]) => {
      const x = 50 + (lng - midLng) * latFactor * scale;
      const y = 50 - (lat - midLat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const startPt = points.split(" ")[0].split(",");
  const endPt = points.split(" ").slice(-1)[0].split(",");

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#142b3b] to-[#10232f] text-white">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full opacity-85"
      >
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showMarkers && (
          <>
            <circle
              cx={startPt[0]}
              cy={startPt[1]}
              r="3.5"
              fill="#22c55e"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            <circle
              cx={endPt[0]}
              cy={endPt[1]}
              r="3.5"
              fill="#f7c948"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </>
        )}
      </svg>
      {hasNoToken && (
        <div className="absolute top-2.5 left-2.5 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/80 backdrop-blur-sm">
          Route outline · map unavailable
        </div>
      )}
    </div>
  );
}
