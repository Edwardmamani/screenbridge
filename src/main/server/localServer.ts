import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  parseClientSignal,
  type RoutedClientSignal,
  type ServerToClientSignal,
} from '../../shared/types/signaling';
import type { FileLogger } from '../logging/logger';
import type { SessionManager } from './sessionManager';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export interface LocalServerCallbacks {
  onClientsChanged: () => void;
  onClientSignal: (payload: RoutedClientSignal) => void;
}

/**
 * Serves the static Browser Receiver SPA over HTTP and manages WebSocket
 * signaling connections from receiver devices on the local network.
 */
export class LocalServer {
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private readonly sockets = new Map<string, WebSocket>();
  private actualPort = 0;

  constructor(
    private readonly receiverDistDir: string,
    private readonly sessionManager: SessionManager,
    private readonly callbacks: LocalServerCallbacks,
    private readonly logger?: FileLogger,
  ) {}

  getPort(): number {
    return this.actualPort;
  }

  async start(preferredPort = 8900): Promise<number> {
    if (this.httpServer) {
      return this.actualPort;
    }

    this.httpServer = http.createServer((req, res) => {
      void this.handleHttpRequest(req, res);
    });

    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' });
    this.wss.on('connection', (socket, req) => {
      this.handleWebSocketConnection(socket, req);
    });

    this.actualPort = await this.listenWithFallback(preferredPort);
    this.logger?.info('server', `HTTP & WebSocket server listening on 0.0.0.0:${this.actualPort}`);
    return this.actualPort;
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets.values()) {
      socket.close(1000, 'Host shutting down');
    }
    this.sockets.clear();

    if (this.wss) {
      await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
      this.wss = null;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => this.httpServer?.close(() => resolve()));
      this.httpServer = null;
    }
    this.actualPort = 0;
  }

  sendToClient(clientId: string, signal: ServerToClientSignal): boolean {
    const socket = this.sockets.get(clientId);
    if (!socket || socket.readyState !== socket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(signal));
    return true;
  }

  disconnectClient(clientId: string, reason = 'Disconnected by host'): void {
    const socket = this.sockets.get(clientId);
    if (socket) {
      this.sendToClient(clientId, { type: 'stream-stopped', reason });
      socket.close(1000, reason);
      this.sockets.delete(clientId);
    }
    this.sessionManager.removeClient(clientId);
    this.callbacks.onClientsChanged();
  }

  private async listenWithFallback(preferredPort: number): Promise<number> {
    try {
      return await this.listenOnPort(preferredPort);
    } catch {
      return await this.listenOnPort(0);
    }
  }

  private listenOnPort(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = this.httpServer!;
      const onError = (err: Error) => {
        server.off('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.off('error', onError);
        const addr = server.address();
        resolve(typeof addr === 'object' && addr ? addr.port : port);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, '0.0.0.0');
    });
  }

  private async handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const rawUrl = req.url ?? '/';
    const urlPath = rawUrl.split('?')[0] ?? '/';
    const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const resolvedPath = path.resolve(this.receiverDistDir, relativePath);

    // Prevent path traversal outside the receiver static directory.
    if (!resolvedPath.startsWith(path.resolve(this.receiverDistDir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const data = await fs.readFile(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch {
      try {
        const indexHtml = await fs.readFile(path.join(this.receiverDistDir, 'index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(indexHtml);
      } catch {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ScreenBridge receiver bundle is not built yet.');
      }
    }
  }

  private handleWebSocketConnection(socket: WebSocket, req: http.IncomingMessage): void {
    const clientId = crypto.randomUUID();
    const remoteIp = req.socket.remoteAddress?.replace(/^::ffff:/, '') ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'Unknown browser';

    this.sockets.set(clientId, socket);
    this.sessionManager.registerConnection(clientId, remoteIp, userAgent);
    this.logger?.info('server', `WebSocket client connected (${clientId})`, {
      ip: remoteIp,
      userAgent,
    });

    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      requiresPin: this.sessionManager.isPinEnabled(),
    });
    this.callbacks.onClientsChanged();

    socket.on('message', (rawData) => {
      const signal = parseClientSignal(rawData.toString());
      if (!signal) {
        this.logger?.warn('server', `Malformed signaling message from ${clientId}`);
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Malformed signaling message',
        });
        return;
      }

      if (signal.type === 'client-log') {
        this.logger?.log(
          signal.level,
          `receiver:${clientId.slice(0, 8)}`,
          signal.message,
          signal.details,
        );
        return;
      }

      if (signal.type === 'join') {
        const result = this.sessionManager.handleJoin(clientId, signal.deviceName, signal.pin);
        if (!result) return;

        this.logger?.info('server', `Client join request (${clientId})`, {
          deviceName: signal.deviceName,
          status: result.initialStatus,
          reason: result.reason,
        });

        this.sendToClient(clientId, {
          type: 'auth-status',
          status: result.initialStatus === 'rejected' ? 'rejected' : 'pending',
          reason: result.reason,
        });
        this.callbacks.onClientsChanged();
        return;
      }

      const client = this.sessionManager.getClient(clientId);
      if (!client || (client.status !== 'approved' && client.status !== 'streaming')) {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Client is not approved to stream yet',
        });
        return;
      }

      if (signal.type === 'webrtc-answer') {
        this.sessionManager.markStreaming(clientId);
        this.callbacks.onClientsChanged();
      }

      this.callbacks.onClientSignal({ clientId, signal });
    });

    socket.on('error', (err) => {
      this.logger?.error('server', `WebSocket error on client ${clientId}`, err);
    });

    socket.on('close', () => {
      this.logger?.info('server', `WebSocket client disconnected (${clientId})`);
      this.sockets.delete(clientId);
      this.sessionManager.removeClient(clientId);
      this.callbacks.onClientsChanged();
    });
  }
}
