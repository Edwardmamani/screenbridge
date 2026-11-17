import type { ScreenBridgeApi } from '../preload/index';

declare global {
  interface Window {
    screenBridge: ScreenBridgeApi;
  }
}
