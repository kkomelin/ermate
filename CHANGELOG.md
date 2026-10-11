# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project is not versioned yet, so entries are grouped by date.

## [Unreleased]

## 2026-10-11

### Changed

- Updated dependencies, including React 19.3, TypeScript 6.0 (kept on 6.0.x), AI SDK 7, lucide-react 1, vitest 5, vite-plugin-pwa 2 and @dagrejs/dagre 3.
- Adapted the chat route to AI SDK 7 and removed the `baseUrl` option, deprecated in TypeScript 6, from the tsconfig files.
- CI uses pnpm 12 to match local development, with updated actions.
- Migrated `onlyBuiltDependencies` to `allowBuilds` in `pnpm-workspace.yaml`.

### Fixed

- `pnpm typecheck` checks all TypeScript projects. Before, it checked none.

### Security

- pnpm only installs package versions that are at least 1 day old (`minimumReleaseAge`), and CI checks the lockfile against the same rule.

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
