import os from 'node:os';
import type { NetworkInterfaceInfo } from '../../shared/types/session';

const VIRTUAL_INTERFACE_PREFIXES = ['docker', 'br-', 'veth', 'virbr', 'tun', 'tap', 'wg', 'tailscale'];

/**
 * Checks whether an interface name looks like a container/VPN bridge rather than a LAN adapter.
 */
export function isVirtualInterfaceName(name: string): boolean {
  const lower = name.toLowerCase();
  return VIRTUAL_INTERFACE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Returns all non-internal IPv4 network interfaces on this machine.
 * Physical LAN/Wi-Fi adapters are sorted ahead of virtual bridges.
 */
export function getLocalNetworkInterfaces(
  interfacesMap: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): NetworkInterfaceInfo[] {
  const results: NetworkInterfaceInfo[] = [];

  for (const [name, entries] of Object.entries(interfacesMap)) {
    if (!entries) continue;

    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      results.push({
        name,
        address: entry.address,
        family: 'IPv4',
        internal: false,
      });
    }
  }

  return results.sort((a, b) => {
    const aVirtual = isVirtualInterfaceName(a.name) ? 1 : 0;
    const bVirtual = isVirtualInterfaceName(b.name) ? 1 : 0;
    if (aVirtual !== bVirtual) return aVirtual - bVirtual;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Picks the most appropriate LAN IPv4 address for mobile/tablet pairing.
 */
export function pickDefaultAddress(interfaces: NetworkInterfaceInfo[]): string {
  if (interfaces.length === 0) {
    return '127.0.0.1';
  }
  const preferred = interfaces.find((item) => !isVirtualInterfaceName(item.name));
  return (preferred ?? interfaces[0])!.address;
}

/**
 * Builds the HTTP URL that receiver devices open in their browser.
 */
export function buildConnectionUrl(address: string, port: number): string {
  return `http://${address}:${port}`;
}
