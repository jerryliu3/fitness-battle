"use client";

import { useEffect, useState } from "react";
import {
  SAMPLE_ROUTES,
  type RouteDataset,
} from "@fitness-battle/shared";
import {
  RouteStaticPreview,
  RouteTimelapseMap,
} from "@/components/routes";
import { webEnv } from "@/lib/env";

export default function RoutesDemoPage() {
  const [selectedRoute, setSelectedRoute] = useState<RouteDataset>(SAMPLE_ROUTES[0]);
  const [customToken, setCustomToken] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>("#f7c948");
  const [durationMs, setDurationMs] = useState<number>(12000);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Load saved token from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fb_demo_mapbox_token");
      if (saved) {
        setCustomToken(saved);
      }
    }
  }, []);

  const handleSaveToken = (val: string) => {
    setCustomToken(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("fb_demo_mapbox_token", val);
    }
  };

  const activeToken = customToken || webEnv.mapboxAccessToken;

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-[#142b3b] pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#e3e9e7] bg-[#f8f9f6]/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#142b3b] text-[#f7c948] font-bold text-sm shadow">
              GPS
            </div>
            <div>
              <h1 className="text-base font-bold sm:text-lg leading-tight">
                Route Visualization Suite
              </h1>
              <p className="text-xs text-[#637482]">
                Everyday Club · Interactive 3D Flyover & Ultra-Fast Static Previews
              </p>
            </div>
          </div>

          {/* Token config button */}
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex items-center gap-1.5 rounded-full border border-[#e3e9e7] bg-white px-3 py-1.5 text-xs font-medium text-[#142b3b] shadow-sm hover:bg-[#f8f9f6] transition-colors"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                activeToken ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="hidden sm:inline">
              {activeToken ? "Mapbox Token Configured" : "Enter Mapbox Token"}
            </span>
            <span className="sm:hidden">Token</span>
          </button>
        </div>

        {/* Optional Collapsible Token Drawer */}
        {showTokenInput && (
          <div className="mx-auto mt-3 max-w-6xl rounded-xl border border-[#e3e9e7] bg-white p-3 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="token-input" className="text-xs font-semibold text-[#142b3b]">
                Mapbox Public Token (pk...):
              </label>
              <input
                id="token-input"
                type="password"
                placeholder="pk.eyJ1..."
                value={customToken}
                onChange={(e) => handleSaveToken(e.target.value.trim())}
                className="flex-1 rounded-lg border border-[#e3e9e7] px-3 py-1.5 text-xs font-mono focus:border-[#142b3b] focus:outline-none"
              />
              {customToken && (
                <button
                  type="button"
                  onClick={() => handleSaveToken("")}
                  className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-100"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#637482]">
              Token is saved locally in your browser for testing. You can also configure{" "}
              <code className="text-[#176c75]">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your environment.
            </p>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-8 space-y-8">
        {/* Route Selector & Customization Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white border border-[#e3e9e7] p-4 shadow-sm">
          {/* Sample Route Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#637482] uppercase tracking-wider mr-1">
              Sample Route:
            </span>
            {SAMPLE_ROUTES.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRoute(route)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedRoute.id === route.id
                    ? "bg-[#142b3b] text-[#f7c948] shadow-sm"
                    : "bg-[#f8f9f6] text-[#637482] hover:bg-[#e3e9e7] hover:text-[#142b3b]"
                }`}
              >
                {route.name}
              </button>
            ))}
          </div>

          {/* Accent Color & Duration controls */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#637482] font-medium">Accent:</span>
              {[
                { name: "Gold", hex: "#f7c948" },
                { name: "Orange", hex: "#FF5500" },
                { name: "Teal", hex: "#176c75" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setAccentColor(c.hex)}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${
                    accentColor === c.hex ? "scale-110 border-[#142b3b]" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#637482] font-medium">Duration:</span>
              <select
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
                className="rounded-lg border border-[#e3e9e7] bg-[#f8f9f6] px-2 py-1 text-xs font-medium focus:outline-none"
              >
                <option value={8000}>8s (Fast)</option>
                <option value={12000}>12s (Standard)</option>
                <option value={20000}>20s (Cinematic)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Two-Column Showcase: Full Interactive 3D Flyover vs Feed Card Static Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Interactive WebGL Visualizer (<RouteTimelapseMap />) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#142b3b]">
                  1. Interactive 2D/3D Route Timelapse & Video Export
                </h2>
                <p className="text-xs text-[#637482]">
                  WebGL canvas with 3D DEM terrain, anti-jerk lookahead camera, line-trim animation, 60fps video capture & HD snapshot.
                </p>
              </div>
            </div>

            {/* Live Component: RouteTimelapseMap */}
            <RouteTimelapseMap
              key={`${selectedRoute.id}-${accentColor}-${durationMs}`}
              coordinates={selectedRoute.coordinates}
              durationMs={durationMs}
              accentColor={accentColor}
              mapboxToken={activeToken}
              mode="3d-flyover"
              autoPlay={true}
            />

            {/* Architecture Highlights Note */}
            <div className="rounded-xl bg-white border border-[#e3e9e7] p-4 text-xs space-y-2">
              <h3 className="font-bold text-[#142b3b] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#176c75]" />
                Technical Capabilities Verified
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[#637482]">
                <li>
                  <strong className="text-[#142b3b]">preserveDrawingBuffer: true</strong> enables WebGL stream recording via <code className="text-[#176c75]">captureStream(60)</code> without blank frames.
                </li>
                <li>
                  <strong className="text-[#142b3b]">Anti-Jerk Camera:</strong> 200m lookahead bearing with shortest-arc angular lerp damped via <code className="text-[#176c75]">map.jumpTo</code> prevents stutter.
                </li>
                <li>
                  <strong className="text-[#142b3b]">Zero Server Cost Export:</strong> Client-side MediaRecorder exports AVC1/H.264 MP4 on iOS/Safari and VP9 WebM on Chrome/Android with Web Share API integration.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column (5 cols): Activity Feed Card (<RouteStaticPreview />) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#142b3b]">
                2. Activity Feed Thumbnail Card
              </h2>
              <p className="text-xs text-[#637482]">
                Powered by Mapbox Static Images API. Lightweight <code className="text-[#176c75]">&lt;img&gt;</code> without mounting heavy WebGL contexts in scrolling lists.
              </p>
            </div>

            {/* Feed Card Mock */}
            <div className="overflow-hidden rounded-2xl bg-white border border-[#e3e9e7] shadow-sm">
              {/* Card Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#142b3b] text-white font-bold text-sm">
                  JL
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#142b3b] truncate">
                      Jerry Liu
                    </span>
                    <span className="rounded-full bg-[#fff5d1] px-2 py-0.5 text-[11px] font-semibold text-[#142b3b]">
                      {selectedRoute.sport === "cycling" ? "Ride" : "Run"}
                    </span>
                  </div>
                  <p className="text-xs text-[#637482] truncate">
                    Today at 7:15 AM · {selectedRoute.location}
                  </p>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="px-4 pb-3">
                <h4 className="text-sm font-semibold text-[#142b3b]">
                  {selectedRoute.name}
                </h4>
                <div className="mt-2 flex items-center gap-4 text-xs text-[#637482]">
                  <div>
                    <span className="font-bold text-[#142b3b] text-sm">
                      {selectedRoute.distanceKm}
                    </span>{" "}
                    km
                  </div>
                  <div>
                    <span className="font-bold text-[#142b3b] text-sm">
                      +{selectedRoute.elevationGainM}
                    </span>{" "}
                    m
                  </div>
                  <div>
                    <span className="font-bold text-[#142b3b] text-sm">
                      {selectedRoute.sport === "cycling" ? "24.5" : "5:12"}
                    </span>{" "}
                    {selectedRoute.sport === "cycling" ? "km/h" : "/km"}
                  </div>
                </div>
              </div>

              {/* Route Static Preview Component */}
              <div className="px-4 pb-4">
                <RouteStaticPreview
                  coordinates={selectedRoute.summaryPolyline}
                  width={600}
                  height={380}
                  strokeColor={accentColor.replace("#", "")}
                  strokeWidth={4}
                  strokeOpacity={0.9}
                  padding={40}
                  showMarkers={true}
                  showPlayBadge={true}
                  mapboxToken={activeToken}
                  onClick={() => {
                    // Scroll to or focus interactive flyover
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  alt={`${selectedRoute.name} static preview thumbnail`}
                />
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-[#e3e9e7] px-4 py-3 text-xs text-[#637482]">
                <span className="font-medium">Everyday Club Activity Feed</span>
                <span className="text-[11px] text-[#176c75] font-semibold">
                  Tap thumbnail to play 3D replay
                </span>
              </div>
            </div>

            {/* Performance note */}
            <div className="rounded-xl bg-[#fff5d1]/60 border border-[#f7c948]/30 p-3.5 text-xs text-[#142b3b]">
              <strong className="font-semibold block mb-1">
                Feed Performance Guarantee:
              </strong>
              Each static card uses a single memoized static image with Douglas-Peucker simplification, auto-framing, and pin overlays. Browsers can easily render hundreds of activities in a scrolling feed without WebGL context limits or frame drops.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
