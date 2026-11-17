import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';
import type { VirtualDisplayResolution, VirtualDisplayState } from '../../shared/types/display';
import type { FileLogger } from '../logging/logger';

export function detectVirtualDisplayBackend(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): 'gnome-wayland' | 'unsupported' {
  const sessionType = (env.XDG_SESSION_TYPE ?? '').toLowerCase();
  const desktop = (env.XDG_CURRENT_DESKTOP ?? '').toLowerCase();
  if (platform === 'linux' && sessionType === 'wayland' && desktop.includes('gnome')) {
    return 'gnome-wayland';
  }
  return 'unsupported';
}

/**
 * Manages the lifecycle of a software-backed virtual display so the OS
 * treats a connected browser device as an extended monitor.
 */
export class VirtualDisplayManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private state: VirtualDisplayState;

  constructor(
    private readonly helperScriptPath: string,
    private readonly logger: FileLogger,
    private readonly onStateChanged: (state: VirtualDisplayState) => void,
  ) {
    const backend = detectVirtualDisplayBackend();
    this.state = {
      active: false,
      supported: backend !== 'unsupported',
      backend,
      width: 1920,
      height: 1080,
    };
  }

  getState(): VirtualDisplayState {
    return { ...this.state };
  }

  async create(resolution: VirtualDisplayResolution): Promise<VirtualDisplayState> {
    if (!this.state.supported) {
      return this.updateState({
        active: false,
        error: 'Software virtual displays are currently supported on GNOME Wayland only.',
      });
    }

    await this.destroy();

    const width = Math.max(640, Math.min(3840, Math.round(resolution.width)));
    const height = Math.max(480, Math.min(2160, Math.round(resolution.height)));

    this.logger.info('virtual-display', 'Creating GNOME Wayland virtual display', {
      width,
      height,
      script: this.helperScriptPath,
    });

    return new Promise((resolve) => {
      const child = spawn(
        'python3',
        [this.helperScriptPath, '--width', String(width), '--height', String(height)],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      this.child = child;

      let settled = false;
      const rl = readline.createInterface({ input: child.stdout });

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          const next = this.updateState({
            active: false,
            error: 'Timed out waiting for GNOME Mutter virtual display.',
          });
          void this.destroy();
          resolve(next);
        }
      }, 6000);

      rl.on('line', (line) => {
        try {
          const event = JSON.parse(line) as {
            event: string;
            nodeId?: number;
            message?: string;
          };
          if (event.event === 'ready' && !settled) {
            settled = true;
            clearTimeout(timeout);
            this.logger.info('virtual-display', 'Virtual display ready', {
              nodeId: event.nodeId,
              width,
              height,
            });
            resolve(
              this.updateState({
                active: true,
                width,
                height,
                nodeId: event.nodeId,
                error: undefined,
              }),
            );
          } else if (event.event === 'error') {
            this.logger.error('virtual-display', 'Helper reported error', event.message);
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              resolve(
                this.updateState({
                  active: false,
                  error: event.message ?? 'Failed to create virtual display',
                }),
              );
            }
          }
        } catch {
          this.logger.debug('virtual-display', 'Helper stdout', line);
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) {
          this.logger.warn('virtual-display', 'Helper stderr', msg);
        }
      });

      child.on('exit', (code, signal) => {
        this.logger.info('virtual-display', 'Virtual display helper exited', { code, signal });
        if (this.child === child) {
          this.child = null;
        }
        const wasActive = this.state.active;
        const next = this.updateState({
          active: false,
          nodeId: undefined,
          error: !settled ? `Virtual display helper exited (${code ?? signal})` : this.state.error,
        });
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(next);
        } else if (wasActive) {
          this.onStateChanged(next);
        }
      });
    });
  }

  async destroy(): Promise<VirtualDisplayState> {
    if (!this.child) {
      return this.updateState({ active: false, nodeId: undefined });
    }

    const proc = this.child;
    this.child = null;
    this.logger.info('virtual-display', 'Stopping virtual display helper');

    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 2000);

      proc.once('exit', () => {
        clearTimeout(killTimer);
        resolve();
      });
      proc.kill('SIGTERM');
    });

    return this.updateState({ active: false, nodeId: undefined, error: undefined });
  }

  private updateState(partial: Partial<VirtualDisplayState>): VirtualDisplayState {
    this.state = { ...this.state, ...partial };
    this.onStateChanged(this.state);
    return { ...this.state };
  }
}
