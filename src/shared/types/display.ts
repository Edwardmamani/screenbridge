export type CaptureSourceKind = 'screen' | 'window';

export interface CaptureSource {
  id: string;
  name: string;
  kind: CaptureSourceKind;
  displayId?: string;
  thumbnailDataUrl: string;
}

export interface PhysicalDisplay {
  id: string;
  label: string;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type QualityPresetId = 'balanced' | 'smooth' | 'crisp';

export interface QualityPreset {
  id: QualityPresetId;
  label: string;
  description: string;
  maxWidth: number;
  maxHeight: number;
  frameRate: number;
}

export const QUALITY_PRESETS: Record<QualityPresetId, QualityPreset> = {
  balanced: {
    id: 'balanced',
    label: 'Balanced (1080p · 30 fps)',
    description: 'Recommended for most Wi-Fi networks',
    maxWidth: 1920,
    maxHeight: 1080,
    frameRate: 30,
  },
  smooth: {
    id: 'smooth',
    label: 'Smooth (720p · 60 fps)',
    description: 'Lower resolution with fluid motion',
    maxWidth: 1280,
    maxHeight: 720,
    frameRate: 60,
  },
  crisp: {
    id: 'crisp',
    label: 'Crisp (Native · 30 fps)',
    description: 'Best text clarity for coding or reading',
    maxWidth: 3840,
    maxHeight: 2160,
    frameRate: 30,
  },
};

export interface VirtualDisplaySupport {
  supported: boolean;
  platform: string;
  sessionType: string;
  mode: 'hardware-or-dummy' | 'native-virtual' | 'window-fallback';
  summary: string;
  instructions: string[];
}

export interface VirtualDisplayResolution {
  width: number;
  height: number;
}

export interface VirtualDisplayState {
  active: boolean;
  supported: boolean;
  backend: 'gnome-wayland' | 'unsupported';
  width: number;
  height: number;
  nodeId?: number;
  error?: string;
}

export const VIRTUAL_DISPLAY_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1600 × 900 (HD+)', width: 1600, height: 900 },
  { label: '1280 × 720 (HD)', width: 1280, height: 720 },
  { label: '2560 × 1440 (QHD)', width: 2560, height: 1440 },
];
