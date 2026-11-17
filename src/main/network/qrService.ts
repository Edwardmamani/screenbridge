import QRCode from 'qrcode';

/**
 * Generates a PNG data URL QR code for the given connection URL.
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
