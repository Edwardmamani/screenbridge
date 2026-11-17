import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { OutboundHostSignal } from '../../shared/types/signaling';
import type { BridgeState } from '../../shared/types/session';
import { listCaptureSources, listPhysicalDisplays } from '../display/displayService';
import { getVirtualDisplaySupport } from '../display/virtualDisplay';
import type { LocalServer } from '../server/localServer';
import type { SessionManager } from '../server/sessionManager';

export interface HandlerDependencies {
  getBridgeState: () => Promise<BridgeState>;
  setSelectedAddress: (address: string) => void;
  sessionManager: SessionManager;
  localServer: LocalServer;
  emitStateUpdate: () => Promise<void>;
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
    deps.localServer.disconnectClient(clientId, 'Disconnected by host');
    await deps.emitStateUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.SEND_SIGNAL, async (_event, payload: OutboundHostSignal) => {
    deps.localServer.sendToClient(payload.clientId, payload.signal);
  });
}
