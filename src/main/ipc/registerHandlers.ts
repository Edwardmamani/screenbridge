import { app, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { VirtualDisplayResolution } from '../../shared/types/display';
import type { GpuPreferenceMode } from '../../shared/types/gpu';
import type { LogEntryInput } from '../../shared/types/logging';
import type { OutboundHostSignal } from '../../shared/types/signaling';
import type { BridgeState } from '../../shared/types/session';
import { listCaptureSources, listPhysicalDisplays } from '../display/displayService';
import type { DisplayLayoutManager } from '../display/displayLayoutManager';
import { getVirtualDisplaySupport } from '../display/virtualDisplay';
import type { VirtualDisplayManager } from '../display/virtualDisplayManager';
import { getGpuStatus, saveGpuPreference } from '../gpu/gpuService';
import type { FileLogger } from '../logging/logger';
import type { LocalServer } from '../server/localServer';
import type { SessionManager } from '../server/sessionManager';

export interface HandlerDependencies {
  getBridgeState: () => Promise<BridgeState>;
  setSelectedAddress: (address: string) => void;
  sessionManager: SessionManager;
  localServer: LocalServer;
  virtualDisplayManager: VirtualDisplayManager;
  displayLayoutManager: DisplayLayoutManager;
  gpuConfigPath: string;
  emitStateUpdate: () => Promise<void>;
  logger: FileLogger;
}

/**
 * Registers all typed IPC handlers between the Renderer UI and Main process.
 */
export function registerIpcHandlers(deps: HandlerDependencies): void {
  ipcMain.handle(IPC_CHANNELS.GET_BRIDGE_STATE, async () => {
    return deps.getBridgeState();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_CAPTURE_SOURCES, async () => {
    return listCaptureSources();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_DISPLAYS, async () => {
    return listPhysicalDisplays();
  });

  ipcMain.handle(IPC_CHANNELS.GET_VIRTUAL_DISPLAY_STATUS, async () => {
    return getVirtualDisplaySupport();
  });

  ipcMain.handle(IPC_CHANNELS.GET_VIRTUAL_DISPLAY_STATE, async () => {
    return deps.virtualDisplayManager.getState();
  });

  ipcMain.handle(
    IPC_CHANNELS.CREATE_VIRTUAL_DISPLAY,
    async (_event, resolution: VirtualDisplayResolution) => {
      const state = await deps.virtualDisplayManager.create(resolution);
      const layoutStatus = deps.displayLayoutManager.getStatus();
      if (state.active && layoutStatus.autoRestore && layoutStatus.hasSavedLayout) {
        setTimeout(() => {
          void deps.displayLayoutManager.applySavedLayout();
        }, 450);
      }
      return state;
    },
  );

  ipcMain.handle(IPC_CHANNELS.DESTROY_VIRTUAL_DISPLAY, async () => {
    return deps.virtualDisplayManager.destroy();
  });

  ipcMain.handle(IPC_CHANNELS.GET_DISPLAY_LAYOUT_STATUS, async () => {
    return deps.displayLayoutManager.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_DISPLAY_LAYOUT, async () => {
    return deps.displayLayoutManager.saveCurrentLayout();
  });

  ipcMain.handle(IPC_CHANNELS.APPLY_DISPLAY_LAYOUT, async () => {
    return deps.displayLayoutManager.applySavedLayout();
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_DISPLAY_LAYOUT, async () => {
    return deps.displayLayoutManager.clearSavedLayout();
  });

  ipcMain.handle(IPC_CHANNELS.SET_AUTO_RESTORE_LAYOUT, async (_event, enabled: boolean) => {
    return deps.displayLayoutManager.setAutoRestore(Boolean(enabled));
  });

  ipcMain.handle(IPC_CHANNELS.GET_GPU_STATUS, async () => {
    return getGpuStatus(deps.gpuConfigPath);
  });

  ipcMain.handle(IPC_CHANNELS.SET_GPU_PREFERENCE, async (_event, mode: GpuPreferenceMode) => {
    saveGpuPreference(deps.gpuConfigPath, mode);
    deps.logger.info('gpu', 'Saved GPU preference mode', { mode });
    return getGpuStatus(deps.gpuConfigPath);
  });

  ipcMain.handle(IPC_CHANNELS.RELAUNCH_APP, async () => {
    const currentMode = (await getGpuStatus(deps.gpuConfigPath)).preferenceMode;
    deps.logger.info('gpu', 'Relaunching ScreenBridge to apply GPU mode', { currentMode });
    if (currentMode === 'nvidia-offload' && process.platform === 'linux') {
      process.env.__NV_PRIME_RENDER_OFFLOAD = '1';
      process.env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
      process.env.__VK_LAYER_NV_optimus = 'NVIDIA_only';
    }
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle(IPC_CHANNELS.SET_SELECTED_INTERFACE, async (_event, address: string) => {
    deps.setSelectedAddress(address);
    await deps.emitStateUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.SET_PIN_ENABLED, async (_event, enabled: boolean) => {
    deps.sessionManager.setPinEnabled(Boolean(enabled));
    await deps.emitStateUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.REGENERATE_PIN, async () => {
    deps.sessionManager.regeneratePin();
    await deps.emitStateUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.APPROVE_CLIENT, async (_event, clientId: string) => {
    const client = deps.sessionManager.approveClient(clientId);
    if (client) {
      deps.logger.info('ipc', `Approved client ${clientId}`, { name: client.name });
      deps.localServer.sendToClient(clientId, {
        type: 'auth-status',
        status: 'approved',
      });
      await deps.emitStateUpdate();
    }
  });

  ipcMain.handle(IPC_CHANNELS.REJECT_CLIENT, async (_event, clientId: string) => {
    const client = deps.sessionManager.rejectClient(clientId);
    if (client) {
      deps.logger.info('ipc', `Rejected client ${clientId}`, { name: client.name });
      deps.localServer.sendToClient(clientId, {
        type: 'auth-status',
        status: 'rejected',
        reason: 'Connection rejected by host',
      });
      deps.localServer.disconnectClient(clientId, 'Connection rejected by host');
      await deps.emitStateUpdate();
    }
  });

  ipcMain.handle(IPC_CHANNELS.DISCONNECT_CLIENT, async (_event, clientId: string) => {
    deps.logger.info('ipc', `Disconnected client ${clientId}`);
    deps.localServer.disconnectClient(clientId, 'Disconnected by host');
    await deps.emitStateUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.SEND_SIGNAL, async (_event, payload: OutboundHostSignal) => {
    deps.localServer.sendToClient(payload.clientId, payload.signal);
  });

  ipcMain.handle(IPC_CHANNELS.LOG_EVENT, async (_event, entry: LogEntryInput) => {
    deps.logger.log(entry.level, entry.source, entry.message, entry.details);
  });
}
