import { desktopCapturer, screen } from 'electron';
import type { CaptureSource, PhysicalDisplay } from '../../shared/types/display';

/**
 * Lists physical and virtual displays currently recognized by the OS.
 */
export function listPhysicalDisplays(): PhysicalDisplay[] {
  const primaryId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display, index) => ({
    id: String(display.id),
    label: display.label || `Display ${index + 1}`,
    width: display.size.width,
    height: display.size.height,
    scaleFactor: display.scaleFactor,
    isPrimary: display.id === primaryId,
    bounds: { ...display.bounds },
  }));
}

/**
 * Lists capturable screens and application windows via Electron's desktopCapturer.
 */
export async function listCaptureSources(): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: false,
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    kind: source.id.startsWith('screen:') ? 'screen' : 'window',
    displayId: source.display_id || undefined,
    thumbnailDataUrl: source.thumbnail.isEmpty() ? '' : source.thumbnail.toDataURL(),
  }));
}
