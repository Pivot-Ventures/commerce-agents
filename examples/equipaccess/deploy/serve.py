# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""PID 1 for the EquipAccess image: uvicorn, three Next servers, and nginx.

    PORT                 public listen port (default 80; Render/Azure set this)
    ANTHROPIC_API_KEY    chat only; catalog, haulage, and listings run without it

EQUIPACCESS_API_BASE is not set here. The demo stays on fixtures. Checkout still
charges nothing; POST /api/haulage and payouts stay unwired.
"""

from __future__ import annotations

import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

PORT = os.environ.get("PORT", "80")
EXAMPLES = Path("/app/examples")
NGINX_TEMPLATE = Path("/etc/nginx/templates/equipaccess.conf.template")
NGINX_CONF = Path("/tmp/nginx.conf")


def render_nginx() -> None:
    Path("/tmp/nginx").mkdir(parents=True, exist_ok=True)
    for name in ("client_body", "proxy", "fastcgi", "uwsgi", "scgi"):
        (Path("/tmp/nginx") / name).mkdir(parents=True, exist_ok=True)
    text = NGINX_TEMPLATE.read_text(encoding="utf-8").replace("${PORT}", PORT)
    NGINX_CONF.write_text(text, encoding="utf-8")
    subprocess.run(["nginx", "-t", "-c", str(NGINX_CONF)], check=True)


def find_next_server(root: Path) -> Path:
    matches = sorted(root.rglob("server.js"))
    if not matches:
        raise FileNotFoundError(f"no Next server.js under {root}")
    return matches[0]


def wait_port(port: int, timeout_s: float = 90) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            if sock.connect_ex(("127.0.0.1", port)) == 0:
                return
        time.sleep(0.25)
    raise RuntimeError(f"nothing listening on 127.0.0.1:{port}")


def main() -> int:
    render_nginx()
    children: list[subprocess.Popen[bytes]] = []

    def stop(_signum: int | None = None, _frame: object = None) -> None:
        for child in children:
            if child.poll() is None:
                child.terminate()
        deadline = time.monotonic() + 8
        for child in children:
            remaining = max(0.1, deadline - time.monotonic())
            try:
                child.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                child.kill()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    children.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "equipaccess.api.main:app",
                "--app-dir",
                str(EXAMPLES),
                "--host",
                "127.0.0.1",
                "--port",
                "8004",
            ],
            cwd="/app",
        )
    )
    for name, port in (("storefront", 3004), ("merchant", 3104), ("admin", 3204)):
        root = Path("/app/web") / name
        server = find_next_server(root)
        env = {**os.environ, "HOSTNAME": "127.0.0.1", "PORT": str(port)}
        children.append(subprocess.Popen(["node", str(server)], cwd=root, env=env))

    for port in (8004, 3004, 3104, 3204):
        wait_port(port)

    children.append(subprocess.Popen(["nginx", "-g", "daemon off;", "-c", str(NGINX_CONF)]))
    print(f"equipaccess: public http://0.0.0.0:{PORT}  (/ /merchant /admin /api)", flush=True)

    while True:
        for child in children:
            code = child.poll()
            if code is not None:
                stop()
                return code or 1
        time.sleep(0.5)


if __name__ == "__main__":
    raise SystemExit(main())
