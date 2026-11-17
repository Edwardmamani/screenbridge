import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc';
import type {
  CaptureSource,
  PhysicalDisplay,
  VirtualDisplaySupport,
} from '../shared/types/display';
import type { BridgeState } from '../shared/types/session';
import type { OutboundHostSignal, RoutedClientSignal } from '../shared/types/signaling';

export interface ScreenBridgeApi {
  getBridgeState: () => Promise<BridgeState>;
  listCaptureSources: () => Promise<CaptureSource[]>;
  listDisplays: () => Promise<PhysicalDisplay[]>;
  getVirtualDisplayStatus: () => Promise<VirtualDisplaySupport>;
  setSelectedInterface: (address: string) => Promise<void>;
  setPinEnabled: (enabled: boolean) => Promise<void>;
  regeneratePin: () => Promise<void>;
  approveClient: (clientId: string) => Promise<void>;
  rejectClient: (clientId: string) => Promise<void>;
  disconnectClient: (clientId: string) => Promise<void>;
  sendSignal: (payload: OutboundHostSignal) => Promise<void>;
  onStateUpdated: (listener: (state: BridgeState) => void) => () => void;
  onClientSignal: (listener: (payload: RoutedClientSignal) => void) => () => void;
  onDisplaysUpdated: (listener: (displays: PhysicalDisplay[]) => void) => () => void;
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
  setSelectedInterface: (address) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SELECTED_INTERFACE, address),
  setPinEnabled: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.SET_PIN_ENABLED, enabled),
  regeneratePin: () => ipcRenderer.invoke(IPC_CHANNELS.REGENERATE_PIN),
  approveClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_CLIENT, clientId),
  rejectClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_CLIENT, clientId),
  disconnectClient: (clientId) => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_CLIENT, clientId),
  sendSignal: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SEND_SIGNAL, payload),
  onStateUpdated: (listener) => subscribe(IPC_CHANNELS.STATE_UPDATED, listener),
  onClientSignal: (listener) => subscribe(IPC_CHANNELS.CLIENT_SIGNAL, listener),
  onDisplaysUpdated: (listener) => subscribe(IPC_CHANNELS.DISPLAYS_UPDATED, listener),
};

contextBridge.exposeInMainWorld('screenBridge', api);
