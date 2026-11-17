import { describe, expect, it } from 'vitest';
import { getVirtualDisplaySupport } from '../../src/main/display/virtualDisplay';
import { detectVirtualDisplayBackend } from '../../src/main/display/virtualDisplayManager';

describe('virtualDisplay', () => {
  it('detects gnome-wayland backend when running GNOME on Wayland', () => {
    const env = { XDG_SESSION_TYPE: 'wayland', XDG_CURRENT_DESKTOP: 'GNOME' };
    expect(detectVirtualDisplayBackend('linux', env)).toBe('gnome-wayland');

    const support = getVirtualDisplaySupport('linux', env);
    expect(support.supported).toBe(true);
    expect(support.mode).toBe('native-virtual');
  });

  it('reports unsupported software virtual backend on non-GNOME Wayland compositors', () => {
    const env = { XDG_SESSION_TYPE: 'wayland', XDG_CURRENT_DESKTOP: 'sway' };
    expect(detectVirtualDisplayBackend('linux', env)).toBe('unsupported');

    const support = getVirtualDisplaySupport('linux', env);
    expect(support.supported).toBe(false);
    expect(support.mode).toBe('window-fallback');
  });
});
