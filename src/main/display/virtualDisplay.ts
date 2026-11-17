import type { VirtualDisplaySupport } from '../../shared/types/display';

/**
 * Reports platform capabilities and actionable setup options for extending
 * the desktop onto a virtual monitor (similar to Deskreen's extend mode).
 */
export function getVirtualDisplaySupport(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): VirtualDisplaySupport {
  const sessionType = env.XDG_SESSION_TYPE ?? (platform === 'linux' ? 'unknown' : 'native');

  if (platform === 'linux' && sessionType === 'wayland') {
    const desktop = (env.XDG_CURRENT_DESKTOP ?? '').toLowerCase();
    if (desktop.includes('gnome')) {
      return {
        supported: true,
        platform,
        sessionType,
        mode: 'native-virtual',
        summary:
          'GNOME Wayland supports software virtual displays via Mutter ScreenCast + PipeWire.',
        instructions: [
          'Click "Create Virtual Display" below to add a software extended monitor.',
          'Once created, select the new screen in "Share Screen or Window" (or System Picker).',
        ],
      };
    }

    return {
      supported: false,
      platform,
      sessionType,
      mode: 'window-fallback',
      summary:
        'This Wayland compositor restricts programmatic virtual monitors without compositor privileges.',
      instructions: [
        'Option A (Recommended): Plug in an inexpensive HDMI or DisplayPort dummy plug to create a hardware-backed extended display.',
        'Option B: Share a single application window in ScreenBridge to use your tablet or second device as a dedicated workspace.',
      ],
    };
  }

  if (platform === 'linux') {
    return {
      supported: true,
      platform,
      sessionType,
      mode: 'hardware-or-dummy',
      summary: 'X11 supports virtual outputs via xrandr or an HDMI/DisplayPort dummy plug.',
      instructions: [
        'Connect an HDMI/DisplayPort dummy plug for plug-and-play extended displays.',
        'Or configure a virtual X11 output with xrandr --addmode on a disconnected port.',
      ],
    };
  }

  return {
    supported: true,
    platform,
    sessionType,
    mode: 'hardware-or-dummy',
    summary:
      'Use a physical monitor, HDMI/DP dummy plug, or OS virtual display driver to extend your desktop.',
    instructions: [
      'Connect an HDMI/DisplayPort dummy plug or enable a virtual display driver.',
      'Select the newly detected display in ScreenBridge to stream it over Wi-Fi.',
    ],
  };
}
