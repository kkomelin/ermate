# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project is not versioned yet, so entries are grouped by date.

## [Unreleased]

## 2026-10-11

### Changed

- Updated runtime dependencies: react and react-dom 19.3 (with @types/react and @types/react-dom 19.3), @xyflow/react 12.12, radix-ui 1.7, zod 4.6, hono 4.13, @clerk/react 6.17, @clerk/hono 0.1.88, sonner 2.0.8, zustand 5.0.15, tailwind-merge 3.7.
- Updated build, lint and format tooling: vite 8.3 (no longer pinned to an exact version), @vitejs/plugin-react 6.1, tailwindcss 4.3, eslint 10.12, typescript-eslint 8.71, eslint-plugin-react-hooks 7.1, eslint-plugin-react-refresh 0.5.7, globals 17.13, prettier 3.9, prettier-plugin-tailwindcss 0.8, shadcn 4.21, tsx 4.23.
- Updated dev tooling to new major versions: vitest 5, vite-plugin-pwa 2 (supports Vite 8, no more peer warning), lint-staged 17, @hono/node-server 2, and @types/node 24 to match the Node 24 used locally and in CI.
- Updated lucide-react to 1.55. Icons are now hidden from screen readers by default (`aria-hidden`), and the icon buttons keep their labels.
- Updated @dagrejs/dagre to 3.1, which ships its own types, and removed the unused `@types/dagre`.
- Refreshed browserslist data (caniuse-lite).
- Vite config uses `import.meta.dirname` instead of `__dirname`.
- Migrated `onlyBuiltDependencies` to `allowBuilds` in `pnpm-workspace.yaml`.
- Removed `@clerk/shared` from `allowBuilds`, since Clerk no longer runs an install script.
- Updated TypeScript to 6.0, kept on 6.0.x (`~6.0.3`) so updates don't pull in TypeScript 7.
- Removed the `baseUrl` option, deprecated in TypeScript 6, from the tsconfig files. `paths` already resolve relative to each tsconfig, so imports are unchanged.
- CI uses pnpm 12, the same major as local development (was pnpm 10, which ignored `allowBuilds`), and updated actions: actions/checkout v7, pnpm/action-setup v6, actions/setup-node v7.

### Fixed

- `pnpm typecheck` checks the app, node and api TypeScript projects. It ran `tsc --noEmit` against the root solution config, which checked 0 files.

### Security

- pnpm only installs package versions published at least 1 day ago (`minimumReleaseAge: 1440`). With pnpm 12, CI also checks every lockfile entry against it.

## 2026-03-18

### Changed

- CI workflow renamed to CI, with concurrency control, typecheck and lint steps, and updated action versions.
- Updated dependencies.

## 2026-03-16

### Changed

- Updated dependencies and improved the separation of dev and production dependencies.

## Initial public release

### Added

- Visual database schema designer built with Vite, React and React Flow.
- Table, column and relationship editing, with drag-and-drop column reordering, foreign key constraints and foreign key auto-suggestion.
- Dagre-based auto-layout and smart placement of new tables.
- AI schema design from prompts for signed-in users, with prompt injection guards and rate limiting.
- SQL import, and SQL export with dialect selection.
- Auto-save, restore of the last opened schema, sharing via URL, and export and import.
- Undo and redo, dark mode, and validation with an expandable log bar.
- PWA support.
