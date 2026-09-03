# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Copy Next `.next/static` and storefront `public/` next to each standalone `server.js`."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

WEB_ROOT = Path("/app/web")
STATIC_ROOT = Path("/tmp/static")
PUBLIC_ROOT = Path("/tmp/public")


def place(
    name: str,
    *,
    web_root: Path = WEB_ROOT,
    static_root: Path = STATIC_ROOT,
    public_root: Path = PUBLIC_ROOT,
) -> Path:
    root = web_root / name
    matches = sorted(root.rglob("server.js"))
    if not matches:
        raise SystemExit(f"no server.js under {root}")
    dest = matches[0].parent / ".next" / "static"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(static_root / name, dest, dirs_exist_ok=True)
    print(f"placed {name} static at {dest}")
    public_src = public_root / name
    if public_src.is_dir():
        public_dest = matches[0].parent / "public"
        shutil.copytree(public_src, public_dest, dirs_exist_ok=True)
        print(f"placed {name} public at {public_dest}")
    return matches[0].parent


def main() -> int:
    for name in ("storefront", "merchant", "admin"):
        place(name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
