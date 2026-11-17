/**
 * Centralized Electron IPC channel names shared between main, preload, and renderer.
 */
export const IPC_CHANNELS = {
  GET_BRIDGE_STATE: 'bridge:get-state',
  LIST_CAPTURE_SOURCES: 'bridge:list-capture-sources',
  LIST_DISPLAYS: 'bridge:list-displays',
  GET_VIRTUAL_DISPLAY_STATUS: 'bridge:get-virtual-display-status',
  GET_VIRTUAL_DISPLAY_STATE: 'bridge:get-virtual-display-state',
  CREATE_VIRTUAL_DISPLAY: 'bridge:create-virtual-display',
  DESTROY_VIRTUAL_DISPLAY: 'bridge:destroy-virtual-display',
  GET_DISPLAY_LAYOUT_STATUS: 'bridge:get-display-layout-status',
  SAVE_DISPLAY_LAYOUT: 'bridge:save-display-layout',
  APPLY_DISPLAY_LAYOUT: 'bridge:apply-display-layout',
  CLEAR_DISPLAY_LAYOUT: 'bridge:clear-display-layout',
  SET_AUTO_RESTORE_LAYOUT: 'bridge:set-auto-restore-layout',
  GET_GPU_STATUS: 'bridge:get-gpu-status',
  SET_GPU_PREFERENCE: 'bridge:set-gpu-preference',
  RELAUNCH_APP: 'bridge:relaunch-app',
  SET_SELECTED_INTERFACE: 'bridge:set-selected-interface',
  SET_PIN_ENABLED: 'bridge:set-pin-enabled',
  REGENERATE_PIN: 'bridge:regenerate-pin',
  APPROVE_CLIENT: 'bridge:approve-client',
  REJECT_CLIENT: 'bridge:reject-client',
  DISCONNECT_CLIENT: 'bridge:disconnect-client',
  SEND_SIGNAL: 'bridge:send-signal',
  LOG_EVENT: 'bridge:log-event',

  // Main -> Renderer push events
  STATE_UPDATED: 'bridge:state-updated',
  CLIENT_SIGNAL: 'bridge:client-signal',
  DISPLAYS_UPDATED: 'bridge:displays-updated',
  VIRTUAL_DISPLAY_UPDATED: 'bridge:virtual-display-updated',
} as const;
