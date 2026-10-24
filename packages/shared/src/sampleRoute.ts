import { encodePolyline, type LngLat } from "./routeGeoUtils";

export interface RouteDataset {
  id: string;
  name: string;
  location: string;
  sport: "running" | "cycling";
  distanceKm: number;
  elevationGainM: number;
  coordinates: LngLat[];
  summaryPolyline: string;
}

/**
 * Marin Headlands Coastal Trail Run (Scenic loop overlooking the Golden Gate Bridge).
 * Ideal for showcasing 3D terrain DEM flyovers with ridges and coastal vistas.
 */
export const MARIN_HEADLANDS_ROUTE_COORDINATES: LngLat[] = [
  [-122.5020, 37.8285],
  [-122.5028, 37.8292],
  [-122.5041, 37.8304],
  [-122.5055, 37.8315],
  [-122.5072, 37.8324],
  [-122.5090, 37.8331],
  [-122.5112, 37.8335],
  [-122.5135, 37.8340],
  [-122.5158, 37.8348],
  [-122.5180, 37.8359],
  [-122.5198, 37.8372],
  [-122.5212, 37.8388],
  [-122.5220, 37.8405],
  [-122.5222, 37.8423],
  [-122.5218, 37.8441],
  [-122.5205, 37.8458],
  [-122.5188, 37.8472],
  [-122.5167, 37.8482],
  [-122.5142, 37.8489],
  [-122.5118, 37.8493],
  [-122.5092, 37.8491],
  [-122.5068, 37.8483],
  [-122.5045, 37.8471],
  [-122.5024, 37.8456],
  [-122.5008, 37.8438],
  [-122.4995, 37.8418],
  [-122.4988, 37.8396],
  [-122.4985, 37.8374],
  [-122.4989, 37.8352],
  [-122.4998, 37.8331],
  [-122.5011, 37.8308],
  [-122.5020, 37.8285],
];

/**
 * Central Park Outer Loop (Classic 10.2km running loop with rolling hills).
 */
export const CENTRAL_PARK_LOOP_COORDINATES: LngLat[] = [
  [-73.9731, 40.7648], // Columbus Circle
  [-73.9745, 40.7680],
  [-73.9760, 40.7725],
  [-73.9774, 40.7770],
  [-73.9785, 40.7815],
  [-73.9792, 40.7860],
  [-73.9775, 40.7910],
  [-73.9730, 40.7960],
  [-73.9660, 40.8005], // North end
  [-73.9590, 40.7995],
  [-73.9535, 40.7960],
  [-73.9515, 40.7905],
  [-73.9540, 40.7850],
  [-73.9580, 40.7800],
  [-73.9620, 40.7740],
  [-73.9665, 40.7690],
  [-73.9705, 40.7655],
  [-73.9731, 40.7648],
];

/**
 * Alpine Mountain Ridge (Breathtaking elevation profile around Mont Blanc / Chamonix valley).
 */
export const ALPINE_CHAMONIX_RIDGE_COORDINATES: LngLat[] = [
  [6.8652, 45.9237],
  [6.8685, 45.9255],
  [6.8720, 45.9278],
  [6.8765, 45.9304],
  [6.8812, 45.9332],
  [6.8860, 45.9355],
  [6.8915, 45.9372],
  [6.8970, 45.9381],
  [6.9025, 45.9380],
  [6.9078, 45.9368],
  [6.9125, 45.9345],
  [6.9160, 45.9312],
  [6.9180, 45.9275],
  [6.9175, 45.9235],
  [6.9145, 45.9198],
  [6.9098, 45.9170],
  [6.9042, 45.9152],
  [6.8980, 45.9145],
  [6.8918, 45.9148],
  [6.8855, 45.9162],
  [6.8795, 45.9185],
  [6.8740, 45.9212],
  [6.8652, 45.9237],
];

export const SAMPLE_ROUTES: RouteDataset[] = [
  {
    id: "marin-headlands-loop",
    name: "Marin Headlands Coastal Ridge",
    location: "Sausalito, CA",
    sport: "running",
    distanceKm: 8.4,
    elevationGainM: 285,
    coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
    summaryPolyline: encodePolyline(MARIN_HEADLANDS_ROUTE_COORDINATES),
  },
  {
    id: "central-park-loop",
    name: "Central Park Outer Loop",
    location: "New York, NY",
    sport: "running",
    distanceKm: 10.2,
    elevationGainM: 78,
    coordinates: CENTRAL_PARK_LOOP_COORDINATES,
    summaryPolyline: encodePolyline(CENTRAL_PARK_LOOP_COORDINATES),
  },
  {
    id: "alpine-chamonix-ridge",
    name: "Chamonix Valley Alpine Loop",
    location: "Haute-Savoie, France",
    sport: "cycling",
    distanceKm: 14.8,
    elevationGainM: 640,
    coordinates: ALPINE_CHAMONIX_RIDGE_COORDINATES,
    summaryPolyline: encodePolyline(ALPINE_CHAMONIX_RIDGE_COORDINATES),
  },
];

export const DEFAULT_SAMPLE_ROUTE = SAMPLE_ROUTES[0];
