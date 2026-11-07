# GitHub Copilot Instructions — Fitness Battle (Overtaek)

## Core Guidelines

1. **Minimal Clean Changes**:
   - Make the smallest correct change. Keep diffs lean and minimal.
   - Do not add verbose or over-complicated abstractions, speculative helper modules, or defensive boilerplate.
   - Maximize component and logic reuse between web and mobile via `packages/shared`.

2. **Verification & Testing Discipline (DO NOT RUN AUTONOMOUSLY)**:
   - Do NOT run slow full-repository type checks (`pnpm typecheck`), test runs (`pnpm test`), or builds autonomously during intermediate steps, rebases, or CI fixes.
   - If the developer specifies "do not verify", push or complete the changes immediately without running validation suites.
   - Only execute verification when explicitly asked or after all work across the entire task/PR is finished.

3. **Code Quality & Recursive Simplification**:
   - Always do a dedicated pass for correctness, bug prevention, and simplification before completing changes.
   - Prune dead code, eliminate redundancy, and clean up tech debt.

4. **Architecture Non-Negotiables**:
   - Monorepo: `apps/mobile` (Expo), `apps/web` (Next App Router), `packages/shared`, `packages/pursuit` (Three.js web-DOM), `supabase/`.
   - `packages/shared` is strictly platform-agnostic (no React, React Native, Expo, Next, or DOM).
   - SQL functions marked `SECURITY DEFINER` must use `SET search_path = ''` and check `auth.uid()`.
   - Never expose server secrets (e.g. Strava client secret) to clients.

5. **Ambiguous Product Requirements**:
   - Never guess or speculate on ambiguous product behavior. Flag questions with concise options for developer approval.
