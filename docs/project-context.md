# Fitness Battle Project Context

## Overview

**Fitness Battle** (product name: **Overtaek**) is a mobile-first athletic competition platform combining weekly asynchronous workout competition with road race leaderboards.

The core product features:
- **Weekly Compete Engine**: Monday-to-Monday Eastern weekly periods where athletes log workouts (running, cycling, walking, strength) to accumulate points/effort, adjust Elo ratings, and climb division standings.
- **Focus shell**: Home / Compete / Progress / Crew (route IDs `/today`, `/arena`, `/you`, `/field`), with Athlete settings behind the profile entry (`/athlete`). Vertical competition lanes and optional portrait perspective; private crew shared fields; Progress training, effort scores, records and history.
- **Race Rankings**: Public road race leaderboards (5K, 10K, half, marathon) backed by verified open-data results.
- **Multi-tracker Ingestion**: Strava OAuth sync, Apple HealthKit sync, Garmin FIT/TCX/GPX imports, and manual logging with synthetic demo fallback.

## Architecture

- **`apps/mobile`**: React Native & Expo Router application targeting iOS and Android with HealthKit sync, SecureStore auth token handling, native 2D lanes and portrait perspective. The earlier WebView-hosted Three.js pursuit remains available in code.
- **`apps/web`**: Next.js App Router application delivering the mobile phone shell, PWA support, OAuth callbacks, API endpoints, and rankings explorer.
- **`packages/shared`**: Pure TypeScript library containing:
  - Compete engine (`engine.ts`, `ledger.ts`, `effort.ts`, `sports.ts`, `elo.ts`)
  - Period calculation (`period.ts`)
  - Shared domain types and mock data generator
  - Strictly platform-agnostic (no DOM, no React, no React Native).
- **`packages/pursuit`**: Shared Three.js Arena 3D scene for web and Expo web.
- **`packages/rankings`**: Parser fixtures and data ingestion tools for official race results.
- **`supabase/`**: PostgreSQL database schema, migrations, and Row-Level Security (RLS) policies.

## Planned activity detail

The owner wants FIT and health-source metrics imported, retained and displayed for non-GPS activities too, including strength sessions with no route. This is a follow-up to v1 GPS maps; do not invent coordinates or treat the absence of a route as the absence of an activity. Current FIT session import retains duration and average heart rate. Activity details now include session-level scatterplots, five-session trends (including a relative Speed / HR index), and the selected session's contribution to seven-day logged volume; see [implementation review](reviews/activity-detail/README.md). These use recorded session summaries. Rich within-session sample-series storage and charts remain future work.
