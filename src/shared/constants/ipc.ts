/**
 * Centralized Electron IPC channel names shared between main, preload, and renderer.
 */
export const IPC_CHANNELS = {
  GET_BRIDGE_STATE: 'bridge:get-state',
  LIST_CAPTURE_SOURCES: 'bridge:list-capture-sources',
  LIST_DISPLAYS: 'bridge:list-displays',
  GET_VIRTUAL_DISPLAY_STATUS: 'bridge:get-virtual-display-status',
  SET_SELECTED_INTERFACE: 'bridge:set-selected-interface',
  SET_PIN_ENABLED: 'bridge:set-pin-enabled',
  REGENERATE_PIN: 'bridge:regenerate-pin',
  APPROVE_CLIENT: 'bridge:approve-client',
  REJECT_CLIENT: 'bridge:reject-client',
  DISCONNECT_CLIENT: 'bridge:disconnect-client',
  SEND_SIGNAL: 'bridge:send-signal',

  // Main -> Renderer push events
  STATE_UPDATED: 'bridge:state-updated',
  CLIENT_SIGNAL: 'bridge:client-signal',
  DISPLAYS_UPDATED: 'bridge:displays-updated',
} as const;
