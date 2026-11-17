import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type {
  DisplayLayoutStatus,
  SavedDisplayLayout,
  SavedMonitorLayoutEntry,
} from '../../shared/types/display';
import type { FileLogger } from '../logging/logger';
import { detectVirtualDisplayBackend } from './virtualDisplayManager';

const execFileAsync = promisify(execFile);

export function loadSavedLayout(layoutFilePath: string): SavedDisplayLayout | null {
  try {
    const raw = fs.readFileSync(layoutFilePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SavedDisplayLayout>;
    if (!Array.isArray(parsed.monitors)) return null;
    return {
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      autoRestore: parsed.autoRestore !== false,
      monitors: parsed.monitors,
    };
  } catch {
    return null;
  }
}

export function writeSavedLayout(layoutFilePath: string, layout: SavedDisplayLayout): void {
  fs.mkdirSync(path.dirname(layoutFilePath), { recursive: true });
  fs.writeFileSync(layoutFilePath, JSON.stringify(layout, null, 2), 'utf8');
}

/**
 * Persists and restores GNOME/Wayland monitor positions so virtual displays
 * return to their previous coordinates across sessions.
 */
export class DisplayLayoutManager {
  private lastError: string | undefined;

  constructor(
    private readonly layoutFilePath: string,
    private readonly helperScriptPath: string,
    private readonly logger: FileLogger,
  ) {}

  isSupported(): boolean {
    return detectVirtualDisplayBackend() === 'gnome-wayland';
  }

  getStatus(): DisplayLayoutStatus {
    const saved = loadSavedLayout(this.layoutFilePath);
    return {
      supported: this.isSupported(),
      hasSavedLayout: Boolean(saved && saved.monitors.length > 0),
      autoRestore: saved ? saved.autoRestore : true,
      savedMonitorCount: saved?.monitors.length ?? 0,
      savedAt: saved?.savedAt ?? null,
      lastError: this.lastError,
    };
  }

  setAutoRestore(enabled: boolean): DisplayLayoutStatus {
    const existing = loadSavedLayout(this.layoutFilePath) ?? {
      savedAt: Date.now(),
      autoRestore: enabled,
      monitors: [],
    };
    existing.autoRestore = enabled;
    writeSavedLayout(this.layoutFilePath, existing);
    this.logger.info('display-layout', `Set auto-restore layout: ${enabled}`);
    return this.getStatus();
  }

  async saveCurrentLayout(): Promise<DisplayLayoutStatus> {
    if (!this.isSupported()) {
      this.lastError = 'Display layout persistence is only supported on GNOME Wayland.';
      return this.getStatus();
    }

    try {
      const { stdout } = await execFileAsync('python3', [this.helperScriptPath, 'get'], {
        timeout: 4000,
      });
      const parsed = JSON.parse(stdout) as {
        monitors?: Array<{
          connector: string;
          x: number;
          y: number;
          scale: number;
          transform: number;
          primary: boolean;
        }>;
      };

      const monitors: SavedMonitorLayoutEntry[] = (parsed.monitors ?? []).map((m) => ({
        connector: m.connector,
        x: m.x,
        y: m.y,
        scale: m.scale,
        transform: m.transform,
        primary: m.primary,
      }));

      const existing = loadSavedLayout(this.layoutFilePath);
      const layout: SavedDisplayLayout = {
        savedAt: Date.now(),
        autoRestore: existing ? existing.autoRestore : true,
        monitors,
      };
      writeSavedLayout(this.layoutFilePath, layout);
      this.lastError = undefined;
      this.logger.info('display-layout', 'Saved current display layout', {
        count: monitors.length,
        monitors,
      });
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.logger.error('display-layout', 'Failed to save display layout', this.lastError);
    }

    return this.getStatus();
  }

  async applySavedLayout(): Promise<DisplayLayoutStatus> {
    if (!this.isSupported()) {
      return this.getStatus();
    }

    const saved = loadSavedLayout(this.layoutFilePath);
    if (!saved || saved.monitors.length === 0) {
      return this.getStatus();
    }

    try {
      const { stdout } = await execFileAsync(
        'python3',
        [this.helperScriptPath, 'apply', this.layoutFilePath],
        { timeout: 5000 },
      );
      this.lastError = undefined;
      this.logger.info('display-layout', 'Applied saved display layout', stdout.trim());
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.logger.error('display-layout', 'Failed to apply saved display layout', this.lastError);
    }

    return this.getStatus();
  }

  clearSavedLayout(): DisplayLayoutStatus {
    try {
      fs.unlinkSync(this.layoutFilePath);
    } catch {
      // Nothing to delete.
    }
    this.lastError = undefined;
    this.logger.info('display-layout', 'Cleared saved display layout');
    return this.getStatus();
  }
}
