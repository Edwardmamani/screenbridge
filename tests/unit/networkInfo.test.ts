import type os from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  buildConnectionUrl,
  getLocalNetworkInterfaces,
  pickDefaultAddress,
} from '../../src/main/network/networkInfo';

function makeIface(address: string, internal = false): os.NetworkInterfaceInfo {
  return {
    address,
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal,
    cidr: `${address}/24`,
  };
}

describe('networkInfo', () => {
  it('filters out internal/IPv6 interfaces and prioritizes physical LAN over docker bridges', () => {
    const interfaces = getLocalNetworkInterfaces({
      lo: [makeIface('127.0.0.1', true)],
      docker0: [makeIface('172.17.0.1')],
      wlan0: [makeIface('192.168.1.42')],
    });

    expect(interfaces).toHaveLength(2);
    expect(interfaces[0]?.name).toBe('wlan0');
    expect(pickDefaultAddress(interfaces)).toBe('192.168.1.42');
  });

  it('falls back to 127.0.0.1 when no external interfaces are available', () => {
    expect(pickDefaultAddress([])).toBe('127.0.0.1');
  });

  it('builds a valid HTTP connection URL', () => {
    expect(buildConnectionUrl('192.168.1.42', 8900)).toBe('http://192.168.1.42:8900');
  });
});
