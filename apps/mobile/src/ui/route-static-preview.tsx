import { textStyle } from "./section";
import { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import {
  buildMapboxStaticImageUrl,
  decodePolyline,
  type LngLat,
} from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { colors, fonts } from "../theme";

export interface MobileRouteStaticPreviewProps {
  /** Array of [lng, lat] coordinates or an encoded polyline string. */
  coordinates: LngLat[] | string;
  /** Width in density pixels for the Mapbox request. Default: 600 */
  width?: number;
  /** Height in density pixels for the Mapbox request. Default: 380 */
  height?: number;
  /** Mapbox style id. Default: 'mapbox/outdoors-v12' */
  mapStyle?: string;
  /** Hex color without '#'. Default: 'f7c948' (Focus Gold) */
  strokeColor?: string;
  /** Line width in pixels. Default: 4 */
  strokeWidth?: number;
  /** Padding around bounds. Default: 40 */
  padding?: number;
  /** Whether to render start and end pin markers. Default: true */
  showMarkers?: boolean;
  /** Whether to show 'Play 3D Replay' pill badge. Default: true */
  showPlayBadge?: boolean;
  /** Click/tap callback (e.g. to open 3D flyover modal/sheet). */
  onPress?: () => void;
  /** Mapbox access token override; falls back to EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN. */
  mapboxToken?: string;
  style?: StyleProp<ViewStyle>;
}

export function RouteStaticPreview({
  coordinates,
  width = 600,
  height = 380,
  mapStyle = "mapbox/outdoors-v12",
  strokeColor = "f7c948",
  strokeWidth = 4,
  padding = 40,
  showMarkers = true,
  showPlayBadge = true,
  onPress,
  mapboxToken,
  style,
}: MobileRouteStaticPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Active token (explicit prop override takes priority)
  const token =
    mapboxToken !== undefined
      ? mapboxToken
      : mobileEnv.mapboxAccessToken;

  // Decode coordinates if string
  const rawCoords: LngLat[] = useMemo(() => {
    if (typeof coordinates === "string") {
      return decodePolyline(coordinates);
    }
    return coordinates || [];
  }, [coordinates]);

  // Mapbox Static URL
  const imageUrl = useMemo(() => {
    if (!token || rawCoords.length < 2) return null;
    try {
      return buildMapboxStaticImageUrl({
        coordinates,
        width,
        height,
        mapStyle,
        strokeColor: strokeColor.replace("#", ""),
        strokeWidth,
        strokeOpacity: 0.9,
        padding,
        retina: true,
        showStartEndPins: showMarkers,
        mapboxToken: token,
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
    padding,
    showMarkers,
    token,
  ]);

  const content = (
    <View style={[styles.container, { aspectRatio: width / height }, style]}>
      {/* 1. Mapbox Static API Image */}
      {imageUrl && !hasError ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.lime} size="small" />
            </View>
          )}
        </>
      ) : (
        /* 2. Pure SVG Fallback when token is missing or network failed */
        <FallbackMobileSvgRoute
          coords={rawCoords}
          strokeColor={`#${strokeColor.replace("#", "")}`}
          strokeWidth={strokeWidth}
          showMarkers={showMarkers}
        />
      )}

      {/* 3. 'Play 3D Replay' Badge */}
      {showPlayBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgePlayIcon}>▶</Text>
          <Text style={styles.badgeText}>Play 3D Replay</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Open route overview and flyover"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function FallbackMobileSvgRoute({
  coords,
  strokeColor,
  strokeWidth,
  showMarkers,
}: {
  coords: LngLat[];
  strokeColor: string;
  strokeWidth: number;
  showMarkers: boolean;
}) {
  if (coords.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No route points available</Text>
      </View>
    );
  }

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
  const pad = 14;
  const scale = (100 - pad * 2) / maxDelta;

  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  const points = coords
    .map(([lng, lat]) => {
      const x = 50 + (lng - midLng) * latFactor * scale;
      const y = 50 - (lat - midLat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const startCoord = points.split(" ")[0].split(",");
  const endCoord = points.split(" ").slice(-1)[0].split(",");

  return (
    <View style={styles.fallbackContainer}>
      <Svg viewBox="0 0 100 100" style={styles.svg}>
        <Polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showMarkers && (
          <>
            <Circle
              cx={parseFloat(startCoord[0])}
              cy={parseFloat(startCoord[1])}
              r={3.5}
              fill="#22c55e"
              stroke="#ffffff"
              strokeWidth={1.2}
            />
            <Circle
              cx={parseFloat(endCoord[0])}
              cy={parseFloat(endCoord[1])}
              r={3.5}
              fill={colors.lime}
              stroke="#ffffff"
              strokeWidth={1.2}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    width: "100%",
    height: "100%",
    opacity: 0.9,
  },
  emptyContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.paper,
  },
  emptyText: {
    ...textStyle("caption"),
    color: colors.muted
},
  badge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(20, 43, 59, 0.88)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  badgePlayIcon: {
    ...textStyle("label"),
    color: colors.lime
},
  badgeText: {
    ...textStyle("label"),
    color: "#ffffff"
},
});
