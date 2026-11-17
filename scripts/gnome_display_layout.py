#!/usr/bin/env python3
"""
Reads and applies monitor layout positions on GNOME/Wayland via
org.gnome.Mutter.DisplayConfig D-Bus API.
"""
import argparse
import json
import sys

import gi

gi.require_version('Gio', '2.0')
from gi.repository import Gio, GLib  # noqa: E402


def get_proxy() -> Gio.DBusProxy:
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    return Gio.DBusProxy.new_sync(
        bus,
        Gio.DBusProxyFlags.NONE,
        None,
        'org.gnome.Mutter.DisplayConfig',
        '/org/gnome/Mutter/DisplayConfig',
        'org.gnome.Mutter.DisplayConfig',
        None,
    )


def is_virtual_connector(connector: str) -> bool:
    lower = connector.lower()
    return lower.startswith('virtual') or lower.startswith('meta')


def read_current_state(proxy: Gio.DBusProxy) -> dict:
    serial, monitors, logical_monitors, _props = proxy.call_sync(
        'GetCurrentState',
        None,
        Gio.DBusCallFlags.NONE,
        -1,
        None,
    ).unpack()

    current_mode_by_connector: dict[str, str] = {}
    for mon_id, modes, _mon_props in monitors:
        connector = mon_id[0]
        selected_mode = None
        for mode_id, _w, _h, _rr, _pref_scale, _sup_scales, mode_props in modes:
            if mode_props.get('is-current', False):
                selected_mode = mode_id
                break
        if selected_mode is None and modes:
            selected_mode = modes[0][0]
        if selected_mode is not None:
            current_mode_by_connector[connector] = selected_mode

    entries = []
    for x, y, scale, transform, primary, mon_list, _lprops in logical_monitors:
        connectors = [m[0] for m in mon_list]
        if not connectors:
            continue
        entries.append(
            {
                'connector': connectors[0],
                'connectors': connectors,
                'x': int(x),
                'y': int(y),
                'scale': float(scale),
                'transform': int(transform),
                'primary': bool(primary),
                'modeId': current_mode_by_connector.get(connectors[0], ''),
            }
        )

    return {'serial': int(serial), 'monitors': entries}


def find_saved_entry(connector: str, saved_monitors: list[dict]) -> dict | None:
    for item in saved_monitors:
        if item.get('connector') == connector:
            return item

    if is_virtual_connector(connector):
        for item in saved_monitors:
            if is_virtual_connector(str(item.get('connector', ''))):
                return item

    return None


def cmd_get() -> int:
    proxy = get_proxy()
    state = read_current_state(proxy)
    print(json.dumps(state))
    return 0


def cmd_apply(layout_path: str) -> int:
    with open(layout_path, 'r', encoding='utf-8') as f:
        saved = json.load(f)

    saved_monitors = saved.get('monitors', [])
    if not saved_monitors:
        print(json.dumps({'applied': False, 'reason': 'No saved monitors in layout'}))
        return 1

    proxy = get_proxy()
    current = read_current_state(proxy)
    current_monitors = current['monitors']

    logical_monitors_arg = []
    for cur in current_monitors:
        connector = cur['connector']
        mode_id = cur['modeId']
        if not mode_id:
            continue

        matched = find_saved_entry(connector, saved_monitors)
        target = matched if matched is not None else cur

        logical_monitors_arg.append(
            (
                int(target['x']),
                int(target['y']),
                float(target['scale']),
                int(target['transform']),
                bool(target['primary']),
                [(connector, mode_id, {})],
            )
        )

    if not logical_monitors_arg:
        print(json.dumps({'applied': False, 'reason': 'No active monitors to configure'}))
        return 1

    # Ensure exactly one primary monitor so Mutter accepts the configuration.
    if not any(m[4] for m in logical_monitors_arg):
        first = logical_monitors_arg[0]
        logical_monitors_arg[0] = (first[0], first[1], first[2], first[3], True, first[5])

    variant = GLib.Variant(
        '(uua(iiduba(ssa{sv}))a{sv})',
        (current['serial'], 1, logical_monitors_arg, {}),
    )
    proxy.call_sync('ApplyMonitorsConfig', variant, Gio.DBusCallFlags.NONE, -1, None)
    print(json.dumps({'applied': True, 'count': len(logical_monitors_arg)}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('get')
    apply_parser = sub.add_parser('apply')
    apply_parser.add_argument('layout_file')

    args = parser.parse_args()
    try:
        if args.command == 'get':
            return cmd_get()
        if args.command == 'apply':
            return cmd_apply(args.layout_file)
    except Exception as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
