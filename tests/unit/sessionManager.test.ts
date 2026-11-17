import { describe, expect, it } from 'vitest';
import { SessionManager } from '../../src/main/server/sessionManager';

describe('SessionManager', () => {
  it('registers a new client in pending status and updates name on join', () => {
    const manager = new SessionManager('1234');
    manager.registerConnection('c1', '192.168.1.50', 'Mozilla/5.0');

    const joinResult = manager.handleJoin('c1', 'iPad Pro');
    expect(joinResult).not.toBeNull();
    expect(joinResult?.initialStatus).toBe('pending');
    expect(joinResult?.client.name).toBe('iPad Pro');
  });

  it('rejects join attempts with an invalid PIN when PIN protection is enabled', () => {
    const manager = new SessionManager('4321');
    manager.setPinEnabled(true);
    manager.registerConnection('c1', '192.168.1.50', 'Mozilla/5.0');

    const failed = manager.handleJoin('c1', 'Pixel Tablet', '0000');
    expect(failed?.initialStatus).toBe('rejected');
    expect(failed?.reason).toBe('Invalid PIN code');

    const succeeded = manager.handleJoin('c1', 'Pixel Tablet', '4321');
    expect(succeeded?.initialStatus).toBe('pending');
  });

  it('transitions client lifecycle from pending -> approved -> streaming -> removed', () => {
    const manager = new SessionManager('9999');
    manager.registerConnection('c1', '10.0.0.12', 'Safari');
    manager.handleJoin('c1', 'MacBook');

    const approved = manager.approveClient('c1');
    expect(approved?.status).toBe('approved');

    const streaming = manager.markStreaming('c1');
    expect(streaming?.status).toBe('streaming');

    expect(manager.removeClient('c1')).toBe(true);
    expect(manager.listClients()).toHaveLength(0);
  });
});
