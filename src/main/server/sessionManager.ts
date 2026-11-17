import crypto from 'node:crypto';
import type { ClientStatus, ConnectedClient } from '../../shared/types/session';

export interface JoinRequestResult {
  client: ConnectedClient;
  initialStatus: ClientStatus;
  reason?: string;
}

/**
 * Pure, testable session state manager for connected receiver devices.
 * Handles PIN validation, host approval, and client lifecycle.
 */
export class SessionManager {
  private readonly clients = new Map<string, ConnectedClient>();
  private pinEnabled = false;
  private pinCode: string;

  constructor(initialPin?: string) {
    this.pinCode = initialPin ?? SessionManager.generatePin();
  }

  static generatePin(): string {
    return crypto.randomInt(1000, 10000).toString();
  }

  isPinEnabled(): boolean {
    return this.pinEnabled;
  }

  setPinEnabled(enabled: boolean): void {
    this.pinEnabled = enabled;
  }

  getPinCode(): string {
    return this.pinCode;
  }

  regeneratePin(): string {
    this.pinCode = SessionManager.generatePin();
    return this.pinCode;
  }

  /**
   * Registers a newly opened WebSocket client in `pending` state before `join`.
   */
  registerConnection(id: string, ip: string, userAgent: string): ConnectedClient {
    const client: ConnectedClient = {
      id,
      name: 'Connecting device...',
      userAgent,
      ip,
      status: 'pending',
      connectedAt: Date.now(),
    };
    this.clients.set(id, client);
    return client;
  }

  /**
   * Processes a `join` message from a receiver client, checking the PIN when enabled.
   */
  handleJoin(id: string, deviceName: string, providedPin?: string): JoinRequestResult | null {
    const existing = this.clients.get(id);
    if (!existing) return null;

    existing.name = deviceName.trim() || 'Browser Device';

    if (this.pinEnabled && providedPin !== this.pinCode) {
      existing.status = 'rejected';
      return {
        client: { ...existing },
        initialStatus: 'rejected',
        reason: 'Invalid PIN code',
      };
    }

    existing.status = 'pending';
    return {
      client: { ...existing },
      initialStatus: 'pending',
    };
  }

  approveClient(id: string): ConnectedClient | null {
    const client = this.clients.get(id);
    if (!client) return null;
    client.status = 'approved';
    return { ...client };
  }

  markStreaming(id: string): ConnectedClient | null {
    const client = this.clients.get(id);
    if (!client) return null;
    client.status = 'streaming';
    return { ...client };
  }

  rejectClient(id: string): ConnectedClient | null {
    const client = this.clients.get(id);
    if (!client) return null;
    client.status = 'rejected';
    return { ...client };
  }

  removeClient(id: string): boolean {
    return this.clients.delete(id);
  }

  getClient(id: string): ConnectedClient | undefined {
    const client = this.clients.get(id);
    return client ? { ...client } : undefined;
  }

  listClients(): ConnectedClient[] {
    return Array.from(this.clients.values()).map((client) => ({ ...client }));
  }
}
