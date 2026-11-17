# Contributing to ScreenBridge

Thank you for your interest in contributing to ScreenBridge!

## Development Setup

1. Ensure you have **Node.js 20+** and **pnpm** installed.
2. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
3. Before submitting a PR, verify all checks pass:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

## Coding Guidelines

- Keep Electron-free business logic in pure modules under `src/main/network/`, `src/main/server/`, or `src/shared/` so it can be unit-tested with Vitest.
- Update `src/shared/types/` whenever changing IPC or WebSocket signaling contracts.
- Keep components focused and small; extract reusable hooks for WebRTC or IPC subscriptions.
