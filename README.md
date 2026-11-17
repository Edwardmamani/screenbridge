# ScreenBridge

Turn any device with a modern web browser (tablet, smartphone, secondary laptop, or Smart TV) into a wireless secondary display over your local network using **WebRTC**.

## Features

- **QR Code & LAN Pairing**: Instant pairing via local Wi-Fi URL or QR code—no extra app needed on the receiving device.
- **Host Approval & Optional PIN**: Approve or reject incoming devices on the host, with an optional 4-digit pairing PIN.
- **Share Screen or Window**: Stream an entire physical/virtual monitor or a single application window with configurable quality presets (`1080p @ 30fps`, `720p @ 60fps`, `Native @ 30fps`).
- **Multi-Device Support**: Stream to multiple connected browsers simultaneously and disconnect individual devices anytime.
- **Receiver Controls**: Fullscreen mode, aspect-ratio fit modes (`contain` / `cover` / `fill`), horizontal mirror toggle, and live stream resolution indicator.
- **Software Virtual Extended Display (GNOME Wayland)**: Create a software extended monitor via `org.gnome.Mutter.ScreenCast` + PipeWire (`scripts/gnome_virtual_display.py`) without needing a physical dummy plug.
- **NVIDIA GPU & PRIME Offload**: Detects NVIDIA GPUs via `nvidia-smi`, enables Chromium GPU rasterization/zero-copy flags, and supports NVIDIA PRIME render offload (`pnpm start:nvidia` or UI toggle).
- **Persistent Diagnostics (`log.txt`)**: Logs main, server, IPC, renderer, WebRTC, and receiver events to `log.txt` for easier debugging.
- **Wayland & X11 Friendly**: Uses Electron's `desktopCapturer` with automatic fallback to `getDisplayMedia` (XDG Desktop Portal / PipeWire on Wayland).

## Tech Stack

- **Desktop Shell**: Electron + TypeScript
- **Host & Receiver UIs**: React 19 + Vite + Tailwind CSS v4
- **Signaling & Static Hosting**: Node `http` + `ws` (WebSocket)
- **Testing & Quality**: Vitest, ESLint, Prettier, TypeScript strict mode

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run in development mode (Host UI + Receiver build + Electron)
pnpm dev

# 3. Build for production & launch
pnpm start
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run Vite dev server, receiver watch build, and Electron |
| `pnpm build` | Compile main, preload, renderer, and receiver bundles |
| `pnpm start` | Build and launch ScreenBridge |
| `pnpm start:nvidia` | Build and launch with NVIDIA PRIME render offload enabled |
| `pnpm typecheck` | Run strict TypeScript type checking |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm test` | Run unit tests with Vitest |

## Extending vs. Mirroring a Screen

- **Mirroring**: Select any physical display or application window in ScreenBridge.
- **Extending**: Plug in an HDMI/DisplayPort dummy plug (or enable a virtual output on X11/Windows/macOS), then select that secondary display in ScreenBridge. On Wayland/GNOME, you can also share a single application window as a dedicated workspace.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before opening a pull request.

## License

[MIT](LICENSE)
