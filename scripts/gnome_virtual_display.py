#!/usr/bin/env python3
"""
Creates a software virtual display on GNOME/Wayland using
org.gnome.Mutter.ScreenCast (RecordVirtual) and keeps the PipeWire
stream alive via GStreamer so Mutter exposes it as an extended monitor.
"""
import argparse
import json
import signal
import subprocess
import sys

import gi

gi.require_version('Gio', '2.0')
from gi.repository import Gio, GLib  # noqa: E402


def emit(payload: dict) -> None:
    print(json.dumps(payload), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--width', type=int, default=1920)
    parser.add_argument('--height', type=int, default=1080)
    args = parser.parse_args()

    loop = GLib.MainLoop()
    gst_proc: subprocess.Popen[bytes] | None = None
    session_proxy: Gio.DBusProxy | None = None

    def cleanup() -> None:
        nonlocal gst_proc, session_proxy
        if gst_proc is not None and gst_proc.poll() is None:
            gst_proc.terminate()
            try:
                gst_proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                gst_proc.kill()
            gst_proc = None

        if session_proxy is not None:
            try:
                session_proxy.call_sync('Stop', None, Gio.DBusCallFlags.NONE, -1, None)
            except Exception:
                pass
            session_proxy = None

    def handle_signal(_signum: int, _frame: object) -> None:
        cleanup()
        if loop.is_running():
            loop.quit()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        screencast = Gio.DBusProxy.new_sync(
            bus,
            Gio.DBusProxyFlags.NONE,
            None,
            'org.gnome.Mutter.ScreenCast',
            '/org/gnome/Mutter/ScreenCast',
            'org.gnome.Mutter.ScreenCast',
            None,
        )

        session_path = screencast.call_sync(
            'CreateSession',
            GLib.Variant('(a{sv})', ({},)),
            Gio.DBusCallFlags.NONE,
            -1,
            None,
        ).unpack()[0]

        session_proxy = Gio.DBusProxy.new_sync(
            bus,
            Gio.DBusProxyFlags.NONE,
            None,
            'org.gnome.Mutter.ScreenCast',
            session_path,
            'org.gnome.Mutter.ScreenCast.Session',
            None,
        )

        stream_path = session_proxy.call_sync(
            'RecordVirtual',
            GLib.Variant(
                '(a{sv})',
                (
                    {
                        'is-platform': GLib.Variant('b', False),
                        'cursor-mode': GLib.Variant('u', 1),
                    },
                ),
            ),
            Gio.DBusCallFlags.NONE,
            -1,
            None,
        ).unpack()[0]

        def on_pipewire_stream_added(
            _connection: Gio.DBusConnection,
            _sender: str,
            _object_path: str,
            _interface_name: str,
            _signal_name: str,
            parameters: GLib.Variant,
        ) -> None:
            nonlocal gst_proc
            node_id = parameters.unpack()[0]
            caps = f'video/x-raw,width={args.width},height={args.height}'
            gst_proc = subprocess.Popen(
                [
                    'gst-launch-1.0',
                    '-q',
                    'pipewiresrc',
                    f'path={node_id}',
                    '!',
                    caps,
                    '!',
                    'fakesink',
                    'sync=false',
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            emit({'event': 'ready', 'nodeId': node_id, 'width': args.width, 'height': args.height})

        bus.signal_subscribe(
            'org.gnome.Mutter.ScreenCast',
            'org.gnome.Mutter.ScreenCast.Stream',
            'PipeWireStreamAdded',
            stream_path,
            None,
            Gio.DBusSignalFlags.NONE,
            on_pipewire_stream_added,
        )

        session_proxy.call_sync('Start', None, Gio.DBusCallFlags.NONE, -1, None)
        loop.run()
    except Exception as exc:
        emit({'event': 'error', 'message': str(exc)})
        cleanup()
        return 1

    cleanup()
    return 0


if __name__ == '__main__':
    sys.exit(main())
