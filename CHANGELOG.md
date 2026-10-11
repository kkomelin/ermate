# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project is not versioned yet, so entries are grouped by date.

## [Unreleased]

## 2026-10-11

### Changed

- Updated runtime dependencies: sonner 2.0.8, zustand 5.0.15, tailwind-merge 3.7.
- Updated build, lint and format tooling: vite 8.3 (no longer pinned to an exact version), @vitejs/plugin-react 6.1, tailwindcss 4.3, eslint 10.12, typescript-eslint 8.71, eslint-plugin-react-hooks 7.1, eslint-plugin-react-refresh 0.5.7, globals 17.13, prettier 3.9, prettier-plugin-tailwindcss 0.8, shadcn 4.21, tsx 4.23.
- Refreshed browserslist data (caniuse-lite).
- Vite config uses `import.meta.dirname` instead of `__dirname`.
- Migrated `onlyBuiltDependencies` to `allowBuilds` in `pnpm-workspace.yaml`.
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
