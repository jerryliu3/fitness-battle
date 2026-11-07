# CLAUDE.md — Agent Guidelines for Fitness Battle (Overtaek)

This project is a pnpm monorepo consisting of:
- `apps/mobile`: Expo Router (React Native)
- `apps/web`: Next.js App Router (web shell + API routes)
- `packages/shared`: Platform-agnostic domain logic & types (NEVER import React, React Native, Expo, Next, or DOM)
- `packages/pursuit`: Three.js Arena 3D DOM scene (web only; mobile embeds via WebView)
- `supabase/`: Migrations, SQL functions (`SECURITY DEFINER` with `SET search_path = ''`), and RLS policies

---

## Developer Preferences & Non-Negotiable Best Practices

### 1. Minimal, Clean Fixes (No Over-engineering)
- **Smallest Correct Change**: Implement the minimal clean change required to solve the problem.
- **Zero Bloat**: Avoid verbose abstractions, defensive boilerplate, speculative helper libraries, or duplicate write paths.
- **Prune Large Diffs**: If a PR or diff is unexpectedly large, perform a dedicated simplification and cleanup pass to strip unnecessary code.
- **Maximum Reuse**: Share code across platforms via `packages/shared`. Keep UI component patterns uniform across sports and categories without unnecessary UI branching.

### 2. Verification Discipline (DO NOT RUN AUTONOMOUSLY)
- **Do NOT run slow/expensive type checks (`pnpm typecheck`), test suites (`pnpm test`), or builds autonomously** after every intermediate edit, rebase, merge conflict resolution, or CI fix.
- When instructed to "fix CI, do not verify", "resolve merge conflicts and push (do not verify)", or similar: immediately apply the fix, commit, and push without local verification delays.
- **Only run verification checks when**:
  1. The user explicitly requests or approves it (e.g. "verify this", "run tests"), OR
  2. All work across the entire task or PR is completely finished and ready for final review (unless the user specified "do not verify").

### 3. Recursive Code Review & Simplification Passes
- Before completing tasks, always perform a deep review pass for correctness, edge-case bugs, tech debt, and code simplification.
- Eliminate dead code, duplicated logic, and unnecessary UI branching.
- Strive for recursive cleanup: review and simplify until no further improvements are needed.

### 4. Git, Stacked PRs & Worktree Hygiene
- **Small, Scoped PRs**: Prefer small stacked PRs against `origin/main` (e.g. 1 PR per feature/tab) over monolithic PRs.
- **Clean Rebases**: Rebase cleanly on `origin/main` and resolve conflicts cleanly without mixing unrelated changes.
- **Local Testing Guidance**: When work is ready for the user to review, provide the exact worktree directory and commands to test locally (e.g. in the iOS simulator or web dev server).

### 5. Product & Scope Ambiguity
- For any ambiguous product requirements, design decisions, or domain logic, **hold off on assumptions** and ask the user directly with concise options.

---

## Key Commands
- Start web: `pnpm dev`
- Start mobile: `pnpm dev:mobile`
- Run tests (only when approved / final): `pnpm test`
- Typecheck (only when approved / final): `pnpm typecheck`
