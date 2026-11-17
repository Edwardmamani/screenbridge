import path from 'node:path';
import { app, BrowserWindow, desktopCapturer, screen, session } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc';
import type { BridgeState } from '../shared/types/session';
import { listPhysicalDisplays } from './display/displayService';
import { registerIpcHandlers } from './ipc/registerHandlers';
import { FileLogger } from './logging/logger';
import {
  buildConnectionUrl,
  getLocalNetworkInterfaces,
  pickDefaultAddress,
} from './network/networkInfo';
import { generateQrDataUrl } from './network/qrService';
import { LocalServer } from './server/localServer';
import { SessionManager } from './server/sessionManager';

let mainWindow: BrowserWindow | null = null;
let selectedAddress = '';

const logFilePath = app.isPackaged
  ? path.join(app.getPath('userData'), 'log.txt')
  : path.resolve(process.cwd(), 'log.txt');
const logger = new FileLogger(logFilePath);
logger.rotateIfExceeds();

const sessionManager = new SessionManager();

const receiverDistDir = path.resolve(__dirname, '../../../dist/receiver');

const localServer = new LocalServer(
  receiverDistDir,
  sessionManager,
  {
    onClientsChanged: () => {
      void emitBridgeStateUpdate();
    },
    onClientSignal: (payload) => {
      mainWindow?.webContents.send(IPC_CHANNELS.CLIENT_SIGNAL, payload);
    },
  },
  logger,
);

process.on('uncaughtException', (err) => {
  logger.error('main', 'Uncaught exception', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('main', 'Unhandled promise rejection', reason);
});

async function buildBridgeState(): Promise<BridgeState> {
  const interfaces = getLocalNetworkInterfaces();
  const hasSelected = interfaces.some((iface) => iface.address === selectedAddress);
  if (!hasSelected) {
    selectedAddress = pickDefaultAddress(interfaces);
  }

  const port = localServer.getPort();
  const connectionUrl = buildConnectionUrl(selectedAddress, port);
  const qrDataUrl = await generateQrDataUrl(connectionUrl);

  return {
    port,
    interfaces,
    selectedAddress,
    connectionUrl,
    qrDataUrl,
    pinEnabled: sessionManager.isPinEnabled(),
    pinCode: sessionManager.getPinCode(),
    clients: sessionManager.listClients(),
  };
}

async function emitBridgeStateUpdate(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const state = await buildBridgeState();
  mainWindow.webContents.send(IPC_CHANNELS.STATE_UPDATED, state);
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: 'ScreenBridge',
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    win.loadURL(devServerUrl).catch(() => {
      void win.loadFile(path.resolve(__dirname, '../../../dist/renderer/index.html'));
    });
  } else {
    void win.loadFile(path.resolve(__dirname, '../../../dist/renderer/index.html'));
  }

  return win;
}

void app.whenReady().then(async () => {
  logger.info('main', 'ScreenBridge starting', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    sessionType: process.env.XDG_SESSION_TYPE ?? 'unknown',
    electron: process.versions.electron,
    node: process.versions.node,
    logFile: logger.getFilePath(),
  });

  // Enable system display picker fallback when getDisplayMedia is used (e.g. Wayland PipeWire).
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        if (sources[0]) {
          logger.info('display', 'setDisplayMediaRequestHandler resolved source', {
            id: sources[0].id,
            name: sources[0].name,
          });
          callback({ video: sources[0] });
        } else {
          logger.warn('display', 'setDisplayMediaRequestHandler found no capture sources');
          callback({});
        }
      } catch (err) {
        logger.error('display', 'setDisplayMediaRequestHandler failed', err);
        callback({});
      }
    },
    { useSystemPicker: true },
  );

  await localServer.start(8900);

  registerIpcHandlers({
    getBridgeState: buildBridgeState,
    setSelectedAddress: (address) => {
      selectedAddress = address;
    },
    sessionManager,
    localServer,
    emitStateUpdate: emitBridgeStateUpdate,
    logger,
  });

  mainWindow = createMainWindow();
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('renderer', 'Renderer process gone', details);
  });

  const notifyDisplayChanges = () => {
    mainWindow?.webContents.send(IPC_CHANNELS.DISPLAYS_UPDATED, listPhysicalDisplays());
  };
  screen.on('display-added', notifyDisplayChanges);
  screen.on('display-removed', notifyDisplayChanges);
  screen.on('display-metrics-changed', notifyDisplayChanges);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void localServer.stop();
});
