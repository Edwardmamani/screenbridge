# Architecture Overview

ScreenBridge is organized into five strict layers so business logic, IPC contracts, and UI components remain decoupled and easy to test.

## Directory Layout

- `src/shared/` — Framework-agnostic domain types (`display.ts`, `session.ts`), WebSocket signaling protocol + runtime validation (`signaling.ts`), and IPC channel names (`ipc.ts`).
- `src/main/` — Electron main process:
  - `network/` — Local IPv4 interface discovery (`networkInfo.ts`) and QR generation (`qrService.ts`).
  - `server/` — Pure `SessionManager` state machine (`sessionManager.ts`) and `LocalServer` HTTP + WebSocket signaling server (`localServer.ts`).
  - `display/` — `desktopCapturer` / `screen` integration (`displayService.ts`), OS virtual display capability reporting (`virtualDisplay.ts`), GNOME Wayland virtual display lifecycle (`virtualDisplayManager.ts` + `scripts/gnome_virtual_display.py`), and monitor layout persistence/restoration (`displayLayoutManager.ts` + `scripts/gnome_display_layout.py`).
  - `gpu/` — NVIDIA detection via `nvidia-smi`, Chromium GPU flags, and PRIME offload configuration (`gpuService.ts`).
  - `logging/` — Persistent structured file logger writing to `log.txt` (`logger.ts`).
  - `ipc/` — Typed IPC handler registration (`registerHandlers.ts`).
- `src/preload/` — Context-isolated `contextBridge` API (`window.screenBridge`).
- `src/renderer/` — Host desktop React UI and `useHostStreaming` WebRTC broadcaster hook.
- `src/receiver/` — Lightweight browser SPA served over LAN HTTP, with `useReceiverStream` WebRTC receiver hook.

## Signaling & Media Flow

1. `LocalServer` starts an HTTP + WebSocket server on `0.0.0.0:8900` (falling back to an ephemeral port if occupied).
2. A receiver browser opens `http://<lan-ip>:<port>` and connects to `ws://<lan-ip>:<port>/ws`.
3. `LocalServer` sends `welcome` (including `requiresPin`) and registers the client in `SessionManager` as `pending`.
4. The receiver sends `join` with `deviceName` (and optional `pin`).
5. The host clicks **Allow** in the desktop UI (`APPROVE_CLIENT` IPC).
6. `useHostStreaming` creates an `RTCPeerConnection` for that `clientId`, attaches the captured `MediaStream` tracks, and exchanges `webrtc-offer`, `webrtc-answer`, and `webrtc-ice` messages through `LocalServer`.
7. Video streams peer-to-peer over LAN directly from the host's Chromium WebRTC stack to the receiver browser.
