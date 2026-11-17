export type ClientStatus = 'pending' | 'approved' | 'streaming' | 'rejected';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: 'IPv4';
  internal: boolean;
}

export interface ConnectedClient {
  id: string;
  name: string;
  userAgent: string;
  ip: string;
  status: ClientStatus;
  connectedAt: number;
}

export interface BridgeState {
  port: number;
  interfaces: NetworkInterfaceInfo[];
  selectedAddress: string;
  connectionUrl: string;
  qrDataUrl: string;
  pinEnabled: boolean;
  pinCode: string;
  clients: ConnectedClient[];
}
