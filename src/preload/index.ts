import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc';
import type {
  CaptureSource,
  PhysicalDisplay,
  VirtualDisplayResolution,
  VirtualDisplayState,
  VirtualDisplaySupport,
} from '../shared/types/display';
import type { GpuPreferenceMode, GpuStatus } from '../shared/types/gpu';
import type { LogEntryInput } from '../shared/types/logging';
import type { BridgeState } from '../shared/types/session';
import type { OutboundHostSignal, RoutedClientSignal } from '../shared/types/signaling';

export interface ScreenBridgeApi {
  getBridgeState: () => Promise<BridgeState>;
  listCaptureSources: () => Promise<CaptureSource[]>;
  listDisplays: () => Promise<PhysicalDisplay[]>;
  getVirtualDisplayStatus: () => Promise<VirtualDisplaySupport>;
  getVirtualDisplayState: () => Promise<VirtualDisplayState>;
  createVirtualDisplay: (resolution: VirtualDisplayResolution) => Promise<VirtualDisplayState>;
  destroyVirtualDisplay: () => Promise<VirtualDisplayState>;
  getGpuStatus: () => Promise<GpuStatus>;
  setGpuPreference: (mode: GpuPreferenceMode) => Promise<GpuStatus>;
  relaunchApp: () => Promise<void>;
  setSelectedInterface: (address: string) => Promise<void>;
  setPinEnabled: (enabled: boolean) => Promise<void>;
  regeneratePin: () => Promise<void>;
  approveClient: (clientId: string) => Promise<void>;
  rejectClient: (clientId: string) => Promise<void>;
  disconnectClient: (clientId: string) => Promise<void>;
  sendSignal: (payload: OutboundHostSignal) => Promise<void>;
  logEvent: (entry: LogEntryInput) => Promise<void>;
  onStateUpdated: (listener: (state: BridgeState) => void) => () => void;
  onClientSignal: (listener: (payload: RoutedClientSignal) => void) => () => void;
  onDisplaysUpdated: (listener: (displays: PhysicalDisplay[]) => void) => () => void;
  onVirtualDisplayUpdated: (listener: (state: VirtualDisplayState) => void) => () => void;
}

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T) => {
    listener(payload);
  };
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

const api: ScreenBridgeApi = {
  getBridgeState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_BRIDGE_STATE),
  listCaptureSources: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_CAPTURE_SOURCES),
  listDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_DISPLAYS),
  getVirtualDisplayStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VIRTUAL_DISPLAY_STATUS),
  getVirtualDisplayState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VIRTUAL_DISPLAY_STATE),
  createVirtualDisplay: (resolution) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_VIRTUAL_DISPLAY, resolution),
  destroyVirtualDisplay: () => ipcRenderer.invoke(IPC_CHANNELS.DESTROY_VIRTUAL_DISPLAY),
  getGpuStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_GPU_STATUS),
  setGpuPreference: (mode) => ipcRenderer.invoke(IPC_CHANNELS.SET_GPU_PREFERENCE, mode),
  relaunchApp: () => ipcRenderer.invoke(IPC_CHANNELS.RELAUNCH_APP),
  setSelectedInterface: (address) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SELECTED_INTERFACE, address),
  setPinEnabled: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.SET_PIN_ENABLED, enabled),
  regeneratePin: () => ipcRenderer.invoke(IPC_CHANNELS.REGENERATE_PIN),
  approveClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_CLIENT, clientId),
  rejectClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_CLIENT, clientId),
  disconnectClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_CLIENT, clientId),
  sendSignal: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SEND_SIGNAL, payload),
  logEvent: (entry) => ipcRenderer.invoke(IPC_CHANNELS.LOG_EVENT, entry),
  onStateUpdated: (listener) => subscribe(IPC_CHANNELS.STATE_UPDATED, listener),
  onClientSignal: (listener) => subscribe(IPC_CHANNELS.CLIENT_SIGNAL, listener),
  onDisplaysUpdated: (listener) => subscribe(IPC_CHANNELS.DISPLAYS_UPDATED, listener),
  onVirtualDisplayUpdated: (listener) => subscribe(IPC_CHANNELS.VIRTUAL_DISPLAY_UPDATED, listener),
};

contextBridge.exposeInMainWorld('screenBridge', api);
